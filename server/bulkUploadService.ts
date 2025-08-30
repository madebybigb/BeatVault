import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { b2Service } from './b2Service';
import { audioService } from './audioService';
import { jobs } from './backgroundJobs';
import { beats, type InsertBeat } from '@shared/schema';
import { db } from './db';
import { redisService } from './redis';

interface BulkUploadJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  successfulUploads: string[]; // Beat IDs
  errors: { file: string; error: string }[];
  createdAt: Date;
  completedAt?: Date;
}

interface FileUploadResult {
  filename: string;
  success: boolean;
  beatId?: string;
  error?: string;
  metadata?: {
    title?: string;
    genre?: string;
    bpm?: number;
    key?: string;
    duration?: number;
  };
}

interface AudioMetadata {
  duration: number;
  bitrate: number;
  sampleRate: number;
  format: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  bpm?: number;
  key?: string;
}

export class BulkUploadService {
  private uploadJobs = new Map<string, BulkUploadJob>();

  /**
   * Configure multer for bulk file uploads
   */
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'temp', 'bulk-uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = nanoid();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
        files: 50 // Max 50 files per batch
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'audio/mpeg',
          'audio/wav',
          'audio/x-wav',
          'audio/mp3',
          'audio/mp4',
          'audio/aac',
          'audio/flac'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
      }
    });
  }

  /**
   * Start a bulk upload job
   */
  async startBulkUpload(
    userId: string,
    files: Express.Multer.File[],
    defaultMetadata: Partial<InsertBeat> = {}
  ): Promise<string> {
    try {
      const jobId = nanoid();
      
      const job: BulkUploadJob = {
        id: jobId,
        userId,
        status: 'pending',
        totalFiles: files.length,
        processedFiles: 0,
        failedFiles: 0,
        successfulUploads: [],
        errors: [],
        createdAt: new Date()
      };

      this.uploadJobs.set(jobId, job);
      
      // Cache job details
      await redisService.setex(`bulk_upload:${jobId}`, 86400, JSON.stringify(job)); // 24 hours

      // Start processing in background
      this.processBulkUpload(jobId, files, defaultMetadata);

      return jobId;
    } catch (error) {
      console.error('Failed to start bulk upload:', error);
      throw new Error('Failed to start bulk upload');
    }
  }

  /**
   * Get bulk upload job status
   */
  async getBulkUploadStatus(jobId: string): Promise<BulkUploadJob | null> {
    try {
      // Check in-memory first
      let job = this.uploadJobs.get(jobId);
      
      if (!job) {
        // Check Redis cache
        const cached = await redisService.get(`bulk_upload:${jobId}`);
        if (cached) {
          job = JSON.parse(cached);
        }
      }

      return job || null;
    } catch (error) {
      console.error('Failed to get upload status:', error);
      return null;
    }
  }

  /**
   * Process bulk upload in background
   */
  private async processBulkUpload(
    jobId: string,
    files: Express.Multer.File[],
    defaultMetadata: Partial<InsertBeat>
  ): Promise<void> {
    const job = this.uploadJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      await this.updateJobStatus(jobId, job);

      const results: FileUploadResult[] = [];

      // Process files in batches of 5 to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(file => this.processUploadFile(file, job.userId, defaultMetadata))
        );

        // Process batch results
        batchResults.forEach((result, index) => {
          const file = batch[index];
          
          if (result.status === 'fulfilled') {
            results.push(result.value);
            if (result.value.success) {
              job.successfulUploads.push(result.value.beatId!);
            } else {
              job.failedFiles++;
              job.errors.push({
                file: file.originalname,
                error: result.value.error || 'Unknown error'
              });
            }
          } else {
            job.failedFiles++;
            job.errors.push({
              file: file.originalname,
              error: result.reason?.message || 'Processing failed'
            });
          }

          job.processedFiles++;
        });

        // Update progress
        await this.updateJobStatus(jobId, job);

        // Clean up temp files
        await Promise.all(batch.map(file => this.cleanupTempFile(file.path)));
      }

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      await this.updateJobStatus(jobId, job);

      console.log(`Bulk upload ${jobId} completed: ${job.successfulUploads.length} successful, ${job.failedFiles} failed`);
    } catch (error) {
      console.error(`Bulk upload ${jobId} failed:`, error);
      job.status = 'failed';
      job.errors.push({
        file: 'system',
        error: error instanceof Error ? error.message : 'Unknown system error'
      });
      await this.updateJobStatus(jobId, job);
    }
  }

  /**
   * Process individual upload file
   */
  private async processUploadFile(
    file: Express.Multer.File,
    userId: string,
    defaultMetadata: Partial<InsertBeat>
  ): Promise<FileUploadResult> {
    try {
      // Extract audio metadata
      const metadata = await this.extractAudioMetadata(file.path);
      
      // Upload to B2
      const fileBuffer = await fs.readFile(file.path);
      const audioUrl = await b2Service.uploadFile(
        `${nanoid()}.${path.extname(file.originalname).slice(1)}`,
        fileBuffer,
        file.mimetype,
        'audio'
      );

      // Create beat record
      const beatData: InsertBeat = {
        title: metadata.title || path.parse(file.originalname).name,
        description: defaultMetadata.description || `Auto-uploaded: ${file.originalname}`,
        producerId: userId,
        genre: metadata.genre || defaultMetadata.genre || 'Hip Hop',
        mood: defaultMetadata.mood || 'Energetic',
        bpm: metadata.bpm || defaultMetadata.bpm || 120,
        key: metadata.key || defaultMetadata.key || 'C',
        price: defaultMetadata.price || 29.99,
        audioUrl,
        tags: defaultMetadata.tags || [],
        duration: Math.round(metadata.duration),
        sampleRate: metadata.sampleRate,
        bitRate: metadata.bitrate,
        audioFormat: metadata.format,
        isActive: true,
        isFree: defaultMetadata.isFree || false,
        isExclusive: defaultMetadata.isExclusive || false
      };

      const [beat] = await db.insert(beats).values(beatData).returning();

      // Queue audio processing jobs
      await audioService.processUploadedAudio(beat.id, audioUrl);

      return {
        filename: file.originalname,
        success: true,
        beatId: beat.id,
        metadata: {
          title: metadata.title,
          genre: metadata.genre,
          bpm: metadata.bpm,
          key: metadata.key,
          duration: Math.round(metadata.duration)
        }
      };
    } catch (error) {
      console.error(`Failed to process file ${file.originalname}:`, error);
      return {
        filename: file.originalname,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  /**
   * Extract metadata from audio file
   */
  private async extractAudioMetadata(filePath: string): Promise<AudioMetadata> {
    try {
      // In a real implementation, you would use a library like node-ffprobe or music-metadata
      // For now, we'll return mock metadata based on file properties
      
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Estimate duration based on file size (rough approximation)
      const estimatedDuration = Math.max(30, Math.min(300, stats.size / 40000)); // 40KB per second estimate
      
      return {
        duration: estimatedDuration,
        bitrate: 320, // Default to high quality
        sampleRate: 44100,
        format: ext.slice(1),
        // Extract from filename patterns if possible
        title: this.extractTitleFromFilename(path.basename(filePath)),
        bpm: this.extractBPMFromFilename(path.basename(filePath)),
        key: this.extractKeyFromFilename(path.basename(filePath))
      };
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {
        duration: 180, // 3 minutes default
        bitrate: 320,
        sampleRate: 44100,
        format: 'mp3'
      };
    }
  }

  /**
   * Extract title from filename
   */
  private extractTitleFromFilename(filename: string): string {
    // Remove common patterns and extensions
    let title = path.parse(filename).name;
    
    // Remove common producer tags and patterns
    title = title
      .replace(/\[(.*?)\]/g, '') // Remove [brackets]
      .replace(/\((.*?)\)/g, '') // Remove (parentheses)
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/-/g, ' ') // Replace hyphens with spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();

    return title || 'Untitled Beat';
  }

  /**
   * Extract BPM from filename
   */
  private extractBPMFromFilename(filename: string): number | undefined {
    const bpmMatch = filename.match(/(?:^|[^\\d])(\\d{2,3})\\s*bpm/i);
    if (bpmMatch) {
      const bpm = parseInt(bpmMatch[1]);
      if (bpm >= 60 && bpm <= 200) {
        return bpm;
      }
    }
    return undefined;
  }

  /**
   * Extract key from filename
   */
  private extractKeyFromFilename(filename: string): string | undefined {
    const keyMatch = filename.match(/\\b([A-G][#b]?(?:m|maj|min|minor|major)?)\\b/i);
    return keyMatch ? keyMatch[1] : undefined;
  }

  /**
   * Update job status in memory and cache
   */
  private async updateJobStatus(jobId: string, job: BulkUploadJob): Promise<void> {
    this.uploadJobs.set(jobId, job);
    await redisService.setex(`bulk_upload:${jobId}`, 86400, JSON.stringify(job));
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Get bulk upload history for a user
   */
  async getUserUploadHistory(
    userId: string,
    limit: number = 20
  ): Promise<BulkUploadJob[]> {
    try {
      // In a real implementation, you would store job history in the database
      // For now, return jobs from memory and cache
      const userJobs: BulkUploadJob[] = [];
      
      for (const job of this.uploadJobs.values()) {
        if (job.userId === userId) {
          userJobs.push(job);
        }
      }

      return userJobs
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get upload history:', error);
      return [];
    }
  }

  /**
   * Cancel a bulk upload job
   */
  async cancelBulkUpload(jobId: string, userId: string): Promise<boolean> {
    try {
      const job = this.uploadJobs.get(jobId);
      
      if (!job || job.userId !== userId) {
        return false;
      }

      if (job.status === 'processing') {
        job.status = 'failed';
        job.errors.push({
          file: 'system',
          error: 'Upload cancelled by user'
        });
        await this.updateJobStatus(jobId, job);
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel upload:', error);
      return false;
    }
  }
}

export const bulkUploadService = new BulkUploadService();