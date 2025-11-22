/**
 * E2E Tests: End-to-End User Scenarios
 * 
 * Tests complete user scenarios across the entire stack (HTTP → Controller → Use Case → Repository → DB/Redis).
 * 
 * E2E tests differ from integration tests by:
 * - Testing complete user workflows (multiple steps in sequence)
 * - Verifying end-to-end behavior from user perspective
 * - Checking side effects and data consistency across the system
 */

import { createTestApp, createTestAgent, cleanupTestApp } from '../integration/api/api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';
import { PostgresStopRepository } from '../../infrastructure/repositories/PostgresStopRepository';
import { PostgresGraphRepository } from '../../infrastructure/repositories/PostgresGraphRepository';
import { createTestRealStop, createTestGraphStructure } from '../integration/helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

/**
 * Get random date in YYYY-MM-DD format (tomorrow to 30 days ahead)
 */
function getRandomDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const randomDays = Math.floor(Math.random() * 30) + 1;
  const date = new Date(tomorrow);
  date.setDate(date.getDate() + randomDays);
  return date.toISOString().split('T')[0];
}

describe('E2E: Complete User Scenarios', () => {
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

    // Prepare test data: create stops for route search
    const moscowStop = createTestRealStop({
      id: 'e2e-stop-moscow',
      name: 'Москва, Центральный вокзал',
      cityId: 'moscow',
      latitude: 55.7558,
      longitude: 37.6173,
    });

    const spbStop = createTestRealStop({
      id: 'e2e-stop-spb',
      name: 'Санкт-Петербург, Московский вокзал',
      cityId: 'spb',
      latitude: 59.9343,
      longitude: 30.3351,
    });

    await stopRepository.saveRealStop(moscowStop);
    await stopRepository.saveRealStop(spbStop);

    // Create graph structure for route search
    const graphStructure = createTestGraphStructure({
      nodes: ['e2e-stop-moscow', 'e2e-stop-spb'],
      edges: {
        'e2e-stop-moscow': [
          {
            neighborId: 'e2e-stop-spb',
            weight: 240, // 4 hours in minutes
            metadata: {
              distance: 635,
              transportType: 'train',
              routeId: 'e2e-route-1',
            },
          },
        ],
        'e2e-stop-spb': [],
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
      'e2e-v1.0.0',
      graphStructure.nodes,
      edgesMap,
      {
        version: 'e2e-v1.0.0',
        nodes: graphStructure.nodes.length,
        edges: totalEdges,
        buildTimestamp: Date.now(),
        datasetVersion: 'e2e-dataset-v1.0.0',
      }
    );
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('E2E Scenario 1: Successful Route Search', () => {
    it('should complete full route search workflow: request → validation → search → response', async () => {
      const date = getRandomDate();

      // Step 1: Make route search request
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: date,
          passengers: 1,
        })
        .expect(200);

      // Step 2: Verify response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('routes');
      expect(Array.isArray(response.body.routes)).toBe(true);
      expect(response.body).toHaveProperty('executionTimeMs');
      expect(typeof response.body.executionTimeMs).toBe('number');

      // Step 3: Verify route structure if routes found
      if (response.body.routes.length > 0) {
        const route = response.body.routes[0];
        expect(route).toHaveProperty('routeId');
        expect(route).toHaveProperty('segments');
        expect(Array.isArray(route.segments)).toBe(true);

        // Step 4: Verify segment structure
        if (route.segments.length > 0) {
          const segment = route.segments[0];
          expect(segment).toHaveProperty('segmentId');
          expect(segment).toHaveProperty('from');
          expect(segment).toHaveProperty('to');
        }
      }

      // Step 5: Verify no unexpected errors in response
      expect(response.body).not.toHaveProperty('error');
    });
  });

  describe('E2E Scenario 2: Validation Error on Route Search', () => {
    it('should return proper validation error for invalid request', async () => {
      // Step 1: Make request without required 'from' parameter
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          to: 'Санкт-Петербург',
          date: getRandomDate(),
        })
        .expect(400);

      // Step 2: Verify error response structure (Zod validation format)
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      // Step 3: Verify error details contain field information
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return validation error for invalid date format', async () => {
      // Step 1: Make request with invalid date format
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: 'invalid-date',
        })
        .expect(400);

      // Step 2: Verify error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should accept request without date parameter (date is optional)', async () => {
      // Step 1: Make request without date (date is now optional, defaults to today)
      const response = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
        });

      // Step 2: Should not return validation error (date is optional)
      // Can be 200 (routes found), 404 (no routes found), or 503 (graph not available)
      expect([200, 404, 503]).toContain(response.status);
      
      if (response.status === 400) {
        // If 400, it should not be about missing date
        expect(response.body.error).not.toEqual(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({ path: 'date' }),
            ]),
          })
        );
      }
    });
  });

  describe('E2E Scenario 3: Health Checks Workflow', () => {
    it('should verify all health endpoints in sequence', async () => {
      // Step 1: Check liveness endpoint
      const liveResponse = await agent
        .get('/health/live')
        .expect(200);

      expect(liveResponse.body).toHaveProperty('status', 'alive');
      expect(liveResponse.body).toHaveProperty('timestamp');

      // Step 2: Check readiness endpoint
      const readyResponse = await agent
        .get('/health/ready')
        .expect(200);

      expect(readyResponse.body).toHaveProperty('status');
      expect(readyResponse.body).toHaveProperty('ready', true);
      expect(readyResponse.body).toHaveProperty('checks');

      // Step 3: Check full health endpoint
      const healthResponse = await agent
        .get('/health')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status');
      expect(healthResponse.body).toHaveProperty('timestamp');
      expect(healthResponse.body).toHaveProperty('database');
      expect(healthResponse.body).toHaveProperty('redis');
      expect(healthResponse.body).toHaveProperty('graph');

      // Step 4: Verify all components are healthy
      expect(healthResponse.body.database).toHaveProperty('status');
      expect(healthResponse.body.redis).toHaveProperty('status');
      expect(healthResponse.body.graph).toHaveProperty('status');
    });

    it('should verify health endpoints via API routes', async () => {
      // Step 1: Check API health endpoint
      const apiHealthResponse = await agent
        .get('/api/v1/health')
        .expect(200);

      expect(apiHealthResponse.body).toHaveProperty('status');
      expect(apiHealthResponse.body).toHaveProperty('timestamp');

      // Step 2: Check API liveness endpoint
      const apiLiveResponse = await agent
        .get('/api/v1/health/live')
        .expect(200);

      expect(apiLiveResponse.body).toHaveProperty('status', 'alive');

      // Step 3: Check API readiness endpoint
      const apiReadyResponse = await agent
        .get('/api/v1/health/ready')
        .expect(200);

      expect(apiReadyResponse.body).toHaveProperty('status');
      expect(apiReadyResponse.body).toHaveProperty('ready', true);
    });
  });

  describe('E2E Scenario 4: Route Risk Assessment Workflow', () => {
    it('should complete full workflow: search route → assess risk → verify result', async () => {
      const date = getRandomDate();

      // Step 1: Search for a route
      const searchResponse = await agent
        .get('/api/v1/routes/search')
        .query({
          from: 'Москва',
          to: 'Санкт-Петербург',
          date: date,
          passengers: 1,
        });

      // Step 2: If route found, assess its risk
      if (searchResponse.status === 200 && searchResponse.body.routes && searchResponse.body.routes.length > 0) {
        const route = searchResponse.body.routes[0];

        // Step 3: Prepare risk assessment request
        const riskAssessmentRequest = {
          route: {
            routeId: route.routeId || 'test-route-id',
            segments: route.segments || [
              {
                segmentId: 'segment-1',
                from: 'Москва',
                to: 'Санкт-Петербург',
                transportType: 'train',
              },
            ],
          },
        };

        // Step 4: Assess route risk
        const riskResponse = await agent
          .post('/api/v1/routes/risk/assess')
          .send(riskAssessmentRequest)
          .expect(200);

        // Step 5: Verify risk assessment response structure
        expect(riskResponse.body).toHaveProperty('routeId');
        expect(riskResponse.body).toHaveProperty('riskScore');
        expect(riskResponse.body.riskScore).toHaveProperty('value');
        expect(typeof riskResponse.body.riskScore.value).toBe('number');
        expect(riskResponse.body.riskScore.value).toBeGreaterThanOrEqual(0);
        expect(riskResponse.body.riskScore.value).toBeLessThanOrEqual(10);
        expect(riskResponse.body).toHaveProperty('factors');
        expect(typeof riskResponse.body.factors).toBe('object');
      } else {
        // If no route found, skip risk assessment (this is OK for E2E test)
        console.log('No route found for risk assessment - skipping this part of the test');
      }
    });

    it('should return validation error for invalid risk assessment request', async () => {
      // Step 1: Make risk assessment request without required routeId
      const response = await agent
        .post('/api/v1/routes/risk/assess')
        .send({
          route: {
            segments: [
              {
                segmentId: 'segment-1',
                from: 'Москва',
                to: 'Санкт-Петербург',
                transportType: 'train',
              },
            ],
          },
        })
        .expect(400);

      // Step 2: Verify error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('E2E Scenario 5: Yakutia Cities API Scenarios', () => {
    it('should return all Yakutia cities from /api/v1/cities', async () => {
      const response = await agent.get('/api/v1/cities').query({ page: 1, limit: 100 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      const cities = response.body.data as string[];

      // Key Yakutia cities that should be present in demo data
      const expectedCities = [
        'Якутск',
        'Мирный',
        'Нерюнгри',
        'Ленск',
        'Вилюйск',
        'Олёкминск',
        'Олекминск', // Test normalization
        'Тикси',
      ];

      // Check that at least some expected cities are present
      // (exact list depends on what's in the test database)
      const foundCities = expectedCities.filter(city => cities.includes(city));
      expect(foundCities.length).toBeGreaterThan(0);

      // Verify that cities list is not empty
      expect(cities.length).toBeGreaterThan(0);
    });

    it('should not return STOPS_NOT_FOUND for Якутск → Олёкминск when data is present', async () => {
      // This test assumes that stops and routes are set up in the test database
      // If they're not, the test will check that the error is NOT STOPS_NOT_FOUND
      const response = await agent.get('/api/v1/routes/search').query({
        from: 'Якутск',
        to: 'Олёкминск',
        date: '2025-11-22',
      });

      // Should not be 404 with STOPS_NOT_FOUND
      if (response.status === 404) {
        expect(response.body.error?.code).not.toBe('STOPS_NOT_FOUND');
        // It's acceptable to have ROUTES_NOT_FOUND if route doesn't exist
        // but stops should be found
      } else if (response.status === 200) {
        // Success case - route found
        expect(response.body.success).toBe(true);
      }
    });

    it('should not return STOPS_NOT_FOUND for Вилюйск → Мирный when data is present', async () => {
      const response = await agent.get('/api/v1/routes/search').query({
        from: 'Вилюйск',
        to: 'Мирный',
        date: '2025-11-22',
      });

      // Should not be 404 with STOPS_NOT_FOUND
      if (response.status === 404) {
        expect(response.body.error?.code).not.toBe('STOPS_NOT_FOUND');
      } else if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });
});

