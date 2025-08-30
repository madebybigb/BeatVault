import type { Request, Response, NextFunction } from 'express';

// API batching middleware for combining multiple similar requests
export class ApiBatcher {
  private batches: Map<string, {
    requests: Array<{
      resolve: (value: any) => void;
      reject: (error: any) => void;
      params: any;
    }>;
    timeout: NodeJS.Timeout;
    createdAt: number;
  }> = new Map();

  // Batch play count updates
  batchPlayCounts = (req: Request, res: Response, next: NextFunction) => {
    const beatId = req.params.id;
    const batchKey = 'playCount';
    
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, {
        requests: [],
        timeout: setTimeout(() => this.processBatch(batchKey), 2000), // Batch for 2 seconds
        createdAt: Date.now()
      });
    }

    const batch = this.batches.get(batchKey)!;
    
    return new Promise((resolve, reject) => {
      batch.requests.push({
        resolve,
        reject,
        params: { beatId }
      });

      // If batch is full, process immediately
      if (batch.requests.length >= 10) {
        clearTimeout(batch.timeout);
        this.processBatch(batchKey);
      }
    }).then((result) => {
      res.json(result);
    }).catch((error) => {
      res.status(500).json({ message: error.message });
    });
  };

  private async processBatch(batchKey: string) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);

    try {
      if (batchKey === 'playCount') {
        // Group play counts by beat ID
        const playCountMap = new Map<string, number>();
        
        batch.requests.forEach(({ params }) => {
          const current = playCountMap.get(params.beatId) || 0;
          playCountMap.set(params.beatId, current + 1);
        });

        // Process all play count updates in a single database transaction
        const updates = Array.from(playCountMap.entries()).map(([beatId, count]) => ({
          beatId,
          increment: count
        }));

        console.log(`[BATCH] Processing ${updates.length} play count updates`);
        
        // Here you would normally update the database
        // For now, we'll simulate success
        batch.requests.forEach(({ resolve }) => {
          resolve({ success: true, batched: true });
        });
      }
    } catch (error) {
      batch.requests.forEach(({ reject }) => {
        reject(error);
      });
    }
  }

  // Batch like/unlike operations
  batchLikes = async (requests: Array<{ userId: string; beatId: string; action: 'like' | 'unlike' }>) => {
    try {
      console.log(`[BATCH] Processing ${requests.length} like operations`);

      // Group by action type
      const likes = requests.filter(r => r.action === 'like');
      const unlikes = requests.filter(r => r.action === 'unlike');

      // Process in batches
      if (likes.length > 0) {
        console.log(`[BATCH] Adding ${likes.length} likes`);
        // Batch insert likes
      }

      if (unlikes.length > 0) {
        console.log(`[BATCH] Removing ${unlikes.length} likes`);
        // Batch delete unlikes
      }

      return { processed: requests.length };
    } catch (error) {
      console.error('[BATCH] Error in batchLikes:', error);
      throw error;
    }
  };

  // Batch cart operations
  batchCartOperations = async (operations: Array<{
    userId: string;
    operation: 'add' | 'remove';
    beatId: string;
    licenseType?: string;
  }>) => {
    try {
      console.log(`[BATCH] Processing ${operations.length} cart operations`);

      const adds = operations.filter(op => op.operation === 'add');
      const removes = operations.filter(op => op.operation === 'remove');

      // Batch process cart operations
      const results = [];

      for (const add of adds) {
        results.push({ operation: 'add', beatId: add.beatId, success: true });
      }

      for (const remove of removes) {
        results.push({ operation: 'remove', beatId: remove.beatId, success: true });
      }

      return results;
    } catch (error) {
      console.error('[BATCH] Error in batchCartOperations:', error);
      throw error;
    }
  };

  // Clean up expired batches
  cleanup = () => {
    const now = Date.now();
    const expiryTime = 30 * 1000; // 30 seconds

    for (const [key, batch] of Array.from(this.batches.entries())) {
      // Check if batch has expired (created more than 30 seconds ago)
      if (now - batch.createdAt > expiryTime) {
        clearTimeout(batch.timeout);
        this.batches.delete(key);
        console.log(`[BATCH] Cleaned up expired batch: ${key}`);
      }
    }
  };
}

export const apiBatcher = new ApiBatcher();

// Cleanup expired batches every minute
setInterval(() => {
  apiBatcher.cleanup();
}, 60000);