import { defineConfig, devices } from '@playwright/test'

/**
 * См. https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Максимальное время выполнения одного теста */
  timeout: 30 * 1000,
  
  expect: {
    /**
     * Максимальное время ожидания для expect assertions
     */
    timeout: 5000,
  },
  
  /* Запускать тесты в параллели */
  fullyParallel: true,
  
  /* Не запускать тесты в CI, если они не прошли локально */
  forbidOnly: !!process.env.CI,
  
  /* Повторять тесты только в CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Количество воркеров для параллельного запуска */
  workers: process.env.CI ? 1 : undefined,
  
  /* Репортер для использования */
  reporter: 'html',
  
  /* Общие настройки для всех проектов */
  use: {
    /* Базовый URL для использования в тестах */
    baseURL: 'http://localhost:3000',
    
    /* Собирать trace при повторе неудачного теста */
    trace: 'on-first-retry',
    
    /* Скриншоты при ошибках */
    screenshot: 'only-on-failure',
  },

  /* Настройка проектов для разных браузеров */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Тестирование на мобильных устройствах */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Запуск dev сервера перед тестами */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})

