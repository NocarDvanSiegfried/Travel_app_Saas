/**
 * Unit Tests: PostgresRouteRepository
 * 
 * Tests for PostgreSQL implementation of route repository.
 */

import { PostgresRouteRepository } from '../../../infrastructure/repositories/PostgresRouteRepository';
import { Route, VirtualRoute } from '../../../domain/entities';
import { createMockPool, createMockQueryResult } from '../../mocks/database.mock';
import type { Pool } from 'pg';

describe('PostgresRouteRepository', () => {
  let repository: PostgresRouteRepository;
  let mockPool: Partial<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockPool = createMockPool();
    mockClient = (mockPool as any).getMockClient();
    repository = new PostgresRouteRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Real Routes', () => {
    describe('findRouteById', () => {
      it('should return route when found', async () => {
        const mockRow = {
          id: 'route-1',
          route_number: '101',
          transport_type: 'BUS',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
          duration_minutes: 60,
          distance_km: 50,
          operator: 'Operator 1',
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.findRouteById('route-1');

        expect(result).toBeDefined();
        expect(result?.id).toBe('route-1');
        expect(result?.routeNumber).toBe('101');
        expect(result?.transportType).toBe('BUS');
      });

      it('should return undefined when not found', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([])
        );

        const result = await repository.findRouteById('non-existent');

        expect(result).toBeUndefined();
      });
    });

    describe('getAllRoutes', () => {
      it('should return all routes', async () => {
        const mockRows = [
          {
            id: 'route-1',
            route_number: '101',
            transport_type: 'BUS',
            from_stop_id: 'stop-1',
            to_stop_id: 'stop-2',
            stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
            duration_minutes: 60,
            distance_km: 50,
            operator: null,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getAllRoutes();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('route-1');
      });
    });

    describe('getRoutesByTransportType', () => {
      it('should filter routes by transport type', async () => {
        const mockRows = [
          {
            id: 'route-1',
            route_number: '101',
            transport_type: 'PLANE',
            from_stop_id: 'stop-1',
            to_stop_id: 'stop-2',
            stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
            duration_minutes: 120,
            distance_km: 500,
            operator: null,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getRoutesByTransportType('PLANE');

        expect(result).toHaveLength(1);
        expect(result[0].transportType).toBe('PLANE');
      });
    });

    describe('getRoutesFromStop', () => {
      it('should return routes starting from stop', async () => {
        const mockRows = [
          {
            id: 'route-1',
            route_number: '101',
            transport_type: 'BUS',
            from_stop_id: 'stop-1',
            to_stop_id: 'stop-2',
            stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
            duration_minutes: 60,
            distance_km: 50,
            operator: null,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getRoutesFromStop('stop-1');

        expect(result).toHaveLength(1);
        expect(result[0].fromStopId).toBe('stop-1');
      });
    });

    describe('findDirectRoutes', () => {
      it('should find direct routes between stops', async () => {
        const mockRows = [
          {
            id: 'route-1',
            route_number: '101',
            transport_type: 'BUS',
            from_stop_id: 'stop-1',
            to_stop_id: 'stop-2',
            stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
            duration_minutes: 60,
            distance_km: 50,
            operator: null,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.findDirectRoutes('stop-1', 'stop-2');

        expect(result).toHaveLength(1);
        expect(result[0].fromStopId).toBe('stop-1');
        expect(result[0].toStopId).toBe('stop-2');
      });
    });

    describe('saveRoute', () => {
      it('should save route', async () => {
        const route = new Route(
          'route-1', // id
          'BUS', // transportType
          'stop-1', // fromStopId
          'stop-2', // toStopId
          [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }], // stopsSequence
          '101', // routeNumber
          60, // durationMinutes
          50 // distanceKm
        );

        const mockRow = {
          id: 'route-1',
          route_number: '101',
          transport_type: 'BUS',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
          duration_minutes: 60,
          distance_km: 50,
          operator: null,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveRoute(route);

        expect(result).toBeDefined();
        expect(result.id).toBe('route-1');
      });
    });

    describe('saveRoutesBatch', () => {
      it('should save multiple routes in transaction', async () => {
        const routes = [
          new Route('route-1', 'BUS', 'stop-1', 'stop-2', [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }], '101', 60, 50),
          new Route('route-2', 'BUS', 'stop-2', 'stop-3', [{ stopId: 'stop-2', order: 0 }, { stopId: 'stop-3', order: 1 }], '102', 45, 40),
        ];

        const mockRows = [
          {
            id: 'route-1',
            route_number: '101',
            transport_type: 'BUS',
            from_stop_id: 'stop-1',
            to_stop_id: 'stop-2',
            stops_sequence: JSON.stringify([{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }]),
            duration_minutes: 60,
            distance_km: 50,
            operator: null,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'route-2',
            route_number: '102',
            transport_type: 'BUS',
            from_stop_id: 'stop-2',
            to_stop_id: 'stop-3',
            stops_sequence: JSON.stringify([{ stopId: 'stop-2', order: 0 }, { stopId: 'stop-3', order: 1 }]),
            duration_minutes: 45,
            distance_km: 40,
            operator: null,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(createMockQueryResult([mockRows[0]]))
          .mockResolvedValueOnce(createMockQueryResult([mockRows[1]]))
          .mockResolvedValueOnce(undefined);

        const result = await repository.saveRoutesBatch(routes);

        expect(result).toHaveLength(2);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      });

      it('should rollback on error', async () => {
        const routes = [
          new Route('route-1', 'BUS', 'stop-1', 'stop-2', [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }], '101', 60, 50),
        ];

        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Database error'));

        await expect(repository.saveRoutesBatch(routes)).rejects.toThrow();

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });
    });
  });

  describe('Virtual Routes', () => {
    describe('findVirtualRouteById', () => {
      it('should return virtual route when found', async () => {
        const mockRow = {
          id: 'virtual-route-1',
          route_type: 'VIRTUAL_TO_VIRTUAL',
          from_stop_id: 'virtual-stop-1',
          to_stop_id: 'virtual-stop-2',
          distance_km: 1000,
          duration_minutes: 180,
          transport_mode: 'WALK',
          metadata: null,
          created_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.findVirtualRouteById('virtual-route-1');

        expect(result).toBeDefined();
        expect(result?.id).toBe('virtual-route-1');
        expect(result?.routeType).toBe('VIRTUAL_TO_VIRTUAL');
      });
    });

    describe('saveVirtualRoute', () => {
      it('should save virtual route', async () => {
        const route = new VirtualRoute(
          'virtual-route-1', // id
          'VIRTUAL_TO_VIRTUAL', // routeType
          'virtual-stop-1', // fromStopId
          'virtual-stop-2', // toStopId
          1000, // distanceKm
          180, // durationMinutes
          'WALK' // transportMode
        );

        const mockRow = {
          id: 'virtual-route-1',
          route_type: 'VIRTUAL_TO_VIRTUAL',
          from_stop_id: 'virtual-stop-1',
          to_stop_id: 'virtual-stop-2',
          distance_km: 1000,
          duration_minutes: 180,
          transport_mode: 'WALK',
          metadata: null,
          created_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveVirtualRoute(route);

        expect(result).toBeDefined();
        expect(result.id).toBe('virtual-route-1');
      });
    });
  });
});




