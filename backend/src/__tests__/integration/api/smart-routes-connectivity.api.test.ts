/**
 * Integration Tests: Smart Routes Connectivity API Endpoint
 * 
 * Tests GET /smart-routes/connectivity endpoint with real database integration.
 * Uses Jest with supertest for API testing.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Smart Routes Connectivity API Integration', () => {
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

  describe('GET /smart-routes/connectivity', () => {
    it('should return connectivity status', async () => {
      const response = await agent
        .get('/smart-routes/connectivity')
        .expect(200);

      expect(response.body).toHaveProperty('isConnected');
      expect(typeof response.body.isConnected).toBe('boolean');
      expect(response.body).toHaveProperty('componentCount');
      expect(typeof response.body.componentCount).toBe('number');
      expect(response.body).toHaveProperty('components');
      expect(Array.isArray(response.body.components)).toBe(true);
      expect(response.body).toHaveProperty('isolatedCities');
      expect(Array.isArray(response.body.isolatedCities)).toBe(true);
    });

    it('should identify isolated cities if any', async () => {
      const response = await agent
        .get('/smart-routes/connectivity')
        .expect(200);

      expect(response.body).toHaveProperty('isolatedCities');
      expect(Array.isArray(response.body.isolatedCities)).toBe(true);

      // Если есть изолированные города, они должны быть в массиве
      if (response.body.isolatedCities.length > 0) {
        expect(response.body.isolatedCities[0]).toHaveProperty('id');
        expect(response.body.isolatedCities[0]).toHaveProperty('name');
      }
    });

    it('should identify multiple components if not fully connected', async () => {
      const response = await agent
        .get('/smart-routes/connectivity')
        .expect(200);

      expect(response.body).toHaveProperty('componentCount');
      expect(response.body.componentCount).toBeGreaterThanOrEqual(1);

      expect(response.body).toHaveProperty('components');
      expect(Array.isArray(response.body.components)).toBe(true);

      // Если есть несколько компонентов, они должны быть в массиве
      if (response.body.componentCount > 1) {
        expect(response.body.components.length).toBeGreaterThan(1);
        expect(Array.isArray(response.body.components[0])).toBe(true);
      }
    });

    it('should return added connections if connectivity was guaranteed', async () => {
      const response = await agent
        .get('/smart-routes/connectivity')
        .expect(200);

      expect(response.body).toHaveProperty('addedConnections');
      expect(Array.isArray(response.body.addedConnections)).toBe(true);

      // Если были добавлены связи, они должны иметь структуру CityConnection
      if (response.body.addedConnections.length > 0) {
        expect(response.body.addedConnections[0]).toHaveProperty('fromCityId');
        expect(response.body.addedConnections[0]).toHaveProperty('toCityId');
        expect(response.body.addedConnections[0]).toHaveProperty('transportType');
      }
    });

    it('should return connectivity graph structure', async () => {
      const response = await agent
        .get('/smart-routes/connectivity')
        .expect(200);

      expect(response.body).toHaveProperty('graph');
      expect(response.body.graph).toHaveProperty('nodes');
      expect(response.body.graph).toHaveProperty('edges');
      expect(Array.isArray(response.body.graph.nodes)).toBe(true);
      expect(Array.isArray(response.body.graph.edges)).toBe(true);
    });
  });
});






