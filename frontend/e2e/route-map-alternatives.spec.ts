/**
 * E2E тесты для переключения альтернативных маршрутов на карте
 * 
 * Тестирует:
 * - Переключение между альтернативными маршрутами
 * - Отображение индикаторов маршрутов
 * - Навигацию по маршрутам (предыдущий/следующий)
 * - Сохранение позиции карты при переключении
 * 
 * @module e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Route Map Alternatives', () => {
  test.beforeEach(async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: ['Якутск', 'Нерюнгри', 'Мирный'],
          pagination: {
            page: 1,
            limit: 100,
            total: 3,
          },
        }),
      });
    });

    // Мокируем API ответ для данных карты
    await page.route('**/api/v1/routes/map*', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === 'POST') {
        const body = await route.request().postDataJSON();
        const routeId = body?.route?.routeId || 'route-1';

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              routeId,
              fromCity: 'Якутск',
              toCity: 'Нерюнгри',
              segments: [
                {
                  segmentId: `segment-${routeId}`,
                  transportType: 'bus',
                  fromStop: {
                    id: 'stop-1',
                    name: 'Якутск, Автовокзал',
                    latitude: 62.0,
                    longitude: 129.0,
                    cityName: 'Якутск',
                    isTransfer: false,
                  },
                  toStop: {
                    id: 'stop-2',
                    name: 'Нерюнгри, Автовокзал',
                    latitude: 56.6,
                    longitude: 124.6,
                    cityName: 'Нерюнгри',
                    isTransfer: false,
                  },
                  polyline: {
                    coordinates: [
                      [62.0, 129.0],
                      [56.6, 124.6],
                    ],
                  },
                  distance: 800,
                  duration: 120,
                  price: 5000,
                  departureTime: '08:00',
                  arrivalTime: '10:00',
                },
              ],
              bounds: {
                north: 62.5,
                south: 56.0,
                east: 130.0,
                west: 124.0,
              },
              totalDistance: 800,
              totalDuration: 120,
            },
            cacheHit: false,
          }),
        });
      } else {
        const routeId = url.searchParams.get('routeId') || 'route-1';

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              routeId,
              fromCity: 'Якутск',
              toCity: 'Нерюнгри',
              segments: [],
              bounds: {
                north: 62.5,
                south: 56.0,
                east: 130.0,
                west: 124.0,
              },
              totalDistance: 800,
              totalDuration: 120,
            },
            cacheHit: true,
          }),
        });
      }
    });
  });

  test('should display route switcher when multiple routes are available', async ({ page }) => {
    // Создаём тестовые маршруты в localStorage
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const route2 = {
      routeId: 'route-2',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 180,
      totalPrice: 7000,
      transferCount: 1,
      transportTypes: ['bus', 'airplane'],
      departureTime: '09:00',
      arrivalTime: '12:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate(
      ({ route1, route2 }) => {
        localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
        localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));
      },
      { route1, route2 }
    );

    await page.reload();

    // Проверяем наличие переключателя маршрутов
    const switcher = page.getByTestId('route-map-switcher');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    const controls = page.getByTestId('route-switcher-controls');
    await expect(controls).toBeVisible();
  });

  test('should switch to next route when next button is clicked', async ({ page }) => {
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const route2 = {
      routeId: 'route-2',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 180,
      totalPrice: 7000,
      transferCount: 1,
      transportTypes: ['bus', 'airplane'],
      departureTime: '09:00',
      arrivalTime: '12:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate(
      ({ route1, route2 }) => {
        localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
        localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));
      },
      { route1, route2 }
    );

    await page.reload();

    // Ждём появления переключателя
    await page.waitForSelector('[data-testid="route-switcher-next"]', { timeout: 10000 });

    // Проверяем начальное состояние (1 / 2)
    const counter = page.getByTestId('route-switcher-counter');
    await expect(counter).toHaveText('1 / 2');

    // Кликаем на кнопку "Следующий"
    const nextButton = page.getByTestId('route-switcher-next');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    // Проверяем, что счётчик обновился (2 / 2)
    await expect(counter).toHaveText('2 / 2');

    // Проверяем, что индикатор второго маршрута выделен
    const indicator2 = page.getByTestId('route-switcher-indicator-1');
    await expect(indicator2).toHaveAttribute('data-selected', 'true');
  });

  test('should switch to previous route when previous button is clicked', async ({ page }) => {
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const route2 = {
      routeId: 'route-2',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 180,
      totalPrice: 7000,
      transferCount: 1,
      transportTypes: ['bus', 'airplane'],
      departureTime: '09:00',
      arrivalTime: '12:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate(
      ({ route1, route2 }) => {
        localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
        localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));
      },
      { route1, route2 }
    );

    await page.reload();

    // Переключаемся на второй маршрут
    await page.waitForSelector('[data-testid="route-switcher-next"]', { timeout: 10000 });
    const nextButton = page.getByTestId('route-switcher-next');
    await nextButton.click();

    // Ждём обновления
    await page.waitForTimeout(500);

    // Переключаемся обратно на первый маршрут
    const prevButton = page.getByTestId('route-switcher-prev');
    await expect(prevButton).toBeEnabled();
    await prevButton.click();

    // Проверяем, что счётчик вернулся к 1 / 2
    const counter = page.getByTestId('route-switcher-counter');
    await expect(counter).toHaveText('1 / 2');

    // Проверяем, что индикатор первого маршрута выделен
    const indicator1 = page.getByTestId('route-switcher-indicator-0');
    await expect(indicator1).toHaveAttribute('data-selected', 'true');
  });

  test('should switch route when indicator is clicked', async ({ page }) => {
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const route2 = {
      routeId: 'route-2',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 180,
      totalPrice: 7000,
      transferCount: 1,
      transportTypes: ['bus', 'airplane'],
      departureTime: '09:00',
      arrivalTime: '12:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate(
      ({ route1, route2 }) => {
        localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
        localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));
      },
      { route1, route2 }
    );

    await page.reload();

    // Ждём появления индикаторов
    await page.waitForSelector('[data-testid="route-switcher-indicator-1"]', { timeout: 10000 });

    // Кликаем на индикатор второго маршрута
    const indicator2 = page.getByTestId('route-switcher-indicator-1');
    await indicator2.click();

    // Проверяем, что индикатор выделен
    await expect(indicator2).toHaveAttribute('data-selected', 'true');

    // Проверяем, что счётчик обновился
    const counter = page.getByTestId('route-switcher-counter');
    await expect(counter).toHaveText('2 / 2');
  });

  test('should disable previous button on first route', async ({ page }) => {
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const route2 = {
      routeId: 'route-2',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 180,
      totalPrice: 7000,
      transferCount: 1,
      transportTypes: ['bus', 'airplane'],
      departureTime: '09:00',
      arrivalTime: '12:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate(
      ({ route1, route2 }) => {
        localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
        localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));
      },
      { route1, route2 }
    );

    await page.reload();

    // Ждём появления кнопок
    await page.waitForSelector('[data-testid="route-switcher-prev"]', { timeout: 10000 });

    // Проверяем, что кнопка "Предыдущий" disabled на первом маршруте
    const prevButton = page.getByTestId('route-switcher-prev');
    await expect(prevButton).toBeDisabled();
  });

  test('should disable next button on last route', async ({ page }) => {
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const route2 = {
      routeId: 'route-2',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 180,
      totalPrice: 7000,
      transferCount: 1,
      transportTypes: ['bus', 'airplane'],
      departureTime: '09:00',
      arrivalTime: '12:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate(
      ({ route1, route2 }) => {
        localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
        localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));
      },
      { route1, route2 }
    );

    await page.reload();

    // Переключаемся на последний маршрут
    await page.waitForSelector('[data-testid="route-switcher-next"]', { timeout: 10000 });
    const nextButton = page.getByTestId('route-switcher-next');
    await nextButton.click();

    // Ждём обновления
    await page.waitForTimeout(500);

    // Проверяем, что кнопка "Следующий" disabled на последнем маршруте
    await expect(nextButton).toBeDisabled();
  });

  test('should not show switcher when only one route is available', async ({ page }) => {
    const route1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate((route) => {
      localStorage.setItem('route-route-1', JSON.stringify({ route }));
    }, route1);

    await page.reload();

    // Переключатель не должен отображаться, если только один маршрут
    const controls = page.getByTestId('route-switcher-controls');
    const isVisible = await controls.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});



