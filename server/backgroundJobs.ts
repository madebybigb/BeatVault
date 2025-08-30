import Queue from 'bull';
import type { BackgroundJob } from '@shared/schema';

// Background job queue using Bull (Redis-based)
// For Replit, we'll use in-memory fallback if Redis isn't available
const queueOptions = {
  redis: process.env.REDIS_URL ? {
    port: 6379,
    host: process.env.REDIS_URL
  } : undefined,
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

// Create job queues
export const beatProcessingQueue = new Queue('beat processing', queueOptions);
export const emailQueue = new Queue('email notifications', queueOptions);
export const analyticsQueue = new Queue('analytics updates', queueOptions);

// Job processors
beatProcessingQueue.process('audio-processing', async (job) => {
  const { beatId, audioPath } = job.data;
  console.log(`[BG JOB] Processing audio for beat: ${beatId}`);
  
  // Simulate heavy audio processing (waveform generation, format conversion, etc.)
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log(`[BG JOB] Audio processing completed for beat: ${beatId}`);
  return { status: 'completed', beatId };
});

emailQueue.process('notification', async (job) => {
  const { type, userId, data } = job.data;
  console.log(`[BG JOB] Sending ${type} notification to user: ${userId}`);
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`[BG JOB] Email notification sent: ${type}`);
  return { status: 'sent', type };
});

analyticsQueue.process('update-stats', async (job) => {
  const { beatId, action } = job.data;
  console.log(`[BG JOB] Updating analytics for beat: ${beatId}, action: ${action}`);
  
  // Simulate analytics processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`[BG JOB] Analytics updated for beat: ${beatId}`);
  return { status: 'updated', beatId, action };
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
beatProcessingQueue.on('completed', (job, result) => {
  console.log(`[QUEUE] Beat processing job completed: ${job.id}`, result);
});

beatProcessingQueue.on('failed', (job, err) => {
  console.error(`[QUEUE] Beat processing job failed: ${job.id}`, err);
});

emailQueue.on('completed', (job, result) => {
  console.log(`[QUEUE] Email job completed: ${job.id}`, result);
});

analyticsQueue.on('completed', (job, result) => {
  console.log(`[QUEUE] Analytics job completed: ${job.id}`, result);
});

export default jobs;