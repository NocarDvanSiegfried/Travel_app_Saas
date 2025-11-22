/**
 * Unit Tests: PostgresStopRepository
 * 
 * Tests for PostgreSQL implementation of stop repository.
 * 
 * Coverage:
 * - Real stops CRUD operations
 * - Virtual stops CRUD operations
 * - Batch operations
 * - Transactions
 * - Geospatial queries
 * - Edge cases and error handling
 */

import { PostgresStopRepository } from '../../../infrastructure/repositories/PostgresStopRepository';
import { RealStop, VirtualStop } from '../../../domain/entities';
import { createMockPool, createMockQueryResult } from '../../mocks/database.mock';
import type { Pool } from 'pg';

describe('PostgresStopRepository', () => {
  let repository: PostgresStopRepository;
  let mockPool: Partial<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockPool = createMockPool();
    mockClient = (mockPool as any).getMockClient();
    repository = new PostgresStopRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Real Stops Tests
  // ============================================================================

  describe('Real Stops', () => {
    describe('findRealStopById', () => {
      it('should return stop when found', async () => {
        const mockRow = {
          id: 'stop-1',
          name: 'Якутск Аэропорт',
          latitude: '62.0355',
          longitude: '129.6755',
          city_id: 'city-yakutsk',
          is_airport: true,
          is_railway_station: false,
          metadata: null,
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.findRealStopById('stop-1');

        expect(result).toBeDefined();
        expect(result?.id).toBe('stop-1');
        expect(result?.name).toBe('Якутск Аэропорт');
        expect(result?.latitude).toBe(62.0355);
        expect(result?.longitude).toBe(129.6755);
        expect(result?.isAirport).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, name, latitude, longitude, city_id, is_airport, is_railway_station, metadata, created_at, updated_at FROM stops WHERE id = $1',
          ['stop-1']
        );
      });

      it('should return undefined when not found', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([])
        );

        const result = await repository.findRealStopById('non-existent');

        expect(result).toBeUndefined();
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, name, latitude, longitude, city_id, is_airport, is_railway_station, metadata, created_at, updated_at FROM stops WHERE id = $1',
          ['non-existent']
        );
      });
    });

    describe('getAllRealStops', () => {
      it('should return all stops', async () => {
        const mockRows = [
          {
            id: 'stop-1',
            name: 'Stop 1',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-1',
            is_airport: false,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'stop-2',
            name: 'Stop 2',
            latitude: '63.0',
            longitude: '130.0',
            city_id: 'city-2',
            is_airport: true,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getAllRealStops();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('stop-1');
        expect(result[1].id).toBe('stop-2');
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, name, latitude, longitude, city_id, is_airport, is_railway_station, metadata, created_at, updated_at FROM stops ORDER BY name'
        );
      });

      it('should return empty array when no stops', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([])
        );

        const result = await repository.getAllRealStops();

        expect(result).toHaveLength(0);
      });
    });

    describe('getRealStopsByCity', () => {
      it('should return stops for specific city', async () => {
        const mockRows = [
          {
            id: 'stop-1',
            name: 'Yakutsk Airport',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-yakutsk',
            is_airport: true,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getRealStopsByCity('city-yakutsk');

        expect(result).toHaveLength(1);
        expect(result[0].cityId).toBe('city-yakutsk');
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, name, latitude, longitude, city_id, is_airport, is_railway_station, metadata, created_at, updated_at FROM stops WHERE city_id = $1 ORDER BY name',
          ['city-yakutsk']
        );
      });
    });

    describe('getRealStopsByType', () => {
      it('should filter by airport', async () => {
        const mockRows = [
          {
            id: 'stop-1',
            name: 'Airport',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-1',
            is_airport: true,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getRealStopsByType(true, undefined);

        expect(result).toHaveLength(1);
        expect(result[0].isAirport).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('is_airport = $1'),
          [true]
        );
      });

      it('should filter by railway station', async () => {
        const mockRows = [
          {
            id: 'stop-1',
            name: 'Railway Station',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-1',
            is_airport: false,
            is_railway_station: true,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getRealStopsByType(undefined, true);

        expect(result).toHaveLength(1);
        expect(result[0].isRailwayStation).toBe(true);
      });

      it('should filter by both airport and railway', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([])
        );

        await repository.getRealStopsByType(true, true);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('is_airport = $1'),
          expect.arrayContaining([true, true])
        );
      });
    });

    describe('saveRealStop', () => {
      it('should insert new stop', async () => {
        const stop = new RealStop(
          'stop-1',
          'Test Stop',
          62.0,
          129.0,
          'city-1',
          false,
          false,
          undefined,
          new Date(),
          new Date()
        );

        const mockRow = {
          id: 'stop-1',
          name: 'Test Stop',
          latitude: '62.0',
          longitude: '129.0',
          city_id: 'city-1',
          is_airport: false,
          is_railway_station: false,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveRealStop(stop);

        expect(result).toBeDefined();
        expect(result.id).toBe('stop-1');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO stops'),
          expect.arrayContaining([
            'stop-1',
            'Test Stop',
            62.0,
            129.0,
            'city-1',
            false,
            false,
            'null',
          ])
        );
      });

      it('should update existing stop on conflict', async () => {
        const stop = new RealStop(
          'stop-1',
          'Updated Stop',
          63.0,
          130.0,
          'city-2',
          true,
          false,
          undefined,
          new Date(),
          new Date()
        );

        const mockRow = {
          id: 'stop-1',
          name: 'Updated Stop',
          latitude: '63.0',
          longitude: '130.0',
          city_id: 'city-2',
          is_airport: true,
          is_railway_station: false,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveRealStop(stop);

        expect(result.name).toBe('Updated Stop');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('ON CONFLICT'),
          expect.any(Array)
        );
      });
    });

    describe('saveRealStopsBatch', () => {
      it('should save multiple stops in transaction', async () => {
        const stops = [
          new RealStop('stop-1', 'Stop 1', 62.0, 129.0, 'city-1', false, false),
          new RealStop('stop-2', 'Stop 2', 63.0, 130.0, 'city-2', true, false),
        ];

        const mockRows = [
          {
            id: 'stop-1',
            name: 'Stop 1',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-1',
            is_airport: false,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'stop-2',
            name: 'Stop 2',
            latitude: '63.0',
            longitude: '130.0',
            city_id: 'city-2',
            is_airport: true,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(createMockQueryResult([mockRows[0]])) // INSERT 1
          .mockResolvedValueOnce(createMockQueryResult([mockRows[1]])) // INSERT 2
          .mockResolvedValueOnce(undefined); // COMMIT

        const result = await repository.saveRealStopsBatch(stops);

        expect(result).toHaveLength(2);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should rollback on error', async () => {
        const stops = [
          new RealStop('stop-1', 'Stop 1', 62.0, 129.0, 'city-1', false, false),
        ];

        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

        await expect(repository.saveRealStopsBatch(stops)).rejects.toThrow(
          'Database error'
        );

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should return empty array for empty input', async () => {
        const result = await repository.saveRealStopsBatch([]);

        expect(result).toHaveLength(0);
        expect(mockPool.query).not.toHaveBeenCalled();
      });
    });

    describe('deleteRealStop', () => {
      it('should delete stop and return true', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([], 1) // rowCount = 1
        );

        const result = await repository.deleteRealStop('stop-1');

        expect(result).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          'DELETE FROM stops WHERE id = $1',
          ['stop-1']
        );
      });

      it('should return false when stop not found', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([], 0) // rowCount = 0
        );

        const result = await repository.deleteRealStop('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('countRealStops', () => {
      it('should return count of stops', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([{ count: '42' }])
        );

        const result = await repository.countRealStops();

        expect(result).toBe(42);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as count FROM stops'
        );
      });
    });

    describe('findRealStopsNearby', () => {
      it('should find stops within radius', async () => {
        const mockRows = [
          {
            id: 'stop-1',
            name: 'Nearby Stop',
            latitude: '62.1',
            longitude: '129.1',
            city_id: 'city-1',
            is_airport: false,
            is_railway_station: false,
            metadata: null,
            created_at: new Date(),
            updated_at: new Date(),
            distance: 5.2,
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.findRealStopsNearby(62.0, 129.0, 10);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('stop-1');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('6371 * acos'),
          [62.0, 129.0, 10]
        );
      });
    });
  });

  // ============================================================================
  // Virtual Stops Tests
  // ============================================================================

  describe('Virtual Stops', () => {
    describe('findVirtualStopById', () => {
      it('should return virtual stop when found', async () => {
        const mockRow = {
          id: 'virtual-stop-1',
          name: 'г. Якутск',
          latitude: '62.0355',
          longitude: '129.6755',
          city_id: 'city-yakutsk',
          grid_type: 'MAIN_GRID',
          grid_position: { x: 0, y: 0 },
          real_stops_nearby: [],
          created_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.findVirtualStopById('virtual-stop-1');

        expect(result).toBeDefined();
        expect(result?.id).toBe('virtual-stop-1');
        expect(result?.name).toBe('г. Якутск');
        expect(result?.gridType).toBe('MAIN_GRID');
      });

      it('should return undefined when not found', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([])
        );

        const result = await repository.findVirtualStopById('non-existent');

        expect(result).toBeUndefined();
      });
    });

    describe('getAllVirtualStops', () => {
      it('should return all virtual stops', async () => {
        const mockRows = [
          {
            id: 'virtual-stop-1',
            name: 'г. Якутск',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-1',
            grid_type: 'MAIN_GRID',
            grid_position: null,
            real_stops_nearby: [],
            created_at: new Date(),
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.getAllVirtualStops();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('virtual-stop-1');
      });
    });

    describe('saveVirtualStop', () => {
      it('should save virtual stop', async () => {
        const stop = new VirtualStop(
          'virtual-stop-1',
          'г. Якутск',
          62.0,
          129.0,
          'MAIN_GRID',
          'city-1',
          { x: 0, y: 0 },
          [],
          new Date()
        );

        const mockRow = {
          id: 'virtual-stop-1',
          name: 'г. Якутск',
          latitude: '62.0',
          longitude: '129.0',
          city_id: 'city-1',
          grid_type: 'MAIN_GRID',
          grid_position: { x: 0, y: 0 },
          real_stops_nearby: [],
          created_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveVirtualStop(stop);

        expect(result).toBeDefined();
        expect(result.id).toBe('virtual-stop-1');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO virtual_stops'),
          expect.any(Array)
        );
      });
    });

    describe('saveVirtualStopsBatch', () => {
      it('should save multiple virtual stops in transaction', async () => {
        const stops = [
          new VirtualStop(
            'virtual-stop-1',
            'г. Якутск',
            62.0,
            129.0,
            'MAIN_GRID',
            'city-1'
          ),
          new VirtualStop(
            'virtual-stop-2',
            'г. Москва',
            55.75,
            37.61,
            'MAIN_GRID',
            'city-2'
          ),
        ];

        const mockRows = [
          {
            id: 'virtual-stop-1',
            name: 'г. Якутск',
            latitude: '62.0',
            longitude: '129.0',
            city_id: 'city-1',
            grid_type: 'MAIN_GRID',
            grid_position: null,
            real_stops_nearby: [],
            created_at: new Date(),
          },
          {
            id: 'virtual-stop-2',
            name: 'г. Москва',
            latitude: '55.75',
            longitude: '37.61',
            city_id: 'city-2',
            grid_type: 'MAIN_GRID',
            grid_position: null,
            real_stops_nearby: [],
            created_at: new Date(),
          },
        ];

        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(createMockQueryResult([mockRows[0]]))
          .mockResolvedValueOnce(createMockQueryResult([mockRows[1]]))
          .mockResolvedValueOnce(undefined); // COMMIT

        const result = await repository.saveVirtualStopsBatch(stops);

        expect(result).toHaveLength(2);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      });

      it('should rollback on error', async () => {
        const stops = [
          new VirtualStop('virtual-stop-1', 'г. Якутск', 62.0, 129.0, 'MAIN_GRID'),
        ];

        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Database error'));

        await expect(repository.saveVirtualStopsBatch(stops)).rejects.toThrow();

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });
    });

    describe('deleteAllVirtualStops', () => {
      it('should delete all virtual stops', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([], 5) // rowCount = 5
        );

        const result = await repository.deleteAllVirtualStops();

        expect(result).toBe(5);
        expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM virtual_stops');
      });
    });

    describe('countVirtualStops', () => {
      it('should return count of virtual stops', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([{ count: '10' }])
        );

        const result = await repository.countVirtualStops();

        expect(result).toBe(10);
      });
    });

    describe('findVirtualStopsNearby', () => {
      it('should find virtual stops within radius', async () => {
        const mockRows = [
          {
            id: 'virtual-stop-1',
            name: 'г. Якутск',
            latitude: '62.1',
            longitude: '129.1',
            city_id: 'city-1',
            grid_type: 'MAIN_GRID',
            grid_position: null,
            real_stops_nearby: [],
            created_at: new Date(),
            distance: 3.5,
          },
        ];

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult(mockRows)
        );

        const result = await repository.findVirtualStopsNearby(62.0, 129.0, 10);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('virtual-stop-1');
      });
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(repository.findRealStopById('stop-1')).rejects.toThrow(
        'Connection failed'
      );
    });

    it('should handle null metadata', async () => {
      const mockRow = {
        id: 'stop-1',
        name: 'Test',
        latitude: '62.0',
        longitude: '129.0',
        city_id: null,
        is_airport: false,
        is_railway_station: false,
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.findRealStopById('stop-1');

      expect(result).toBeDefined();
      expect(result?.cityId).toBeFalsy(); // Can be null or undefined
      expect(result?.metadata).toBeFalsy(); // Can be null or undefined
    });

    it('should handle missing coordinates', async () => {
      const mockRow = {
        id: 'stop-1',
        name: 'Test',
        latitude: null,
        longitude: null,
        city_id: 'city-1',
        is_airport: false,
        is_railway_station: false,
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.findRealStopById('stop-1');

      expect(result).toBeDefined();
      expect(isNaN(result!.latitude)).toBe(true);
      expect(isNaN(result!.longitude)).toBe(true);
    });
  });
});




