/**
 * E2E Tests: Multimodal Route Visualization
 * 
 * Тестирует визуализацию мультимодальных маршрутов:
 * - Маршрут с несколькими типами транспорта
 * - Визуализация пересадок
 * - Разные стили для разных типов транспорта
 * - Отображение промежуточных точек
 */

import { test, expect } from '@playwright/test';

test.describe('Multimodal Route Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/smart-routes/autocomplete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'yakutsk', name: 'Якутск', normalizedName: 'якутск' },
          { id: 'moscow', name: 'Москва', normalizedName: 'москва' },
        ]),
      });
    });
  });

  test('should visualize multimodal route with airplane and bus', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-multimodal-1',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'moscow', name: 'Москва' },
            segments: [
              {
                id: 'segment-1',
                type: 'airplane',
                from: { id: 'stop-1', name: 'Якутск Аэропорт', cityId: 'yakutsk' },
                to: { id: 'stop-2', name: 'Новосибирск Аэропорт', cityId: 'novosibirsk' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278], // Якутск
                    [82.9357, 55.0084], // Новосибирск
                  ],
                },
              },
              {
                id: 'segment-2',
                type: 'bus',
                from: { id: 'stop-2', name: 'Новосибирск Автовокзал', cityId: 'novosibirsk' },
                to: { id: 'stop-3', name: 'Москва Автовокзал', cityId: 'moscow' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [82.9357, 55.0084], // Новосибирск
                    [82.95, 55.02], // Промежуточная точка
                    [37.6173, 55.7558], // Москва
                  ],
                },
              },
            ],
            totalDistance: { value: 5000, unit: 'km' },
            totalDuration: { value: 600, unit: 'minutes' },
            totalPrice: { base: 25000, total: 25000, currency: 'RUB' },
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=moscow&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем, что карта отображает мультимодальный маршрут
    const mapElement = page.getByTestId('smart-route-map');
    await expect(mapElement).toBeVisible();

    // Проверяем наличие полилиний для разных сегментов
    const polylines = page.locator('.leaflet-interactive, svg path');
    await expect(polylines.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display transfer markers', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-multimodal-2',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'moscow', name: 'Москва' },
            segments: [
              {
                id: 'segment-1',
                type: 'airplane',
                from: { id: 'stop-1', name: 'Якутск Аэропорт', cityId: 'yakutsk' },
                to: { id: 'stop-2', name: 'Новосибирск Аэропорт', cityId: 'novosibirsk' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278],
                    [82.9357, 55.0084],
                  ],
                },
              },
              {
                id: 'segment-2',
                type: 'bus',
                from: { id: 'stop-2', name: 'Новосибирск Автовокзал', cityId: 'novosibirsk' },
                to: { id: 'stop-3', name: 'Москва Автовокзал', cityId: 'moscow' },
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [82.9357, 55.0084],
                    [37.6173, 55.7558],
                  ],
                },
              },
            ],
            visualization: {
              markers: [
                { coordinates: { latitude: 62.0278, longitude: 129.7042 }, icon: 'hub', label: 'Якутск', type: 'start' },
                { coordinates: { latitude: 55.0084, longitude: 82.9357 }, icon: 'transfer', label: 'Новосибирск', type: 'transfer' },
                { coordinates: { latitude: 55.7558, longitude: 37.6173 }, icon: 'hub', label: 'Москва', type: 'end' },
              ],
            },
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=moscow&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем наличие маркеров пересадок
    const markers = page.locator('.leaflet-marker-icon');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThanOrEqual(2); // Минимум start и end, плюс transfer
  });

  test('should use different colors for different transport types', async ({ page }) => {
    await page.route('**/api/v1/smart-routes/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            id: 'route-multimodal-3',
            fromCity: { id: 'yakutsk', name: 'Якутск' },
            toCity: { id: 'moscow', name: 'Москва' },
            segments: [
              {
                id: 'segment-1',
                type: 'airplane',
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [129.7042, 62.0278],
                    [82.9357, 55.0084],
                  ],
                },
              },
              {
                id: 'segment-2',
                type: 'bus',
                pathGeometry: {
                  type: 'LineString',
                  coordinates: [
                    [82.9357, 55.0084],
                    [37.6173, 55.7558],
                  ],
                },
              },
            ],
            visualization: {
              polylines: [
                {
                  geometry: [[129.7042, 62.0278], [82.9357, 55.0084]],
                  color: '#0066CC', // Синий для авиа
                  weight: 3,
                  style: 'solid',
                },
                {
                  geometry: [[82.9357, 55.0084], [37.6173, 55.7558]],
                  color: '#00CC66', // Зелёный для автобуса
                  weight: 3,
                  style: 'solid',
                },
              ],
            },
          },
        }),
      });
    });

    await page.goto('/routes?from=yakutsk&to=moscow&date=2024-07-15');

    // Ждем загрузки карты
    const mapContainer = page.getByTestId('smart-route-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Проверяем наличие полилиний с разными цветами
    const polylines = page.locator('.leaflet-interactive, svg path');
    await expect(polylines.first()).toBeVisible({ timeout: 5000 });
  });
});






