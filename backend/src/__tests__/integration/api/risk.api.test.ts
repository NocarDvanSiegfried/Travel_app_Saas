/**
 * Integration Tests: Risk Assessment API Endpoint
 * 
 * Tests /api/v1/routes/risk/assess endpoint with real Express app and database connections.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Risk Assessment API Integration', () => {
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

  describe('POST /api/v1/routes/risk/assess', () => {
    it('should return 200 with risk assessment for valid route (positive scenario)', async () => {
      const validRoute = {
        routeId: 'test-route-1',
        segments: [
          {
            segmentId: 'seg-1',
            from: 'Москва',
            to: 'Санкт-Петербург',
            transportType: 'train',
            departureTime: '2024-12-20T10:00:00Z',
            arrivalTime: '2024-12-20T14:00:00Z',
            duration: 240,
            price: 1500,
            carrier: 'РЖД',
            flightNumber: '001',
          },
        ],
        totalDuration: 240,
        totalPrice: 1500,
        from: 'Москва',
        to: 'Санкт-Петербург',
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route: validRoute })
        .expect(200);

      expect(response.body).toHaveProperty('riskLevel');
      expect(typeof response.body.riskLevel).toBe('number');
      expect(response.body.riskLevel).toBeGreaterThanOrEqual(0);
      expect(response.body.riskLevel).toBeLessThanOrEqual(1);
    });

    it('should accept route object directly (without nesting) (positive scenario)', async () => {
      const validRoute = {
        routeId: 'test-route-2',
        segments: [
          {
            segmentId: 'seg-1',
            from: 'Москва',
            to: 'Казань',
            transportType: 'bus',
            duration: 180,
            price: 800,
          },
        ],
        from: 'Москва',
        to: 'Казань',
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send(validRoute)
        .expect(200);

      expect(response.body).toHaveProperty('riskLevel');
      expect(typeof response.body.riskLevel).toBe('number');
    });

    it('should return 400 for missing routeId (negative scenario)', async () => {
      const invalidRoute = {
        segments: [
          {
            segmentId: 'seg-1',
            from: 'Москва',
            to: 'Санкт-Петербург',
            transportType: 'train',
          },
        ],
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route: invalidRoute })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for empty segments array (negative scenario)', async () => {
      const invalidRoute = {
        routeId: 'test-route-3',
        segments: [],
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route: invalidRoute })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for missing segmentId in segment (negative scenario)', async () => {
      const invalidRoute = {
        routeId: 'test-route-4',
        segments: [
          {
            from: 'Москва',
            to: 'Санкт-Петербург',
            transportType: 'train',
          },
        ],
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route: invalidRoute })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid request body format (negative scenario)', async () => {
      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for missing request body (negative scenario)', async () => {
      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });
});

