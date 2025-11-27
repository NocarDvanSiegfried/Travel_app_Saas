/**
 * Playwright Configuration for Backend E2E Tests
 * 
 * Конфигурация для end-to-end тестов с использованием Playwright.
 * Тестирует API endpoints через HTTP запросы.
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Базовый URL для API
 */
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * См. https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  
  /* Максимальное время выполнения одного теста */
  timeout: 60 * 1000,
  
  expect: {
    /**
     * Максимальное время ожидания для expect assertions
     */
    timeout: 10 * 1000,
  },
  
  /* Запускать тесты в параллели */
  fullyParallel: false, // E2E тесты лучше запускать последовательно
  
  /* Не запускать тесты в CI, если они не прошли локально */
  forbidOnly: !!process.env.CI,
  
  /* Повторять тесты только в CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Количество воркеров для параллельного запуска */
  workers: 1, // E2E тесты требуют последовательного выполнения
  
  /* Репортер для использования */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  
  /* Общие настройки для всех проектов */
  use: {
    /* Базовый URL для использования в тестах */
    baseURL: API_BASE_URL,
    
    /* Собирать trace при повторе неудачного теста */
    trace: 'on-first-retry',
    
    /* Скриншоты при ошибках */
    screenshot: 'only-on-failure',
    
    /* Видео при ошибках */
    video: 'retain-on-failure',
    
    /* HTTP заголовки по умолчанию */
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },

  /* Настройка проектов */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'api-tests',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  /* Global setup and teardown */
  globalSetup: './src/__tests__/e2e/global.setup.ts',
  globalTeardown: './src/__tests__/e2e/global.teardown.ts',

  /* Запуск API сервера перед тестами */
  webServer: {
    command: 'npm run docker:dev || npm run dev',
    url: API_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

