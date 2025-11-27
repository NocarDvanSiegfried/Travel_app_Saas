/**
 * Jest Global Test Setup
 * 
 * Общая настройка для всех unit тестов.
 * Изолированное окружение с моками всех внешних зависимостей.
 */

import { TEST_ENV, UNIT_TEST_CONFIG } from './config/test-config';

// Устанавливаем переменные окружения для тестов (изолированы от продакшена)
process.env.NODE_ENV = TEST_ENV.NODE_ENV;
process.env.LOG_LEVEL = TEST_ENV.LOG_LEVEL;
process.env.REDIS_HOST = TEST_ENV.REDIS_HOST;
process.env.REDIS_PORT = TEST_ENV.REDIS_PORT;
process.env.REDIS_DB = TEST_ENV.REDIS_DB;
process.env.REDIS_TTL_DEFAULT = TEST_ENV.REDIS_TTL_DEFAULT;
process.env.DATABASE_URL = TEST_ENV.DATABASE_URL;
process.env.OSRM_URL = TEST_ENV.OSRM_URL;
process.env.API_BASE_URL = TEST_ENV.API_BASE_URL;

// Устанавливаем тип тестов для условной логики
process.env.JEST_TEST_TYPE = 'unit';

// Таймаут для unit тестов
jest.setTimeout(UNIT_TEST_CONFIG.testTimeout);

// Моки консоли для уменьшения шума в тестах
if (!UNIT_TEST_CONFIG.verbose) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Глобальные моки для внешних зависимостей
// Mock fetch для OSRM (всегда используем моки в unit тестах)
global.fetch = jest.fn() as jest.Mock;

// Очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
