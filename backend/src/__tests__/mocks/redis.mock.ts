/**
 * Redis Mock Utilities
 * 
 * Mocks for Redis client operations.
 */

import type { RedisClientType } from 'redis';

/**
 * Mock Redis Client
 */
export function createMockRedisClient(): Partial<RedisClientType> {
  const storage = new Map<string, string>();

  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      return storage.get(key) || null;
    }),
    set: jest.fn().mockImplementation(async (key: string, value: string) => {
      storage.set(key, value);
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      const deleted = storage.delete(key);
      return deleted ? 1 : 0;
    }),
    exists: jest.fn().mockImplementation(async (key: string) => {
      return storage.has(key) ? 1 : 0;
    }),
    keys: jest.fn().mockImplementation(async (pattern: string) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(storage.keys()).filter(key => regex.test(key));
    }),
    // Helper to clear storage
    clearStorage: () => {
      storage.clear();
    },
    // Helper to set value directly
    setValue: (key: string, value: string) => {
      storage.set(key, value);
    },
    // Helper to get value directly
    getValue: (key: string) => {
      return storage.get(key) || null;
    },
  } as any;
}

