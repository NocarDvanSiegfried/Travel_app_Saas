/**
 * Integration Tests: OptimizedBuildRouteUseCase
 * 
 * Tests route building with real repositories and graph.
 */

import { OptimizedBuildRouteUseCase } from '../../../application/route-builder/use-cases/BuildRouteUseCase.optimized';
import { PostgresStopRepository } from '../../../infrastructure/repositories/PostgresStopRepository';
import { PostgresRouteRepository } from '../../../infrastructure/repositories/PostgresRouteRepository';
import { PostgresFlightRepository } from '../../../infrastructure/repositories/PostgresFlightRepository';
import { PostgresGraphRepository } from '../../../infrastructure/repositories/PostgresGraphRepository';
import { setupIntegrationTests, teardownIntegrationTests, cleanTestDatabase, cleanTestRedis } from '../setup';
import { createTestRealStop, createTestRoute, createTestFlight } from '../helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

describe('OptimizedBuildRouteUseCase Integration', () => {
  let useCase: OptimizedBuildRouteUseCase;
  let stopRepository: PostgresStopRepository;
  let routeRepository: PostgresRouteRepository;
  let flightRepository: PostgresFlightRepository;
  let graphRepository: PostgresGraphRepository;
  let dbPool: Pool;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    dbPool = setup.dbPool;
    redisClient = setup.redisClient;

    stopRepository = new PostgresStopRepository(dbPool);
    routeRepository = new PostgresRouteRepository(dbPool);
    flightRepository = new PostgresFlightRepository(dbPool);
    graphRepository = new PostgresGraphRepository(dbPool, redisClient);

    useCase = new OptimizedBuildRouteUseCase(
      graphRepository,
      flightRepository,
      stopRepository,
      routeRepository
    );
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await cleanTestDatabase(dbPool);
    await cleanTestRedis(redisClient);
  });

  describe('Route Search with Graph', () => {
    it('should find route when graph is available', async () => {
      // Setup: Create stops
      const stop1 = createTestRealStop({
        id: 'stop-1',
        name: 'Якутск Аэропорт',
        latitude: 62.0355,
        longitude: 129.6755,
        cityId: 'yakutsk',
      });

      const stop2 = createTestRealStop({
        id: 'stop-2',
        name: 'Москва Аэропорт',
        latitude: 55.7558,
        longitude: 37.6173,
        cityId: 'moscow',
      });

      await stopRepository.saveRealStop(stop1);
      await stopRepository.saveRealStop(stop2);

      // Setup: Create route
      const route = createTestRoute({
        id: 'route-1',
        transportType: 'PLANE',
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
        stopsSequence: [
          { stopId: 'stop-1', order: 1 },
          { stopId: 'stop-2', order: 2 },
        ],
        durationMinutes: 360,
        distanceKm: 4900,
      });

      await routeRepository.saveRoute(route);

      // Setup: Create flight
      const flight = createTestFlight({
        id: 'flight-1',
        routeId: 'route-1',
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
        departureTime: '08:00',
        arrivalTime: '14:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        priceRub: 15000,
        transportType: 'PLANE',
      });

      await flightRepository.saveFlight(flight);

      // Setup: Build graph
      const nodes = ['stop-1', 'stop-2'];
      const edges = {
        'stop-1': [
          {
            neighborId: 'stop-2',
            weight: 360,
            distance: 4900,
            transportType: 'PLANE',
            routeId: 'route-1',
          },
        ],
        'stop-2': [],
      };

      await graphRepository.saveGraph(nodes, edges);
      await graphRepository.setGraphVersion('graph-v1.0.0');

      // Execute: Search route
      const request = {
        fromCity: 'якутск',
        toCity: 'москва',
        date: new Date('2025-02-03'), // Monday
        passengers: 1,
      };

      const result = await useCase.execute(request);

      // Verify
      expect(result.success).toBe(true);
      expect(result.graphAvailable).toBe(true);
      expect(result.routes).toBeDefined();
      expect(result.routes.length).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeLessThan(10);
    });

    it('should return error when graph is not available', async () => {
      const request = {
        fromCity: 'якутск',
        toCity: 'москва',
        date: new Date('2025-02-03'),
        passengers: 1,
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.graphAvailable).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should return error when no stops found for city', async () => {
      // Setup: Build empty graph
      await graphRepository.saveGraph([], {});
      await graphRepository.setGraphVersion('graph-v1.0.0');

      const request = {
        fromCity: 'nonexistent',
        toCity: 'also-nonexistent',
        date: new Date('2025-02-03'),
        passengers: 1,
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No stops found');
    });

    it('should complete in less than 10ms', async () => {
      // Setup: Create minimal graph
      const stop1 = createTestRealStop({
        id: 'stop-1',
        name: 'Якутск Аэропорт',
        cityId: 'yakutsk',
      });

      const stop2 = createTestRealStop({
        id: 'stop-2',
        name: 'Москва Аэропорт',
        cityId: 'moscow',
      });

      await stopRepository.saveRealStop(stop1);
      await stopRepository.saveRealStop(stop2);

      const nodes = ['stop-1', 'stop-2'];
      const edges = {
        'stop-1': [
          {
            neighborId: 'stop-2',
            weight: 360,
            distance: 4900,
            transportType: 'PLANE',
            routeId: 'route-1',
          },
        ],
        'stop-2': [],
      };

      await graphRepository.saveGraph(nodes, edges);
      await graphRepository.setGraphVersion('graph-v1.0.0');

      const request = {
        fromCity: 'якутск',
        toCity: 'москва',
        date: new Date('2025-02-03'),
        passengers: 1,
      };

      const startTime = Date.now();
      const result = await useCase.execute(request);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10);
      expect(result.executionTimeMs).toBeLessThan(10);
    });
  });
});

