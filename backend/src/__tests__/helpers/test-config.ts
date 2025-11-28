/**
 * Test Configuration
 * 
 * Централизованная конфигурация для тестового окружения.
 * Предоставляет настройки для всех типов тестов (Unit, Integration, E2E).
 */

/**
 * Конфигурация тестового окружения
 */
export interface TestConfig {
  /**
   * Базовый URL API для тестов
   */
  apiBaseUrl: string;

  /**
   * URL OSRM сервера для тестов
   */
  osrmUrl?: string;

  /**
   * Использовать ли реальный OSRM (false = использовать моки)
   */
  useRealOsrm: boolean;

  /**
   * Использовать ли реальный Redis (false = использовать моки)
   */
  useRealRedis: boolean;

  /**
   * Использовать ли реальную базу данных (false = использовать моки)
   */
  useRealDatabase: boolean;

  /**
   * Таймаут для тестов (в миллисекундах)
   */
  testTimeout: number;

  /**
   * Включить ли детальное логирование
   */
  verbose: boolean;
}

/**
 * Конфигурация для Unit тестов
 */
export const UNIT_TEST_CONFIG: TestConfig = {
  apiBaseUrl: 'http://localhost:3000',
  osrmUrl: undefined,
  useRealOsrm: false,
  useRealRedis: false,
  useRealDatabase: false,
  testTimeout: 10000, // 10 секунд
  verbose: false,
};

/**
 * Конфигурация для Integration тестов
 */
export const INTEGRATION_TEST_CONFIG: TestConfig = {
  apiBaseUrl: 'http://localhost:3000',
  osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
  useRealOsrm: process.env.USE_REAL_OSRM === 'true',
  useRealRedis: process.env.USE_REAL_REDIS === 'true',
  useRealDatabase: process.env.USE_REAL_DB === 'true',
  testTimeout: 30000, // 30 секунд
  verbose: true,
};

/**
 * Конфигурация для E2E тестов
 */
export const E2E_TEST_CONFIG: TestConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
  useRealOsrm: true,
  useRealRedis: true,
  useRealDatabase: true,
  testTimeout: 60000, // 60 секунд
  verbose: true,
};

/**
 * Получить конфигурацию для текущего типа тестов
 */
export function getTestConfig(type: 'unit' | 'integration' | 'e2e' = 'unit'): TestConfig {
  switch (type) {
    case 'unit':
      return UNIT_TEST_CONFIG;
    case 'integration':
      return INTEGRATION_TEST_CONFIG;
    case 'e2e':
      return E2E_TEST_CONFIG;
    default:
      return UNIT_TEST_CONFIG;
  }
}

/**
 * Переменные окружения для тестов
 */
export const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  REDIS_TTL_DEFAULT: '3600',
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test',
  OSRM_URL: process.env.OSRM_URL || 'https://router.project-osrm.org',
};






