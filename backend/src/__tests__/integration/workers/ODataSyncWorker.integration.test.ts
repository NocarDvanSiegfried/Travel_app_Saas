/**
 * Integration Tests: ODataSyncWorker
 * 
 * Tests full cycle of OData synchronization worker with real repositories.
 */

import { ODataSyncWorker } from '../../../application/workers/ODataSyncWorker';
import { PostgresStopRepository } from '../../../infrastructure/repositories/PostgresStopRepository';
import { PostgresRouteRepository } from '../../../infrastructure/repositories/PostgresRouteRepository';
import { PostgresFlightRepository } from '../../../infrastructure/repositories/PostgresFlightRepository';
import { PostgresDatasetRepository } from '../../../infrastructure/repositories/PostgresDatasetRepository';
import { setupIntegrationTests, teardownIntegrationTests, cleanTestDatabase } from '../setup';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

/**
 * Mock OData client for testing
 */
class MockODataClient {
  private data: any = null;

  setData(data: any): void {
    this.data = data;
  }

  async fetchAll(): Promise<any> {
    if (!this.data) {
      return {
        stops: [],
        routes: [],
        flights: [],
      };
    }
    return this.data;
  }
}

/**
 * Mock MinIO client for testing
 */
class MockMinioClient {
  async uploadDataset(version: string, data: any): Promise<void> {
    // Mock implementation
  }
}

describe('ODataSyncWorker Integration', () => {
  let worker: ODataSyncWorker;
  let stopRepository: PostgresStopRepository;
  let routeRepository: PostgresRouteRepository;
  let flightRepository: PostgresFlightRepository;
  let datasetRepository: PostgresDatasetRepository;
  let mockODataClient: MockODataClient;
  let mockMinioClient: MockMinioClient;
  let dbPool: Pool;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    dbPool = setup.dbPool;
    redisClient = setup.redisClient;

    stopRepository = new PostgresStopRepository(dbPool);
    routeRepository = new PostgresRouteRepository(dbPool);
    flightRepository = new PostgresFlightRepository(dbPool);
    datasetRepository = new PostgresDatasetRepository(dbPool);

    mockODataClient = new MockODataClient();
    mockMinioClient = new MockMinioClient();

    worker = new ODataSyncWorker(
      mockODataClient as any,
      stopRepository,
      routeRepository,
      flightRepository,
      datasetRepository,
      mockMinioClient as any
    );
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await cleanTestDatabase(dbPool);
  });

  it('should process new OData and create dataset', async () => {
    const odataData = {
      stops: [
        {
          id: 'stop-1',
          name: 'Якутск Аэропорт',
          latitude: 62.0355,
          longitude: 129.6755,
          type: 'airport',
        },
      ],
      routes: [
        {
          id: 'route-1',
          routeNumber: '101',
          name: 'Якутск - Москва',
          transportType: 'PLANE',
          stops: ['stop-1', 'stop-2'],
          baseFare: 15000,
        },
      ],
      flights: [
        {
          id: 'flight-1',
          routeId: 'route-1',
          fromStopId: 'stop-1',
          toStopId: 'stop-2',
          departureTime: '08:00',
          arrivalTime: '14:00',
          priceRub: 15000,
          availableSeats: 50,
        },
      ],
    };

    mockODataClient.setData(odataData);

    const result = await worker.execute();

    expect(result.success).toBe(true);
    expect(result.message).toContain('OData sync completed');
    expect(result.nextWorker).toBe('virtual-entities-generator');

    // Verify data was saved
    const stops = await stopRepository.getAllRealStops();
    expect(stops.length).toBeGreaterThan(0);

    const routes = await routeRepository.getAllRoutes();
    expect(routes.length).toBeGreaterThan(0);

    const flights = await flightRepository.getAllFlights();
    expect(flights.length).toBeGreaterThan(0);

    // Verify dataset was created
    const latestDataset = await datasetRepository.getLatestDataset();
    expect(latestDataset).toBeDefined();
  });

  it('should skip when no changes detected', async () => {
    // First run
    const odataData = {
      stops: [{ id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0 }],
      routes: [],
      flights: [],
    };

    mockODataClient.setData(odataData);
    await worker.execute();

    // Second run with same data (same hash)
    const result = await worker.execute();

    expect(result.success).toBe(true);
    expect(result.message).toContain('No changes detected');
  });
});

