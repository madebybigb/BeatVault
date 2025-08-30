import {
  beats,
  users,
  searchSuggestions,
  searchAnalytics,
  type Beat,
  type SearchFilters,
  type SearchResult,
  type InsertSearchSuggestion,
  type InsertSearchAnalytics,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, inArray, gte, lte, count } from "drizzle-orm";
import { redisService } from "./redis";

export class SearchService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Advanced search with full-text search, filtering, and faceting
   */
  async search(filters: SearchFilters, userId?: string): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = `search:${JSON.stringify(filters)}`;
    
    // Try to get from cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached) as SearchResult;
      result.searchTime = Date.now() - startTime;
      
      // Track search analytics (no await to not block response)
      this.trackSearchAnalytics(filters, result.totalCount, userId, result.searchTime);
      
      return result;
    }

    // Build query conditions
    const conditions = [eq(beats.isActive, true)];
    
    // Text search using PostgreSQL full-text search
    if (filters.query) {
      const searchQuery = filters.query.trim();
      conditions.push(
        or(
          // Title and description search
          ilike(beats.title, `%${searchQuery}%`),
          ilike(beats.description, `%${searchQuery}%`),
          // Tags search
          sql`EXISTS(SELECT 1 FROM unnest(${beats.tags}) AS tag WHERE LOWER(tag) LIKE LOWER('%${searchQuery}%'))`,
          // Producer search by joining users table
          sql`EXISTS(SELECT 1 FROM ${users} WHERE ${users.id} = ${beats.producerId} AND (LOWER(${users.username}) LIKE LOWER('%${searchQuery}%') OR LOWER(${users.firstName} || ' ' || ${users.lastName}) LIKE LOWER('%${searchQuery}%')))`
        )!
      );
    }

    // Genre filter
    if (filters.genre) {
      conditions.push(eq(beats.genre, filters.genre));
    }

    // Mood filter
    if (filters.mood) {
      conditions.push(eq(beats.mood, filters.mood));
    }

    // BPM range filter
    if (filters.bpmMin !== undefined) {
      conditions.push(gte(beats.bpm, filters.bpmMin));
    }
    if (filters.bpmMax !== undefined) {
      conditions.push(lte(beats.bpm, filters.bpmMax));
    }

    // Key filter
    if (filters.key) {
      conditions.push(eq(beats.key, filters.key));
    }

    // Price range filter
    if (filters.priceMin !== undefined) {
      conditions.push(gte(beats.price, filters.priceMin.toString()));
    }
    if (filters.priceMax !== undefined) {
      conditions.push(lte(beats.price, filters.priceMax.toString()));
    }

    // Duration filter
    if (filters.duration?.min !== undefined) {
      conditions.push(gte(beats.duration, filters.duration.min));
    }
    if (filters.duration?.max !== undefined) {
      conditions.push(lte(beats.duration, filters.duration.max));
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag => 
        sql`EXISTS(SELECT 1 FROM unnest(${beats.tags}) AS beat_tag WHERE LOWER(beat_tag) = LOWER(${tag}))`
      );
      conditions.push(or(...tagConditions)!);
    }

    // Free/paid filter
    if (filters.isFree !== undefined) {
      conditions.push(eq(beats.isFree, filters.isFree));
    }

    // Exclusive filter
    if (filters.isExclusive !== undefined) {
      conditions.push(eq(beats.isExclusive, filters.isExclusive));
    }

    // Producer filter
    if (filters.producerId) {
      conditions.push(eq(beats.producerId, filters.producerId));
    }

    // Build sorting
    let orderBy;
    switch (filters.sortBy) {
      case 'newest':
        orderBy = [desc(beats.createdAt)];
        break;
      case 'popular':
        orderBy = [desc(beats.playCount), desc(beats.likeCount)];
        break;
      case 'price_low':
        orderBy = [beats.price];
        break;
      case 'price_high':
        orderBy = [desc(beats.price)];
        break;
      case 'bpm':
        orderBy = [beats.bpm];
        break;
      case 'duration':
        orderBy = [beats.duration];
        break;
      default: // relevance
        if (filters.query) {
          // For text searches, prioritize title matches, then play count
          orderBy = [
            sql`CASE WHEN LOWER(${beats.title}) LIKE LOWER('%${filters.query}%') THEN 1 ELSE 2 END`,
            desc(beats.playCount),
            desc(beats.likeCount)
          ];
        } else {
          orderBy = [desc(beats.playCount), desc(beats.likeCount)];
        }
    }

    // Execute search query with pagination
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const [beatsResult, totalCountResult, facetsResult] = await Promise.all([
      // Main search results
      db
        .select()
        .from(beats)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),

      // Total count
      db
        .select({ count: count() })
        .from(beats)
        .where(and(...conditions)),

      // Facets for filtering
      this.getFacets(and(...conditions))
    ]);

    const totalCount = totalCountResult[0]?.count || 0;
    
    // Get search suggestions
    const suggestions = await this.getSearchSuggestions(filters.query);

    const result: SearchResult = {
      beats: beatsResult,
      totalCount,
      facets: facetsResult,
      suggestions,
      searchTime: Date.now() - startTime
    };

    // Cache the result
    await redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    // Track search analytics (no await to not block response)
    this.trackSearchAnalytics(filters, totalCount, userId, result.searchTime);

    // Update search suggestions (no await to not block response)
    if (filters.query) {
      this.updateSearchSuggestions(filters.query, totalCount);
    }

    return result;
  }

  /**
   * Get search suggestions based on popular queries
   */
  async getSearchSuggestions(query?: string, limit = 10): Promise<string[]> {
    if (!query || query.length < 2) {
      // Return popular searches
      const suggestions = await db
        .select({ query: searchSuggestions.query })
        .from(searchSuggestions)
        .where(eq(searchSuggestions.category, 'beat'))
        .orderBy(desc(searchSuggestions.popularity))
        .limit(limit);
      
      return suggestions.map(s => s.query);
    }

    // Return matching suggestions
    const suggestions = await db
      .select({ query: searchSuggestions.query })
      .from(searchSuggestions)
      .where(
        and(
          ilike(searchSuggestions.query, `${query}%`),
          eq(searchSuggestions.category, 'beat')
        )
      )
      .orderBy(desc(searchSuggestions.popularity), desc(searchSuggestions.resultCount))
      .limit(limit);

    return suggestions.map(s => s.query);
  }

  /**
   * Get autocomplete suggestions for real-time search
   */
  async getAutocomplete(query: string, categories: string[] = ['beat', 'producer', 'genre']): Promise<{
    beats: string[];
    producers: string[];
    genres: string[];
    tags: string[];
  }> {
    if (query.length < 2) {
      return { beats: [], producers: [], genres: [], tags: [] };
    }

    const cacheKey = `autocomplete:${query}:${categories.join(',')}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const results = await Promise.all([
      // Beat titles
      categories.includes('beat') ? db
        .select({ title: beats.title })
        .from(beats)
        .where(
          and(
            eq(beats.isActive, true),
            ilike(beats.title, `${query}%`)
          )
        )
        .orderBy(desc(beats.playCount))
        .limit(5) : Promise.resolve([]),

      // Producer names
      categories.includes('producer') ? db
        .select({ 
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName 
        })
        .from(users)
        .where(
          or(
            ilike(users.username, `${query}%`),
            ilike(users.firstName, `${query}%`),
            ilike(users.lastName, `${query}%`)
          )!
        )
        .limit(5) : Promise.resolve([]),

      // Genres
      categories.includes('genre') ? db
        .selectDistinct({ genre: beats.genre })
        .from(beats)
        .where(
          and(
            eq(beats.isActive, true),
            ilike(beats.genre, `${query}%`)
          )
        )
        .limit(5) : Promise.resolve([]),

      // Tags
      categories.includes('tag') ? db
        .select({ tags: beats.tags })
        .from(beats)
        .where(
          and(
            eq(beats.isActive, true),
            sql`EXISTS(SELECT 1 FROM unnest(${beats.tags}) AS tag WHERE LOWER(tag) LIKE LOWER('${query}%'))`
          )
        )
        .limit(10) : Promise.resolve([])
    ]);

    const [beatTitles, producers, genres, tagResults] = results;

    // Extract unique tags that match the query
    const allTags = tagResults.flatMap(r => r.tags || []);
    const uniqueTags = new Set(
      allTags.filter(tag => 
        tag.toLowerCase().startsWith(query.toLowerCase())
      )
    );
    const matchingTags = Array.from(uniqueTags).slice(0, 5);

    const autocompleteResult = {
      beats: beatTitles.map(b => b.title),
      producers: producers.map(p => 
        p.username || `${p.firstName} ${p.lastName}`.trim()
      ).filter(Boolean),
      genres: genres.map(g => g.genre),
      tags: matchingTags
    };

    // Cache for 1 minute
    await redisService.set(cacheKey, JSON.stringify(autocompleteResult), 60);

    return autocompleteResult;
  }

  /**
   * Get facets for advanced filtering
   */
  private async getFacets(baseCondition: any) {
    const [genreFacets, moodFacets, keyFacets] = await Promise.all([
      // Genre facets
      db
        .select({
          value: beats.genre,
          count: count()
        })
        .from(beats)
        .where(baseCondition)
        .groupBy(beats.genre)
        .orderBy(desc(count()))
        .limit(20),

      // Mood facets
      db
        .select({
          value: beats.mood,
          count: count()
        })
        .from(beats)
        .where(baseCondition)
        .groupBy(beats.mood)
        .orderBy(desc(count()))
        .limit(20),

      // Key facets
      db
        .select({
          value: beats.key,
          count: count()
        })
        .from(beats)
        .where(baseCondition)
        .groupBy(beats.key)
        .orderBy(desc(count()))
        .limit(24) // All 12 major + 12 minor keys
    ]);

    // BPM ranges
    const bpmRanges = [
      { range: '60-90', count: 0 },
      { range: '90-120', count: 0 },
      { range: '120-140', count: 0 },
      { range: '140-180', count: 0 },
      { range: '180+', count: 0 }
    ];

    // Price ranges
    const priceRanges = [
      { range: 'Free', count: 0 },
      { range: '$1-$25', count: 0 },
      { range: '$25-$50', count: 0 },
      { range: '$50-$100', count: 0 },
      { range: '$100+', count: 0 }
    ];

    return {
      genres: genreFacets,
      moods: moodFacets,
      keys: keyFacets,
      bpmRanges,
      priceRanges
    };
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(
    filters: SearchFilters, 
    resultCount: number, 
    userId?: string, 
    responseTime?: number
  ) {
    try {
      const analytics: InsertSearchAnalytics = {
        query: filters.query || '',
        userId,
        resultCount,
        searchType: filters.query ? 'text' : 'filter',
        filters: filters,
        responseTime
      };

      await db.insert(searchAnalytics).values(analytics);
    } catch (error) {
      console.error('Failed to track search analytics:', error);
    }
  }

  /**
   * Update search suggestions based on usage
   */
  private async updateSearchSuggestions(query: string, resultCount: number) {
    try {
      const suggestion: InsertSearchSuggestion = {
        query: query.toLowerCase().trim(),
        category: 'beat',
        popularity: 1,
        resultCount
      };

      await db
        .insert(searchSuggestions)
        .values(suggestion)
        .onConflictDoUpdate({
          target: [searchSuggestions.query, searchSuggestions.category],
          set: {
            popularity: sql`${searchSuggestions.popularity} + 1`,
            resultCount: suggestion.resultCount,
            lastUsed: new Date()
          }
        });
    } catch (error) {
      console.error('Failed to update search suggestions:', error);
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit = 10): Promise<string[]> {
    const cacheKey = 'trending_searches';
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const trending = await db
      .select({ query: searchSuggestions.query })
      .from(searchSuggestions)
      .where(eq(searchSuggestions.category, 'beat'))
      .orderBy(desc(searchSuggestions.popularity))
      .limit(limit);

    const trendingQueries = trending.map(t => t.query);
    
    // Cache for 30 minutes
    await redisService.set(cacheKey, JSON.stringify(trendingQueries), 1800);

    return trendingQueries;
  }

  /**
   * Search beats by similarity (for "more like this" feature)
   */
  async findSimilarBeats(beatId: string, limit = 10): Promise<Beat[]> {
    try {
      // Get the reference beat
      const [referenceBeat] = await db
        .select()
        .from(beats)
        .where(eq(beats.id, beatId));

      if (!referenceBeat) {
        return [];
      }

      // Find similar beats based on genre, mood, BPM range, and tags
      const bpmRange = 10; // ±10 BPM
      const similarBeats = await db
        .select()
        .from(beats)
        .where(
          and(
            eq(beats.isActive, true),
            sql`${beats.id} != ${beatId}`, // Exclude the reference beat
            or(
              // Same genre
              eq(beats.genre, referenceBeat.genre),
              // Same mood
              eq(beats.mood, referenceBeat.mood),
              // Similar BPM
              and(
                gte(beats.bpm, referenceBeat.bpm - bpmRange),
                lte(beats.bpm, referenceBeat.bpm + bpmRange)
              ),
              // Shared tags
              sql`EXISTS(SELECT 1 FROM unnest(${beats.tags}) AS beat_tag WHERE beat_tag = ANY(${referenceBeat.tags}))`
            )!
          )
        )
        .orderBy(
          // Prioritize exact genre match, then mood, then BPM similarity
          sql`CASE 
            WHEN ${beats.genre} = ${referenceBeat.genre} THEN 1 
            WHEN ${beats.mood} = ${referenceBeat.mood} THEN 2
            ELSE 3 
          END`,
          desc(beats.playCount)
        )
        .limit(limit);

      return similarBeats;
    } catch (error) {
      console.error('Failed to find similar beats:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();