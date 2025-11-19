/**
 * Unit Tests: ODataSyncWorker
 * 
 * Tests for OData synchronization worker.
 */

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
  });

  describe('execute', () => {
    it('should skip when no changes detected (same hash)', async () => {
      const odataResponse = {
        stops: [],
        routes: [],
        flights: [],
      };

      const existingDataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 0,
        routesCount: 0,
        flightsCount: 0,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: true,
      });

      mockODataClient.fetchAll.mockResolvedValue(odataResponse);
      mockDatasetRepository.getLatestDataset.mockResolvedValue(existingDataset);

      // Mock crypto.createHash to return same hash
      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const result = await worker.execute();

      expect(result.success).toBe(true);
      expect(result.message).toContain('No changes detected');
      expect(mockStopRepository.saveRealStopsBatch).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should process changes when hash differs', async () => {
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
      mockDatasetRepository.getLatestDataset.mockResolvedValue(null); // No existing dataset

      // Mock crypto to return different hash
      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('new-hash-123'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      mockStopRepository.saveRealStopsBatch.mockResolvedValue([new RealStop('stop-1', 'Якутск Аэропорт', 62.0355, 129.6755)]);
      mockRouteRepository.saveRoutesBatch.mockResolvedValue([new Route('route-1', '101', 'PLANE', 'stop-1', 'stop-2', ['stop-1', 'stop-2'], 360, 4900)]);
      mockFlightRepository.saveFlightsBatch.mockResolvedValue([new Flight('flight-1', 'route-1', 'stop-1', 'stop-2', '2025-02-01T08:00:00Z', '2025-02-01T14:00:00Z', [1], 15000, 50, false)]);
      mockDatasetRepository.saveDataset.mockResolvedValue(new Dataset({
        id: 'dataset-2',
        version: 'v2.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 1,
        routesCount: 1,
        flightsCount: 1,
        odataHash: 'new-hash-123',
        buildTimestamp: new Date(),
        isActive: false,
      }));

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

      mockODataClient.fetchAll.mockResolvedValue(odataResponse);
      mockDatasetRepository.getLatestDataset.mockResolvedValue(null);
      mockStopRepository.saveRealStopsBatch.mockRejectedValue(new Error('Database error'));

      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('new-hash'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const result = await worker.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      jest.restoreAllMocks();
    });
  });

  describe('canRun', () => {
    it('should allow running if enough time passed', async () => {
      // Mock lastRun to be 2 hours ago
      const metadata = worker.getMetadata();
      (metadata as any).lastRun = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const canRun = await worker.canRun();

      expect(canRun).toBe(true);
    });

    it('should prevent running if too soon', async () => {
      // Mock lastRun to be 30 minutes ago
      const metadata = worker.getMetadata();
      (metadata as any).lastRun = new Date(Date.now() - 30 * 60 * 1000);

      const canRun = await worker.canRun();

      expect(canRun).toBe(false);
    });
  });
});

