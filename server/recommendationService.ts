import {
  beats,
  listeningHistory,
  likes,
  purchases,
  users,
  analytics,
  type Beat,
  type User,
  type ListeningHistory,
  type Like
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, gt, count, avg } from "drizzle-orm";
import { redisService } from "./redis";

interface UserBehavior {
  userId: string;
  totalListens: number;
  totalLikes: number;
  totalPurchases: number;
  favoriteGenres: { genre: string; score: number }[];
  favoriteMoods: { mood: string; score: number }[];
  preferredBPMRange: { min: number; max: number };
  averageSessionLength: number;
  lastActive: Date;
}

interface RecommendationScore {
  beatId: string;
  score: number;
  factors: {
    genreMatch: number;
    moodMatch: number;
    bpmMatch: number;
    popularityBoost: number;
    recencyBoost: number;
    collaborativeFiltering: number;
    noveltyScore: number;
  };
}

interface SimilarUser {
  userId: string;
  similarity: number;
  commonLikes: number;
  commonGenres: number;
}

export class RecommendationService {
  private modelWeights = {
    genre: 0.25,
    mood: 0.20,
    bpm: 0.15,
    popularity: 0.15,
    recency: 0.10,
    collaborative: 0.10,
    novelty: 0.05
  };

  /**
   * Get personalized beat recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 20,
    excludeBeatIds: string[] = []
  ): Promise<Beat[]> {
    try {
      const cacheKey = `recommendations:${userId}:${limit}`;
      
      // Check cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        const beatIds = JSON.parse(cached);
        return await this.getBeatsByIds(beatIds);
      }

      // Get user behavior profile
      const userBehavior = await this.getUserBehaviorProfile(userId);
      
      // Get candidate beats (exclude already interacted with)
      const candidateBeats = await this.getCandidateBeats(userId, excludeBeatIds);
      
      // Score each candidate beat
      const scoredBeats = await Promise.all(
        candidateBeats.map(beat => this.scoreBeatForUser(beat, userBehavior, userId))
      );

      // Sort by score and take top recommendations
      const recommendations = scoredBeats
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(scored => scored.beatId);

      // Cache recommendations for 1 hour
      await redisService.setex(cacheKey, 3600, JSON.stringify(recommendations));

      return await this.getBeatsByIds(recommendations);
    } catch (error) {
      console.error('Personalized recommendations failed:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Get trending beats based on recent activity
   */
  async getTrendingBeats(limit: number = 20): Promise<Beat[]> {
    try {
      const cacheKey = `trending:beats:${limit}`;
      
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate trending score based on recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const trendingBeats = await db
        .select({
          beat: beats,
          recentLikes: count(likes.id),
          recentPlays: sql<number>`COALESCE(SUM(CASE WHEN ${analytics.createdAt} >= ${sevenDaysAgo} THEN 1 ELSE 0 END), 0)`,
          totalScore: sql<number>`(
            COALESCE(${count(likes.id)}, 0) * 2 + 
            COALESCE(SUM(CASE WHEN ${analytics.createdAt} >= ${sevenDaysAgo} THEN 1 ELSE 0 END), 0) +
            COALESCE(${beats.playCount}, 0) * 0.1
          )`
        })
        .from(beats)
        .leftJoin(likes, and(
          eq(likes.beatId, beats.id),
          gt(likes.createdAt, sevenDaysAgo)
        ))
        .leftJoin(analytics, and(
          eq(analytics.entityId, beats.id),
          eq(analytics.action, 'play'),
          gt(analytics.createdAt, sevenDaysAgo)
        ))
        .where(eq(beats.isActive, true))
        .groupBy(beats.id)
        .orderBy(desc(sql`total_score`))
        .limit(limit);

      const results = trendingBeats.map(row => row.beat);

      // Cache for 30 minutes
      await redisService.setex(cacheKey, 1800, JSON.stringify(results));

      return results;
    } catch (error) {
      console.error('Trending beats failed:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Find similar beats based on audio features and metadata
   */
  async findSimilarBeats(beatId: string, limit: number = 10): Promise<Beat[]> {
    try {
      const cacheKey = `similar:${beatId}:${limit}`;
      
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get the source beat
      const [sourceBeat] = await db
        .select()
        .from(beats)
        .where(eq(beats.id, beatId));

      if (!sourceBeat) {
        return [];
      }

      // Find beats with similar characteristics
      const similarBeats = await db
        .select({
          beat: beats,
          similarity: sql<number>`(
            CASE WHEN ${beats.genre} = ${sourceBeat.genre} THEN 40 ELSE 0 END +
            CASE WHEN ${beats.mood} = ${sourceBeat.mood} THEN 30 ELSE 0 END +
            CASE WHEN ${beats.key} = ${sourceBeat.key} THEN 20 ELSE 0 END +
            (100 - ABS(${beats.bpm} - ${sourceBeat.bpm || 120})) * 0.1 +
            (100 - ABS(${beats.price} - ${sourceBeat.price})) * 0.05
          )`
        })
        .from(beats)
        .where(and(
          eq(beats.isActive, true),
          sql`${beats.id} != ${beatId}`
        ))
        .orderBy(desc(sql`similarity`))
        .limit(limit);

      const results = similarBeats.map(row => row.beat);

      // Cache for 2 hours
      await redisService.setex(cacheKey, 7200, JSON.stringify(results));

      return results;
    } catch (error) {
      console.error('Similar beats failed:', error);
      return [];
    }
  }

  /**
   * Get genre-based recommendations
   */
  async getGenreRecommendations(
    genre: string,
    userId?: string,
    limit: number = 20
  ): Promise<Beat[]> {
    try {
      let query = db
        .select()
        .from(beats)
        .where(and(
          eq(beats.genre, genre),
          eq(beats.isActive, true)
        ));

      // If user is provided, exclude their interactions
      if (userId) {
        const userLikes = await db
          .select({ beatId: likes.beatId })
          .from(likes)
          .where(eq(likes.userId, userId));

        const likedBeatIds = userLikes.map(like => like.beatId);
        
        if (likedBeatIds.length > 0) {
          query = query.where(sql`${beats.id} NOT IN (${likedBeatIds.join(',')})`);
        }
      }

      return await query
        .orderBy(desc(beats.playCount), desc(beats.likeCount))
        .limit(limit);
    } catch (error) {
      console.error('Genre recommendations failed:', error);
      return [];
    }
  }

  /**
   * Collaborative filtering - find users with similar taste
   */
  async findSimilarUsers(userId: string, limit: number = 50): Promise<SimilarUser[]> {
    try {
      const cacheKey = `similar_users:${userId}`;
      
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user's liked beats
      const userLikes = await db
        .select({ beatId: likes.beatId })
        .from(likes)
        .where(eq(likes.userId, userId));

      const likedBeatIds = userLikes.map(like => like.beatId);

      if (likedBeatIds.length === 0) {
        return [];
      }

      // Find users who liked similar beats
      const similarUsers = await db
        .select({
          userId: likes.userId,
          commonLikes: count(likes.id),
          totalLikes: sql<number>`COUNT(DISTINCT ${likes.beatId})`
        })
        .from(likes)
        .where(and(
          inArray(likes.beatId, likedBeatIds),
          sql`${likes.userId} != ${userId}`
        ))
        .groupBy(likes.userId)
        .having(sql`COUNT(${likes.id}) >= 2`) // At least 2 common likes
        .orderBy(desc(count(likes.id)))
        .limit(limit);

      const results: SimilarUser[] = similarUsers.map(user => ({
        userId: user.userId,
        similarity: user.commonLikes / Math.max(user.totalLikes, likedBeatIds.length),
        commonLikes: user.commonLikes,
        commonGenres: 0 // TODO: Calculate common genres
      }));

      // Cache for 4 hours
      await redisService.setex(cacheKey, 14400, JSON.stringify(results));

      return results;
    } catch (error) {
      console.error('Similar users failed:', error);
      return [];
    }
  }

  /**
   * Track user interaction for improving recommendations
   */
  async trackUserInteraction(
    userId: string,
    beatId: string,
    action: 'play' | 'like' | 'purchase' | 'skip',
    duration?: number
  ): Promise<void> {
    try {
      // Store in analytics table
      await db.insert(analytics).values({
        userId,
        entityType: 'beat',
        entityId: beatId,
        action,
        metadata: duration ? { duration } : undefined
      });

      // Invalidate user's recommendation cache
      const cachePattern = `recommendations:${userId}:*`;
      await redisService.deletePattern(cachePattern);

      // Update real-time user behavior
      await this.updateUserBehaviorProfile(userId, action, beatId);
    } catch (error) {
      console.error('Track user interaction failed:', error);
    }
  }

  /**
   * Private helper methods
   */
  private async getUserBehaviorProfile(userId: string): Promise<UserBehavior> {
    try {
      const cacheKey = `user_behavior:${userId}`;
      
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user statistics
      const [userStats] = await db
        .select({
          totalLikes: count(likes.id),
          totalListens: sql<number>`COUNT(DISTINCT ${listeningHistory.id})`,
          totalPurchases: sql<number>`COUNT(DISTINCT ${purchases.id})`
        })
        .from(likes)
        .leftJoin(listeningHistory, eq(listeningHistory.userId, userId))
        .leftJoin(purchases, eq(purchases.userId, userId))
        .where(eq(likes.userId, userId));

      // Get favorite genres
      const favoriteGenres = await db
        .select({
          genre: beats.genre,
          score: count(likes.id)
        })
        .from(likes)
        .innerJoin(beats, eq(beats.id, likes.beatId))
        .where(eq(likes.userId, userId))
        .groupBy(beats.genre)
        .orderBy(desc(count(likes.id)))
        .limit(5);

      // Get favorite moods
      const favoriteMoods = await db
        .select({
          mood: beats.mood,
          score: count(likes.id)
        })
        .from(likes)
        .innerJoin(beats, eq(beats.id, likes.beatId))
        .where(eq(likes.userId, userId))
        .groupBy(beats.mood)
        .orderBy(desc(count(likes.id)))
        .limit(5);

      // Calculate preferred BPM range
      const bpmStats = await db
        .select({
          avgBpm: avg(beats.bpm),
          minBpm: sql<number>`MIN(${beats.bpm})`,
          maxBpm: sql<number>`MAX(${beats.bpm})`
        })
        .from(likes)
        .innerJoin(beats, eq(beats.id, likes.beatId))
        .where(eq(likes.userId, userId));

      const behavior: UserBehavior = {
        userId,
        totalListens: userStats?.totalListens || 0,
        totalLikes: userStats?.totalLikes || 0,
        totalPurchases: userStats?.totalPurchases || 0,
        favoriteGenres: favoriteGenres.map(g => ({ genre: g.genre, score: g.score })),
        favoriteMoods: favoriteMoods.map(m => ({ mood: m.mood, score: m.score })),
        preferredBPMRange: {
          min: bpmStats?.[0]?.minBpm || 80,
          max: bpmStats?.[0]?.maxBpm || 140
        },
        averageSessionLength: 180, // Default 3 minutes
        lastActive: new Date()
      };

      // Cache for 2 hours
      await redisService.setex(cacheKey, 7200, JSON.stringify(behavior));

      return behavior;
    } catch (error) {
      console.error('Get user behavior failed:', error);
      return {
        userId,
        totalListens: 0,
        totalLikes: 0,
        totalPurchases: 0,
        favoriteGenres: [],
        favoriteMoods: [],
        preferredBPMRange: { min: 80, max: 140 },
        averageSessionLength: 180,
        lastActive: new Date()
      };
    }
  }

  private async getCandidateBeats(userId: string, excludeBeatIds: string[]): Promise<Beat[]> {
    // Get beats user hasn't interacted with
    const userInteractions = await db
      .select({ beatId: likes.beatId })
      .from(likes)
      .where(eq(likes.userId, userId));

    const interactedBeatIds = [
      ...userInteractions.map(i => i.beatId),
      ...excludeBeatIds
    ];

    let query = db
      .select()
      .from(beats)
      .where(eq(beats.isActive, true));

    if (interactedBeatIds.length > 0) {
      query = query.where(sql`${beats.id} NOT IN (${interactedBeatIds.join(',')})`);
    }

    return await query.limit(200); // Get larger candidate pool
  }

  private async scoreBeatForUser(
    beat: Beat,
    userBehavior: UserBehavior,
    userId: string
  ): Promise<RecommendationScore> {
    const factors = {
      genreMatch: this.calculateGenreMatch(beat, userBehavior),
      moodMatch: this.calculateMoodMatch(beat, userBehavior),
      bpmMatch: this.calculateBPMMatch(beat, userBehavior),
      popularityBoost: this.calculatePopularityBoost(beat),
      recencyBoost: this.calculateRecencyBoost(beat),
      collaborativeFiltering: await this.calculateCollaborativeScore(beat, userId),
      noveltyScore: this.calculateNoveltyScore(beat, userBehavior)
    };

    const score = Object.entries(factors).reduce((total, [key, value]) => {
      const weight = this.modelWeights[key as keyof typeof this.modelWeights] || 0;
      return total + (value * weight);
    }, 0);

    return {
      beatId: beat.id,
      score,
      factors
    };
  }

  private calculateGenreMatch(beat: Beat, userBehavior: UserBehavior): number {
    const genreScore = userBehavior.favoriteGenres.find(g => g.genre === beat.genre);
    return genreScore ? Math.min(genreScore.score / userBehavior.totalLikes, 1) * 100 : 10;
  }

  private calculateMoodMatch(beat: Beat, userBehavior: UserBehavior): number {
    const moodScore = userBehavior.favoriteMoods.find(m => m.mood === beat.mood);
    return moodScore ? Math.min(moodScore.score / userBehavior.totalLikes, 1) * 100 : 10;
  }

  private calculateBPMMatch(beat: Beat, userBehavior: UserBehavior): number {
    if (!beat.bpm) return 50;
    
    const { min, max } = userBehavior.preferredBPMRange;
    if (beat.bpm >= min && beat.bpm <= max) {
      return 100;
    }
    
    const distance = Math.min(Math.abs(beat.bpm - min), Math.abs(beat.bpm - max));
    return Math.max(0, 100 - distance);
  }

  private calculatePopularityBoost(beat: Beat): number {
    const playScore = Math.min(beat.playCount / 1000, 1) * 50; // Max 50 points for plays
    const likeScore = Math.min(beat.likeCount / 100, 1) * 50; // Max 50 points for likes
    return playScore + likeScore;
  }

  private calculateRecencyBoost(beat: Beat): number {
    const daysSinceCreated = (Date.now() - beat.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 100 - daysSinceCreated * 2); // Lose 2 points per day
  }

  private async calculateCollaborativeScore(beat: Beat, userId: string): Promise<number> {
    // Simple collaborative filtering based on similar users
    const similarUsers = await this.findSimilarUsers(userId, 10);
    
    if (similarUsers.length === 0) return 0;

    // Check if similar users liked this beat
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const likesFromSimilarUsers = await db
      .select({ count: count(likes.id) })
      .from(likes)
      .where(and(
        eq(likes.beatId, beat.id),
        inArray(likes.userId, similarUserIds)
      ));

    const likesCount = likesFromSimilarUsers[0]?.count || 0;
    return (likesCount / similarUsers.length) * 100;
  }

  private calculateNoveltyScore(beat: Beat, userBehavior: UserBehavior): number {
    // Encourage exploration of new genres/moods
    const isNewGenre = !userBehavior.favoriteGenres.some(g => g.genre === beat.genre);
    const isNewMood = !userBehavior.favoriteMoods.some(m => m.mood === beat.mood);
    
    return (isNewGenre ? 50 : 0) + (isNewMood ? 50 : 0);
  }

  private async updateUserBehaviorProfile(
    userId: string,
    action: string,
    beatId: string
  ): Promise<void> {
    // Invalidate cached behavior profile
    const cacheKey = `user_behavior:${userId}`;
    await redisService.del(cacheKey);
  }

  private async getBeatsByIds(beatIds: string[]): Promise<Beat[]> {
    if (beatIds.length === 0) return [];
    
    return await db
      .select()
      .from(beats)
      .where(and(
        inArray(beats.id, beatIds),
        eq(beats.isActive, true)
      ));
  }

  private async getFallbackRecommendations(limit: number): Promise<Beat[]> {
    // Fallback to popular beats
    return await db
      .select()
      .from(beats)
      .where(eq(beats.isActive, true))
      .orderBy(desc(beats.playCount), desc(beats.likeCount))
      .limit(limit);
  }
}

export const recommendationService = new RecommendationService();