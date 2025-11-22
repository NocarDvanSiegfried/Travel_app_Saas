/**
 * Unit Tests: ODataSyncWorker
 * 
 * Tests for OData synchronization worker.
 */

// Mock crypto module at the top level
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    createHash: jest.fn(),
  };
});

import { ODataSyncWorker } from '../../../application/workers/ODataSyncWorker';
import type { IODataClient, IMinioClient } from '../../../application/workers/ODataSyncWorker';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../../domain/repositories/IDatasetRepository';
import { RealStop, Route, Flight, Dataset } from '../../../domain/entities';

describe('ODataSyncWorker', () => {
  let worker: ODataSyncWorker;
  let mockODataClient: jest.Mocked<IODataClient>;
  let mockStopRepository: jest.Mocked<IStopRepository>;
  let mockRouteRepository: jest.Mocked<IRouteRepository>;
  let mockFlightRepository: jest.Mocked<IFlightRepository>;
  let mockDatasetRepository: jest.Mocked<IDatasetRepository>;
  let mockMinioClient: jest.Mocked<IMinioClient>;

  beforeEach(() => {
    mockODataClient = {
      fetchAll: jest.fn(),
    };

    mockStopRepository = {
      saveRealStopsBatch: jest.fn(),
    } as any;

    mockRouteRepository = {
      saveRoutesBatch: jest.fn(),
    } as any;

    mockFlightRepository = {
      saveFlightsBatch: jest.fn(),
    } as any;

    mockDatasetRepository = {
      getLatestDataset: jest.fn(),
      saveDataset: jest.fn(),
    } as any;

    mockMinioClient = {
      uploadDataset: jest.fn(),
    };

    worker = new ODataSyncWorker(
      mockODataClient,
      mockStopRepository,
      mockRouteRepository,
      mockFlightRepository,
      mockDatasetRepository,
      mockMinioClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Don't use jest.restoreAllMocks() here as it causes issues with crypto.createHash spy
    // Reset lastRun after each test to avoid interference
    (worker as any).lastRun = undefined;
    (worker as any).isRunning = false;
  });

  describe('execute', () => {
    it('should skip when no changes detected (same hash)', async () => {
      // Reset lastRun to allow canRun() to return true
      (worker as any).lastRun = undefined;
      
      const odataResponse = {
        stops: [],
        routes: [],
        flights: [],
      };

      const existingDataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        0, // totalStops
        0, // totalRoutes
        0, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        true // isActive
      );

      mockODataClient.fetchAll.mockResolvedValue(odataResponse);
      // ODataSyncWorker.canRun() doesn't check dataset, only lastRun
      // So we only need to mock getLatestDataset for executeWorkerLogic()
      mockDatasetRepository.getLatestDataset.mockResolvedValue(existingDataset); // Call in executeWorkerLogic() line 150

      // Mock crypto.createHash to return same hash
      jest.restoreAllMocks(); // Restore any previous spies
      const crypto = await import('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('No changes detected');
      expect(mockStopRepository.saveRealStopsBatch).not.toHaveBeenCalled();
    });

    it('should process changes when hash differs', async () => {
      // Reset lastRun to allow canRun() to return true
      (worker as any).lastRun = undefined;
      
      const odataResponse = {
        stops: [
          {
            id: 'stop-1',
            name: 'Якутск Аэропорт',
            latitude: 62.0355,
            longitude: 129.6755,
            type: 'airport',
          },
        ],
        routes: [
          {
            id: 'route-1',
            routeNumber: '101',
            name: 'Якутск - Москва',
            transportType: 'PLANE',
            stops: ['stop-1', 'stop-2'],
            baseFare: 15000,
          },
        ],
        flights: [
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
        ],
      };

      mockODataClient.fetchAll.mockResolvedValue(odataResponse);
      // For canRun() to return true, getLatestDataset can return undefined (no existing dataset is OK)
      // But for executeWorkerLogic to work with hash comparison, we need a dataset with old hash
      const existingDataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        0, // totalStops
        0, // totalRoutes
        0, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'old-hash', // odataHash (different from new-hash-123 to trigger processing)
        undefined, // metadata
        new Date(), // createdAt
        true // isActive
      );
      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(existingDataset) // First call in canRun() - returns dataset, so canRun() = true
        .mockResolvedValueOnce(existingDataset); // Second call in executeWorkerLogic() for hash comparison

      // Mock crypto to return different hash
      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('new-hash-123'),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      mockStopRepository.saveRealStopsBatch.mockResolvedValue([new RealStop('stop-1', 'Якутск Аэропорт', 62.0355, 129.6755)]);
      mockRouteRepository.saveRoutesBatch.mockResolvedValue([
        new Route(
          'route-1', // id
          'PLANE', // transportType
          'stop-1', // fromStopId
          'stop-2', // toStopId
          [{ stopId: 'stop-1', order: 0 }, { stopId: 'stop-2', order: 1 }], // stopsSequence (must have at least 2 stops)
          '101', // routeNumber
          360, // durationMinutes
          4900 // distanceKm
        )
      ]);
      mockFlightRepository.saveFlightsBatch.mockResolvedValue([
        new Flight(
          'flight-1', // id
          'stop-1', // fromStopId
          'stop-2', // toStopId
          '08:00', // departureTime
          '14:00', // arrivalTime
          [1], // daysOfWeek
          'route-1', // routeId
          15000, // priceRub
          false, // isVirtual
          'PLANE' // transportType
        )
      ]);
      mockDatasetRepository.saveDataset.mockResolvedValue(
        new Dataset(
          2, // id
          'v2.0.0', // version
          'ODATA', // sourceType
          0.95, // qualityScore
          1, // totalStops
          1, // totalRoutes
          1, // totalFlights
          0, // totalVirtualStops
          0, // totalVirtualRoutes
          'new-hash-123', // odataHash
          undefined, // metadata
          new Date(), // createdAt
          false // isActive
        )
      );
      mockMinioClient.uploadDataset.mockResolvedValue(undefined);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('OData sync completed');
      expect(result.nextWorker).toBe('virtual-entities-generator');
      expect(mockStopRepository.saveRealStopsBatch).toHaveBeenCalled();
      expect(mockRouteRepository.saveRoutesBatch).toHaveBeenCalled();
      expect(mockFlightRepository.saveFlightsBatch).toHaveBeenCalled();
      expect(mockDatasetRepository.saveDataset).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should handle OData fetch errors', async () => {
      mockODataClient.fetchAll.mockRejectedValue(new Error('OData API unavailable'));

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('OData API unavailable');
    });

    it('should handle database errors', async () => {
      const odataResponse = {
        stops: [],
        routes: [],
        flights: [],
      };

      // Reset lastRun to allow canRun() to return true
      (worker as any).lastRun = undefined;
      
      mockODataClient.fetchAll.mockResolvedValue(odataResponse);
      mockDatasetRepository.getLatestDataset
        .mockResolvedValueOnce(undefined) // First call in canRun() - will fail, but we need to mock it
        .mockResolvedValueOnce(undefined); // Second call in executeWorkerLogic() line 150
      mockStopRepository.saveRealStopsBatch.mockRejectedValue(new Error('Database error'));

      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('new-hash'),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      jest.restoreAllMocks();
    });
  });

  describe('canRun', () => {
    it('should allow running if enough time passed', async () => {
      // Mock lastRun to be 2 hours ago
      (worker as any).lastRun = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should prevent running if too soon', async () => {
      // Mock lastRun to be 30 minutes ago
      (worker as any).lastRun = new Date(Date.now() - 30 * 60 * 1000);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });
});

