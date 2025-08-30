import Redis from 'ioredis';

class RedisService {
  private redis?: Redis;
  private connected = false;

  constructor() {
    // Only initialize Redis if URL is provided
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('Redis connected successfully');
        this.connected = true;
      });

      this.redis.on('error', (error) => {
        console.warn('Redis connection error (falling back to memory):', error.message);
        this.connected = false;
      });

      this.redis.on('ready', () => {
        console.log('Redis ready for commands');
      });
    } else {
      console.log('Redis URL not provided, using memory-only mode');
    }
  }

  async connect() {
    if (this.redis && !this.connected) {
      try {
        await this.redis.connect();
      } catch (error) {
        console.warn('Failed to connect to Redis, continuing without cache:', error instanceof Error ? error.message : 'Unknown error');
        this.connected = false;
      }
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.connected || !this.redis) return null;
      return await this.redis.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.connected || !this.redis) return false;
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.connected || !this.redis) return false;
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected || !this.redis) return false;
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.connected || !this.redis) return 0;
      
      const result = await this.redis.incr(key);
      if (ttlSeconds && result === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const data = await this.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis JSON GET error:', error);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      return await this.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      console.error('Redis JSON SET error:', error);
      return false;
    }
  }

  // Cache patterns
  async cacheUser(userId: string, userData: any, ttl = 300): Promise<void> {
    await this.setJson(`user:${userId}`, userData, ttl);
  }

  async getCachedUser(userId: string): Promise<any | null> {
    return await this.getJson(`user:${userId}`);
  }

  async cacheBeats(key: string, beats: any[], ttl = 600): Promise<void> {
    await this.setJson(`beats:${key}`, beats, ttl);
  }

  async getCachedBeats(key: string): Promise<any[] | null> {
    return await this.getJson(`beats:${key}`);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
    await this.del(`cart:${userId}`);
    await this.del(`wishlist:${userId}`);
  }

  async invalidateBeatsCache(): Promise<void> {
    // Get all beat cache keys and delete them
    try {
      if (!this.connected || !this.redis) return;
      const keys = await this.redis.keys('beats:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis cache invalidation error:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.disconnect();
      } catch (error) {
        console.warn('Error disconnecting Redis:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
}

export const redisService = new RedisService();