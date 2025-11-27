/**
 * E2E Test Setup for SMART ROUTING
 * 
 * Настройка окружения для E2E тестов SMART ROUTING.
 */

import { E2E_TEST_CONFIG, TEST_ENV } from '../../helpers/test-config';

// Устанавливаем переменные окружения для E2E тестов
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = TEST_ENV.LOG_LEVEL;
process.env.REDIS_HOST = TEST_ENV.REDIS_HOST;
process.env.REDIS_PORT = TEST_ENV.REDIS_PORT;
process.env.REDIS_TTL_DEFAULT = TEST_ENV.REDIS_TTL_DEFAULT;
process.env.DATABASE_URL = TEST_ENV.DATABASE_URL;
process.env.OSRM_URL = TEST_ENV.OSRM_URL;
process.env.API_BASE_URL = E2E_TEST_CONFIG.apiBaseUrl;
process.env.JEST_TEST_TYPE = 'e2e';

// Увеличиваем таймаут для E2E тестов
jest.setTimeout(E2E_TEST_CONFIG.testTimeout);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global setup для E2E тестов
beforeAll(async () => {
  // Здесь можно добавить инициализацию тестового окружения
  console.log('Setting up E2E test environment...');
  
  // Проверяем, что backend и frontend запущены
  // Можно добавить проверку доступности API
});

// Global teardown для E2E тестов
afterAll(async () => {
  // Здесь можно добавить очистку тестового окружения
  console.log('Cleaning up E2E test environment...');
});




