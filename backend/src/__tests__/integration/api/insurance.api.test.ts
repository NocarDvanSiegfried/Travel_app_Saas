/**
 * Integration Tests: Insurance API Endpoints
 * 
 * Tests for insurance-related API endpoints with real Express app.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Insurance API Integration', () => {
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

  describe('GET /api/v1/insurance/products', () => {
    it('should return 200 with list of insurance products', async () => {
      const response = await agent
        .get('/api/v1/insurance/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);

      const product = response.body.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('type');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('basePrice');
      expect(product).toHaveProperty('isActive', true);
    });
  });

  describe('POST /api/v1/insurance/offers/route', () => {
    it('should return 200 with insurance offers for route', async () => {
      const requestBody = {
        riskScore: {
          value: 6,
          level: 'medium',
          description: 'Средний риск',
        },
        autoRecommend: true,
      };

      const response = await agent
        .post('/api/v1/insurance/offers/route')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('offers');
      expect(Array.isArray(response.body.offers)).toBe(true);

      if (response.body.offers.length > 0) {
        const offer = response.body.offers[0];
        expect(offer).toHaveProperty('product');
        expect(offer).toHaveProperty('price');
        expect(offer).toHaveProperty('isRecommended');
        expect(offer).toHaveProperty('priority');
        expect(typeof offer.price).toBe('number');
        expect(offer.price).toBeGreaterThan(0);
      }
    });

    it('should return 400 for missing riskScore', async () => {
      const response = await agent
        .post('/api/v1/insurance/offers/route')
        .send({ autoRecommend: true })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid riskScore value', async () => {
      const requestBody = {
        riskScore: {
          value: 15, // Invalid: should be 1-10
          level: 'medium',
          description: 'Invalid risk',
        },
      };

      const response = await agent
        .post('/api/v1/insurance/offers/route')
        .send(requestBody)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return different offers when autoRecommend = false', async () => {
      const riskScore = {
        value: 3,
        level: 'low',
        description: 'Низкий риск',
      };

      const responseWithRecommend = await agent
        .post('/api/v1/insurance/offers/route')
        .send({ riskScore, autoRecommend: true })
        .expect(200);

      const responseWithoutRecommend = await agent
        .post('/api/v1/insurance/offers/route')
        .send({ riskScore, autoRecommend: false })
        .expect(200);

      expect(responseWithoutRecommend.body.offers.length).toBeGreaterThanOrEqual(
        responseWithRecommend.body.offers.length
      );
    });
  });

  describe('POST /api/v1/insurance/offers/segment', () => {
    it('should return 200 with insurance offers for segment', async () => {
      const requestBody = {
        riskScore: {
          value: 7,
          level: 'high',
          description: 'Высокий риск',
        },
        autoRecommend: true,
      };

      const response = await agent
        .post('/api/v1/insurance/offers/segment')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('offers');
      expect(Array.isArray(response.body.offers)).toBe(true);
    });

    it('should return 400 for missing riskScore', async () => {
      const response = await agent
        .post('/api/v1/insurance/offers/segment')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/insurance/calculate', () => {
    it('should return 200 with calculated price', async () => {
      const requestBody = {
        productId: 'insurance-travel',
        riskScore: {
          value: 5,
          level: 'medium',
          description: 'Средний риск',
        },
      };

      const response = await agent
        .post('/api/v1/insurance/calculate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('productId', 'insurance-travel');
      expect(response.body).toHaveProperty('price');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent product', async () => {
      const requestBody = {
        productId: 'non-existent-product',
        riskScore: {
          value: 5,
          level: 'medium',
          description: 'Средний риск',
        },
      };

      const response = await agent
        .post('/api/v1/insurance/calculate')
        .send(requestBody)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing productId', async () => {
      const requestBody = {
        riskScore: {
          value: 5,
          level: 'medium',
          description: 'Средний риск',
        },
      };

      const response = await agent
        .post('/api/v1/insurance/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

