import {
  offlineCache,
  pushSubscriptions,
  beats,
  type OfflineCache,
  type PushSubscription,
  type InsertOfflineCache,
  type InsertPushSubscription
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, lte, count, inArray } from "drizzle-orm";

interface CacheStats {
  totalCached: number;
  totalSize: number;
  oldestCache: Date | null;
  newestCache: Date | null;
}

interface OfflineBeatData {
  beatId: string;
  title: string;
  producer: string;
  audioUrl: string;
  cacheSize: number;
  cachedAt: Date;
  lastAccessedAt: Date;
}

export class PWAService {
  private readonly MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly CACHE_EXPIRY_DAYS = 30;

  /**
   * Cache a beat for offline access
   */
  async cacheBeat(
    userId: string,
    beatId: string,
    audioUrl: string,
    cacheSize: number,
    isPreloaded: boolean = false
  ): Promise<OfflineCache> {
    try {
      // Check if already cached
      const [existing] = await db
        .select()
        .from(offlineCache)
        .where(and(
          eq(offlineCache.userId, userId),
          eq(offlineCache.beatId, beatId)
        ));

      if (existing) {
        // Update last accessed time
        const [updated] = await db
          .update(offlineCache)
          .set({ lastAccessedAt: new Date() })
          .where(eq(offlineCache.id, existing.id))
          .returning();
        return updated;
      }

      // Check cache limits
      await this.enforceStorageLimits(userId);

      // Add to cache
      const cacheData: InsertOfflineCache = {
        userId,
        beatId,
        audioUrl,
        cacheSize,
        isPreloaded
      };

      const [cached] = await db
        .insert(offlineCache)
        .values(cacheData)
        .returning();

      return cached;
    } catch (error) {
      console.error('Cache beat error:', error);
      throw new Error('Failed to cache beat');
    }
  }

  /**
   * Get cached beats for a user
   */
  async getCachedBeats(userId: string): Promise<OfflineBeatData[]> {
    try {
      const cachedBeats = await db
        .select({
          cache: offlineCache,
          beat: beats
        })
        .from(offlineCache)
        .innerJoin(beats, eq(beats.id, offlineCache.beatId))
        .where(eq(offlineCache.userId, userId))
        .orderBy(desc(offlineCache.lastAccessedAt));

      return cachedBeats.map(({ cache, beat }) => ({
        beatId: beat.id,
        title: beat.title,
        producer: beat.producer,
        audioUrl: cache.audioUrl,
        cacheSize: cache.cacheSize || 0,
        cachedAt: cache.cachedAt!,
        lastAccessedAt: cache.lastAccessedAt!
      }));
    } catch (error) {
      console.error('Get cached beats error:', error);
      return [];
    }
  }

  /**
   * Remove beat from cache
   */
  async uncacheBeat(userId: string, beatId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(offlineCache)
        .where(and(
          eq(offlineCache.userId, userId),
          eq(offlineCache.beatId, beatId)
        ));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Uncache beat error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for a user
   */
  async getCacheStats(userId: string): Promise<CacheStats> {
    try {
      const [stats] = await db
        .select({
          totalCached: count(offlineCache.id),
          totalSize: sql<number>`COALESCE(SUM(${offlineCache.cacheSize}), 0)`,
          oldestCache: sql<Date>`MIN(${offlineCache.cachedAt})`,
          newestCache: sql<Date>`MAX(${offlineCache.cachedAt})`
        })
        .from(offlineCache)
        .where(eq(offlineCache.userId, userId));

      return {
        totalCached: stats?.totalCached || 0,
        totalSize: Number(stats?.totalSize) || 0,
        oldestCache: stats?.oldestCache || null,
        newestCache: stats?.newestCache || null
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return {
        totalCached: 0,
        totalSize: 0,
        oldestCache: null,
        newestCache: null
      };
    }
  }

  /**
   * Clear old cached items to stay within limits
   */
  private async enforceStorageLimits(userId: string): Promise<void> {
    try {
      const stats = await this.getCacheStats(userId);

      // If approaching size limit, remove oldest items
      if (stats.totalSize > this.MAX_CACHE_SIZE * 0.8) {
        const oldItems = await db
          .select()
          .from(offlineCache)
          .where(eq(offlineCache.userId, userId))
          .orderBy(offlineCache.lastAccessedAt)
          .limit(10);

        if (oldItems.length > 0) {
          await db
            .delete(offlineCache)
            .where(inArray(offlineCache.id, oldItems.map(item => item.id)));
        }
      }

      // Remove items older than expiry period
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - this.CACHE_EXPIRY_DAYS);

      await db
        .delete(offlineCache)
        .where(and(
          eq(offlineCache.userId, userId),
          lte(offlineCache.lastAccessedAt, expiryDate)
        ));
    } catch (error) {
      console.error('Enforce storage limits error:', error);
    }
  }

  /**
   * Preload popular beats for offline access
   */
  async preloadPopularBeats(userId: string, limit: number = 20): Promise<string[]> {
    try {
      // Get most popular beats not already cached
      const popularBeats = await db
        .select({
          id: beats.id,
          audioUrl: beats.audioUrl
        })
        .from(beats)
        .where(sql`${beats.id} NOT IN (
          SELECT ${offlineCache.beatId} 
          FROM ${offlineCache} 
          WHERE ${offlineCache.userId} = ${userId}
        )`)
        .orderBy(desc(beats.playCount), desc(beats.likeCount))
        .limit(limit);

      const preloadedIds: string[] = [];

      for (const beat of popularBeats) {
        try {
          // Estimate cache size (rough calculation)
          const estimatedSize = 3 * 1024 * 1024; // 3MB average

          await this.cacheBeat(
            userId,
            beat.id,
            beat.audioUrl,
            estimatedSize,
            true // isPreloaded
          );

          preloadedIds.push(beat.id);
        } catch (error) {
          console.error('Preload beat error:', error);
          // Continue with next beat
        }
      }

      return preloadedIds;
    } catch (error) {
      console.error('Preload popular beats error:', error);
      return [];
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    userAgent?: string
  ): Promise<PushSubscription> {
    try {
      // Check if subscription already exists
      const [existing] = await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, subscription.endpoint)
        ));

      if (existing) {
        // Update existing subscription
        const [updated] = await db
          .update(pushSubscriptions)
          .set({
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            userAgent,
            isActive: true,
            lastUsedAt: new Date()
          })
          .where(eq(pushSubscriptions.id, existing.id))
          .returning();
        return updated;
      }

      // Create new subscription
      const subscriptionData: InsertPushSubscription = {
        userId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent,
        isActive: true
      };

      const [newSubscription] = await db
        .insert(pushSubscriptions)
        .values(subscriptionData)
        .returning();

      return newSubscription;
    } catch (error) {
      console.error('Subscribe to push error:', error);
      throw new Error('Failed to subscribe to push notifications');
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(
    userId: string,
    endpoint: string
  ): Promise<boolean> {
    try {
      const result = await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        ));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Unsubscribe from push error:', error);
      return false;
    }
  }

  /**
   * Get active push subscriptions for a user
   */
  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      return await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true)
        ))
        .orderBy(desc(pushSubscriptions.lastUsedAt));
    } catch (error) {
      console.error('Get user push subscriptions error:', error);
      return [];
    }
  }

  /**
   * Send push notification to user
   */
  async sendPushNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      data?: any;
    }
  ): Promise<boolean> {
    try {
      const subscriptions = await this.getUserPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        return false;
      }

      // In a real implementation, you would use a service like web-push
      // For now, we'll just log the notification
      console.log('Push notification sent:', {
        userId,
        subscriptions: subscriptions.length,
        payload
      });

      return true;
    } catch (error) {
      console.error('Send push notification error:', error);
      return false;
    }
  }

  /**
   * Generate PWA manifest data
   */
  getManifestData() {
    return {
      name: "BeatHub - Music Beat Marketplace",
      short_name: "BeatHub",
      description: "Discover and purchase high-quality beats from talented producers",
      start_url: "/",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#3b82f6",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      categories: ["music", "entertainment", "productivity"],
      screenshots: [
        {
          src: "/screenshot-mobile.png",
          sizes: "375x812",
          type: "image/png",
          form_factor: "narrow"
        },
        {
          src: "/screenshot-desktop.png",
          sizes: "1920x1080",
          type: "image/png",
          form_factor: "wide"
        }
      ]
    };
  }
}

export const pwaService = new PWAService();