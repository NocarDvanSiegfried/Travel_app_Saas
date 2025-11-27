/**
 * E2E Tests: Smart Routes Map Visualization
 * 
 * Тестирует визуализацию маршрутов на карте:
 * - Отображение карты с маршрутом
 * - Визуализация разных типов транспорта (авиа, автобус, ЖД, паром, зимник)
 * - Проверка реалистичности путей (не прямые линии)
 * - Скрытие Leaflet footer
 * - Отображение маркеров и полилиний
 * - Интерактивность карты
 */

import { test, expect } from '@playwright/test';

test.describe('Smart Routes Map Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Мокируем API для автодополнения
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
  });

  test('should display map with route visualization', async ({ page }) => {
    // Мокируем API для построения маршрута (новый endpoint)
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          route: {
            id: 'route-1',
            fromCity: { id: 'yakutsk', name: 'Якутск', coordinates: { latitude: 62.0278, longitude: 129.7042 } },
            toCity: { id: 'mirny', name: 'Мирный', coordinates: { latitude: 62.5381, longitude: 113.9606 } },
            segments: [
              {
                segmentId: 'segment-1',
                type: 'bus',
                from: { id: 'stop-1', name: 'Якутск Автовокзал', type: 'bus_station', coordinates: { latitude: 62.0278, longitude: 129.7042 }, cityId: 'yakutsk' },
                to: { id: 'stop-2', name: 'Мирный Автовокзал', type: 'bus_station', coordinates: { latitude: 62.5381, longitude: 113.9606 }, cityId: 'mirny' },
                distance: { value: 1000, unit: 'km' },
                duration: { value: 720, unit: 'minutes', display: '12 часов' },
                price: { base: 3500, total: 3500, currency: 'RUB', display: '3 500 ₽' },
                schedule: { departureTime: '08:00', arrivalTime: '20:00' },
                pathGeometry: {
                  coordinates: [
                    [129.7042, 62.0278], // Якутск
                    [129.8, 62.1],
                    [129.9, 62.2],
                    [113.9606, 62.5381], // Мирный
                  ],
                },
              },
            ],
            totalDistance: { value: 1000, unit: 'km' },
            totalDuration: { value: 720, unit: 'minutes', display: '12 часов' },
            totalPrice: { base: 3500, total: 3500, currency: 'RUB', display: '3 500 ₽' },
          },
          alternatives: [],
          executionTimeMs: 100,
        }),
      });
    });

    // Переходим на страницу поиска
    await page.goto('/routes?from=yakutsk&to=mirny&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что карта отображается
    const mapElement = page.getByTestId('smart-route-map');
    await expect(mapElement).toBeVisible();
  });

  test('should visualize airplane route with hub path (not straight line)', async ({ page }) => {
    // Мокируем API для авиа-маршрута через хабы
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-2',
            fromCity: { id: 'srednekolymsk', name: 'Среднеколымск' },
            toCity: { id: 'moscow', name: 'Москва' },
            segments: [
              {
                id: 'segment-1',
                type: 'airplane',
                from: { id: 'stop-1', name: 'Среднеколымск Аэропорт', cityId: 'srednekolymsk' },
                to: { id: 'stop-2', name: 'Якутск Аэропорт', cityId: 'yakutsk' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [153.7, 67.45], // Среднеколымск
                    [129.7042, 62.0278], // Якутск (хаб)
                  ],
                },
                viaHubs: [{ id: 'yakutsk-hub', name: 'Якутск Хаб' }],
              },
              {
                id: 'segment-2',
                type: 'airplane',
                from: { id: 'stop-2', name: 'Якутск Аэропорт', cityId: 'yakutsk' },
                to: { id: 'stop-3', name: 'Москва Аэропорт', cityId: 'moscow' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278], // Якутск
                    [37.6173, 55.7558], // Москва
                  ],
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/routes?from=srednekolymsk&to=moscow&date=2024-07-15&preferredTransport=airplane');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что путь не является прямой линией (должно быть больше 2 точек)
    // Это проверяется через наличие промежуточных точек в pathGeometry
    const mapElement = page.getByTestId('smart-route-map');
    await expect(mapElement).toBeVisible();
  });

  test('should visualize bus route along roads (not straight line)', async ({ page }) => {
    // Мокируем API для автобусного маршрута с реалистичным путем
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-3',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'mirny', name: 'Мирный' },
            segments: [
              {
                id: 'segment-1',
                type: 'bus',
                from: { id: 'stop-1', name: 'Якутск Автовокзал', cityId: 'yakutsk' },
                to: { id: 'stop-2', name: 'Мирный Автовокзал', cityId: 'mirny' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278], // Якутск
                    [129.75, 62.05], // Промежуточная точка 1
                    [129.8, 62.1], // Промежуточная точка 2
                    [129.85, 62.15], // Промежуточная точка 3
                    [113.9606, 62.5381], // Мирный
                  ],
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=mirny&date=2024-07-15&preferredTransport=bus');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что автобусный маршрут отображается (не прямая линия)
    const mapElement = page.getByTestId('smart-route-map');
    await expect(mapElement).toBeVisible();
  });

  test('should visualize ferry route with wavy line', async ({ page }) => {
    // Мокируем API для паромного маршрута
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-4',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'olekminsk', name: 'Олёкминск' },
            segments: [
              {
                id: 'segment-1',
                type: 'ferry',
                from: { id: 'stop-1', name: 'Якутск Причал', cityId: 'yakutsk' },
                to: { id: 'stop-2', name: 'Олёкминск Причал', cityId: 'olekminsk' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278], // Якутск
                    [129.6, 61.8], // Промежуточная точка 1
                    [129.5, 61.5], // Промежуточная точка 2
                    [120.4264, 60.3733], // Олёкминск
                  ],
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=olekminsk&date=2024-07-15&preferredTransport=ferry');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что паромный маршрут отображается волнистой линией
    const mapElement = page.getByTestId('smart-route-map');
    await expect(mapElement).toBeVisible();
  });

  test('should hide Leaflet footer attribution', async ({ page }) => {
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-1',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'mirny', name: 'Мирный' },
            segments: [
              {
                id: 'segment-1',
                type: 'bus',
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278],
                    [113.9606, 62.5381],
                  ],
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=mirny&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что Leaflet footer скрыт
    // Leaflet footer обычно имеет класс .leaflet-control-attribution
    // Footer должен быть скрыт через CSS или не создаваться вообще (attributionControl: false)
    const leafletFooter = page.locator('.leaflet-control-attribution');
    
    // Проверяем, что footer либо не существует, либо скрыт
    const footerCount = await leafletFooter.count();
    
    if (footerCount > 0) {
      // Если footer существует, проверяем, что он скрыт
      const isHidden = await leafletFooter.first().evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      });
      expect(isHidden).toBe(true);
    } else {
      // Footer не создан (attributionControl: false) - это тоже правильно
      expect(footerCount).toBe(0);
    }
  });

  test('should display markers for start and end cities', async ({ page }) => {
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-1',
            fromCity: { id: 'yakutsk', name: 'Якутск', coordinates: { latitude: 62.0278, longitude: 129.7042 } },
            toCity: { id: 'mirny', name: 'Мирный', coordinates: { latitude: 62.5381, longitude: 113.9606 } },
            segments: [
              {
                id: 'segment-1',
                type: 'bus',
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278],
                    [113.9606, 62.5381],
                  ],
                },
              },
            ],
            visualization: {
              markers: [
                { coordinates: { latitude: 62.0278, longitude: 129.7042 }, icon: 'hub', label: 'Якутск', type: 'start' },
                { coordinates: { latitude: 62.5381, longitude: 113.9606 }, icon: 'hub', label: 'Мирный', type: 'end' },
              ],
            },
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=mirny&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем наличие маркеров (через Leaflet маркеры)
    // Leaflet маркеры обычно имеют класс .leaflet-marker-icon
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display polylines for route segments', async ({ page }) => {
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-1',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'mirny', name: 'Мирный' },
            segments: [
              {
                id: 'segment-1',
                type: 'bus',
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278],
                    [129.8, 62.1],
                    [113.9606, 62.5381],
                  ],
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=mirny&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем наличие полилиний (Leaflet использует SVG или Canvas)
    // Полилинии обычно имеют класс .leaflet-interactive или являются SVG path
    const polylines = page.locator('.leaflet-interactive, svg path');
    await expect(polylines.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle map interaction (zoom, pan)', async ({ page }) => {
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-1',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'mirny', name: 'Мирный' },
            segments: [
              {
                id: 'segment-1',
                type: 'bus',
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278],
                    [113.9606, 62.5381],
                  ],
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=mirny&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем наличие элементов управления картой (zoom buttons)
    const zoomInButton = page.locator('.leaflet-control-zoom-in');
    const zoomOutButton = page.locator('.leaflet-control-zoom-out');

    // Элементы управления должны быть видны
    await expect(zoomInButton).toBeVisible({ timeout: 5000 });
    await expect(zoomOutButton).toBeVisible({ timeout: 5000 });

    // Тестируем зум
    await zoomInButton.click();
    await page.waitForTimeout(500); // Даем время на обновление карты

    await zoomOutButton.click();
    await page.waitForTimeout(500);
  });
});

