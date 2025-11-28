/**
 * E2E Tests: Risk Assessment and Insurance Products
 * 
 * End-to-end tests for complete risk assessment and insurance product flow.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from '../integration/api/api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Risk Assessment and Insurance E2E', () => {
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

  describe('Complete Flow: Route Risk Assessment → Insurance Offers', () => {
    it('should assess route risk and return insurance offers', async () => {
      // Step 1: Assess route risk
      const route = {
        routeId: 'test-route-e2e',
        segments: [
          {
            segmentId: 'seg-1',
            fromStopId: 'stop-moscow',
            toStopId: 'stop-spb',
            routeId: 'route-1',
            transportType: 'train',
            distance: 650,
            estimatedDuration: 240,
            basePrice: 2000,
          },
        ],
        totalDuration: 240,
        totalPrice: 2000,
        from: 'Москва',
        to: 'Санкт-Петербург',
      };

      const riskResponse = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route })
        .expect(200);

      expect(riskResponse.body).toHaveProperty('riskScore');
      expect(riskResponse.body.riskScore).toHaveProperty('value');
      expect(riskResponse.body.riskScore).toHaveProperty('level');
      expect(riskResponse.body.riskScore.value).toBeGreaterThanOrEqual(1);
      expect(riskResponse.body.riskScore.value).toBeLessThanOrEqual(10);

      // Step 2: Get insurance offers based on risk
      const insuranceResponse = await agent
        .post('/api/v1/insurance/offers/route')
        .send({
          riskScore: riskResponse.body.riskScore,
          autoRecommend: true,
        })
        .expect(200);

      expect(insuranceResponse.body).toHaveProperty('success', true);
      expect(insuranceResponse.body).toHaveProperty('offers');
      expect(Array.isArray(insuranceResponse.body.offers)).toBe(true);

      // Step 3: Calculate price for specific product
      if (insuranceResponse.body.offers.length > 0) {
        const firstOffer = insuranceResponse.body.offers[0];
        const priceResponse = await agent
          .post('/api/v1/insurance/calculate')
          .send({
            productId: firstOffer.product.id,
            riskScore: riskResponse.body.riskScore,
          })
          .expect(200);

        expect(priceResponse.body).toHaveProperty('success', true);
        expect(priceResponse.body).toHaveProperty('price');
        expect(priceResponse.body.price).toBe(firstOffer.price);
      }
    });

    it('should assess segment risk and return insurance offers', async () => {
      // Step 1: Assess segment risk
      const segment = {
        segmentId: 'seg-e2e-1',
        fromStopId: 'stop-a',
        toStopId: 'stop-b',
        routeId: 'route-1',
        transportType: 'airplane',
        distance: 1000,
        estimatedDuration: 120,
        basePrice: 5000,
      };

      const segmentRiskResponse = await agent
        .post('/api/v1/routes/risk/segment')
        .send({
          segment,
          date: '2024-12-20',
          passengers: 1,
        })
        .expect(200);

      expect(segmentRiskResponse.body).toHaveProperty('riskScore');
      expect(segmentRiskResponse.body.riskScore).toHaveProperty('value');

      // Step 2: Get insurance offers for segment
      const insuranceResponse = await agent
        .post('/api/v1/insurance/offers/segment')
        .send({
          riskScore: segmentRiskResponse.body.riskScore,
          autoRecommend: true,
        })
        .expect(200);

      expect(insuranceResponse.body).toHaveProperty('success', true);
      expect(insuranceResponse.body).toHaveProperty('offers');
    });
  });

  describe('Risk Score Validation', () => {
    it('should return risk score in valid range (1-10)', async () => {
      const route = {
        routeId: 'test-validation',
        segments: [
          {
            segmentId: 'seg-1',
            fromStopId: 'stop-a',
            toStopId: 'stop-b',
            routeId: 'route-1',
            transportType: 'bus',
            distance: 300,
            estimatedDuration: 180,
            basePrice: 1000,
          },
        ],
        from: 'Москва',
        to: 'Казань',
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route })
        .expect(200);

      const riskValue = response.body.riskScore?.value;
      expect(riskValue).toBeGreaterThanOrEqual(1);
      expect(riskValue).toBeLessThanOrEqual(10);
    });

    it('should return valid risk level', async () => {
      const route = {
        routeId: 'test-level',
        segments: [
          {
            segmentId: 'seg-1',
            fromStopId: 'stop-a',
            toStopId: 'stop-b',
            routeId: 'route-1',
            transportType: 'train',
            distance: 500,
            estimatedDuration: 120,
            basePrice: 1500,
          },
        ],
        from: 'Москва',
        to: 'Санкт-Петербург',
      };

      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({ route })
        .expect(200);

      const riskLevel = response.body.riskScore?.level;
      const validLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
      expect(validLevels).toContain(riskLevel);
    });
  });

  describe('Insurance Price Calculation Consistency', () => {
    it('should return consistent prices for same risk score', async () => {
      const riskScore = {
        value: 6,
        level: 'medium',
        description: 'Средний риск',
      };

      const response1 = await agent
        .post('/api/v1/insurance/calculate')
        .send({
          productId: 'insurance-travel',
          riskScore,
        })
        .expect(200);

      const response2 = await agent
        .post('/api/v1/insurance/calculate')
        .send({
          productId: 'insurance-travel',
          riskScore,
        })
        .expect(200);

      expect(response1.body.price).toBe(response2.body.price);
    });

    it('should return higher price for higher risk', async () => {
      const lowRisk = {
        value: 3,
        level: 'low',
        description: 'Низкий риск',
      };

      const highRisk = {
        value: 8,
        level: 'high',
        description: 'Высокий риск',
      };

      const lowPriceResponse = await agent
        .post('/api/v1/insurance/calculate')
        .send({
          productId: 'insurance-travel',
          riskScore: lowRisk,
        })
        .expect(200);

      const highPriceResponse = await agent
        .post('/api/v1/insurance/calculate')
        .send({
          productId: 'insurance-travel',
          riskScore: highRisk,
        })
        .expect(200);

      expect(highPriceResponse.body.price).toBeGreaterThan(
        lowPriceResponse.body.price
      );
    });
  });
});


