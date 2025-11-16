import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { RedisCacheService } from '../../infrastructure/cache/RedisCacheService';

/**
 * Декоратор для кеширования результатов use cases
 * Автоматически кеширует результаты выполнения функций
 */
export class CacheDecorator {
  private cacheService: ICacheService;

  constructor() {
    this.cacheService = new RedisCacheService();
  }

  /**
   * Обернуть функцию кешированием
   * @param key - Ключ кеша
   * @param fn - Функция для выполнения
   * @param ttl - Время жизни кеша в секундах
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Пытаемся получить из кеша
    const cached = await this.cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Выполняем функцию
    const result = await fn();

    // Сохраняем в кеш
    await this.cacheService.set(key, result, ttl);

    return result;
  }

  /**
   * Инвалидировать кеш по ключу
   */
  async invalidate(key: string): Promise<void> {
    await this.cacheService.delete(key);
  }

  /**
   * Инвалидировать кеш по паттерну
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.cacheService.deleteByPattern(pattern);
  }
}

