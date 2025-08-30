import Redis from 'ioredis';

class RedisService {
  private redis: Redis;
  private connected = false;

  constructor() {
    // Use Redis Cloud or local Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
      this.connected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.connected = false;
    });

    this.redis.on('ready', () => {
      console.log('Redis ready for commands');
    });
  }

  async connect() {
    if (!this.connected) {
      try {
        await this.redis.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Fall back to memory storage if Redis is not available
      }
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.connected) return null;
      return await this.redis.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.connected) return false;
      
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
      if (!this.connected) return false;
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) return false;
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.connected) return 0;
      
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
      if (!this.connected) return;
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
      await this.redis.disconnect();
    }
  }
}

export const redisService = new RedisService();