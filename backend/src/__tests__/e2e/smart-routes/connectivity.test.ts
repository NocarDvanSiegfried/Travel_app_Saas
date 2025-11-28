/**
 * E2E Tests: Smart Routes - Connectivity
 * 
 * Тестирует endpoint GET /smart-routes/connectivity
 * 
 * Сценарии:
 * - Проверка связности графа
 * - Обнаружение изолированных городов
 * - Автоматическое добавление недостающих связей
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Smart Routes API - Connectivity', () => {
  test('should check connectivity status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/connectivity`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data).toHaveProperty('isConnected');
    expect(data).toHaveProperty('componentCount');
    expect(data).toHaveProperty('components');
    expect(data).toHaveProperty('isolatedCities');
    expect(typeof data.isConnected).toBe('boolean');
    expect(typeof data.componentCount).toBe('number');
    expect(Array.isArray(data.components)).toBeTruthy();
    expect(Array.isArray(data.isolatedCities)).toBeTruthy();
  });

  test('should guarantee connectivity', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/smart-routes/connectivity/guarantee`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data).toHaveProperty('isConnected');
    expect(data).toHaveProperty('addedConnections');
    expect(Array.isArray(data.addedConnections)).toBeTruthy();
    
    // После гарантии связности граф должен быть связным
    expect(data.isConnected).toBe(true);
  });

  test('should return connectivity details', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/connectivity`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Проверяем структуру данных
    if (data.components.length > 0) {
      expect(Array.isArray(data.components[0])).toBeTruthy();
    }
    
    if (data.isolatedCities.length > 0) {
      expect(typeof data.isolatedCities[0]).toBe('string');
    }
  });
});






