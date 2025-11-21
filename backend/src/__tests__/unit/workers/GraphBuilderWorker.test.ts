/**
 * Unit Tests: GraphBuilderWorker
 */

import { GraphBuilderWorker } from '../../../application/workers/GraphBuilderWorker';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../../domain/repositories/IDatasetRepository';
import type { IGraphRepository } from '../../../domain/repositories/IGraphRepository';
import { Dataset } from '../../../domain/entities';

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
      const dataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 100,
        routesCount: 50,
        flightsCount: 200,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: false,
      });

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]); // No existing graph

      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Stop 1', latitude: 62.0, longitude: 129.0 },
      ] as any);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([
        { id: 'virtual-stop-1', name: 'Virtual Stop 1', latitude: 63.0, longitude: 130.0 },
      ] as any);

      mockRouteRepository.getAllRoutes.mockResolvedValue([
        { id: 'route-1', fromStopId: 'stop-1', toStopId: 'stop-2', transportType: 'BUS' },
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

      mockGraphRepository.saveGraph.mockResolvedValue(undefined);
      mockGraphRepository.saveGraphMetadata.mockResolvedValue({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 2,
        edgesCount: 1,
        buildTimestamp: new Date(),
        isActive: false,
      });
      mockGraphRepository.setActiveGraphMetadata.mockResolvedValue(undefined);
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
      mockDatasetRepository.getLatestDataset.mockResolvedValue(null);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_DATASET');
    });

    it('should skip when graph already exists', async () => {
      const dataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 100,
        routesCount: 50,
        flightsCount: 200,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: false,
      });

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([
        { id: 'graph-1', version: 'graph-v1.0.0', datasetVersion: 'v1.0.0' },
      ] as any);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });

    it('should validate graph before saving', async () => {
      const dataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 0,
        routesCount: 0,
        flightsCount: 0,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: false,
      });

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);
      mockStopRepository.getAllRealStops.mockResolvedValue([]);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]);
      mockRouteRepository.getAllRoutes.mockResolvedValue([]);
      mockRouteRepository.getAllVirtualRoutes.mockResolvedValue([]);
      mockFlightRepository.getAllFlights.mockResolvedValue([]);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Graph validation failed');
    });
  });

  describe('canRun', () => {
    it('should allow running when no graph exists for dataset', async () => {
      const dataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 100,
        routesCount: 50,
        flightsCount: 200,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: false,
      });

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([]);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should prevent running when graph exists', async () => {
      const dataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 100,
        routesCount: 50,
        flightsCount: 200,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: false,
      });

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);
      mockGraphRepository.getGraphMetadataByDatasetVersion.mockResolvedValue([
        { id: 'graph-1' },
      ] as any);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });
});




