/**
 * Integration Tests: Route Map API Endpoint
 * 
 * Tests /api/v1/routes/map endpoints with real Express app and database connections.
 * 
 * Coverage:
 * - GET /api/v1/routes/map?routeId={routeId} - Load from cache
 * - POST /api/v1/routes/map - Process full route
 * - Validation errors
 * - Route not found errors
 * - Map data structure
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';
import { PostgresStopRepository } from '../../../../infrastructure/repositories/PostgresStopRepository';
import { RedisCacheService } from '../../../../infrastructure/cache/RedisCacheService';
import { createTestRealStop } from '../helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import type { IBuiltRoute } from '../../../../domain/entities/BuiltRoute';
import { TransportType } from '../../../../domain/entities/RouteSegment';

describe('Route Map API Integration', () => {
  let app: Express;
  let agent: ReturnType<typeof supertest>;
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let stopRepository: PostgresStopRepository;
  let cacheService: RedisCacheService;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    agent = createTestAgent(app);
    dbPool = testSetup.dbPool;
    redisClient = testSetup.redisClient;
    stopRepository = new PostgresStopRepository(dbPool);
    cacheService = new RedisCacheService();

    // Prepare test data: create stops
    const stop1 = createTestRealStop({
      id: 'stop-yakutsk-1',
      name: 'Якутск, Аэропорт',
      latitude: 62.093056,
      longitude: 129.770556,
      cityId: 'yakutsk',
      isAirport: true,
    });

    const stop2 = createTestRealStop({
      id: 'stop-moscow-1',
      name: 'Москва, Шереметьево',
      latitude: 55.973333,
      longitude: 37.413333,
      cityId: 'moscow',
      isAirport: true,
    });

    await stopRepository.saveRealStop(stop1);
    await stopRepository.saveRealStop(stop2);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('POST /api/v1/routes/map', () => {
    const createTestRoute = (): IBuiltRoute => {
      return {
        routeId: 'test-route-map-1',
        fromCity: 'Якутск',
        toCity: 'Москва',
        date: '2025-02-01',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'segment-1',
              fromStopId: 'stop-yakutsk-1',
              toStopId: 'stop-moscow-1',
              routeId: 'route-1',
              transportType: TransportType.AIRPLANE,
              distance: 4900,
              estimatedDuration: 480,
              basePrice: 15000,
            },
            departureTime: '2025-02-01T08:00:00Z',
            arrivalTime: '2025-02-01T16:00:00Z',
            duration: 480,
            price: 15000,
          },
        ],
        totalDuration: 480,
        totalPrice: 15000,
        transferCount: 0,
        transportTypes: [TransportType.AIRPLANE],
        departureTime: '2025-02-01T08:00:00Z',
        arrivalTime: '2025-02-01T16:00:00Z',
      };
    };

    it('should return 200 with map data for valid route (positive scenario)', async () => {
      const route = createTestRoute();

      const response = await agent
        .post('/api/v1/routes/map')
        .send({ route })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('routeId', route.routeId);
      expect(response.body.data).toHaveProperty('segments');
      expect(response.body.data).toHaveProperty('bounds');
      expect(response.body.data).toHaveProperty('totalDistance');
      expect(response.body.data).toHaveProperty('totalDuration');
      expect(Array.isArray(response.body.data.segments)).toBe(true);
      expect(response.body.data.segments.length).toBeGreaterThan(0);
    });

    it('should return map data with correct structure', async () => {
      const route = createTestRoute();

      const response = await agent
        .post('/api/v1/routes/map')
        .send({ route })
        .expect(200);

      const mapData = response.body.data;

      // Проверка структуры сегмента
      const segment = mapData.segments[0];
      expect(segment).toHaveProperty('segmentId');
      expect(segment).toHaveProperty('transportType');
      expect(segment).toHaveProperty('fromStop');
      expect(segment).toHaveProperty('toStop');
      expect(segment).toHaveProperty('polyline');
      expect(segment).toHaveProperty('distance');
      expect(segment).toHaveProperty('duration');
      expect(segment).toHaveProperty('price');

      // Проверка структуры остановки
      expect(segment.fromStop).toHaveProperty('id');
      expect(segment.fromStop).toHaveProperty('name');
      expect(segment.fromStop).toHaveProperty('latitude');
      expect(segment.fromStop).toHaveProperty('longitude');
      expect(segment.fromStop).toHaveProperty('cityName');
      expect(segment.fromStop).toHaveProperty('isTransfer');

      // Проверка структуры полилинии
      expect(segment.polyline).toHaveProperty('coordinates');
      expect(Array.isArray(segment.polyline.coordinates)).toBe(true);
      expect(segment.polyline.coordinates.length).toBeGreaterThan(0);

      // Проверка структуры bounds
      expect(mapData.bounds).toHaveProperty('north');
      expect(mapData.bounds).toHaveProperty('south');
      expect(mapData.bounds).toHaveProperty('east');
      expect(mapData.bounds).toHaveProperty('west');
    });

    it('should use Great Circle for airplane transport', async () => {
      const route = createTestRoute();
      route.segments[0].segment.transportType = TransportType.AIRPLANE;

      const response = await agent
        .post('/api/v1/routes/map')
        .send({ route })
        .expect(200);

      const segment = response.body.data.segments[0];
      // Great Circle должен иметь много точек
      expect(segment.polyline.coordinates.length).toBeGreaterThan(10);
    });

    it('should use Straight Line for bus transport', async () => {
      const route = createTestRoute();
      route.segments[0].segment.transportType = TransportType.BUS;

      const response = await agent
        .post('/api/v1/routes/map')
        .send({ route })
        .expect(200);

      const segment = response.body.data.segments[0];
      // Straight Line должен иметь 2 точки
      expect(segment.polyline.coordinates.length).toBe(2);
    });

    it('should cache route after processing', async () => {
      const route = createTestRoute();
      route.routeId = 'test-route-cache-1';

      // Первый запрос - создаёт кэш
      await agent
        .post('/api/v1/routes/map')
        .send({ route })
        .expect(200);

      // Проверяем, что маршрут закэширован
      const cachedRoute = await cacheService.get<IBuiltRoute>(`route:${route.routeId}`);
      expect(cachedRoute).toBeTruthy();
      expect(cachedRoute?.routeId).toBe(route.routeId);
    });

    it('should return 400 for missing route in body', async () => {
      const response = await agent
        .post('/api/v1/routes/map')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for invalid route structure', async () => {
      const response = await agent
        .post('/api/v1/routes/map')
        .send({ route: { routeId: 'test' } }) // Неполный маршрут
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle multiple segments correctly', async () => {
      const route: IBuiltRoute = {
        routeId: 'test-route-multi',
        fromCity: 'Якутск',
        toCity: 'Москва',
        date: '2025-02-01',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'segment-1',
              fromStopId: 'stop-yakutsk-1',
              toStopId: 'stop-moscow-1',
              routeId: 'route-1',
              transportType: TransportType.BUS,
            },
            departureTime: '2025-02-01T08:00:00Z',
            arrivalTime: '2025-02-01T10:00:00Z',
            duration: 120,
            price: 1000,
          },
          {
            segment: {
              segmentId: 'segment-2',
              fromStopId: 'stop-moscow-1',
              toStopId: 'stop-moscow-1', // Same stop for simplicity
              routeId: 'route-2',
              transportType: TransportType.AIRPLANE,
            },
            departureTime: '2025-02-01T11:00:00Z',
            arrivalTime: '2025-02-01T16:00:00Z',
            duration: 300,
            price: 5000,
          },
        ],
        totalDuration: 420,
        totalPrice: 6000,
        transferCount: 1,
        transportTypes: [TransportType.BUS, TransportType.AIRPLANE],
        departureTime: '2025-02-01T08:00:00Z',
        arrivalTime: '2025-02-01T16:00:00Z',
      };

      const response = await agent
        .post('/api/v1/routes/map')
        .send({ route })
        .expect(200);

      expect(response.body.data.segments).toHaveLength(2);
      expect(response.body.data.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/routes/map', () => {
    it('should return 404 when route not found in cache', async () => {
      const response = await agent
        .get('/api/v1/routes/map')
        .query({ routeId: 'non-existent-route' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });

    it('should return 200 when route found in cache', async () => {
      // Сначала создаём маршрут через POST и кэшируем
      const route: IBuiltRoute = {
        routeId: 'test-route-get-1',
        fromCity: 'Якутск',
        toCity: 'Москва',
        date: '2025-02-01',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'segment-1',
              fromStopId: 'stop-yakutsk-1',
              toStopId: 'stop-moscow-1',
              routeId: 'route-1',
              transportType: TransportType.AIRPLANE,
            },
            departureTime: '2025-02-01T08:00:00Z',
            arrivalTime: '2025-02-01T16:00:00Z',
            duration: 480,
            price: 15000,
          },
        ],
        totalDuration: 480,
        totalPrice: 15000,
        transferCount: 0,
        transportTypes: [TransportType.AIRPLANE],
        departureTime: '2025-02-01T08:00:00Z',
        arrivalTime: '2025-02-01T16:00:00Z',
      };

      // Кэшируем маршрут напрямую
      await cacheService.set(`route:${route.routeId}`, route, 3600);

      // Теперь запрашиваем через GET
      const response = await agent
        .get('/api/v1/routes/map')
        .query({ routeId: route.routeId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('routeId', route.routeId);
    });

    it('should return 400 for missing routeId parameter', async () => {
      const response = await agent
        .get('/api/v1/routes/map')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for empty routeId', async () => {
      const response = await agent
        .get('/api/v1/routes/map')
        .query({ routeId: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});







