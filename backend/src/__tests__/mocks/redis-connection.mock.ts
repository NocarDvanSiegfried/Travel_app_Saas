/**
 * Redis Connection Mock
 * 
 * Mock для RedisConnection (ioredis).
 * Стабильный, повторяемый, изолированный от продакшена.
 */

import type Redis from 'ioredis';

/**
 * Создаёт mock Redis клиента (ioredis)
 */
export function createMockRedisConnection(): Partial<Redis> {
  const storage = new Map<string, string>();
  const ttlStorage = new Map<string, number>();
  
  // Очистка истёкших ключей
  const cleanupExpired = () => {
    const now = Date.now();
    for (const [key, expiresAt] of ttlStorage.entries()) {
      if (expiresAt < now) {
        storage.delete(key);
        ttlStorage.delete(key);
      }
    }
  };
  
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      cleanupExpired();
      return storage.get(key) || null;
    }),
    
    set: jest.fn().mockImplementation(async (key: string, value: string) => {
      storage.set(key, value);
      return 'OK';
    }),
    
    setex: jest.fn().mockImplementation(async (key: string, seconds: number, value: string) => {
      storage.set(key, value);
      ttlStorage.set(key, Date.now() + seconds * 1000);
      return 'OK';
    }),
    
    del: jest.fn().mockImplementation(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      let deleted = 0;
      for (const k of keys) {
        if (storage.delete(k)) {
          ttlStorage.delete(k);
          deleted++;
        }
      }
      return deleted;
    }),
    
    exists: jest.fn().mockImplementation(async (key: string) => {
      cleanupExpired();
      return storage.has(key) ? 1 : 0;
    }),
    
    keys: jest.fn().mockImplementation(async (pattern: string) => {
      cleanupExpired();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Array.from(storage.keys()).filter(key => regex.test(key));
    }),
    
    flushdb: jest.fn().mockImplementation(async () => {
      storage.clear();
      ttlStorage.clear();
      return 'OK';
    }),
    
    // Helper методы для тестов
    clearStorage: () => {
      storage.clear();
      ttlStorage.clear();
    },
    
    setValue: (key: string, value: string) => {
      storage.set(key, value);
    },
    
    getValue: (key: string) => {
      cleanupExpired();
      return storage.get(key) || null;
    },
    
    // Статус подключения
    status: 'ready',
    connected: true,
  } as any;
}




