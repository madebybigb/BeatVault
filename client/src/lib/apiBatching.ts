// Frontend API batching utilities
import { apiRequest } from './queryClient';

class FrontendBatcher {
  private playCountBatch: Set<string> = new Set();
  private playCountTimer: NodeJS.Timeout | null = null;

  // Batch play count updates
  batchPlayCount(beatId: string) {
    this.playCountBatch.add(beatId);
    
    if (this.playCountTimer) {
      clearTimeout(this.playCountTimer);
    }
    
    // Batch requests for 1 second
    this.playCountTimer = setTimeout(() => {
      this.flushPlayCounts();
    }, 1000);
  }

  private async flushPlayCounts() {
    if (this.playCountBatch.size === 0) return;
    
    const beatIds = Array.from(this.playCountBatch);
    this.playCountBatch.clear();
    this.playCountTimer = null;
    
    console.log(`[BATCH] Sending ${beatIds.length} play count updates`);
    
    // Send batched requests
    const promises = beatIds.map(beatId => 
      apiRequest('POST', `/api/beats/${beatId}/play`).catch(error => {
        console.error(`Failed to update play count for beat ${beatId}:`, error);
      })
    );
    
    await Promise.allSettled(promises);
  }

  // Batch multiple API calls of the same type
  async batchRequests<T>(
    requests: Array<{ url: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any }>,
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(({ url, method, data }) =>
        apiRequest(method, url, data).catch(error => {
          console.error(`Batch request failed for ${url}:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : null
      ).filter(Boolean));
      
      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // Debounce search requests
  private searchTimeout: NodeJS.Timeout | null = null;
  
  debouncedSearch(searchFn: () => void, delay: number = 300) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(searchFn, delay);
  }
}

export const frontendBatcher = new FrontendBatcher();

// Hook for batched play count updates
export function useBatchedPlayCount() {
  return {
    incrementPlayCount: (beatId: string) => {
      frontendBatcher.batchPlayCount(beatId);
    }
  };
}

// Prefetch utility for predictive loading
export class Prefetcher {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async prefetch(url: string, priority: 'high' | 'low' = 'low') {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const data = await apiRequest('GET', url);
      this.cache.set(url, { data, timestamp: Date.now() });
      
      console.log(`[PREFETCH] Cached data for ${url}`);
      return data;
    } catch (error) {
      console.error(`[PREFETCH] Failed to prefetch ${url}:`, error);
      return null;
    }
  }

  getCached(url: string) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const prefetcher = new Prefetcher();

// Performance monitoring for frontend
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(label: string) {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
      
      if (duration > 100) {
        console.warn(`[PERF] Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  private recordMetric(label: string, duration: number) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const metrics = this.metrics.get(label)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getAverageTime(label: string): number {
    const metrics = this.metrics.get(label);
    if (!metrics || metrics.length === 0) return 0;
    
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }

  getMetrics() {
    const result: Record<string, { average: number; count: number }> = {};
    
    for (const [label, times] of this.metrics.entries()) {
      result[label] = {
        average: this.getAverageTime(label),
        count: times.length
      };
    }
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();