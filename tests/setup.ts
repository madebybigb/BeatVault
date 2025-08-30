import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    SESSION_SECRET: 'test-secret',
    B2_APPLICATION_KEY_ID: 'test-key-id',
    B2_APPLICATION_KEY: 'test-key',
    B2_BUCKET_ID: 'test-bucket',
  },
}));

// Mock Redis
vi.mock('../server/redis', () => ({
  redisService: {
    connect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    getJson: vi.fn(),
    setJson: vi.fn(),
    isConnected: vi.fn(() => true),
  },
}));

// Mock WebSocket
vi.mock('../server/websocket', () => ({
  initializeWebSocket: vi.fn(),
  getWebSocketService: vi.fn(() => ({
    sendNotificationToUser: vi.fn(),
    broadcastBeatUpdate: vi.fn(),
  })),
}));

// Mock BackBlaze B2
vi.mock('../server/b2Service', () => ({
  b2Service: {
    uploadFile: vi.fn(() => Promise.resolve('https://test-url.com/file.mp3')),
    deleteFile: vi.fn(() => Promise.resolve()),
    getFileUrl: vi.fn(() => 'https://test-url.com/file.mp3'),
  },
}));