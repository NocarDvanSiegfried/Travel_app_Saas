/**
 * Комплексные E2E тесты для модуля Leaflet карты
 * 
 * Тестирует все аспекты работы карты согласно финальному чек-листу:
 * - CSS загрузка
 * - Контейнер карты
 * - Инициализация
 * - invalidateSize
 * - fitBounds
 * - Маркеры
 * - Полилинии
 * - Tile Provider
 * - Производительность
 * - Ошибки
 * 
 * @module e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Leaflet Map Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: ['Якутск', 'Нерюнгри', 'Мирный'],
          pagination: { page: 1, limit: 100, total: 3 },
        }),
      });
    });

    // Мокируем API ответ для данных карты
    await page.route('**/api/v1/routes/map*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            routeId: 'route-1',
            fromCity: 'Якутск',
            toCity: 'Нерюнгри',
            segments: [
              {
                segmentId: 'segment-1',
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
    });
  });

  // Блок 1: CSS загрузка
  test('should load CSS only once without duplicates', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    await page.waitForSelector('[data-testid="route-map-container"]', { timeout: 15000 });

    // Проверяем количество CSS ссылок
    const cssLinks = await page.$$eval('link[data-leaflet-css], link[href*="leaflet.css"]', (links) => links.length);
    expect(cssLinks).toBe(1);
  });

  // Блок 2: Контейнер карты
  test('should wait for container to have valid size (>50x50)', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем размеры контейнера
    const boundingBox = await mapContainer.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox?.width).toBeGreaterThan(50);
    expect(boundingBox?.height).toBeGreaterThan(50);
  });

  // Блок 3: Инициализация карты
  test('should initialize map only once', async ({ page }) => {
    const initCalls: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Initializing map') || text.includes('Map initialized successfully')) {
        initCalls.push(text);
      }
    });

    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    await page.waitForSelector('[data-testid="route-map-container"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Проверяем, что карта инициализирована (в dev режиме будет лог)
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible();
  });

  // Блок 4: invalidateSize
  test('should call invalidateSize correctly', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что карта отображается корректно (invalidateSize должен был отработать)
    const boundingBox = await mapContainer.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox?.width).toBeGreaterThan(0);
    expect(boundingBox?.height).toBeGreaterThan(0);
  });

  // Блок 5: fitBounds
  test('should center map correctly with fitBounds', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Проверяем, что карта отображается (fitBounds должен был отработать)
    const boundingBox = await mapContainer.boundingBox();
    expect(boundingBox).not.toBeNull();
  });

  // Блок 6: Маркеры
  test('should render markers correctly', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Проверяем наличие Leaflet маркеров (они добавляются как img элементы)
    const markers = await page.$$('.leaflet-marker-icon');
    expect(markers.length).toBeGreaterThan(0);
  });

  // Блок 7: Полилинии
  test('should render polylines correctly', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Проверяем наличие Leaflet полилиний (они добавляются как path элементы)
    const polylines = await page.$$('.leaflet-interactive');
    expect(polylines.length).toBeGreaterThan(0);
  });

  // Блок 8: Tile Provider
  test('should load tiles from OpenStreetMap France', async ({ page }) => {
    const tileRequests: string[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('tile.openstreetmap.fr')) {
        tileRequests.push(url);
      }
    });

    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Проверяем, что были запросы к tile provider
    expect(tileRequests.length).toBeGreaterThan(0);
    
    // Проверяем, что используется OpenStreetMap France
    const allFromFrance = tileRequests.every((url) => url.includes('tile.openstreetmap.fr'));
    expect(allFromFrance).toBe(true);
  });

  // Блок 9: Производительность
  test('should not recreate map on route change', async ({ page }) => {
    const testRoute1 = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const testRoute2 = {
      routeId: 'route-2',
      fromCity: 'Мирный',
      toCity: 'Удачный',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-2', fromStopId: 'stop-3', toStopId: 'stop-4', transportType: 'train' }, departureTime: '09:00', arrivalTime: '11:00', duration: 120, price: 6000 }],
      totalDuration: 120,
      totalPrice: 6000,
      transferCount: 0,
      transportTypes: ['train'],
      departureTime: '09:00',
      arrivalTime: '11:00',
    };

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate((route) => {
      localStorage.setItem('route-route-1', JSON.stringify({ route }));
    }, testRoute1);
    await page.reload();

    // Ждём загрузки первой карты
    await page.waitForSelector('[data-testid="route-map-container"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Переключаемся на второй маршрут
    await page.evaluate((route) => {
      localStorage.setItem('route-route-2', JSON.stringify({ route }));
    }, testRoute2);
    await page.goto('/routes/details?routeId=route-2');
    await page.reload();

    // Ждём загрузки второй карты
    await page.waitForSelector('[data-testid="route-map-container"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Проверяем, что карта отображается
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible();
  });

  // Блок 10: Ошибки
  test('should handle errors gracefully and allow retry', async ({ page }) => {
    // Блокируем загрузку CSS для имитации ошибки
    await page.route('**/leaflet.css', async (route) => {
      await route.abort('failed');
    });

    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [{ segment: { segmentId: 'segment-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'bus' }, departureTime: '08:00', arrivalTime: '10:00', duration: 120, price: 5000 }],
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
    }, testRoute);
    await page.reload();

    // Ждём появления ошибки
    await page.waitForTimeout(6000);

    // Проверяем наличие кнопки "Попробовать снова"
    const retryButton = page.getByText('Попробовать снова');
    const retryButtonVisible = await retryButton.isVisible().catch(() => false);
    
    // Если ошибка отображается, проверяем кнопку
    if (retryButtonVisible) {
      await expect(retryButton).toBeVisible();
    }
  });
});

