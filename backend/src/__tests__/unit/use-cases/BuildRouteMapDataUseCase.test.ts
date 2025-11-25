/**
 * Unit Tests: BuildRouteMapDataUseCase
 * 
 * Tests for route map data building use case.
 * 
 * Coverage:
 * - Valid route processing
 * - Stop coordinate loading (real/virtual/unified reference fallback)
 * - Polyline building (Great Circle vs Straight Line)
 * - Bounds calculation
 * - Transfer point detection
 * - Error handling
 */

import { BuildRouteMapDataUseCase } from '../../../../application/route-builder/use-cases/BuildRouteMapDataUseCase';
import type { IStopRepository } from '../../../../domain/repositories/IStopRepository';
import type { IBuiltRoute, IRouteSegmentDetails } from '../../../../domain/entities/BuiltRoute';
import { TransportType } from '../../../../domain/entities/RouteSegment';
import { RealStop } from '../../../../domain/entities/RealStop';
import { VirtualStop } from '../../../../domain/entities/VirtualStop';

describe('BuildRouteMapDataUseCase', () => {
  let useCase: BuildRouteMapDataUseCase;
  let mockStopRepository: jest.Mocked<IStopRepository>;

  beforeEach(() => {
    // Create mock repository
    mockStopRepository = {
      findRealStopById: jest.fn(),
      findVirtualStopById: jest.fn(),
      getAllRealStops: jest.fn(),
      getAllVirtualStops: jest.fn(),
      getRealStopsByCity: jest.fn(),
      getRealStopsByCityName: jest.fn(),
      getVirtualStopsByCity: jest.fn(),
      getVirtualStopsByCityName: jest.fn(),
      getRealStopsByType: jest.fn(),
      saveRealStop: jest.fn(),
      saveVirtualStop: jest.fn(),
      saveRealStopsBatch: jest.fn(),
      saveVirtualStopsBatch: jest.fn(),
      deleteRealStop: jest.fn(),
      deleteAllVirtualStops: jest.fn(),
      countRealStops: jest.fn(),
      countVirtualStops: jest.fn(),
      findRealStopsNearby: jest.fn(),
      findVirtualStopsNearby: jest.fn(),
    } as any;

    useCase = new BuildRouteMapDataUseCase(mockStopRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const createMockRoute = (): IBuiltRoute => {
      return {
        routeId: 'route-test-1',
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

    it('should build map data for valid route with real stops', async () => {
      const route = createMockRoute();

      // Mock real stops
      const fromStop = new RealStop(
        'stop-yakutsk-1',
        'Якутск, Аэропорт',
        62.093056,
        129.770556,
        'yakutsk',
        true,
        false
      );

      const toStop = new RealStop(
        'stop-moscow-1',
        'Москва, Шереметьево',
        55.973333,
        37.413333,
        'moscow',
        true,
        false
      );

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(fromStop)
        .mockResolvedValueOnce(toStop);

      const result = await useCase.execute({ route });

      expect(result.routeId).toBe(route.routeId);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].transportType).toBe(TransportType.AIRPLANE);
      expect(result.segments[0].polyline.coordinates.length).toBeGreaterThan(2); // Great Circle
      expect(result.bounds.north).toBeGreaterThan(result.bounds.south);
      expect(result.bounds.east).toBeGreaterThan(result.bounds.west);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should use virtual stops when real stops not found', async () => {
      const route = createMockRoute();

      const virtualFromStop = new VirtualStop(
        'stop-yakutsk-1',
        'Virtual Stop Yakutsk',
        62.0,
        129.7,
        'MAIN_GRID',
        'yakutsk'
      );

      const virtualToStop = new VirtualStop(
        'stop-moscow-1',
        'Virtual Stop Moscow',
        55.75,
        37.6,
        'MAIN_GRID',
        'moscow'
      );

      mockStopRepository.findRealStopById.mockResolvedValue(undefined);
      mockStopRepository.findVirtualStopById
        .mockResolvedValueOnce(virtualFromStop)
        .mockResolvedValueOnce(virtualToStop);

      const result = await useCase.execute({ route });

      expect(result.segments).toHaveLength(1);
      expect(mockStopRepository.findVirtualStopById).toHaveBeenCalledTimes(2);
    });

    it('should use Great Circle for airplane transport', async () => {
      const route = createMockRoute();
      route.segments[0].segment.transportType = TransportType.AIRPLANE;

      const fromStop = new RealStop('stop-1', 'Stop 1', 62.0, 129.7, 'city1');
      const toStop = new RealStop('stop-2', 'Stop 2', 55.75, 37.6, 'city2');

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(fromStop)
        .mockResolvedValueOnce(toStop);

      const result = await useCase.execute({ route });

      // Great Circle должен иметь много точек
      expect(result.segments[0].polyline.coordinates.length).toBeGreaterThan(10);
    });

    it('should use Straight Line for bus transport', async () => {
      const route = createMockRoute();
      route.segments[0].segment.transportType = TransportType.BUS;

      const fromStop = new RealStop('stop-1', 'Stop 1', 62.0, 129.7, 'city1');
      const toStop = new RealStop('stop-2', 'Stop 2', 62.1, 129.8, 'city1');

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(fromStop)
        .mockResolvedValueOnce(toStop);

      const result = await useCase.execute({ route });

      // Straight Line должен иметь 2 точки
      expect(result.segments[0].polyline.coordinates.length).toBe(2);
    });

    it('should detect transfer points correctly', async () => {
      const route: IBuiltRoute = {
        routeId: 'route-test-2',
        fromCity: 'Якутск',
        toCity: 'Москва',
        date: '2025-02-01',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'segment-1',
              fromStopId: 'stop-yakutsk',
              toStopId: 'stop-transfer',
              routeId: 'route-1',
              transportType: TransportType.AIRPLANE,
            },
            departureTime: '2025-02-01T08:00:00Z',
            arrivalTime: '2025-02-01T10:00:00Z',
            duration: 120,
            price: 5000,
          },
          {
            segment: {
              segmentId: 'segment-2',
              fromStopId: 'stop-transfer',
              toStopId: 'stop-moscow',
              routeId: 'route-2',
              transportType: TransportType.AIRPLANE,
            },
            departureTime: '2025-02-01T11:00:00Z',
            arrivalTime: '2025-02-01T16:00:00Z',
            duration: 300,
            price: 10000,
          },
        ],
        totalDuration: 420,
        totalPrice: 15000,
        transferCount: 1,
        transportTypes: [TransportType.AIRPLANE],
        departureTime: '2025-02-01T08:00:00Z',
        arrivalTime: '2025-02-01T16:00:00Z',
      };

      const stop1 = new RealStop('stop-yakutsk', 'Yakutsk', 62.0, 129.7, 'yakutsk');
      const stopTransfer = new RealStop('stop-transfer', 'Transfer', 60.0, 100.0, 'transfer');
      const stop2 = new RealStop('stop-moscow', 'Moscow', 55.75, 37.6, 'moscow');

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(stop1)
        .mockResolvedValueOnce(stopTransfer)
        .mockResolvedValueOnce(stopTransfer)
        .mockResolvedValueOnce(stop2);

      const result = await useCase.execute({ route });

      expect(result.segments).toHaveLength(2);
      // Первая остановка первого сегмента не должна быть transfer
      expect(result.segments[0].fromStop.isTransfer).toBe(false);
      // Конечная остановка первого сегмента должна быть transfer (начало второго)
      expect(result.segments[0].toStop.isTransfer).toBe(true);
      // Начало второго сегмента должно быть transfer
      expect(result.segments[1].fromStop.isTransfer).toBe(true);
      // Конечная остановка последнего сегмента не должна быть transfer
      expect(result.segments[1].toStop.isTransfer).toBe(false);
    });

    it('should calculate bounds correctly', async () => {
      const route = createMockRoute();

      const fromStop = new RealStop('stop-1', 'Stop 1', 62.0, 129.7, 'city1');
      const toStop = new RealStop('stop-2', 'Stop 2', 55.75, 37.6, 'city2');

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(fromStop)
        .mockResolvedValueOnce(toStop);

      const result = await useCase.execute({ route });

      expect(result.bounds.north).toBeGreaterThan(result.bounds.south);
      expect(result.bounds.east).toBeGreaterThan(result.bounds.west);
      expect(result.bounds.north).toBeGreaterThanOrEqual(62.0);
      expect(result.bounds.south).toBeLessThanOrEqual(55.75);
    });

    it('should throw error for empty route', async () => {
      const route: IBuiltRoute = {
        routeId: 'route-empty',
        fromCity: 'Якутск',
        toCity: 'Москва',
        date: '2025-02-01',
        passengers: 1,
        segments: [],
        totalDuration: 0,
        totalPrice: 0,
        transferCount: 0,
        transportTypes: [],
        departureTime: '2025-02-01T08:00:00Z',
        arrivalTime: '2025-02-01T08:00:00Z',
      };

      await expect(useCase.execute({ route })).rejects.toThrow('Route segments array is empty');
    });

    it('should throw error for missing routeId', async () => {
      const route = createMockRoute();
      route.routeId = '';

      await expect(useCase.execute({ route })).rejects.toThrow('Route routeId is required');
    });

    it('should throw error for missing fromCity', async () => {
      const route = createMockRoute();
      route.fromCity = '';

      await expect(useCase.execute({ route })).rejects.toThrow('Route fromCity is required');
    });

    it('should throw error for missing segment fromStopId', async () => {
      const route = createMockRoute();
      route.segments[0].segment.fromStopId = '';

      await expect(useCase.execute({ route })).rejects.toThrow('Segment fromStopId is required');
    });

    it('should handle multiple segments', async () => {
      const route: IBuiltRoute = {
        routeId: 'route-multi',
        fromCity: 'Якутск',
        toCity: 'Москва',
        date: '2025-02-01',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'segment-1',
              fromStopId: 'stop-1',
              toStopId: 'stop-2',
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
              fromStopId: 'stop-2',
              toStopId: 'stop-3',
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

      const stop1 = new RealStop('stop-1', 'Stop 1', 62.0, 129.7, 'city1');
      const stop2 = new RealStop('stop-2', 'Stop 2', 60.0, 100.0, 'city2');
      const stop3 = new RealStop('stop-3', 'Stop 3', 55.75, 37.6, 'city3');

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(stop1)
        .mockResolvedValueOnce(stop2)
        .mockResolvedValueOnce(stop2)
        .mockResolvedValueOnce(stop3);

      const result = await useCase.execute({ route });

      expect(result.segments).toHaveLength(2);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should calculate total distance correctly', async () => {
      const route = createMockRoute();

      const fromStop = new RealStop('stop-1', 'Stop 1', 62.0, 129.7, 'city1');
      const toStop = new RealStop('stop-2', 'Stop 2', 55.75, 37.6, 'city2');

      mockStopRepository.findRealStopById
        .mockResolvedValueOnce(fromStop)
        .mockResolvedValueOnce(toStop);

      const result = await useCase.execute({ route });

      // Расстояние Якутск -> Москва примерно 4900 км
      expect(result.totalDistance).toBeGreaterThan(4800);
      expect(result.totalDistance).toBeLessThan(5000);
    });

    it('should handle all transport types', async () => {
      const transportTypes = [
        TransportType.AIRPLANE,
        TransportType.BUS,
        TransportType.TRAIN,
        TransportType.FERRY,
        TransportType.TAXI,
      ];

      for (const transportType of transportTypes) {
        const route = createMockRoute();
        route.segments[0].segment.transportType = transportType;

        const fromStop = new RealStop('stop-1', 'Stop 1', 62.0, 129.7, 'city1');
        const toStop = new RealStop('stop-2', 'Stop 2', 62.1, 129.8, 'city1');

        mockStopRepository.findRealStopById
          .mockResolvedValueOnce(fromStop)
          .mockResolvedValueOnce(toStop);

        const result = await useCase.execute({ route });

        expect(result.segments[0].transportType).toBe(transportType);
        expect(result.segments[0].polyline.coordinates.length).toBeGreaterThan(0);
      }
    });
  });
});



