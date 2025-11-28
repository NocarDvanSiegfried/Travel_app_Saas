/**
 * Cache Service Mock
 * 
 * Mock для ICacheService для использования в тестах.
 * Предоставляет in-memory реализацию кэша без реального Redis.
 */

import type { ICacheService } from '../../../infrastructure/cache/ICacheService';

/**
 * In-memory реализация ICacheService для тестов
 */
export class MockCacheService implements ICacheService {
  private storage: Map<string, { value: string; expiresAt?: number }> = new Map();

  /**
   * Получить значение из кеша
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.storage.get(key);

    if (!item) {
      return null;
    }

    // Проверяем срок действия
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    try {
      return JSON.parse(item.value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Сохранить значение в кеш
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;

    this.storage.set(key, {
      value: serialized,
      expiresAt,
    });
  }

  /**
   * Удалить значение из кеша
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Удалить все ключи по паттерну
   */
  async deleteByPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete: string[] = [];

    for (const key of this.storage.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
  }

  /**
   * Проверить существование ключа
   */
  async exists(key: string): Promise<boolean> {
    const item = this.storage.get(key);

    if (!item) {
      return false;
    }

    // Проверяем срок действия
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Установить время жизни для ключа
   */
  async expire(key: string, ttl: number): Promise<void> {
    const item = this.storage.get(key);

    if (item) {
      item.expiresAt = Date.now() + ttl * 1000;
      this.storage.set(key, item);
    }
  }

  /**
   * Получить несколько значений по ключам
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      const value = await this.get<T>(key);
      results.push(value);
    }

    return results;
  }

  /**
   * Сохранить несколько значений
   */
  async mset<T>(data: Record<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Очистить весь кеш
   */
  async flushAll(): Promise<void> {
    this.storage.clear();
  }

  /**
   * Очистить кеш (helper для тестов)
   */
  public clear(): void {
    this.storage.clear();
  }

  /**
   * Получить количество элементов в кеше (helper для тестов)
   */
  public size(): number {
    return this.storage.size;
  }

  /**
   * Получить все ключи (helper для тестов)
   */
  public keys(): string[] {
    return Array.from(this.storage.keys());
  }
}

/**
 * Создаёт новый экземпляр MockCacheService
 */
export function createMockCacheService(): MockCacheService {
  return new MockCacheService();
}





