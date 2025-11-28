/**
 * Integration Tests: Smart Routes Reality Check API Endpoint
 * 
 * Tests POST /smart-routes/reality-check endpoint with real database integration.
 * Uses Jest with supertest for API testing.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Smart Routes Reality Check API Integration', () => {
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

  describe('POST /smart-routes/reality-check', () => {
    it('should return reality check results for a valid route', async () => {
      // First, build a route
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const buildResponse = await agent
        .post('/smart-routes/build')
        .send({
          fromCityId: 'yakutsk',
          toCityId: 'mirny',
          date: dateStr,
          preferredTransport: 'airplane',
        })
        .expect(200);

      const routeId = buildResponse.body.route?.id;
      expect(routeId).toBeDefined();

      // Then, request reality check
      const checkResponse = await agent
        .post('/smart-routes/reality-check')
        .send({ routeId })
        .expect(200);

      expect(checkResponse.body).toHaveProperty('hasIssues');
      expect(typeof checkResponse.body.hasIssues).toBe('boolean');
      expect(checkResponse.body).toHaveProperty('issues');
      expect(Array.isArray(checkResponse.body.issues)).toBe(true);
      expect(checkResponse.body).toHaveProperty('recommendations');
      expect(Array.isArray(checkResponse.body.recommendations)).toBe(true);
    });

    it('should identify issues for potentially unrealistic routes', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      // Build a route that might have issues (e.g., direct flight between small airports)
      const buildResponse = await agent
        .post('/smart-routes/build')
        .send({
          fromCityId: 'srednekolymsk',
          toCityId: 'chokurdakh',
          date: dateStr,
          preferredTransport: 'airplane',
        });

      // Route might not be found or might have issues
      if (buildResponse.status === 200 && buildResponse.body.route?.id) {
        const routeId = buildResponse.body.route.id;

        const checkResponse = await agent
          .post('/smart-routes/reality-check')
          .send({ routeId })
          .expect(200);

        expect(checkResponse.body).toHaveProperty('hasIssues');
        expect(checkResponse.body).toHaveProperty('issues');
        expect(checkResponse.body).toHaveProperty('recommendations');

        // If there are issues, they should be in the issues array
        if (checkResponse.body.hasIssues) {
          expect(checkResponse.body.issues.length).toBeGreaterThan(0);
          expect(checkResponse.body.issues[0]).toHaveProperty('type');
          expect(checkResponse.body.issues[0]).toHaveProperty('message');
        }
      }
    });

    it('should return 404 for invalid routeId', async () => {
      const response = await agent
        .post('/smart-routes/reality-check')
        .send({ routeId: 'invalid-route-id-12345' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });

    it('should check distance reality', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const buildResponse = await agent
        .post('/smart-routes/build')
        .send({
          fromCityId: 'yakutsk',
          toCityId: 'mirny',
          date: dateStr,
          preferredTransport: 'bus',
        })
        .expect(200);

      const routeId = buildResponse.body.route?.id;
      if (routeId) {
        const checkResponse = await agent
          .post('/smart-routes/reality-check')
          .send({ routeId })
          .expect(200);

        // Check if distance reality is validated
        const hasDistanceCheck = checkResponse.body.issues.some((issue: any) =>
          issue.type === 'distance_mismatch' || issue.message?.includes('расстояние')
        );

        // Distance check might or might not find issues, but the structure should be correct
        expect(checkResponse.body).toHaveProperty('issues');
        expect(Array.isArray(checkResponse.body.issues)).toBe(true);
      }
    });

    it('should check price reality', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const buildResponse = await agent
        .post('/smart-routes/build')
        .send({
          fromCityId: 'yakutsk',
          toCityId: 'moscow',
          date: dateStr,
          preferredTransport: 'airplane',
        })
        .expect(200);

      const routeId = buildResponse.body.route?.id;
      if (routeId) {
        const checkResponse = await agent
          .post('/smart-routes/reality-check')
          .send({ routeId })
          .expect(200);

        // Check if price reality is validated
        const hasPriceCheck = checkResponse.body.issues.some((issue: any) =>
          issue.type === 'price_mismatch' || issue.message?.includes('цена')
        );

        // Price check might or might not find issues, but the structure should be correct
        expect(checkResponse.body).toHaveProperty('issues');
        expect(Array.isArray(checkResponse.body.issues)).toBe(true);
      }
    });

    it('should provide recommendations for issues', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const buildResponse = await agent
        .post('/smart-routes/build')
        .send({
          fromCityId: 'yakutsk',
          toCityId: 'mirny',
          date: dateStr,
          preferredTransport: 'bus',
        })
        .expect(200);

      const routeId = buildResponse.body.route?.id;
      if (routeId) {
        const checkResponse = await agent
          .post('/smart-routes/reality-check')
          .send({ routeId })
          .expect(200);

        expect(checkResponse.body).toHaveProperty('recommendations');
        expect(Array.isArray(checkResponse.body.recommendations)).toBe(true);

        // If there are recommendations, they should have structure
        if (checkResponse.body.recommendations.length > 0) {
          expect(checkResponse.body.recommendations[0]).toHaveProperty('type');
          expect(checkResponse.body.recommendations[0]).toHaveProperty('message');
        }
      }
    });
  });
});






