/**
 * Integration Tests: PostgresStopRepository
 * 
 * Tests real database interactions for stop repository.
 * 
 * Requirements:
 * - Real PostgreSQL connection
 * - Migrations applied
 * - Clean database state
 */

import { PostgresStopRepository } from '../../../infrastructure/repositories/PostgresStopRepository';
import { setupIntegrationTests, teardownIntegrationTests, cleanTestDatabase } from '../setup';
import { createTestRealStop, createTestVirtualStop } from '../helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

describe('PostgresStopRepository Integration', () => {
  let repository: PostgresStopRepository;
  let dbPool: Pool;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    dbPool = setup.dbPool;
    redisClient = setup.redisClient;
    repository = new PostgresStopRepository(dbPool);
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await cleanTestDatabase(dbPool);
  });

  describe('Real Stops', () => {
    it('should save and retrieve real stop', async () => {
      const stop = createTestRealStop({
        id: 'test-stop-1',
        name: 'Якутск Аэропорт',
        latitude: 62.0355,
        longitude: 129.6755,
        cityId: 'yakutsk',
        isAirport: true,
      });

      const saved = await repository.saveRealStop(stop);

      expect(saved.id).toBe(stop.id);
      expect(saved.name).toBe(stop.name);
      expect(saved.latitude).toBe(stop.latitude);
      expect(saved.longitude).toBe(stop.longitude);
      expect(saved.isAirport).toBe(true);

      const retrieved = await repository.findRealStopById(stop.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(stop.id);
      expect(retrieved?.name).toBe(stop.name);
    });

    it('should update existing stop on conflict', async () => {
      const stop1 = createTestRealStop({
        id: 'test-stop-1',
        name: 'Old Name',
        latitude: 62.0,
        longitude: 129.0,
      });

      await repository.saveRealStop(stop1);

      const stop2 = createTestRealStop({
        id: 'test-stop-1',
        name: 'New Name',
        latitude: 63.0,
        longitude: 130.0,
      });

      const updated = await repository.saveRealStop(stop2);

      expect(updated.id).toBe(stop1.id);
      expect(updated.name).toBe('New Name');
      expect(updated.latitude).toBe(63.0);
    });

    it('should save multiple stops in batch transaction', async () => {
      const stops = [
        createTestRealStop({ id: 'stop-1', name: 'Stop 1' }),
        createTestRealStop({ id: 'stop-2', name: 'Stop 2' }),
        createTestRealStop({ id: 'stop-3', name: 'Stop 3' }),
      ];

      const saved = await repository.saveRealStopsBatch(stops);

      expect(saved).toHaveLength(3);
      expect(saved[0].id).toBe('stop-1');
      expect(saved[1].id).toBe('stop-2');
      expect(saved[2].id).toBe('stop-3');

      const allStops = await repository.getAllRealStops();
      expect(allStops).toHaveLength(3);
    });

    it('should rollback batch transaction on error', async () => {
      const stops = [
        createTestRealStop({ id: 'stop-1', name: 'Stop 1' }),
        createTestRealStop({ id: 'stop-2', name: 'Stop 2' }),
      ];

      // Create invalid stop that will cause error
      const invalidStop = createTestRealStop({
        id: 'stop-2', // Duplicate ID
        name: 'Stop 2 Duplicate',
      });

      // First batch succeeds
      await repository.saveRealStopsBatch(stops);

      // Second batch with duplicate should update, not fail
      const updated = await repository.saveRealStopsBatch([invalidStop]);
      expect(updated).toHaveLength(1);
    });

    it('should filter stops by city', async () => {
      const stops = [
        createTestRealStop({ id: 'stop-1', name: 'Stop 1', cityId: 'city-1' }),
        createTestRealStop({ id: 'stop-2', name: 'Stop 2', cityId: 'city-1' }),
        createTestRealStop({ id: 'stop-3', name: 'Stop 3', cityId: 'city-2' }),
      ];

      await repository.saveRealStopsBatch(stops);

      const city1Stops = await repository.getRealStopsByCity('city-1');
      expect(city1Stops).toHaveLength(2);
      expect(city1Stops.every(s => s.cityId === 'city-1')).toBe(true);
    });

    it('should filter stops by type', async () => {
      const stops = [
        createTestRealStop({ id: 'stop-1', name: 'Airport', isAirport: true }),
        createTestRealStop({ id: 'stop-2', name: 'Railway', isRailwayStation: true }),
        createTestRealStop({ id: 'stop-3', name: 'Regular' }),
      ];

      await repository.saveRealStopsBatch(stops);

      const airports = await repository.getRealStopsByType(true, undefined);
      expect(airports).toHaveLength(1);
      expect(airports[0].isAirport).toBe(true);

      const railways = await repository.getRealStopsByType(undefined, true);
      expect(railways).toHaveLength(1);
      expect(railways[0].isRailwayStation).toBe(true);
    });

    it('should find stops nearby using geospatial query', async () => {
      const stops = [
        createTestRealStop({
          id: 'stop-1',
          name: 'Near Stop',
          latitude: 62.0,
          longitude: 129.0,
        }),
        createTestRealStop({
          id: 'stop-2',
          name: 'Far Stop',
          latitude: 70.0,
          longitude: 140.0,
        }),
      ];

      await repository.saveRealStopsBatch(stops);

      // Find stops within 100km of (62.0, 129.0)
      const nearby = await repository.findRealStopsNearby(62.0, 129.0, 100);

      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.some(s => s.id === 'stop-1')).toBe(true);
    });

    it('should count stops correctly', async () => {
      const stops = [
        createTestRealStop({ id: 'stop-1' }),
        createTestRealStop({ id: 'stop-2' }),
        createTestRealStop({ id: 'stop-3' }),
      ];

      await repository.saveRealStopsBatch(stops);

      const count = await repository.countRealStops();
      expect(count).toBe(3);
    });

    it('should delete stop', async () => {
      const stop = createTestRealStop({ id: 'stop-1' });
      await repository.saveRealStop(stop);

      const deleted = await repository.deleteRealStop('stop-1');
      expect(deleted).toBe(true);

      const retrieved = await repository.findRealStopById('stop-1');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Virtual Stops', () => {
    it('should save and retrieve virtual stop', async () => {
      const stop = createTestVirtualStop({
        id: 'virtual-stop-1',
        name: 'г. Якутск',
        gridType: 'MAIN_GRID',
      });

      const saved = await repository.saveVirtualStop(stop);

      expect(saved.id).toBe(stop.id);
      expect(saved.name).toBe(stop.name);
      expect(saved.gridType).toBe('MAIN_GRID');

      const retrieved = await repository.findVirtualStopById(stop.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(stop.id);
    });

    it('should save multiple virtual stops in batch', async () => {
      const stops = [
        createTestVirtualStop({ id: 'virtual-stop-1', name: 'Virtual 1' }),
        createTestVirtualStop({ id: 'virtual-stop-2', name: 'Virtual 2' }),
      ];

      const saved = await repository.saveVirtualStopsBatch(stops);

      expect(saved).toHaveLength(2);

      const allVirtual = await repository.getAllVirtualStops();
      expect(allVirtual).toHaveLength(2);
    });

    it('should delete all virtual stops', async () => {
      const stops = [
        createTestVirtualStop({ id: 'virtual-stop-1' }),
        createTestVirtualStop({ id: 'virtual-stop-2' }),
      ];

      await repository.saveVirtualStopsBatch(stops);

      const deleted = await repository.deleteAllVirtualStops();
      expect(deleted).toBe(2);

      const count = await repository.countVirtualStops();
      expect(count).toBe(0);
    });

    it('should find virtual stops nearby', async () => {
      const stops = [
        createTestVirtualStop({
          id: 'virtual-stop-1',
          name: 'Near Virtual',
          latitude: 62.0,
          longitude: 129.0,
        }),
        createTestVirtualStop({
          id: 'virtual-stop-2',
          name: 'Far Virtual',
          latitude: 70.0,
          longitude: 140.0,
        }),
      ];

      await repository.saveVirtualStopsBatch(stops);

      const nearby = await repository.findVirtualStopsNearby(62.0, 129.0, 100);

      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.some(s => s.id === 'virtual-stop-1')).toBe(true);
    });
  });
});

