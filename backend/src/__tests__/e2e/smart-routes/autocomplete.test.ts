/**
 * E2E Tests: Smart Routes - Autocomplete
 * 
 * Тестирует endpoint GET /smart-routes/autocomplete
 * 
 * Сценарии:
 * - Автодополнение по частичному названию
 * - Автодополнение с административной структурой
 * - Фильтрация результатов
 * - Ограничение количества результатов
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Smart Routes API - Autocomplete', () => {
  test('should return cities for partial name', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=якут`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
    
    // Проверяем, что результаты содержат запрос
    const firstResult = data[0];
    expect(firstResult).toHaveProperty('id');
    expect(firstResult).toHaveProperty('name');
    expect(firstResult.name.toLowerCase()).toContain('якут');
  });

  test('should return cities with administrative structure', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=олёкминск`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    if (data.length > 0) {
      const city = data[0];
      expect(city).toHaveProperty('administrative');
      expect(city.administrative).toHaveProperty('region');
      expect(city.administrative).toHaveProperty('district');
    }
  });

  test('should limit results count', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=город&limit=5`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data.length).toBeLessThanOrEqual(5);
  });

  test('should return empty array for no matches', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=xyz123nonexistent`);

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(0);
  });

  test('should handle empty query', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=`);

    // Может вернуть пустой массив или ошибку
    expect([200, 400]).toContain(response.status());
  });

  test('should be case insensitive', async ({ request }) => {
    const lowerResponse = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=якутск`);
    const upperResponse = await request.get(`${API_BASE_URL}/smart-routes/autocomplete?query=ЯКУТСК`);

    expect(lowerResponse.ok()).toBeTruthy();
    expect(upperResponse.ok()).toBeTruthy();
    
    const lowerData = await lowerResponse.json();
    const upperData = await upperResponse.json();
    
    // Результаты должны быть одинаковыми (или похожими)
    expect(lowerData.length).toBe(upperData.length);
  });
});





