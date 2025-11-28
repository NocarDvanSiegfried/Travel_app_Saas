/**
 * Test Configuration
 * 
 * Централизованная конфигурация для всех типов тестов.
 * Изолированное окружение, не влияющее на продакшен.
 */

/**
 * Тип тестового окружения
 */
export type TestEnvironment = 'unit' | 'integration' | 'e2e';

/**
 * Конфигурация тестового окружения
 */
export interface TestConfig {
  /**
   * Тип окружения
   */
  environment: TestEnvironment;
  
  /**
   * Базовый URL API
   */
  apiBaseUrl: string;
  
  /**
   * URL OSRM сервера
   */
  osrmUrl: string;
  
  /**
   * Использовать реальный OSRM
   */
  useRealOsrm: boolean;
  
  /**
   * Использовать реальный Redis
   */
  useRealRedis: boolean;
  
  /**
   * Использовать реальную базу данных
   */
  useRealDatabase: boolean;
  
  /**
   * Таймаут тестов (мс)
   */
  testTimeout: number;
  
  /**
   * Детальное логирование
   */
  verbose: boolean;
}

/**
 * Конфигурация для Unit тестов
 * Полностью изолированное окружение с моками
 */
export const UNIT_TEST_CONFIG: TestConfig = {
  environment: 'unit',
  apiBaseUrl: 'http://localhost:3000',
  osrmUrl: 'https://router.project-osrm.org',
  useRealOsrm: false, // Всегда используем моки
  useRealRedis: false, // Всегда используем моки
  useRealDatabase: false, // Всегда используем моки
  testTimeout: 10000,
  verbose: false,
};

/**
 * Конфигурация для Integration тестов
 * Использует тестовую БД и Redis, но мокирует OSRM по умолчанию
 */
export const INTEGRATION_TEST_CONFIG: TestConfig = {
  environment: 'integration',
  apiBaseUrl: 'http://localhost:3000',
  osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
  useRealOsrm: process.env.USE_REAL_OSRM === 'true',
  useRealRedis: process.env.USE_REAL_REDIS === 'true',
  useRealDatabase: process.env.USE_REAL_DB === 'true',
  testTimeout: 30000,
  verbose: true,
};

/**
 * Конфигурация для E2E тестов
 * Использует реальное окружение
 */
export const E2E_TEST_CONFIG: TestConfig = {
  environment: 'e2e',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
  useRealOsrm: true,
  useRealRedis: true,
  useRealDatabase: true,
  testTimeout: 60000,
  verbose: true,
};

/**
 * Получить конфигурацию для типа тестов
 */
export function getTestConfig(type: TestEnvironment = 'unit'): TestConfig {
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
 * Изолированы от продакшена
 */
export const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  REDIS_HOST: process.env.TEST_REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.TEST_REDIS_PORT || '6379',
  REDIS_DB: process.env.TEST_REDIS_DB || '1', // DB 1 для тестов
  REDIS_TTL_DEFAULT: '3600',
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/travel_app_test',
  OSRM_URL: process.env.OSRM_URL || 'https://router.project-osrm.org',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
} as const;






