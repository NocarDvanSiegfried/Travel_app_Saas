/**
 * Integration Test Setup
 * 
 * Настройка для integration тестов с реальными зависимостями.
 */

import { TEST_ENV, INTEGRATION_TEST_CONFIG } from '../config/test-config';
import { setupIntegrationTests, teardownIntegrationTests } from './helpers/test-db';

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

process.env.JEST_TEST_TYPE = 'integration';

jest.setTimeout(INTEGRATION_TEST_CONFIG.testTimeout);

// Global setup для integration тестов
beforeAll(async () => {
  if (INTEGRATION_TEST_CONFIG.useRealDatabase || INTEGRATION_TEST_CONFIG.useRealRedis) {
    await setupIntegrationTests();
  }
});

// Global teardown для integration тестов
afterAll(async () => {
  if (INTEGRATION_TEST_CONFIG.useRealDatabase || INTEGRATION_TEST_CONFIG.useRealRedis) {
    await teardownIntegrationTests();
  }
});

// Очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
