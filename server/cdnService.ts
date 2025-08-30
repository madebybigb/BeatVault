import { b2Service } from "./b2Service";
import { redisService } from "./redis";
import path from "path";

interface CDNConfig {
  baseUrl: string;
  cacheTTL: number;
  enableCompression: boolean;
  enableEdgeCaching: boolean;
}

interface OptimizedAsset {
  originalUrl: string;
  cdnUrl: string;
  format: string;
  size: number;
  quality: 'high' | 'medium' | 'low';
  cached: boolean;
}

export class CDNService {
  private config: CDNConfig;
  private regionalEndpoints: { [key: string]: string };

  constructor() {
    this.config = {
      baseUrl: process.env.CDN_BASE_URL || 'https://cdn.beathub.com',
      cacheTTL: 3600, // 1 hour
      enableCompression: true,
      enableEdgeCaching: true
    };

    // Define regional CDN endpoints for global optimization
    this.regionalEndpoints = {
      'us-east': 'https://us-east.cdn.beathub.com',
      'us-west': 'https://us-west.cdn.beathub.com', 
      'eu-west': 'https://eu-west.cdn.beathub.com',
      'asia-pacific': 'https://ap.cdn.beathub.com'
    };
  }

  /**
   * Optimize audio file for CDN delivery
   */
  async optimizeAudioForCDN(
    audioUrl: string,
    quality: 'high' | 'medium' | 'low' = 'high'
  ): Promise<OptimizedAsset> {
    try {
      const cacheKey = `cdn:audio:${audioUrl}:${quality}`;
      
      // Check if already optimized and cached
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Generate optimized CDN URL
      const cdnUrl = this.generateOptimizedUrl(audioUrl, {
        format: 'mp3',
        quality,
        compression: true
      });

      const optimizedAsset: OptimizedAsset = {
        originalUrl: audioUrl,
        cdnUrl,
        format: 'mp3',
        size: await this.estimateOptimizedSize(audioUrl, quality),
        quality,
        cached: false
      };

      // Cache the optimized asset info
      await redisService.setex(cacheKey, this.config.cacheTTL, JSON.stringify(optimizedAsset));

      return optimizedAsset;
    } catch (error) {
      console.error('CDN optimization failed:', error);
      
      // Fallback to original URL
      return {
        originalUrl: audioUrl,
        cdnUrl: audioUrl,
        format: 'mp3',
        size: 0,
        quality,
        cached: false
      };
    }
  }

  /**
   * Get regional CDN URL based on user location
   */
  getRegionalCDNUrl(
    assetPath: string,
    userRegion: string = 'us-east'
  ): string {
    const endpoint = this.regionalEndpoints[userRegion] || this.regionalEndpoints['us-east'];
    return `${endpoint}/${assetPath}`;
  }

  /**
   * Generate optimized URLs with parameters
   */
  private generateOptimizedUrl(
    originalUrl: string,
    options: {
      format?: string;
      quality?: 'high' | 'medium' | 'low';
      compression?: boolean;
      width?: number;
      height?: number;
    }
  ): string {
    const url = new URL(originalUrl);
    const params = new URLSearchParams();

    // Add optimization parameters
    if (options.format) params.append('format', options.format);
    if (options.quality) {
      const qualityMap = { high: '320', medium: '192', low: '128' };
      params.append('bitrate', qualityMap[options.quality]);
    }
    if (options.compression) params.append('compress', 'true');
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());

    // Add cache headers
    params.append('cache', this.config.cacheTTL.toString());

    return `${this.config.baseUrl}${url.pathname}?${params.toString()}`;
  }

  /**
   * Estimate optimized file size
   */
  private async estimateOptimizedSize(url: string, quality: 'high' | 'medium' | 'low'): Promise<number> {
    // Quality compression ratios (approximate)
    const compressionRatios = {
      high: 0.85,    // 320kbps
      medium: 0.60,  // 192kbps  
      low: 0.40      // 128kbps
    };

    try {
      // In a real implementation, you would get the actual file size
      // For now, estimate based on quality
      const baseSize = 5 * 1024 * 1024; // 5MB average
      return Math.round(baseSize * compressionRatios[quality]);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Preload assets to edge caches
   */
  async preloadToEdgeCache(assetUrls: string[]): Promise<void> {
    try {
      const preloadPromises = assetUrls.map(async (url) => {
        const cacheKey = `edge:preload:${url}`;
        
        // Mark as preloaded in cache
        await redisService.setex(cacheKey, 3600, 'preloaded');
        
        // In a real CDN implementation, you would:
        // 1. Make requests to edge servers to cache the assets
        // 2. Use CDN APIs to invalidate/update cache
        // 3. Monitor cache hit rates
        
        console.log(`Preloaded to edge cache: ${url}`);
      });

      await Promise.all(preloadPromises);
    } catch (error) {
      console.error('Edge cache preload failed:', error);
    }
  }

  /**
   * Invalidate CDN cache for specific assets
   */
  async invalidateCache(assetPaths: string[]): Promise<void> {
    try {
      const invalidationPromises = assetPaths.map(async (path) => {
        const cachePattern = `cdn:*:${path}:*`;
        
        // Remove from Redis cache
        await redisService.deletePattern(cachePattern);
        
        // In a real CDN implementation, you would:
        // 1. Call CDN invalidation APIs
        // 2. Clear edge caches
        // 3. Update cache version numbers
        
        console.log(`Invalidated cache for: ${path}`);
      });

      await Promise.all(invalidationPromises);
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
  }

  /**
   * Get CDN analytics and performance metrics
   */
  async getCDNAnalytics(assetPath: string): Promise<{
    hitRate: number;
    bandwidth: number;
    requests: number;
    avgResponseTime: number;
  }> {
    try {
      const analyticsKey = `cdn:analytics:${assetPath}`;
      const cached = await redisService.get(analyticsKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Mock analytics data - in a real implementation, this would come from CDN APIs
      const analytics = {
        hitRate: 0.85 + Math.random() * 0.1, // 85-95% hit rate
        bandwidth: Math.random() * 1000000, // Random bandwidth in bytes
        requests: Math.floor(Math.random() * 10000), // Random request count
        avgResponseTime: 50 + Math.random() * 100 // 50-150ms response time
      };

      // Cache analytics for 5 minutes
      await redisService.setex(analyticsKey, 300, JSON.stringify(analytics));
      
      return analytics;
    } catch (error) {
      console.error('Failed to get CDN analytics:', error);
      return {
        hitRate: 0,
        bandwidth: 0,
        requests: 0,
        avgResponseTime: 0
      };
    }
  }

  /**
   * Optimize images for different screen sizes
   */
  async optimizeImageForCDN(
    imageUrl: string,
    sizes: { width: number; height: number; quality: number }[]
  ): Promise<{ [key: string]: string }> {
    try {
      const optimizedUrls: { [key: string]: string } = {};

      for (const size of sizes) {
        const key = `${size.width}x${size.height}`;
        optimizedUrls[key] = this.generateOptimizedUrl(imageUrl, {
          width: size.width,
          height: size.height,
          quality: size.quality > 80 ? 'high' : size.quality > 60 ? 'medium' : 'low',
          format: 'webp', // Modern format for images
          compression: true
        });
      }

      return optimizedUrls;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return { original: imageUrl };
    }
  }

  /**
   * Generate adaptive streaming URLs
   */
  async generateAdaptiveStreamingUrls(audioUrl: string): Promise<{
    hls: string;
    dash: string;
    qualities: { [key: string]: string };
  }> {
    try {
      const baseUrl = audioUrl.replace(/\.[^/.]+$/, ''); // Remove extension
      
      return {
        hls: `${this.config.baseUrl}/${baseUrl}/playlist.m3u8`,
        dash: `${this.config.baseUrl}/${baseUrl}/manifest.mpd`,
        qualities: {
          '320k': this.generateOptimizedUrl(audioUrl, { quality: 'high' }),
          '192k': this.generateOptimizedUrl(audioUrl, { quality: 'medium' }),
          '128k': this.generateOptimizedUrl(audioUrl, { quality: 'low' })
        }
      };
    } catch (error) {
      console.error('Adaptive streaming URL generation failed:', error);
      return {
        hls: audioUrl,
        dash: audioUrl,
        qualities: { original: audioUrl }
      };
    }
  }
}

export const cdnService = new CDNService();