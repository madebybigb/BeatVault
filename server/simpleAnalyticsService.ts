import {
  beats,
  analytics,
  purchases,
  likes,
  users,
  type Beat,
  type Purchase
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, count, sum, avg } from "drizzle-orm";

interface SimpleRevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSales: number;
  averageOrderValue: number;
}

interface SimpleEngagementMetrics {
  totalPlays: number;
  totalLikes: number;
  totalBeats: number;
  engagementRate: number;
}

interface SimpleAnalyticsDashboard {
  revenue: SimpleRevenueMetrics;
  engagement: SimpleEngagementMetrics;
  topBeats: Array<{
    beatId: string;
    title: string;
    plays: number;
    revenue: number;
  }>;
}

export class SimpleAnalyticsService {
  /**
   * Get basic revenue metrics for a producer
   */
  async getRevenueMetrics(producerId: string): Promise<SimpleRevenueMetrics> {
    try {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total revenue and sales
      const [totalMetrics] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${purchases.amount}), 0)`,
          sales: count(purchases.id),
          avgOrderValue: sql<number>`COALESCE(AVG(${purchases.amount}), 0)`
        })
        .from(purchases)
        .innerJoin(beats, eq(beats.id, purchases.beatId))
        .where(eq(beats.producerId, producerId));

      // Get monthly revenue
      const [monthlyMetrics] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${purchases.amount}), 0)`
        })
        .from(purchases)
        .innerJoin(beats, eq(beats.id, purchases.beatId))
        .where(and(
          eq(beats.producerId, producerId),
          gte(purchases.createdAt, monthAgo)
        ));

      return {
        totalRevenue: Number(totalMetrics?.revenue) || 0,
        monthlyRevenue: Number(monthlyMetrics?.revenue) || 0,
        totalSales: Number(totalMetrics?.sales) || 0,
        averageOrderValue: Number(totalMetrics?.avgOrderValue) || 0
      };
    } catch (error) {
      console.error('Revenue metrics error:', error);
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalSales: 0,
        averageOrderValue: 0
      };
    }
  }

  /**
   * Get basic engagement metrics for a producer
   */
  async getEngagementMetrics(producerId: string): Promise<SimpleEngagementMetrics> {
    try {
      // Get play count from analytics
      const [playMetrics] = await db
        .select({
          totalPlays: sql<number>`COALESCE(SUM(${analytics.metricValue}), 0)`
        })
        .from(analytics)
        .where(and(
          eq(analytics.producerId, producerId),
          eq(analytics.metricType, 'play')
        ));

      // Get like count
      const [likeMetrics] = await db
        .select({
          totalLikes: count(likes.id)
        })
        .from(likes)
        .innerJoin(beats, eq(beats.id, likes.beatId))
        .where(eq(beats.producerId, producerId));

      // Get total beats count
      const [beatCount] = await db
        .select({
          totalBeats: count(beats.id)
        })
        .from(beats)
        .where(eq(beats.producerId, producerId));

      const totalPlays = Number(playMetrics?.totalPlays) || 0;
      const totalLikes = Number(likeMetrics?.totalLikes) || 0;
      const engagementRate = totalPlays > 0 ? (totalLikes / totalPlays) * 100 : 0;

      return {
        totalPlays,
        totalLikes,
        totalBeats: Number(beatCount?.totalBeats) || 0,
        engagementRate
      };
    } catch (error) {
      console.error('Engagement metrics error:', error);
      return {
        totalPlays: 0,
        totalLikes: 0,
        totalBeats: 0,
        engagementRate: 0
      };
    }
  }

  /**
   * Get top performing beats for a producer
   */
  async getTopBeats(producerId: string, limit: number = 5): Promise<Array<{
    beatId: string;
    title: string;
    plays: number;
    revenue: number;
  }>> {
    try {
      const topBeats = await db
        .select({
          beatId: beats.id,
          title: beats.title,
          plays: sql<number>`COALESCE(SUM(${analytics.metricValue}), 0)`,
          revenue: sql<number>`COALESCE(SUM(${purchases.amount}), 0)`
        })
        .from(beats)
        .leftJoin(analytics, and(
          eq(analytics.beatId, beats.id),
          eq(analytics.metricType, 'play')
        ))
        .leftJoin(purchases, eq(purchases.beatId, beats.id))
        .where(eq(beats.producerId, producerId))
        .groupBy(beats.id, beats.title)
        .orderBy(desc(sql`COALESCE(SUM(${analytics.metricValue}), 0)`))
        .limit(limit);

      return topBeats.map(beat => ({
        beatId: beat.beatId,
        title: beat.title,
        plays: Number(beat.plays) || 0,
        revenue: Number(beat.revenue) || 0
      }));
    } catch (error) {
      console.error('Top beats error:', error);
      return [];
    }
  }

  /**
   * Get complete dashboard data
   */
  async getDashboard(producerId: string): Promise<SimpleAnalyticsDashboard> {
    try {
      const [revenue, engagement, topBeats] = await Promise.all([
        this.getRevenueMetrics(producerId),
        this.getEngagementMetrics(producerId),
        this.getTopBeats(producerId)
      ]);

      return {
        revenue,
        engagement,
        topBeats
      };
    } catch (error) {
      console.error('Dashboard error:', error);
      return {
        revenue: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalSales: 0,
          averageOrderValue: 0
        },
        engagement: {
          totalPlays: 0,
          totalLikes: 0,
          totalBeats: 0,
          engagementRate: 0
        },
        topBeats: []
      };
    }
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    producerId: string,
    beatId: string | null,
    metricType: string,
    metricValue: number = 1,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(analytics).values({
        producerId,
        beatId,
        metricType,
        metricValue,
        metadata
      });
    } catch (error) {
      console.error('Track event error:', error);
      // Don't throw error for analytics tracking
    }
  }
}

export const simpleAnalyticsService = new SimpleAnalyticsService();