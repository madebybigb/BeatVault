import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ioredis
const mockRedis = {
  connect: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  keys: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => mockRedis),
  };
});

import { redisService } from '../../server/redis';

describe('RedisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      mockRedis.get.mockResolvedValue('test-value');
      
      const result = await redisService.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await redisService.get('non-existent-key');
      
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      
      const result = await redisService.set('test-key', 'test-value');
      
      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set value with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      
      const result = await redisService.set('test-key', 'test-value', 300);
      
      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, 'test-value');
    });
  });

  describe('getJson', () => {
    it('should parse JSON value', async () => {
      const testData = { id: 1, name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));
      
      const result = await redisService.getJson('test-key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for invalid JSON', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      
      const result = await redisService.getJson('test-key');
      
      expect(result).toBeNull();
    });
  });

  describe('setJson', () => {
    it('should stringify and set JSON value', async () => {
      const testData = { id: 1, name: 'test' };
      mockRedis.set.mockResolvedValue('OK');
      
      const result = await redisService.setJson('test-key', testData);
      
      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });
  });

  describe('cacheUser', () => {
    it('should cache user data with default TTL', async () => {
      const userData = { id: '123', name: 'Test User' };
      mockRedis.setex.mockResolvedValue('OK');
      
      await redisService.cacheUser('123', userData);
      
      expect(mockRedis.setex).toHaveBeenCalledWith('user:123', 300, JSON.stringify(userData));
    });

    it('should cache user data with custom TTL', async () => {
      const userData = { id: '123', name: 'Test User' };
      mockRedis.setex.mockResolvedValue('OK');
      
      await redisService.cacheUser('123', userData, 600);
      
      expect(mockRedis.setex).toHaveBeenCalledWith('user:123', 600, JSON.stringify(userData));
    });
  });
});