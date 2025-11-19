/**
 * Unit Tests: VirtualEntitiesGeneratorWorker
 */

import { VirtualEntitiesGeneratorWorker } from '../../../application/workers/VirtualEntitiesGeneratorWorker';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../../domain/repositories/IDatasetRepository';
import { Dataset } from '../../../domain/entities';

describe('VirtualEntitiesGeneratorWorker', () => {
  let worker: VirtualEntitiesGeneratorWorker;
  let mockStopRepository: jest.Mocked<IStopRepository>;
  let mockRouteRepository: jest.Mocked<IRouteRepository>;
  let mockFlightRepository: jest.Mocked<IFlightRepository>;
  let mockDatasetRepository: jest.Mocked<IDatasetRepository>;

  const citiesDirectory = {
    'Якутск': { latitude: 62.0355, longitude: 129.6755 },
    'Москва': { latitude: 55.7558, longitude: 37.6173 },
  };

  beforeEach(() => {
    mockStopRepository = {
      getAllRealStops: jest.fn(),
      getAllVirtualStops: jest.fn(),
      saveVirtualStopsBatch: jest.fn(),
      countRealStops: jest.fn(),
      countVirtualStops: jest.fn(),
      getRealStopsByCity: jest.fn(),
      getVirtualStopsByCity: jest.fn(),
    } as any;

    mockRouteRepository = {
      saveVirtualRoutesBatch: jest.fn(),
      countRoutes: jest.fn(),
      countVirtualRoutes: jest.fn(),
    } as any;

    mockFlightRepository = {
      saveFlightsBatch: jest.fn(),
      countFlights: jest.fn(),
    } as any;

    mockDatasetRepository = {
      getLatestDataset: jest.fn(),
      updateStatistics: jest.fn(),
    } as any;

    worker = new VirtualEntitiesGeneratorWorker(
      mockStopRepository,
      mockRouteRepository,
      mockFlightRepository,
      mockDatasetRepository,
      citiesDirectory
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should generate virtual entities for missing cities', async () => {
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
      mockStopRepository.getAllRealStops.mockResolvedValue([
        { id: 'stop-1', name: 'Якутск Аэропорт', cityName: 'Якутск' },
      ] as any);
      mockStopRepository.countVirtualStops.mockResolvedValue(0); // No virtual stops yet
      mockStopRepository.saveVirtualStopsBatch.mockResolvedValue([]);
      mockRouteRepository.saveVirtualRoutesBatch.mockResolvedValue([]);
      mockFlightRepository.saveFlightsBatch.mockResolvedValue([]);
      mockStopRepository.countRealStops.mockResolvedValue(100);
      mockStopRepository.countVirtualStops.mockResolvedValue(1);
      mockRouteRepository.countRoutes.mockResolvedValue(50);
      mockRouteRepository.countVirtualRoutes.mockResolvedValue(1);
      mockFlightRepository.countFlights.mockResolvedValue(200);
      mockDatasetRepository.updateStatistics.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Virtual entities generated');
      expect(result.nextWorker).toBe('graph-builder');
    });

    it('should skip when no dataset found', async () => {
      mockDatasetRepository.getLatestDataset.mockResolvedValue(null);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_DATASET');
    });

    it('should skip when virtual entities already exist', async () => {
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
      mockStopRepository.countVirtualStops.mockResolvedValue(10); // Already has virtual stops

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });

  describe('canRun', () => {
    it('should allow running when no virtual entities exist', async () => {
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
      mockStopRepository.countVirtualStops.mockResolvedValue(0);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should prevent running when virtual entities exist', async () => {
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
      mockStopRepository.countVirtualStops.mockResolvedValue(10);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });
});

