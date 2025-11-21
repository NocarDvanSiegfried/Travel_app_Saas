/**
 * Unit Tests: OptimizedBuildRouteUseCase
 * 
 * Tests for optimized route building use case.
 * 
 * Coverage:
 * - Valid input handling
 * - Graph availability checks
 * - Path finding (Dijkstra)
 * - Route segment building
 * - Error handling
 * - Performance (< 10ms)
 */

import { OptimizedBuildRouteUseCase } from '../../../application/route-builder/use-cases/BuildRouteUseCase.optimized';
import type { IGraphRepository } from '../../../domain/repositories/IGraphRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import type { BuildRouteRequest } from '../../../application/route-builder/use-cases/BuildRouteUseCase.optimized';

describe('OptimizedBuildRouteUseCase', () => {
  let useCase: OptimizedBuildRouteUseCase;
  let mockGraphRepository: jest.Mocked<IGraphRepository>;
  let mockFlightRepository: jest.Mocked<IFlightRepository>;
  let mockStopRepository: jest.Mocked<IStopRepository>;
  let mockRouteRepository: jest.Mocked<IRouteRepository>;

  beforeEach(() => {
    // Create mocks
    mockGraphRepository = {
      getGraphVersion: jest.fn(),
      getGraphMetadata: jest.fn(),
      hasNode: jest.fn(),
      getNeighbors: jest.fn(),
      getEdgeWeight: jest.fn(),
      getEdgeMetadata: jest.fn(),
      getAllNodes: jest.fn(),
    } as any;

    mockFlightRepository = {
      getFlightsBetweenStops: jest.fn(),
    } as any;

    mockStopRepository = {
      getAllRealStops: jest.fn(),
      getAllVirtualStops: jest.fn(),
      findRealStopById: jest.fn(),
      findVirtualStopById: jest.fn(),
    } as any;

    mockRouteRepository = {} as any;

    // Create use case
    useCase = new OptimizedBuildRouteUseCase(
      mockGraphRepository,
      mockFlightRepository,
      mockStopRepository,
      mockRouteRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validRequest: BuildRouteRequest = {
      fromCity: 'якутск',
      toCity: 'москва',
      date: new Date('2025-02-01'),
      passengers: 1,
    };

    it('should return error when graph not available', async () => {
      mockGraphRepository.getGraphVersion.mockResolvedValue(undefined);

      const result = await useCase.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.graphAvailable).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should return error when no stops found for fromCity', async () => {
      mockGraphRepository.getGraphVersion.mockResolvedValue('graph-v1.0.0');
      mockGraphRepository.getGraphMetadata.mockResolvedValue({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 1000,
        edgesCount: 5000,
        buildTimestamp: new Date(),
        isActive: true,
      });
      mockStopRepository.getAllRealStops.mockResolvedValue([]);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);

      const result = await useCase.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No stops found for city');
    });

    it('should return error when no stops found for toCity', async () => {
      mockGraphRepository.getGraphVersion.mockResolvedValue('graph-v1.0.0');
      mockGraphRepository.getGraphMetadata.mockResolvedValue({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 1000,
        edgesCount: 5000,
        buildTimestamp: new Date(),
        isActive: true,
      });
      mockStopRepository.getAllRealStops
        .mockResolvedValueOnce([
          { id: 'stop-1', name: 'Якутск Аэропорт' },
        ] as any)
        .mockResolvedValueOnce([]);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);

      const result = await useCase.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No stops found for city');
    });

    it('should return error when no path found', async () => {
      mockGraphRepository.getGraphVersion.mockResolvedValue('graph-v1.0.0');
      mockGraphRepository.getGraphMetadata.mockResolvedValue({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 1000,
        edgesCount: 5000,
        buildTimestamp: new Date(),
        isActive: true,
      });
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Якутск Аэропорт' },
        { id: 'stop-2', name: 'Москва Аэропорт' },
      ] as any);
      mockGraphRepository.hasNode.mockResolvedValue(true);
      mockGraphRepository.getNeighbors.mockResolvedValue([]); // No neighbors = no path

      const result = await useCase.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No path found');
    });

    it('should find route successfully', async () => {
      mockGraphRepository.getGraphVersion.mockResolvedValue('graph-v1.0.0');
      mockGraphRepository.getGraphMetadata.mockResolvedValue({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 1000,
        edgesCount: 5000,
        buildTimestamp: new Date(),
        isActive: true,
      });
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Якутск Аэропорт' },
        { id: 'stop-2', name: 'Москва Аэропорт' },
      ] as any);
      mockGraphRepository.hasNode.mockResolvedValue(true);
      
      // Path: stop-1 -> stop-2
      mockGraphRepository.getNeighbors
        .mockResolvedValueOnce([
          { neighborId: 'stop-2', weight: 360, distance: 4900, transportType: 'PLANE', routeId: 'route-1' },
        ])
        .mockResolvedValueOnce([]); // stop-2 has no neighbors (destination)
      
      mockGraphRepository.getEdgeWeight.mockResolvedValue(360);
      mockGraphRepository.getEdgeMetadata.mockResolvedValue({
        distance: 4900,
        transportType: 'PLANE',
        routeId: 'route-1',
      });
      
      mockFlightRepository.getFlightsBetweenStops.mockResolvedValue([
        {
          id: 'flight-1',
          routeId: 'route-1',
          fromStopId: 'stop-1',
          toStopId: 'stop-2',
          departureTime: '2025-02-01T08:00:00Z',
          arrivalTime: '2025-02-01T14:00:00Z',
          priceRub: 15000,
          availableSeats: 50,
        },
      ] as any);
      
      mockStopRepository.findRealStopById
        .mockResolvedValueOnce({ id: 'stop-1', name: 'Якутск Аэропорт' } as any)
        .mockResolvedValueOnce({ id: 'stop-2', name: 'Москва Аэропорт' } as any);

      const result = await useCase.execute(validRequest);

      expect(result.success).toBe(true);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].segments).toHaveLength(1);
      expect(result.routes[0].fromCity).toBe('Якутск');
      expect(result.routes[0].toCity).toBe('Москва');
      expect(result.executionTimeMs).toBeLessThan(10);
    });

    it('should complete in less than 10ms', async () => {
      mockGraphRepository.getGraphVersion.mockResolvedValue('graph-v1.0.0');
      mockGraphRepository.getGraphMetadata.mockResolvedValue({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 1000,
        edgesCount: 5000,
        buildTimestamp: new Date(),
        isActive: true,
      });
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Якутск Аэропорт' },
        { id: 'stop-2', name: 'Москва Аэропорт' },
      ] as any);
      mockGraphRepository.hasNode.mockResolvedValue(true);
      mockGraphRepository.getNeighbors
        .mockResolvedValueOnce([
          { neighborId: 'stop-2', weight: 360 },
        ])
        .mockResolvedValueOnce([]);
      mockGraphRepository.getEdgeWeight.mockResolvedValue(360);
      mockGraphRepository.getEdgeMetadata.mockResolvedValue({
        distance: 4900,
        transportType: 'PLANE',
        routeId: 'route-1',
      });
      mockFlightRepository.getFlightsBetweenStops.mockResolvedValue([]);
      mockStopRepository.findRealStopById
        .mockResolvedValueOnce({ id: 'stop-1', name: 'Якутск Аэропорт' } as any)
        .mockResolvedValueOnce({ id: 'stop-2', name: 'Москва Аэропорт' } as any);

      const startTime = Date.now();
      const result = await useCase.execute(validRequest);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10);
      expect(result.executionTimeMs).toBeLessThan(10);
    });

    it('should handle errors gracefully', async () => {
      mockGraphRepository.getGraphVersion.mockRejectedValue(
        new Error('Redis connection failed')
      );

      const result = await useCase.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis connection failed');
    });
  });
});




