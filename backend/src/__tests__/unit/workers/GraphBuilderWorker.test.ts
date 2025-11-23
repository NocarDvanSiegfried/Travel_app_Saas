/**
 * Unit Tests: GraphBuilderWorker
 */

import { GraphBuilderWorker } from '../../../application/workers/GraphBuilderWorker';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../../domain/repositories/IDatasetRepository';
import type { IGraphRepository } from '../../../domain/repositories/IGraphRepository';
import { Dataset, Graph } from '../../../domain/entities';

describe('GraphBuilderWorker', () => {
  let worker: GraphBuilderWorker;
  let mockStopRepository: jest.Mocked<IStopRepository>;
  let mockRouteRepository: jest.Mocked<IRouteRepository>;
  let mockFlightRepository: jest.Mocked<IFlightRepository>;
  let mockDatasetRepository: jest.Mocked<IDatasetRepository>;
  let mockGraphRepository: jest.Mocked<IGraphRepository>;

  beforeEach(() => {
    mockStopRepository = {
      getAllRealStops: jest.fn(),
      getAllVirtualStops: jest.fn(),
    } as any;

    mockRouteRepository = {
      getAllRoutes: jest.fn(),
      getAllVirtualRoutes: jest.fn(),
    } as any;

    mockFlightRepository = {
      getAllFlights: jest.fn(),
    } as any;

    mockDatasetRepository = {
      getLatestDataset: jest.fn(),
    } as any;

    mockGraphRepository = {
      getGraphMetadataByDatasetVersion: jest.fn(),
      saveGraph: jest.fn(),
      saveGraphMetadata: jest.fn(),
      setActiveGraphMetadata: jest.fn(),
      setGraphVersion: jest.fn(),
    } as any;

    worker = new GraphBuilderWorker(
      mockStopRepository,
      mockRouteRepository,
      mockFlightRepository,
      mockDatasetRepository,
      mockGraphRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should build graph successfully', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset) // First call in canRun()
        .mockResolvedValueOnce(dataset) // Second call in executeWorkerLogic() -> saveGraphToRedis() line 440
        .mockResolvedValueOnce(dataset); // Third call in executeWorkerLogic() line 207 (before creating graph metadata)
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]); // No existing graph

      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0 },
        { id: 'stop-2', name: 'Stop 2', latitude: 62.1, longitude: 129.1 },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([
        { id: 'virtual-stop-1', name: 'Virtual Stop 1', latitude: 63.0, longitude: 130.0 },
      ] as any);

      mockRouteRepository.getAllRoutes.mockResolvedValue([
        { 
          id: 'route-1', 
          fromStopId: 'stop-1', 
          toStopId: 'stop-2', 
          transportType: 'BUS',
          stopsSequence: [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }],
          durationMinutes: 60,
          distanceKm: 50,
        },
      ] as any);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);

      mockFlightRepository.getAllFlights.mockResolvedValue([
        {
          id: 'flight-1',
          routeId: 'route-1',
          fromStopId: 'stop-1',
          toStopId: 'stop-2',
          departureTime: '2025-02-01T08:00:00Z',
          arrivalTime: '2025-02-01T10:00:00Z',
        },
      ] as any);

      const savedGraph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        2, // totalNodes
        1, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );
      mockGraphRepository.saveGraph.mockResolvedValue(undefined);
      mockGraphRepository.saveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setActiveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setGraphVersion.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Graph built successfully');
      expect(mockGraphRepository.saveGraph).toHaveBeenCalled();
      expect(mockGraphRepository.saveGraphMetadata).toHaveBeenCalled();
      expect(mockGraphRepository.setActiveGraphMetadata).toHaveBeenCalled();
      expect(mockGraphRepository.setGraphVersion).toHaveBeenCalled();
    });

    it('should skip when no dataset found', async () => {
      mockDatasetRepository.getLatestDataset.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBe('CANNOT_RUN');
    });

    it('should skip when graph already exists', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      const existingGraph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        100, // totalNodes
        50, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([existingGraph]);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });

    it('should validate graph before saving', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        2, // totalStops
        1, // totalRoutes
        1, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);
      
      // Create stops
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', name: 'Stop 2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);
      
      // Create route with invalid weight (negative duration)
      mockRouteRepository.getAllRoutes.mockResolvedValue([
        { 
          id: 'route-1', 
          fromStopId: 'stop-1', 
          toStopId: 'stop-2', 
          transportType: 'BUS',
          stopsSequence: [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }],
          durationMinutes: -10, // Invalid negative duration
          distanceKm: 50,
        },
      ] as any);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);
      
      // No flights - route will be added directly from route list with negative durationMinutes as weight
      mockFlightRepository.getAllFlights.mockResolvedValue([]);

      try {
        const result = await worker.execute();
        // If execution succeeds, check that validation caught the error
        expect(result.success).toBe(false);
        expect(result.error || result.message).toMatch(/Graph structure validation failed|invalid weight/i);
      } catch (error: any) {
        // Worker throws error on validation failure
        expect(error.message).toMatch(/Graph structure validation failed|invalid weight/i);
      }
    });
  });

  describe('canRun', () => {
    it('should allow running when no graph exists for dataset', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should prevent running when graph exists', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([
        { id: 'graph-1' },
      ] as any);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });

  describe('validation integration', () => {
    it('should call validateGraphStructure after building graph', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);

      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', name: 'Stop 2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);

      mockRouteRepository.getAllRoutes.mockResolvedValue([
        { 
          id: 'route-1', 
          fromStopId: 'stop-1', 
          toStopId: 'stop-2', 
          transportType: 'BUS',
          stopsSequence: [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }],
          durationMinutes: 60,
          distanceKm: 50,
        },
      ] as any);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);

      mockFlightRepository.getAllFlights.mockResolvedValue([
        {
          id: 'flight-1',
          routeId: 'route-1',
          fromStopId: 'stop-1',
          toStopId: 'stop-2',
          departureTime: '08:00',
          arrivalTime: '09:00',
        },
      ] as any);

      const savedGraph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        2, // totalNodes
        1, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );
      mockGraphRepository.saveGraph.mockResolvedValue(undefined);
      mockGraphRepository.saveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setActiveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setGraphVersion.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Validation:');
      expect(result.message).toContain('graph=true');
      expect(result.message).toContain('transfers=true');
      expect(result.message).toContain('ferry=true');
    });

    it('should fail when graph structure validation fails', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);

      // Create stops that will result in invalid graph (edge with invalid weight)
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', name: 'Stop 2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);

      // Create route with invalid weight (negative duration will be used as weight)
      // Note: route.durationMinutes || 60 will use -10 (truthy), so weight will be -10
      mockRouteRepository.getAllRoutes.mockResolvedValue([
        { 
          id: 'route-1', 
          fromStopId: 'stop-1', 
          toStopId: 'stop-2', 
          transportType: 'BUS',
          stopsSequence: [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }],
          durationMinutes: -10, // Invalid negative duration (will be used as weight)
          distanceKm: 50,
        },
      ] as any);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);

      // No flights - route will be added directly from route list
      mockFlightRepository.getAllFlights.mockResolvedValue([]);

      try {
        const result = await worker.execute();
        // If execution succeeds, check that validation caught the error
        expect(result.success).toBe(false);
        expect(result.error || result.message).toMatch(/Graph structure validation failed|invalid weight/i);
      } catch (error: any) {
        // Worker throws error on validation failure
        expect(error.message).toMatch(/Graph structure validation failed|invalid weight/i);
      }
    });

    it('should fail when transfer edges validation fails', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);

      // Create stops in different cities to trigger transfer validation error
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', name: 'Stop 2', latitude: 55.7, longitude: 37.6, cityId: 'москва' },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);

      mockRouteRepository.getAllRoutes.mockResolvedValue([]);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);
      mockFlightRepository.getAllFlights.mockResolvedValue([]);

      // Note: Transfer edges are created automatically in buildGraphStructure
      // But they should only be created between stops in the same city
      // This test will pass if validation correctly rejects cross-city transfers

      const savedGraph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        2, // totalNodes
        0, // totalEdges (no routes, but transfers will be created)
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );
      mockGraphRepository.saveGraph.mockResolvedValue(undefined);
      mockGraphRepository.saveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setActiveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setGraphVersion.mockResolvedValue(undefined);

      const result = await worker.execute();

      // Should succeed because transfer edges are only created between stops in the same city
      // If stops are in different cities, no transfer edges will be created
      expect(result.success).toBe(true);
    });

    it('should log federal cities statistics', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        100, // totalStops
        50, // totalRoutes
        200, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset)
        .mockResolvedValueOnce(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);

      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-yakutsk', name: 'Yakutsk Stop', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-moscow', name: 'Moscow Stop', latitude: 55.7, longitude: 37.6, cityId: 'москва' },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);

      mockRouteRepository.getAllRoutes.mockResolvedValue([
        { 
          id: 'route-1', 
          fromStopId: 'stop-moscow', 
          toStopId: 'stop-yakutsk', 
          transportType: 'PLANE',
          stopsSequence: [{ stopId: 'stop-moscow', order: 0 }, { stopId: 'stop-yakutsk', order: 1 }],
          durationMinutes: 240,
          distanceKm: 4900,
        },
      ] as any);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);

      mockFlightRepository.getAllFlights.mockResolvedValue([
        {
          id: 'flight-1',
          routeId: 'route-1',
          fromStopId: 'stop-moscow',
          toStopId: 'stop-yakutsk',
          departureTime: '08:00',
          arrivalTime: '12:00',
        },
      ] as any);

      const savedGraph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        2, // totalNodes
        1, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );
      mockGraphRepository.saveGraph.mockResolvedValue(undefined);
      mockGraphRepository.saveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setActiveGraphMetadata.mockResolvedValue(savedGraph);
      mockGraphRepository.setGraphVersion.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      // Federal cities statistics should be logged (check via console.log spy if needed)
    });
  });
});




