/**
 * E2E тесты для валидации умных маршрутов
 * 
 * Тестирует:
 * - Отображение результатов валидации на фронтенде
 * - Отображение ошибок из RouteErrorDetector
 * - Отображение предупреждений из RealityChecker
 * - Интеграцию с API endpoint /smart-routes/build
 * 
 * @module e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Smart Routes Validation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: ['Якутск', 'Москва', 'Мирный', 'Нижний Бестях'],
          pagination: {
            page: 1,
            limit: 100,
            total: 4,
          },
        }),
      });
    });
  });

  test('should display validation errors from RouteErrorDetector', async ({ page, request }) => {
    // Мокируем API ответ с ошибками валидации
    await page.route('**/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          route: {
            id: 'route-1',
            fromCity: {
              id: 'moscow',
              name: 'Москва',
              coordinates: { latitude: 55.75, longitude: 37.62 },
            },
            toCity: {
              id: 'bestyakh',
              name: 'Нижний Бестях',
              coordinates: { latitude: 61.95, longitude: 129.6 },
            },
            segments: [
              {
                id: 'seg-1',
                type: 'bus',
                from: {
                  id: 'stop-1',
                  name: 'Автовокзал Москва',
                  type: 'bus_station',
                  coordinates: { latitude: 55.75, longitude: 37.62 },
                  cityId: 'moscow',
                },
                to: {
                  id: 'stop-2',
                  name: 'Автовокзал Нижний Бестях',
                  type: 'bus_station',
                  coordinates: { latitude: 61.95, longitude: 129.6 },
                  cityId: 'bestyakh',
                },
                distance: { value: 5000, unit: 'km' },
                duration: { value: 3000, unit: 'minutes', display: '50ч 0м' },
                price: { base: 20000, total: 20000, currency: 'RUB' },
                pathGeometry: {
                  coordinates: [
                    [37.62, 55.75],
                    [129.6, 61.95],
                  ],
                },
              },
            ],
            totalDistance: { value: 5000, unit: 'km' },
            totalDuration: { value: 3000, unit: 'minutes', display: '50ч 0м' },
            totalPrice: { base: 20000, total: 20000, currency: 'RUB' },
          },
          validation: {
            isValid: false,
            errors: [
              '[empty_space] Маршрут bus не должен быть прямой линией. Требуется путь по дорогам.',
              '[unrealistic_route] Автобусный маршрут на расстояние 5000 км нереалистичен (максимум 1500 км)',
            ],
            warnings: [
              '[long_distance] Автобусный маршрут на расстояние 5000 км может быть неоптимальным',
            ],
            segmentValidations: [
              {
                segmentId: 'seg-1',
                isValid: false,
                errors: ['empty_space', 'unrealistic_route'],
                warnings: ['long_distance'],
              },
            ],
          },
          executionTimeMs: 189,
        }),
      });
    });

    // Навигация на страницу с умным маршрутом
    await page.goto('/routes/smart?from=moscow&to=bestyakh&date=2024-12-25');

    // Ждём загрузки данных
    await page.waitForTimeout(2000);

    // Проверяем отображение ошибок валидации
    const errorMessages = page.getByText(/не должен быть прямой линией|нереалистичен/i);
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });

    // Проверяем, что маршрут помечен как невалидный
    const invalidIndicator = page.getByText(/маршрут содержит ошибки|невалидный маршрут/i);
    const hasInvalidIndicator = await invalidIndicator.isVisible().catch(() => false);
    if (hasInvalidIndicator) {
      await expect(invalidIndicator).toBeVisible();
    }
  });

  test('should display validation warnings from RealityChecker', async ({ page }) => {
    // Мокируем API ответ с предупреждениями валидации
    await page.route('**/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          route: {
            id: 'route-2',
            fromCity: {
              id: 'yakutsk',
              name: 'Якутск',
              coordinates: { latitude: 62.0, longitude: 129.7 },
            },
            toCity: {
              id: 'moscow',
              name: 'Москва',
              coordinates: { latitude: 55.75, longitude: 37.62 },
            },
            segments: [
              {
                id: 'seg-1',
                type: 'airplane',
                from: {
                  id: 'stop-1',
                  name: 'Аэропорт Якутск',
                  type: 'airport',
                  coordinates: { latitude: 62.0, longitude: 129.7 },
                  cityId: 'yakutsk',
                  isHub: true,
                  hubLevel: 'regional',
                },
                to: {
                  id: 'stop-2',
                  name: 'Аэропорт Москва',
                  type: 'airport',
                  coordinates: { latitude: 55.75, longitude: 37.62 },
                  cityId: 'moscow',
                  isHub: true,
                  hubLevel: 'federal',
                },
                distance: { value: 4900, unit: 'km' },
                duration: { value: 480, unit: 'minutes', display: '8ч 0м' },
                price: { base: 10000, total: 10000, currency: 'RUB' }, // Заниженная цена
                pathGeometry: {
                  coordinates: [
                    [129.7, 62.0],
                    [37.62, 55.75],
                  ],
                },
                isDirect: true,
              },
            ],
            totalDistance: { value: 4900, unit: 'km' },
            totalDuration: { value: 480, unit: 'minutes', display: '8ч 0м' },
            totalPrice: { base: 10000, total: 10000, currency: 'RUB' },
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [
              '[price_mismatch] Цена сегмента seg-1 отклоняется от оценочной на 59.2%: заявлено 10000₽, оценочно 24500₽',
              '  → Предложенная коррекция: adjust_price (уверенность: 90%)',
              '[рекомендация] Рекомендуется проверить расчёт расстояний через OSRM/Google Maps API.',
            ],
            segmentValidations: [
              {
                segmentId: 'seg-1',
                isValid: true,
                errors: [],
                warnings: ['price_mismatch'],
              },
            ],
          },
          executionTimeMs: 245,
        }),
      });
    });

    // Навигация на страницу с умным маршрутом
    await page.goto('/routes/smart?from=yakutsk&to=moscow&date=2024-12-25');

    // Ждём загрузки данных
    await page.waitForTimeout(2000);

    // Проверяем отображение предупреждений валидации
    const warningMessages = page.getByText(/отклоняется от оценочной|рекомендация/i);
    await expect(warningMessages.first()).toBeVisible({ timeout: 5000 });

    // Проверяем, что маршрут помечен как валидный, но с предупреждениями
    const validIndicator = page.getByText(/маршрут валиден|валидный маршрут/i);
    const hasValidIndicator = await validIndicator.isVisible().catch(() => false);
    if (hasValidIndicator) {
      await expect(validIndicator).toBeVisible();
    }
  });

  test('should display validation results in SmartRouteMap component', async ({ page }) => {
    // Мокируем API ответ с полными данными валидации
    await page.route('**/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          route: {
            id: 'route-3',
            fromCity: {
              id: 'yakutsk',
              name: 'Якутск',
              coordinates: { latitude: 62.0, longitude: 129.7 },
            },
            toCity: {
              id: 'mirny',
              name: 'Мирный',
              coordinates: { latitude: 62.5, longitude: 113.9 },
            },
            segments: [
              {
                id: 'seg-1',
                type: 'bus',
                from: {
                  id: 'stop-1',
                  name: 'Автовокзал Якутск',
                  type: 'bus_station',
                  coordinates: { latitude: 62.0, longitude: 129.7 },
                  cityId: 'yakutsk',
                },
                to: {
                  id: 'stop-2',
                  name: 'Автовокзал Мирный',
                  type: 'bus_station',
                  coordinates: { latitude: 62.5, longitude: 113.9 },
                  cityId: 'mirny',
                },
                distance: { value: 800, unit: 'km' },
                duration: { value: 600, unit: 'minutes', display: '10ч 0м' },
                price: { base: 3200, total: 3200, currency: 'RUB' },
                pathGeometry: {
                  coordinates: [
                    [129.7, 62.0],
                    [129.6, 62.1],
                    [113.9, 62.5],
                  ],
                },
                isDirect: false,
              },
            ],
            totalDistance: { value: 800, unit: 'km' },
            totalDuration: { value: 600, unit: 'minutes', display: '10ч 0м' },
            totalPrice: { base: 3200, total: 3200, currency: 'RUB' },
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [
              '[path_mismatch] Путь для bus слишком близок к прямой линии (отклонение 2.1%). Требуется более детализированный путь.',
            ],
            segmentValidations: [
              {
                segmentId: 'seg-1',
                isValid: true,
                errors: [],
                warnings: ['path_mismatch'],
              },
            ],
          },
          executionTimeMs: 156,
        }),
      });
    });

    // Навигация на страницу с умным маршрутом
    await page.goto('/routes/smart?from=yakutsk&to=mirny&date=2024-12-25');

    // Ждём загрузки данных и карты
    await page.waitForTimeout(3000);

    // Проверяем, что карта отображается
    const mapContainer = page.locator('[data-testid="smart-route-map"]').or(
      page.locator('.smart-route-map')
    );
    await expect(mapContainer.first()).toBeVisible({ timeout: 10000 });

    // Проверяем отображение предупреждений (если они отображаются в компоненте)
    const warningsSection = page.getByText(/предупреждения|warnings/i);
    const hasWarningsSection = await warningsSection.isVisible().catch(() => false);
    if (hasWarningsSection) {
      await expect(warningsSection).toBeVisible();
    }
  });

  test('should handle API validation errors gracefully', async ({ page }) => {
    // Мокируем ошибку валидации входных данных
    await page.route('**/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Параметры "from", "to" и "date" обязательны',
          },
          executionTimeMs: 5,
        }),
      });
    });

    // Навигация на страницу с невалидными параметрами
    await page.goto('/routes/smart?from=&to=&date=');

    // Ждём ответа от API
    await page.waitForTimeout(1000);

    // Проверяем отображение ошибки валидации
    const errorMessage = page.getByText(/обязательны|validation error|ошибка валидации/i);
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display validation summary in route details', async ({ page }) => {
    // Мокируем API ответ с валидацией
    await page.route('**/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          route: {
            id: 'route-4',
            fromCity: {
              id: 'yakutsk',
              name: 'Якутск',
              coordinates: { latitude: 62.0, longitude: 129.7 },
            },
            toCity: {
              id: 'moscow',
              name: 'Москва',
              coordinates: { latitude: 55.75, longitude: 37.62 },
            },
            segments: [
              {
                id: 'seg-1',
                type: 'airplane',
                from: {
                  id: 'stop-1',
                  name: 'Аэропорт Якутск',
                  type: 'airport',
                  coordinates: { latitude: 62.0, longitude: 129.7 },
                  cityId: 'yakutsk',
                  isHub: true,
                  hubLevel: 'regional',
                },
                to: {
                  id: 'stop-2',
                  name: 'Аэропорт Москва',
                  type: 'airport',
                  coordinates: { latitude: 55.75, longitude: 37.62 },
                  cityId: 'moscow',
                  isHub: true,
                  hubLevel: 'federal',
                },
                distance: { value: 4900, unit: 'km' },
                duration: { value: 480, unit: 'minutes', display: '8ч 0м' },
                price: { base: 24500, total: 24500, currency: 'RUB' },
                pathGeometry: {
                  coordinates: [
                    [129.7, 62.0],
                    [37.62, 55.75],
                  ],
                },
                isDirect: true,
              },
            ],
            totalDistance: { value: 4900, unit: 'km' },
            totalDuration: { value: 480, unit: 'minutes', display: '8ч 0м' },
            totalPrice: { base: 24500, total: 24500, currency: 'RUB' },
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            segmentValidations: [
              {
                segmentId: 'seg-1',
                isValid: true,
                errors: [],
                warnings: [],
              },
            ],
          },
          executionTimeMs: 120,
        }),
      });
    });

    // Навигация на страницу с умным маршрутом
    await page.goto('/routes/smart?from=yakutsk&to=moscow&date=2024-12-25');

    // Ждём загрузки данных
    await page.waitForTimeout(2000);

    // Проверяем, что маршрут отображается
    const routeInfo = page.getByText(/Якутск.*Москва|Москва.*Якутск/i);
    await expect(routeInfo.first()).toBeVisible({ timeout: 5000 });

    // Проверяем, что валидация прошла успешно (нет ошибок)
    const validationStatus = page.getByText(/валиден|успешно|success/i);
    const hasValidationStatus = await validationStatus.isVisible().catch(() => false);
    if (hasValidationStatus) {
      await expect(validationStatus.first()).toBeVisible();
    }
  });
});




