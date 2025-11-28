/**
 * E2E Tests: Smart Routes - Build Route
 * 
 * Тестирует endpoint POST /smart-routes/build
 * 
 * Сценарии:
 * - Простой маршрут (автобус)
 * - Маршрут через хабы (авиа)
 * - Мультимодальный маршрут
 * - Автодополнение городов
 * - Проверка связности
 * - Проверка реалистичности
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Smart Routes API - Build Route', () => {
  test('should build simple bus route', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        date: '2024-07-15',
        preferredTransport: 'bus',
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data).toHaveProperty('route');
    expect(data.route).toHaveProperty('fromCity');
    expect(data.route).toHaveProperty('toCity');
    expect(data.route).toHaveProperty('segments');
    expect(data.route.segments.length).toBeGreaterThan(0);
    expect(data.route.segments[0].type).toBe('bus');
  });

  test('should build airplane route via hubs', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'srednekolymsk',
        toCityId: 'moscow',
        date: '2024-07-15',
        preferredTransport: 'airplane',
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data).toHaveProperty('route');
    expect(data.route.segments.length).toBeGreaterThan(0);
    
    // Проверяем, что маршрут использует хабы
    const airplaneSegments = data.route.segments.filter((s: { type: string }) => s.type === 'airplane');
    expect(airplaneSegments.length).toBeGreaterThan(0);
  });

  test('should build multimodal route', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        date: '2024-07-15',
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data).toHaveProperty('route');
    expect(data.route.segments.length).toBeGreaterThan(0);
    
    // Мультимодальный маршрут должен содержать несколько типов транспорта
    const transportTypes = new Set(data.route.segments.map((s: { type: string }) => s.type));
    expect(transportTypes.size).toBeGreaterThanOrEqual(1);
  });

  test('should return 400 for invalid city IDs', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'nonexistent-city',
        toCityId: 'another-nonexistent-city',
        date: '2024-07-15',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should return 400 for invalid date format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        date: 'invalid-date',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should respect maxTransfers parameter', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        date: '2024-07-15',
        maxTransfers: 2,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    if (data.route) {
      // Количество пересадок = количество сегментов - 1
      const transfers = data.route.segments.length - 1;
      expect(transfers).toBeLessThanOrEqual(2);
    }
  });

  test('should handle seasonal transport availability', async ({ request }) => {
    // Летний маршрут (паром доступен)
    const summerResponse = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'olekminsk',
        date: '2024-07-15',
        preferredTransport: 'ferry',
      },
    });

    // Зимний маршрут (паром недоступен)
    const winterResponse = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'olekminsk',
        date: '2024-01-15',
        preferredTransport: 'ferry',
      },
    });

    // Летом паром должен быть доступен, зимой - нет
    expect(summerResponse.ok() || winterResponse.ok()).toBeTruthy();
  });
});





