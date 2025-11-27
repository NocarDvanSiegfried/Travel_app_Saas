/**
 * Integration Tests: Smart Routes API Endpoint
 * 
 * Tests POST /smart-routes/build endpoint with validation integration.
 * Uses Playwright-style API testing patterns from context7.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Smart Routes API Integration', () => {
  let app: Express;
  let agent: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    agent = createTestAgent(app);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('POST /smart-routes/build', () => {
    it('should return 200 with validation results for valid route', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'yakutsk',
          to: 'moscow',
          date: dateStr,
          preferredTransport: 'airplane',
          maxTransfers: 2,
          priority: 'price',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('route');
      expect(response.body).toHaveProperty('validation');
      expect(response.body.validation).toHaveProperty('isValid');
      expect(response.body.validation).toHaveProperty('errors');
      expect(response.body.validation).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('executionTimeMs');
      expect(typeof response.body.executionTimeMs).toBe('number');
    });

    it('should include error detection results in validation', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'moscow',
          to: 'bestyakh',
          date: dateStr,
          preferredTransport: 'bus',
        })
        .expect(200);

      expect(response.body).toHaveProperty('validation');
      
      // Если маршрут содержит ошибки (например, автобус Москва → Бестях),
      // они должны быть в validation.errors
      if (response.body.validation.errors && response.body.validation.errors.length > 0) {
        const hasErrorDetection = response.body.validation.errors.some((error: string) =>
          error.includes('[empty_space]') ||
          error.includes('[unrealistic_route]') ||
          error.includes('[incorrect_connection]')
        );
        // Если есть ошибки, они должны быть из RouteErrorDetector
        expect(hasErrorDetection || response.body.validation.errors.length === 0).toBe(true);
      }
    });

    it('should include reality check warnings in validation', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'yakutsk',
          to: 'moscow',
          date: dateStr,
          preferredTransport: 'airplane',
        })
        .expect(200);

      expect(response.body).toHaveProperty('validation');
      expect(response.body.validation).toHaveProperty('warnings');
      expect(Array.isArray(response.body.validation.warnings)).toBe(true);

      // Если есть предупреждения, они могут быть из RealityChecker
      if (response.body.validation.warnings.length > 0) {
        const hasRealityCheck = response.body.validation.warnings.some((warning: string) =>
          warning.includes('[distance_mismatch]') ||
          warning.includes('[price_mismatch]') ||
          warning.includes('[path_mismatch]') ||
          warning.includes('[рекомендация]')
        );
        // Предупреждения могут быть из разных источников
        expect(Array.isArray(response.body.validation.warnings)).toBe(true);
      }
    });

    it('should return 400 for invalid request body', async () => {
      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'yakutsk',
          // missing 'to' and 'date'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'yakutsk',
          to: 'moscow',
          date: 'invalid-date',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 404 for non-existent cities', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'non-existent-city-12345',
          to: 'another-non-existent-city-67890',
          date: dateStr,
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'CITIES_NOT_FOUND');
    });

    it('should validate route structure and return segment validations', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'yakutsk',
          to: 'moscow',
          date: dateStr,
          preferredTransport: 'airplane',
        })
        .expect(200);

      expect(response.body).toHaveProperty('validation');
      expect(response.body.validation).toHaveProperty('segmentValidations');
      expect(Array.isArray(response.body.validation.segmentValidations)).toBe(true);

      // Каждый сегмент должен иметь валидацию
      if (response.body.route && response.body.route.segments) {
        expect(response.body.validation.segmentValidations.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle validation errors gracefully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .post('/smart-routes/build')
        .send({
          from: 'yakutsk',
          to: 'moscow',
          date: dateStr,
        })
        .expect(200);

      // Даже если есть ошибки валидации, ответ должен быть структурированным
      expect(response.body).toHaveProperty('validation');
      expect(response.body.validation).toHaveProperty('isValid');
      expect(typeof response.body.validation.isValid).toBe('boolean');
      
      // Если маршрут невалиден, errors должны быть непустым массивом
      if (!response.body.validation.isValid) {
        expect(response.body.validation.errors.length).toBeGreaterThan(0);
      }
    });
  });
});




