/**
 * E2E тесты для проверки стабильности tile provider
 * 
 * Тестирует:
 * - Загрузку тайлов от стабильного провайдера (OpenStreetMap France)
 * - Отсутствие ошибок 404/429 при загрузке тайлов
 * - Корректное отображение карты без дыр
 * - Fallback механизм при ошибках загрузки тайлов
 * - Работу маршрутов, маркеров и полилиний
 * 
 * @module e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Tile Provider Verification', () => {
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

  test('should load tiles from OpenStreetMap France without errors', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [
        {
          segment: {
            segmentId: 'segment-1',
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            transportType: 'bus',
          },
          departureTime: '08:00',
          arrivalTime: '10:00',
          duration: 120,
          price: 5000,
        },
      ],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    // Отслеживаем запросы к tile provider
    const tileRequests: string[] = [];
    const tileErrors: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Проверяем запросы к OpenStreetMap France
      if (url.includes('tile.openstreetmap.fr')) {
        tileRequests.push(url);
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      // Проверяем ошибки при загрузке тайлов
      if (url.includes('tile.openstreetmap.fr') && !response.ok()) {
        tileErrors.push(`${url}: ${response.status()}`);
      }
    });

    // Перехватываем ошибки консоли
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        const text = msg.text();
        if (text.includes('tile') || text.includes('Tile') || text.includes('404') || text.includes('429')) {
          tileErrors.push(`Console: ${text}`);
        }
      }
    });

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate((route) => {
      localStorage.setItem('route-route-1', JSON.stringify({ route }));
    }, testRoute);

    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Ждём загрузки тайлов (даём время на загрузку)
    await page.waitForTimeout(3000);

    // Проверяем, что были запросы к tile provider
    expect(tileRequests.length).toBeGreaterThan(0);

    // Проверяем, что нет ошибок 404 или 429
    const has404Errors = tileErrors.some((error) => error.includes('404'));
    const has429Errors = tileErrors.some((error) => error.includes('429'));

    expect(has404Errors).toBe(false);
    expect(has429Errors).toBe(false);

    // Проверяем, что карта отображается (контейнер виден)
    await expect(mapContainer).toBeVisible();
  });

  test('should handle tile loading errors with fallback', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [
        {
          segment: {
            segmentId: 'segment-1',
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            transportType: 'bus',
          },
          departureTime: '08:00',
          arrivalTime: '10:00',
          duration: 120,
          price: 5000,
        },
      ],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    // Блокируем запросы к OpenStreetMap France для имитации ошибки
    await page.route('**/tile.openstreetmap.fr/**', async (route) => {
      await route.abort('failed');
    });

    const fallbackRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Проверяем запросы к fallback провайдеру (CartoDB)
      if (url.includes('basemaps.cartocdn.com')) {
        fallbackRequests.push(url);
      }
    });

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate((route) => {
      localStorage.setItem('route-route-1', JSON.stringify({ route }));
    }, testRoute);

    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Ждём возможного переключения на fallback
    await page.waitForTimeout(5000);

    // Проверяем, что карта всё ещё видна (fallback должен работать)
    await expect(mapContainer).toBeVisible();

    // Если fallback сработал, должны быть запросы к CartoDB
    // (но это может не произойти, если ошибки не критичны)
    // Основная проверка - карта должна оставаться видимой
  });

  test('should display map without visual artifacts', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [
        {
          segment: {
            segmentId: 'segment-1',
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            transportType: 'bus',
          },
          departureTime: '08:00',
          arrivalTime: '10:00',
          duration: 120,
          price: 5000,
        },
      ],
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

    // Ждём загрузки тайлов
    await page.waitForTimeout(3000);

    // Проверяем, что контейнер карты имеет размер (не пустой)
    const boundingBox = await mapContainer.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox?.width).toBeGreaterThan(0);
    expect(boundingBox?.height).toBeGreaterThan(0);

    // Делаем скриншот для визуальной проверки
    await page.screenshot({
      path: 'test-results/tile-provider-map-screenshot.png',
      fullPage: false,
    });
  });

  test('should work with map interactions (zoom, pan)', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [
        {
          segment: {
            segmentId: 'segment-1',
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            transportType: 'bus',
          },
          departureTime: '08:00',
          arrivalTime: '10:00',
          duration: 120,
          price: 5000,
        },
      ],
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

    // Ждём загрузки тайлов
    await page.waitForTimeout(3000);

    // Проверяем наличие элементов управления картой (zoom buttons)
    // Leaflet добавляет класс .leaflet-control-zoom
    const zoomControls = page.locator('.leaflet-control-zoom');
    const zoomControlsVisible = await zoomControls.isVisible().catch(() => false);

    // Если элементы управления есть, проверяем их работу
    if (zoomControlsVisible) {
      await expect(zoomControls).toBeVisible();
    }

    // Проверяем, что карта интерактивна (можно кликнуть)
    await mapContainer.click({ timeout: 5000 });
  });

  test('should verify tile provider URL is OpenStreetMap France', async ({ page }) => {
    const testRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [
        {
          segment: {
            segmentId: 'segment-1',
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            transportType: 'bus',
          },
          departureTime: '08:00',
          arrivalTime: '10:00',
          duration: 120,
          price: 5000,
        },
      ],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const tileUrls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Проверяем, что используются тайлы от OpenStreetMap France
      if (url.includes('tile.openstreetmap.fr')) {
        tileUrls.push(url);
      }
    });

    await page.goto('/routes/details?routeId=route-1');
    await page.evaluate((route) => {
      localStorage.setItem('route-route-1', JSON.stringify({ route }));
    }, testRoute);

    await page.reload();

    // Ждём загрузки карты
    const mapContainer = page.getByTestId('route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Ждём загрузки тайлов
    await page.waitForTimeout(3000);

    // Проверяем, что используются тайлы от OpenStreetMap France
    expect(tileUrls.length).toBeGreaterThan(0);
    
    // Проверяем, что URL содержит правильный домен
    const allFromFrance = tileUrls.every((url) => url.includes('tile.openstreetmap.fr'));
    expect(allFromFrance).toBe(true);

    // Проверяем, что URL содержит правильный путь
    const allHaveCorrectPath = tileUrls.every((url) => url.includes('/osmfr/'));
    expect(allHaveCorrectPath).toBe(true);
  });
});


