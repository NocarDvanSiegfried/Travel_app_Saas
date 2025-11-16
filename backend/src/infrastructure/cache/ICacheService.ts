/**
 * Интерфейс для сервиса кеширования
 * Определяет контракт для работы с кешем
 */
export interface ICacheService {
  /**
   * Получить значение из кеша
   * @param key - Ключ кеша
   * @returns Значение или null, если не найдено
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Сохранить значение в кеш
   * @param key - Ключ кеша
   * @param value - Значение для сохранения
   * @param ttl - Время жизни в секундах (опционально)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Удалить значение из кеша
   * @param key - Ключ кеша
   */
  delete(key: string): Promise<void>;

  /**
   * Удалить все ключи по паттерну
   * @param pattern - Паттерн для поиска ключей (например, "routes:*")
   */
  deleteByPattern(pattern: string): Promise<void>;

  /**
   * Проверить существование ключа
   * @param key - Ключ кеша
   */
  exists(key: string): Promise<boolean>;

  /**
   * Установить время жизни для ключа
   * @param key - Ключ кеша
   * @param ttl - Время жизни в секундах
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * Получить несколько значений по ключам
   * @param keys - Массив ключей
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Сохранить несколько значений
   * @param data - Объект с ключами и значениями
   * @param ttl - Время жизни в секундах (опционально)
   */
  mset<T>(data: Record<string, T>, ttl?: number): Promise<void>;

  /**
   * Очистить весь кеш
   */
  flushAll(): Promise<void>;
}

