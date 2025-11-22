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
    'Санкт-Петербург': { latitude: 59.9343, longitude: 30.3351 },
    'Новосибирск': { latitude: 55.0084, longitude: 82.9357 },
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
      findRealStopById: jest.fn(),
      findVirtualStopById: jest.fn(),
    } as any;

    mockRouteRepository = {
      saveVirtualRoutesBatch: jest.fn(),
      countRoutes: jest.fn(),
      countVirtualRoutes: jest.fn(),
      findDirectRoutes: jest.fn(),
      findVirtualConnections: jest.fn(),
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

      // Setup mocks for canRun() check (called first in execute())
      // canRun() calls: super.canRun() -> getLatestDataset() -> countVirtualStops()
      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset) // First call in canRun()
        .mockResolvedValueOnce(dataset); // Second call in executeWorkerLogic()
      mockStopRepository.countVirtualStops
        .mockResolvedValueOnce(0) // First call in canRun() - no virtual stops yet
        .mockResolvedValueOnce(0) // Second call in executeWorkerLogic() line 170
        .mockResolvedValueOnce(1) // Third call in executeWorkerLogic() line 178 (after generation)
        .mockResolvedValueOnce(1); // Fourth call in executeWorkerLogic() line 178 (for totalVirtualStops)
      
      // Setup mocks for executeWorkerLogic()
      const mockVirtualStop = { id: 'vstop-1', name: 'Virtual Stop', cityId: 'MissingCity' } as any;
      const mockHubStop = { id: 'stop-1', name: 'Якутск Аэропорт', cityId: 'Якутск' } as any;
      mockStopRepository.getAllRealStops.mockResolvedValue([mockHubStop]);
      mockStopRepository.getAllVirtualStops.mockResolvedValue([]); // For ensureYakutiaCitiesConnectivity
      // Mock for findHubStop() - getRealStopsByCity('якутск')
      mockStopRepository.getRealStopsByCity.mockResolvedValue([mockHubStop]);
      mockStopRepository.saveVirtualStopsBatch.mockResolvedValue([mockVirtualStop]);
      // Mock for ensureYakutiaCitiesConnectivity - checkRouteExists
      mockRouteRepository.findDirectRoutes.mockResolvedValue([]);
      mockRouteRepository.findVirtualConnections.mockResolvedValue([]);
      mockRouteRepository.saveVirtualRoutesBatch.mockResolvedValue([]);
      mockFlightRepository.saveFlightsBatch.mockResolvedValue([]);
      mockRouteRepository.countVirtualRoutes
        .mockResolvedValueOnce(0) // First call in executeWorkerLogic() line 171
        .mockResolvedValueOnce(0); // Second call in executeWorkerLogic() line 179
      mockStopRepository.countRealStops.mockResolvedValue(100);
      mockRouteRepository.countRoutes.mockResolvedValue(50);
      // countVirtualRoutes already mocked with mockResolvedValueOnce above
      mockFlightRepository.countFlights.mockResolvedValue(200);
      mockDatasetRepository.updateStatistics.mockResolvedValue(dataset);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Virtual entities generated');
      expect(result.nextWorker).toBe('graph-builder');
    });

    it('should skip when no dataset found', async () => {
      // canRun() checks getLatestDataset() first
      mockDatasetRepository.getLatestDataset.mockResolvedValue(undefined);
      // canRun() will return false, so execute() returns CANNOT_RUN
      // But we want to test the NO_DATASET case, so we need to mock canRun() to return true
      // Actually, the worker's canRun() checks for dataset, so if dataset is undefined,
      // canRun() returns false, and execute() returns CANNOT_RUN, not NO_DATASET
      // So we need to test the actual behavior: when dataset is undefined, canRun() fails
      const result = await worker.execute();

      expect(result.success).toBe(false);
      // When canRun() fails due to no dataset, it returns CANNOT_RUN, not NO_DATASET
      expect(result.error).toBe('CANNOT_RUN');
    });

    it('should skip when virtual entities already exist', async () => {
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
      mockStopRepository.countVirtualStops.mockResolvedValue(10); // Already has virtual stops

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });

  describe('canRun', () => {
    it('should allow running when no virtual entities exist', async () => {
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
      mockStopRepository.countVirtualStops.mockResolvedValue(0);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should prevent running when virtual entities exist', async () => {
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
      mockStopRepository.countVirtualStops.mockResolvedValue(10);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });
});




