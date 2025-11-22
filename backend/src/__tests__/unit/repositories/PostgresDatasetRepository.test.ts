/**
 * Unit Tests: PostgresDatasetRepository
 */

import { PostgresDatasetRepository } from '../../../infrastructure/repositories/PostgresDatasetRepository';
import { Dataset } from '../../../domain/entities';
import { createMockPool, createMockQueryResult } from '../../mocks/database.mock';
import type { Pool } from 'pg';

describe('PostgresDatasetRepository', () => {
  let repository: PostgresDatasetRepository;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    mockPool = createMockPool();
    repository = new PostgresDatasetRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return dataset when found', async () => {
      const mockRow = {
        id: 1,
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality_score: 0.95,
        total_stops: 1000,
        total_routes: 500,
        total_flights: 2000,
        total_virtual_stops: 0,
        total_virtual_routes: 0,
        odata_hash: 'abc123',
        metadata: null,
        is_active: true,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.findById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.version).toBe('v1.0.0');
    });
  });

  describe('getLatestDataset', () => {
    it('should return latest dataset', async () => {
      const mockRow = {
        id: 1,
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality_score: 0.95,
        total_stops: 1000,
        total_routes: 500,
        total_flights: 2000,
        total_virtual_stops: 0,
        total_virtual_routes: 0,
        odata_hash: 'abc123',
        metadata: null,
        is_active: false,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.getLatestDataset();

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });
  });

  describe('getActiveDataset', () => {
    it('should return active dataset', async () => {
      const mockRow = {
        id: 1,
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality_score: 0.95,
        total_stops: 1000,
        total_routes: 500,
        total_flights: 2000,
        total_virtual_stops: 0,
        total_virtual_routes: 0,
        odata_hash: 'abc123',
        metadata: null,
        is_active: true,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.getActiveDataset();

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(true);
    });
  });

  describe('saveDataset', () => {
    it('should save dataset', async () => {
      const dataset = new Dataset(
        1, // id
        'v1.0.0', // version
        'ODATA', // sourceType
        0.95, // qualityScore
        1000, // totalStops
        500, // totalRoutes
        2000, // totalFlights
        0, // totalVirtualStops
        0, // totalVirtualRoutes
        'abc123', // odataHash
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      const mockRow = {
        id: 1,
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality_score: 0.95,
        total_stops: 1000,
        total_routes: 500,
        total_flights: 2000,
        total_virtual_stops: 0,
        total_virtual_routes: 0,
        odata_hash: 'abc123',
        metadata: null,
        is_active: false,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.saveDataset(dataset);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  describe('setActiveDataset', () => {
    it('should set dataset as active', async () => {
      const mockRow = {
        id: 1,
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality_score: 0.95,
        total_stops: 1000,
        total_routes: 500,
        total_flights: 2000,
        total_virtual_stops: 0,
        total_virtual_routes: 0,
        odata_hash: 'abc123',
        metadata: null,
        is_active: true,
        created_at: new Date(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(createMockQueryResult([], 1)) // BEGIN
          .mockResolvedValueOnce(createMockQueryResult([], 1)) // UPDATE all to inactive
          .mockResolvedValueOnce(createMockQueryResult([mockRow])) // UPDATE specific dataset to active (RETURNING *)
          .mockResolvedValueOnce(createMockQueryResult([], 1)), // COMMIT
        release: jest.fn(),
      };

      (mockPool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);

      const result = await repository.setActiveDataset('v1.0.0');

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.isActive).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE datasets'),
        expect.arrayContaining(['v1.0.0'])
      );
    });
  });

  describe('existsByODataHash', () => {
    it('should return true when hash exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([{ exists: true }])
      );

      const result = await repository.existsByODataHash('abc123');

      expect(result).toBe(true);
    });

    it('should return false when hash does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([{ exists: false }])
      );

      const result = await repository.existsByODataHash('non-existent');

      expect(result).toBe(false);
    });
  });
});




