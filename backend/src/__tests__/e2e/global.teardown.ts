/**
 * Global Teardown for Playwright E2E Tests
 * 
 * Выполняется один раз после всех тестов.
 * Очищает тестовое окружение, удаляет временные данные.
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global Teardown: Очистка E2E тестового окружения...');

  // Можно добавить очистку тестовой БД, удаление временных файлов и т.д.
  
  console.log('✅ Global Teardown завершён');
}

export default globalTeardown;





