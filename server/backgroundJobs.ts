import Queue, { Job } from 'bull';
import type { BackgroundJob } from '@shared/schema';

// Background job queue using Bull (Redis-based)
// For Replit, we'll use in-memory fallback if Redis isn't available
const getQueueOptions = () => {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        redis: {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined,
          username: url.username || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      };
    } catch (error) {
      console.warn('Invalid REDIS_URL format, falling back to in-memory:', error);
    }
  }

  // In-memory fallback for development
  console.log('Using in-memory queue storage (Redis not configured)');
  return {
    redis: false, // Disables Redis, uses in-memory
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  };
};

const queueOptions = getQueueOptions();

// Create job queues
export const beatProcessingQueue = new Queue('beat processing', queueOptions as any);
export const emailQueue = new Queue('email notifications', queueOptions as any);
export const analyticsQueue = new Queue('analytics updates', queueOptions as any);

// Job processors
beatProcessingQueue.process('audio-processing', async (job: Job<{ beatId: string; audioPath: string }>) => {
  try {
    const { beatId, audioPath } = job.data;
    console.log(`[BG JOB] Processing audio for beat: ${beatId}`);

    // Simulate heavy audio processing (waveform generation, format conversion, etc.)
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`[BG JOB] Audio processing completed for beat: ${beatId}`);
    return { status: 'completed', beatId };
  } catch (error) {
    console.error(`[BG JOB] Error processing audio for beat: ${job.data.beatId}`, error);
    throw error; // Let Bull handle retry
  }
});

emailQueue.process('notification', async (job: Job<{ type: string; userId: string; data: any }>) => {
  try {
    const { type, userId, data } = job.data;
    console.log(`[BG JOB] Sending ${type} notification to user: ${userId}`);

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`[BG JOB] Email notification sent: ${type}`);
    return { status: 'sent', type };
  } catch (error) {
    console.error(`[BG JOB] Error sending notification: ${job.data.type}`, error);
    throw error;
  }
});

analyticsQueue.process('update-stats', async (job: Job<{ beatId: string; action: string }>) => {
  try {
    const { beatId, action } = job.data;
    console.log(`[BG JOB] Updating analytics for beat: ${beatId}, action: ${action}`);

    // Simulate analytics processing
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`[BG JOB] Analytics updated for beat: ${beatId}`);
    return { status: 'updated', beatId, action };
  } catch (error) {
    console.error(`[BG JOB] Error updating analytics for beat: ${job.data.beatId}`, error);
    throw error;
  }
});

analyticsQueue.process('batch-play-counts', async (job: Job<{ updates: Array<{ beatId: string; increment: number }> }>) => {
  try {
    const { updates } = job.data;
    console.log(`[BG JOB] Batch updating play counts for ${updates.length} beats`);

    // Simulate batch processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`[BG JOB] Batch play counts updated`);
    return { status: 'batch-updated', count: updates.length };
  } catch (error) {
    console.error(`[BG JOB] Error in batch play counts update`, error);
    throw error;
  }
});

// Job helpers
export const jobs = {
  async processBeatAudio(beatId: string, audioPath: string) {
    return beatProcessingQueue.add('audio-processing', {
      beatId,
      audioPath,
    }, {
      priority: 1,
      delay: 1000, // Start processing after 1 second
    });
  },

  async sendNotification(type: string, userId: string, data: any) {
    return emailQueue.add('notification', {
      type,
      userId,
      data,
    }, {
      priority: type === 'purchase' ? 1 : 5, // High priority for purchases
    });
  },

  async updateAnalytics(beatId: string, action: string) {
    return analyticsQueue.add('update-stats', {
      beatId,
      action,
    }, {
      priority: 10, // Low priority for analytics
      delay: 5000, // Batch analytics updates
    });
  },

  // Batch operations
  async batchUpdatePlayCounts(updates: Array<{ beatId: string; increment: number }>) {
    return analyticsQueue.add('batch-play-counts', {
      updates,
    }, {
      priority: 8,
      delay: 10000, // Batch every 10 seconds
    });
  },
};

// Queue monitoring
beatProcessingQueue.on('completed', (job: Job, result: any) => {
  console.log(`[QUEUE] Beat processing job completed: ${job.id}`, result);
});

beatProcessingQueue.on('failed', (job: Job, err: Error) => {
  console.error(`[QUEUE] Beat processing job failed: ${job.id}`, err);
});

emailQueue.on('completed', (job: Job, result: any) => {
  console.log(`[QUEUE] Email job completed: ${job.id}`, result);
});

analyticsQueue.on('completed', (job: Job, result: any) => {
  console.log(`[QUEUE] Analytics job completed: ${job.id}`, result);
});

export default jobs;