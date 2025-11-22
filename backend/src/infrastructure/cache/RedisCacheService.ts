import { RedisConnection } from './RedisConnection';
import { ICacheService } from './ICacheService';

/**
 * Реализация сервиса кеширования на основе Redis
 */
export class RedisCacheService implements ICacheService {
  private redis: RedisConnection;
  private defaultTTL: number;

  constructor() {
    this.redis = RedisConnection.getInstance();
    this.defaultTTL = parseInt(process.env.REDIS_TTL_DEFAULT || '3600', 10);
  }

  /**
   * Получить значение из кеша
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache get');
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`❌ Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Сохранить значение в кеш
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache set');
        return;
      }

      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl || this.defaultTTL;

      await client.setex(key, cacheTTL, serializedValue);
    } catch (error) {
      console.error(`❌ Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Удалить значение из кеша
   */
  async delete(key: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache delete');
        return;
      }

      await client.del(key);
    } catch (error) {
      console.error(`❌ Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Удалить все ключи по паттерну
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache delete by pattern');
        return;
      }

      // Use SCAN instead of KEYS to avoid blocking Redis
      const { scanKeysIoredis } = await import('./redis-scan');
      const keys = await scanKeysIoredis(client, pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error(`❌ Error deleting cache by pattern ${pattern}:`, error);
    }
  }

  /**
   * Проверить существование ключа
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        return false;
      }

      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Error checking cache key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Установить время жизни для ключа
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache expire');
        return;
      }

      await client.expire(key, ttl);
    } catch (error) {
      console.error(`❌ Error setting cache expire for key ${key}:`, error);
    }
  }

  /**
   * Получить несколько значений по ключам
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache mget');
        return keys.map(() => null);
      }

      const values = await client.mget(...keys);
      return values.map((value) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('❌ Error getting multiple cache keys:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Сохранить несколько значений
   */
  async mset<T>(data: Record<string, T>, ttl?: number): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache mset');
        return;
      }

      const pipeline = client.pipeline();
      const cacheTTL = ttl || this.defaultTTL;

      for (const [key, value] of Object.entries(data)) {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, cacheTTL, serializedValue);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('❌ Error setting multiple cache keys:', error);
    }
  }

  /**
   * Очистить весь кеш
   */
  async flushAll(): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client || !this.redis.isReady()) {
        console.warn('⚠️ Redis not available, skipping cache flush');
        return;
      }

      await client.flushdb();
      console.log('🗑️ Redis cache flushed');
    } catch (error) {
      console.error('❌ Error flushing cache:', error);
    }
  }
}

