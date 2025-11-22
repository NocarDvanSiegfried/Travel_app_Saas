/**
 * Integration Tests: Cities API Endpoint
 * 
 * Tests /api/v1/cities endpoint with real Express app and database connections.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';
import { PostgresStopRepository } from '../../../../infrastructure/repositories/PostgresStopRepository';
import { createTestRealStop, createTestVirtualStop } from '../helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

describe('Cities API Integration', () => {
  let app: Express;
  let agent: ReturnType<typeof supertest>;
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let stopRepository: PostgresStopRepository;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    agent = createTestAgent(app);
    dbPool = testSetup.dbPool;
    redisClient = testSetup.redisClient;
    stopRepository = new PostgresStopRepository(dbPool);

    // Prepare test data: create stops with city names
    const stops = [
      createTestRealStop({ id: 'stop-moscow-1', name: 'Москва, Центральный вокзал', cityId: 'moscow' }),
      createTestRealStop({ id: 'stop-spb-1', name: 'Санкт-Петербург, Московский вокзал', cityId: 'spb' }),
      createTestRealStop({ id: 'stop-kazan-1', name: 'Казань, Центральный вокзал', cityId: 'kazan' }),
      createTestVirtualStop({ id: 'virtual-moscow-1', name: 'г. Москва' }),
      createTestVirtualStop({ id: 'virtual-spb-1', name: 'г. Санкт-Петербург' }),
    ];

    // Insert test stops into database
    for (const stop of stops) {
      await stopRepository.saveRealStop(stop);
    }
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /api/v1/cities', () => {
    it('should return 200 with list of cities (positive scenario)', async () => {
      const response = await agent
        .get('/api/v1/cities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should support pagination parameters (positive scenario)', async () => {
      const response = await agent
        .get('/api/v1/cities')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should return 400 for invalid pagination parameters (negative scenario)', async () => {
      const response = await agent
        .get('/api/v1/cities')
        .query({ page: -1, limit: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid limit (exceeds max)', async () => {
      const response = await agent
        .get('/api/v1/cities')
        .query({ limit: 200 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle missing pagination parameters (uses defaults)', async () => {
      const response = await agent
        .get('/api/v1/cities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
    });
  });
});

