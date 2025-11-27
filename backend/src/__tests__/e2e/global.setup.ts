/**
 * Global Setup for Playwright E2E Tests
 * 
 * Выполняется один раз перед всеми тестами.
 * Инициализирует тестовое окружение, проверяет доступность сервисов.
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Global Setup: Инициализация E2E тестового окружения...');

  const baseURL = config.use?.baseURL || 'http://localhost:3001';
  
  // Проверяем доступность API через fetch (проще для API тестов)
  try {
    console.log(`📡 Проверка доступности API: ${baseURL}`);
    const response = await fetch(`${baseURL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`API недоступен: ${response.status}`);
    }
    
    console.log('✅ API доступен и готов к тестированию');
  } catch (error) {
    console.warn('⚠️  API недоступен, но продолжаем тесты:', error instanceof Error ? error.message : error);
  }

  // Можно добавить инициализацию тестовой БД, создание тестовых данных и т.д.
  console.log('✅ Global Setup завершён');
}

export default globalSetup;

