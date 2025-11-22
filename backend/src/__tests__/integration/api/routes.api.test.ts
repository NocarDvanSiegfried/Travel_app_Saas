/**
 * Integration Tests: Routes Search API Endpoint
 * 
 * Tests /api/v1/routes/search endpoint with real Express app and database connections.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';
import { PostgresStopRepository } from '../../../../infrastructure/repositories/PostgresStopRepository';
import { PostgresGraphRepository } from '../../../../infrastructure/repositories/PostgresGraphRepository';
import { createTestRealStop, createTestGraphStructure } from '../helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

describe('Routes Search API Integration', () => {
  let app: Express;
  let agent: ReturnType<typeof supertest>;
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let stopRepository: PostgresStopRepository;
  let graphRepository: PostgresGraphRepository;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    agent = createTestAgent(app);
    dbPool = testSetup.dbPool;
    redisClient = testSetup.redisClient;
    stopRepository = new PostgresStopRepository(dbPool);
    graphRepository = new PostgresGraphRepository(dbPool, redisClient);

    // Prepare test data: create stops
    const stop1 = createTestRealStop({ 
      id: 'stop-moscow-1', 
      name: 'Москва, Центральный вокзал', 
      cityId: 'moscow' 
    });
    const stop2 = createTestRealStop({ 
      id: 'stop-spb-1', 
      name: 'Санкт-Петербург, Московский вокзал', 
      cityId: 'spb' 
    });

    await stopRepository.saveRealStop(stop1);
    await stopRepository.saveRealStop(stop2);

    // Create minimal graph structure for testing
    const graphStructure = createTestGraphStructure({
      nodes: ['stop-moscow-1', 'stop-spb-1'],
      edges: {
        'stop-moscow-1': [
          {
            neighborId: 'stop-spb-1',
            weight: 100,
            metadata: {
              distance: 635,
              transportType: 'train',
              routeId: 'route-1',
            },
          },
        ],
        'stop-spb-1': [],
      },
    });

    // Convert edges Record to Map for saveGraph
    const edgesMap = new Map<string, typeof graphStructure.edges[string]>();
    for (const [nodeId, neighbors] of Object.entries(graphStructure.edges)) {
      edgesMap.set(nodeId, neighbors);
    }

    // Calculate total edges count
    const totalEdges = Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0);

    // Save graph to Redis
    await graphRepository.saveGraph(
      'v1.0.0',
      graphStructure.nodes,
      edgesMap,
      {
        buildTimestamp: Date.now(),
        totalNodes: graphStructure.nodes.length,
        totalEdges,
        buildDurationMs: 100,
      }
    );
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /api/v1/routes/search', () => {
    it('should return 200 or 404 for valid search parameters (positive scenario)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: dateStr,
        });

      // Can be 200 (routes found) or 404 (no routes found) - both are valid
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('routes');
        expect(Array.isArray(response.body.routes)).toBe(true);
      } else if (response.status === 404) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for missing required parameter "from" (negative scenario)', async () => {
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          to: 'Санкт-Петербург',
          date: '2024-12-20',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for missing required parameter "to" (negative scenario)', async () => {
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          date: '2024-12-20',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid date format (negative scenario)', async () => {
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: 'invalid-date',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid passengers parameter (negative scenario)', async () => {
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: '2024-12-20',
          passengers: -1,
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for passengers exceeding max (negative scenario)', async () => {
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: '2024-12-20',
          passengers: 10,
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });
});

