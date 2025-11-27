/**
 * E2E Test Setup
 * 
 * Настройка для end-to-end тестов с реальным окружением.
 */

import { TEST_ENV, E2E_TEST_CONFIG } from '../config/test-config';

// Устанавливаем переменные окружения
process.env.NODE_ENV = TEST_ENV.NODE_ENV;
process.env.LOG_LEVEL = TEST_ENV.LOG_LEVEL;
process.env.REDIS_HOST = TEST_ENV.REDIS_HOST;
process.env.REDIS_PORT = TEST_ENV.REDIS_PORT;
process.env.REDIS_DB = TEST_ENV.REDIS_DB;
process.env.REDIS_TTL_DEFAULT = TEST_ENV.REDIS_TTL_DEFAULT;
process.env.DATABASE_URL = TEST_ENV.DATABASE_URL;
process.env.OSRM_URL = TEST_ENV.OSRM_URL;
process.env.API_BASE_URL = TEST_ENV.API_BASE_URL;

process.env.JEST_TEST_TYPE = 'e2e';

jest.setTimeout(E2E_TEST_CONFIG.testTimeout);

// Global setup для E2E тестов
beforeAll(async () => {
  // Проверяем доступность сервисов
  // Можно добавить проверку доступности API, БД, Redis
});

// Global teardown для E2E тестов
afterAll(async () => {
  // Очистка ресурсов при необходимости
});

// Очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});




