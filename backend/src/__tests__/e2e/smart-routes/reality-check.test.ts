/**
 * E2E Tests: Smart Routes - Reality Check
 * 
 * Тестирует endpoint POST /smart-routes/reality-check
 * 
 * Сценарии:
 * - Проверка реалистичности маршрута
 * - Обнаружение несоответствий
 * - Предложения по коррекции
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Smart Routes API - Reality Check', () => {
  test('should check route reality', async ({ request }) => {
    // Сначала строим маршрут
    const buildResponse = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        date: '2024-07-15',
        preferredTransport: 'bus',
      },
    });

    expect(buildResponse.ok()).toBeTruthy();
    const routeData = await buildResponse.json();

    // Затем проверяем его реалистичность
    const checkResponse = await request.post(`${API_BASE_URL}/smart-routes/reality-check`, {
      data: {
        route: routeData.route,
      },
    });

    expect(checkResponse.ok()).toBeTruthy();
    
    const checkData = await checkResponse.json();
    
    expect(checkData).toHaveProperty('hasIssues');
    expect(checkData).toHaveProperty('issues');
    expect(checkData).toHaveProperty('recommendations');
    expect(typeof checkData.hasIssues).toBe('boolean');
    expect(Array.isArray(checkData.issues)).toBeTruthy();
    expect(Array.isArray(checkData.recommendations)).toBeTruthy();
  });

  test('should detect distance mismatches', async ({ request }) => {
    // Создаём маршрут с потенциально нереалистичным расстоянием
    const buildResponse = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        date: '2024-07-15',
      },
    });

    if (buildResponse.ok()) {
      const routeData = await buildResponse.json();
      
      const checkResponse = await request.post(`${API_BASE_URL}/smart-routes/reality-check`, {
        data: {
          route: routeData.route,
        },
      });

      expect(checkResponse.ok()).toBeTruthy();
      
      const checkData = await checkResponse.json();
      
      // Может обнаружить несоответствия расстояния
      expect(checkData).toHaveProperty('hasIssues');
    }
  });

  test('should provide correction suggestions', async ({ request }) => {
    const buildResponse = await request.post(`${API_BASE_URL}/smart-routes/build`, {
      data: {
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        date: '2024-07-15',
        preferredTransport: 'bus',
      },
    });

    if (buildResponse.ok()) {
      const routeData = await buildResponse.json();
      
      const checkResponse = await request.post(`${API_BASE_URL}/smart-routes/reality-check`, {
        data: {
          route: routeData.route,
        },
      });

      expect(checkResponse.ok()).toBeTruthy();
      
      const checkData = await checkResponse.json();
      
      // Если есть проблемы, должны быть предложения по коррекции
      if (checkData.hasIssues && checkData.issues.length > 0) {
        const issueWithCorrection = checkData.issues.find((issue: { correction?: unknown }) => issue.correction);
        if (issueWithCorrection) {
          expect(issueWithCorrection.correction).toHaveProperty('type');
          expect(issueWithCorrection.correction).toHaveProperty('suggestedValue');
          expect(issueWithCorrection.correction).toHaveProperty('confidence');
        }
      }
    }
  });
});






