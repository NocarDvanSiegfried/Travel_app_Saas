/**
 * Integration Test Setup for SMART ROUTING
 * 
 * Настройка окружения для integration тестов SMART ROUTING.
 */

import { INTEGRATION_TEST_CONFIG, TEST_ENV } from '../../helpers/test-config';

// Устанавливаем переменные окружения для integration тестов
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = TEST_ENV.LOG_LEVEL;
process.env.REDIS_HOST = TEST_ENV.REDIS_HOST;
process.env.REDIS_PORT = TEST_ENV.REDIS_PORT;
process.env.REDIS_TTL_DEFAULT = TEST_ENV.REDIS_TTL_DEFAULT;
process.env.DATABASE_URL = TEST_ENV.DATABASE_URL;
process.env.OSRM_URL = TEST_ENV.OSRM_URL;
process.env.JEST_TEST_TYPE = 'integration';

// Увеличиваем таймаут для integration тестов
jest.setTimeout(INTEGRATION_TEST_CONFIG.testTimeout);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global setup для integration тестов
beforeAll(async () => {
  // Здесь можно добавить инициализацию тестовой базы данных, Redis и т.д.
  console.log('Setting up integration test environment...');
});

// Global teardown для integration тестов
afterAll(async () => {
  // Здесь можно добавить очистку тестовой базы данных, Redis и т.д.
  console.log('Cleaning up integration test environment...');
});





