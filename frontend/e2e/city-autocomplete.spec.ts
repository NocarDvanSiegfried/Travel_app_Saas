/**
 * E2E Tests: City Autocomplete
 * 
 * Тестирует автодополнение городов:
 * - Поиск по частичному названию
 * - Отображение административной структуры
 * - Фильтрация результатов
 * - Выбор города из списка
 * - Обработка пустых результатов
 * - Регистронезависимый поиск
 */

import { test, expect } from '@playwright/test';

test.describe('City Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show autocomplete suggestions when typing', async ({ page }) => {
    // Мокируем API для автодополнения
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query') || '';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'yakutsk',
            name: 'Якутск',
            normalizedName: 'якутск',
            administrative: {
              region: 'Республика Саха (Якутия)',
              district: 'Городской округ Якутск',
              fullName: 'Республика Саха (Якутия), Городской округ Якутск, г. Якутск',
            },
          },
        ]),
      });
    });

    // Находим поле автодополнения "Откуда"
    const fromInput = page.getByTestId('city-autocomplete-from');
    await expect(fromInput).toBeVisible();

    // Вводим текст
    await fromInput.fill('якут');

    // Ждем появления автодополнения
    await page.waitForTimeout(500);

    // Проверяем наличие результатов
    const suggestions = page.getByRole('listitem');
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display administrative structure in autocomplete', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'olekminsk',
            name: 'Олёкминск',
            normalizedName: 'олёкминск',
            administrative: {
              region: 'Республика Саха (Якутия)',
              district: 'Олёкминский район',
              fullName: 'Республика Саха (Якутия), Олёкминский район, г. Олёкминск',
            },
          },
        ]),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');
    await fromInput.fill('олёкминск');

    await page.waitForTimeout(500);

    // Проверяем, что административная структура отображается
    const suggestion = page.getByRole('listitem').first();
    await expect(suggestion).toBeVisible();

    // Проверяем наличие полного названия с административной структурой
    const fullName = page.getByText(/Республика Саха.*Олёкминский район.*Олёкминск/);
    await expect(fullName).toBeVisible({ timeout: 5000 });
  });

  test('should filter results based on query', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query')?.toLowerCase() || '';

      const allCities = [
        { id: 'yakutsk', name: 'Якутск', normalizedName: 'якутск' },
        { id: 'mirny', name: 'Мирный', normalizedName: 'мирный' },
        { id: 'moscow', name: 'Москва', normalizedName: 'москва' },
      ];

      const filtered = allCities.filter(
        (city) => city.name.toLowerCase().includes(query) || city.normalizedName.includes(query)
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filtered),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');
    await fromInput.fill('якут');

    await page.waitForTimeout(500);

    // Проверяем, что показывается только Якутск
    const suggestions = page.getByRole('listitem');
    await expect(suggestions).toHaveCount(1);
    await expect(page.getByText('Якутск')).toBeVisible();
  });

  test('should select city from autocomplete list', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'yakutsk', name: 'Якутск', normalizedName: 'якутск' },
        ]),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');
    await fromInput.fill('якут');

    await page.waitForTimeout(500);

    // Выбираем город из списка
    const suggestion = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first();
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    // Проверяем, что город выбран
    await expect(fromInput).toHaveValue('Якутск');
  });

  test('should handle empty search results', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');
    await fromInput.fill('nonexistentcity123');

    await page.waitForTimeout(500);

    // Проверяем, что автодополнение не показывает результаты
    const suggestions = page.getByRole('listitem');
    await expect(suggestions).toHaveCount(0);
  });

  test('should be case insensitive', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'yakutsk', name: 'Якутск', normalizedName: 'якутск' },
        ]),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');

    // Тестируем с разным регистром
    await fromInput.fill('ЯКУТСК');
    await page.waitForTimeout(500);

    const suggestions = page.getByRole('listitem');
    await expect(suggestions.first()).toBeVisible();

    // Очищаем и тестируем с маленькими буквами
    await fromInput.clear();
    await fromInput.fill('якутск');
    await page.waitForTimeout(500);

    await expect(suggestions.first()).toBeVisible();
  });

  test('should limit results count', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      const url = new URL(route.request().url());
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);

      // Создаем много городов
      const cities = Array.from({ length: 20 }, (_, i) => ({
        id: `city-${i}`,
        name: `Город ${i}`,
        normalizedName: `город ${i}`,
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cities.slice(0, limit)),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');
    await fromInput.fill('город');

    await page.waitForTimeout(500);

    // Проверяем, что результаты ограничены
    const suggestions = page.getByRole('listitem');
    const count = await suggestions.count();
    expect(count).toBeLessThanOrEqual(10);
  });

  test('should handle keyboard navigation in autocomplete', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'yakutsk', name: 'Якутск', normalizedName: 'якутск' },
          { id: 'mirny', name: 'Мирный', normalizedName: 'мирный' },
          { id: 'moscow', name: 'Москва', normalizedName: 'москва' },
        ]),
      });
    });

    const fromInput = page.getByTestId('city-autocomplete-from');
    await fromInput.fill('я');

    await page.waitForTimeout(500);

    // Навигация с клавиатуры
    await fromInput.press('ArrowDown');
    await page.waitForTimeout(200);

    await fromInput.press('ArrowDown');
    await page.waitForTimeout(200);

    await fromInput.press('Enter');

    // Проверяем, что город выбран
    await expect(fromInput).not.toHaveValue('я');
  });
});




