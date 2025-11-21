/**
 * Unit Tests: PostgresFlightRepository
 */

import { PostgresFlightRepository } from '../../../infrastructure/repositories/PostgresFlightRepository';
import { Flight } from '../../../domain/entities';
import { createMockPool, createMockQueryResult } from '../../mocks/database.mock';
import type { Pool } from 'pg';

describe('PostgresFlightRepository', () => {
  let repository: PostgresFlightRepository;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    mockPool = createMockPool();
    repository = new PostgresFlightRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return flight when found', async () => {
      const mockRow = {
        id: 'flight-1',
        route_id: 'route-1',
        from_stop_id: 'stop-1',
        to_stop_id: 'stop-2',
        departure_time: new Date('2025-02-01T08:00:00Z'),
        arrival_time: new Date('2025-02-01T10:00:00Z'),
        day_of_week: 1,
        price_rub: 1500,
        available_seats: 50,
        is_virtual: false,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.findById('flight-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('flight-1');
      expect(result?.routeId).toBe('route-1');
    });

    it('should return undefined when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([])
      );

      const result = await repository.findById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getFlightsByRoute', () => {
    it('should return flights for route', async () => {
      const mockRows = [
        {
          id: 'flight-1',
          route_id: 'route-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          departure_time: new Date('2025-02-01T08:00:00Z'),
          arrival_time: new Date('2025-02-01T10:00:00Z'),
          day_of_week: 1,
          price_rub: 1500,
          available_seats: 50,
          is_virtual: false,
          created_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult(mockRows)
      );

      const result = await repository.getFlightsByRoute('route-1');

      expect(result).toHaveLength(1);
      expect(result[0].routeId).toBe('route-1');
    });
  });

  describe('getFlightsBetweenStops', () => {
    it('should return flights between stops', async () => {
      const mockRows = [
        {
          id: 'flight-1',
          route_id: 'route-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          departure_time: new Date('2025-02-01T08:00:00Z'),
          arrival_time: new Date('2025-02-01T10:00:00Z'),
          day_of_week: 1,
          price_rub: 1500,
          available_seats: 50,
          is_virtual: false,
          created_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult(mockRows)
      );

      const result = await repository.getFlightsBetweenStops(
        'stop-1',
        'stop-2',
        new Date('2025-02-01')
      );

      expect(result).toHaveLength(1);
      expect(result[0].fromStopId).toBe('stop-1');
      expect(result[0].toStopId).toBe('stop-2');
    });
  });

  describe('saveFlight', () => {
    it('should save flight', async () => {
      const flight = new Flight(
        'flight-1',
        'route-1',
        'stop-1',
        'stop-2',
        new Date('2025-02-01T08:00:00Z').toISOString(),
        new Date('2025-02-01T10:00:00Z').toISOString(),
        [1],
        1500,
        50,
        false
      );

      const mockRow = {
        id: 'flight-1',
        route_id: 'route-1',
        from_stop_id: 'stop-1',
        to_stop_id: 'stop-2',
        departure_time: new Date('2025-02-01T08:00:00Z'),
        arrival_time: new Date('2025-02-01T10:00:00Z'),
        day_of_week: 1,
        price_rub: 1500,
        available_seats: 50,
        is_virtual: false,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.saveFlight(flight);

      expect(result).toBeDefined();
      expect(result.id).toBe('flight-1');
    });
  });

  describe('saveFlightsBatch', () => {
    it('should save multiple flights in transaction', async () => {
      const flights = [
        new Flight('flight-1', 'route-1', 'stop-1', 'stop-2', '2025-02-01T08:00:00Z', '2025-02-01T10:00:00Z', [1], 1500, 50, false),
        new Flight('flight-2', 'route-1', 'stop-1', 'stop-2', '2025-02-01T14:00:00Z', '2025-02-01T16:00:00Z', [1], 1500, 50, false),
      ];

      const mockClient = (mockPool as any).getMockClient();
      const mockRows = flights.map(f => ({
        id: f.id,
        route_id: f.routeId,
        from_stop_id: f.fromStopId,
        to_stop_id: f.toStopId,
        departure_time: new Date(f.departureTime),
        arrival_time: new Date(f.arrivalTime),
        day_of_week: f.daysOfWeek?.[0] || 1,
        price_rub: f.priceRub,
        available_seats: f.availableSeats,
        is_virtual: f.isVirtual,
        created_at: new Date(),
      }));

      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createMockQueryResult([mockRows[0]]))
        .mockResolvedValueOnce(createMockQueryResult([mockRows[1]]))
        .mockResolvedValueOnce(undefined);

      const result = await repository.saveFlightsBatch(flights);

      expect(result).toHaveLength(2);
    });
  });
});




