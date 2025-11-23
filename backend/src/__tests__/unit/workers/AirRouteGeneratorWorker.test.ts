/**
 * Unit Tests: AirRouteGeneratorWorker
 * 
 * Tests for air route generation from federal cities to Yakutsk.
 */

import { AirRouteGeneratorWorker } from '../../../application/workers/AirRouteGeneratorWorker';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../../domain/repositories/IDatasetRepository';
import { Dataset, RealStop, Route, Flight } from '../../../domain/entities';

describe('AirRouteGeneratorWorker', () => {
  let worker: AirRouteGeneratorWorker;
  let mockStopRepository: jest.Mocked<IStopRepository>;
  let mockRouteRepository: jest.Mocked<IRouteRepository>;
  let mockFlightRepository: jest.Mocked<IFlightRepository>;
  let mockDatasetRepository: jest.Mocked<IDatasetRepository>;

  beforeEach(() => {
    mockStopRepository = {
      getAllRealStops: jest.fn(),
      getRealStopsByCity: jest.fn().mockResolvedValue([]),
      getVirtualStopsByCity: jest.fn().mockResolvedValue([]),
    } as any;

    mockRouteRepository = {
      findDirectRoutes: jest.fn(),
      saveRoutesBatch: jest.fn(),
    } as any;

    mockFlightRepository = {
      saveFlightsBatch: jest.fn(),
    } as any;

    mockDatasetRepository = {
      getLatestDataset: jest.fn(),
    } as any;

    worker = new AirRouteGeneratorWorker(
      mockStopRepository,
      mockRouteRepository,
      mockFlightRepository,
      mockDatasetRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canRun', () => {
    it('should return true when dataset exists', async () => {
      const dataset = new Dataset(
        1,
        'v1.0.0',
        'ODATA',
        0.95,
        100,
        50,
        200,
        0,
        0,
        'abc123',
        undefined,
        new Date(),
        false
      );

      mockDatasetRepository.getLatestDataset.mockResolvedValue(dataset);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should return false when no dataset found', async () => {
      mockDatasetRepository.getLatestDataset.mockResolvedValue(undefined);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });

  describe('execute', () => {
    it('should skip when no dataset found', async () => {
      mockDatasetRepository.getLatestDataset.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      // BaseBackgroundWorker returns CANNOT_RUN when canRun() returns false
      expect(result.error).toBe('CANNOT_RUN');
    });

    it('should skip when hub city has no stops', async () => {
      const dataset = new Dataset(
        1,
        'v1.0.0',
        'ODATA',
        0.95,
        100,
        50,
        200,
        0,
        0,
        'abc123',
        undefined,
        new Date(),
        false
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset) // canRun()
        .mockResolvedValueOnce(dataset); // executeWorkerLogic()

      mockStopRepository.getRealStopsByCity.mockResolvedValue([]);
      (mockStopRepository as any).getVirtualStopsByCity = jest.fn().mockResolvedValue([]);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_HUB_STOPS');
    });

    it('should generate routes when hub and federal city stops exist', async () => {
      const dataset = new Dataset(
        1,
        'v1.0.0',
        'ODATA',
        0.95,
        100,
        50,
        200,
        0,
        0,
        'abc123',
        undefined,
        new Date(),
        false
      );

      const hubStop = new RealStop(
        'stop-yakutsk-airport',
        'Аэропорт Якутск (Туймаада)',
        62.0933,
        129.7706,
        'якутск',
        true,
        false,
        undefined,
        new Date()
      );

      const moscowStop = new RealStop(
        'stop-moscow-airport',
        'Аэропорт Шереметьево',
        55.9736,
        37.4145,
        'москва',
        true,
        false,
        undefined,
        new Date()
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset) // canRun()
        .mockResolvedValueOnce(dataset); // executeWorkerLogic()

      mockStopRepository.getRealStopsByCity
        .mockResolvedValueOnce([hubStop]) // Yakutsk (hub)
        .mockResolvedValueOnce([moscowStop]); // Moscow (federal city)
      (mockStopRepository as any).getVirtualStopsByCity = jest.fn().mockResolvedValue([]);

      mockRouteRepository.findDirectRoutes
        .mockResolvedValueOnce([]) // Forward route doesn't exist
        .mockResolvedValueOnce([]); // Backward route doesn't exist

      const savedRoutes = [
        new Route(
          'route-moscow-yakutsk',
          'PLANE',
          'stop-moscow-airport',
          'stop-yakutsk-airport',
          [{ stopId: 'stop-moscow-airport', order: 0 }, { stopId: 'stop-yakutsk-airport', order: 1 }],
          undefined,
          240,
          4900,
          undefined,
          undefined,
          new Date()
        ),
      ];

      const savedFlights: Flight[] = [];

      mockRouteRepository.saveRoutesBatch.mockResolvedValue(savedRoutes);
      mockFlightRepository.saveFlightsBatch.mockResolvedValue(savedFlights);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(mockRouteRepository.saveRoutesBatch).toHaveBeenCalled();
      expect(mockFlightRepository.saveFlightsBatch).toHaveBeenCalled();
    });

    it('should skip when routes already exist', async () => {
      const dataset = new Dataset(
        1,
        'v1.0.0',
        'ODATA',
        0.95,
        100,
        50,
        200,
        0,
        0,
        'abc123',
        undefined,
        new Date(),
        false
      );

      const hubStop = new RealStop(
        'stop-yakutsk-airport',
        'Аэропорт Якутск (Туймаада)',
        62.0933,
        129.7706,
        'якутск',
        true,
        false,
        undefined,
        new Date()
      );

      const moscowStop = new RealStop(
        'stop-moscow-airport',
        'Аэропорт Шереметьево',
        55.9736,
        37.4145,
        'москва',
        true,
        false,
        undefined,
        new Date()
      );

      const existingRoute = new Route(
        'route-existing',
        'PLANE',
        'stop-moscow-airport',
        'stop-yakutsk-airport',
        [{ stopId: 'stop-moscow-airport', order: 0 }, { stopId: 'stop-yakutsk-airport', order: 1 }],
        undefined,
        240,
        4900,
        undefined,
        undefined,
        new Date()
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset) // canRun()
        .mockResolvedValueOnce(dataset); // executeWorkerLogic()

      mockStopRepository.getRealStopsByCity
        .mockResolvedValueOnce([hubStop]) // Yakutsk (hub)
        .mockResolvedValueOnce([moscowStop]); // Moscow (federal city)
      (mockStopRepository as any).getVirtualStopsByCity = jest.fn().mockResolvedValue([]);

      mockRouteRepository.findDirectRoutes
        .mockResolvedValueOnce([existingRoute]) // Forward route exists
        .mockResolvedValueOnce([existingRoute]); // Backward route exists

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('No new routes to generate');
      expect(mockRouteRepository.saveRoutesBatch).not.toHaveBeenCalled();
    });

    it('should handle errors during execution', async () => {
      const dataset = new Dataset(
        1,
        'v1.0.0',
        'ODATA',
        0.95,
        100,
        50,
        200,
        0,
        0,
        'abc123',
        undefined,
        new Date(),
        false
      );

      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(dataset) // canRun()
        .mockRejectedValueOnce(new Error('Database error')); // executeWorkerLogic()

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBe('EXECUTION_ERROR');
      expect(result.message).toContain('Database error');
    });
  });
});

