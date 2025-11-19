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
        id: 'dataset-1',
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality: 0.95,
        stops_count: 1000,
        routes_count: 500,
        flights_count: 2000,
        odata_hash: 'abc123',
        build_timestamp: new Date('2025-01-15T10:00:00Z'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.findById('dataset-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('dataset-1');
      expect(result?.version).toBe('v1.0.0');
    });
  });

  describe('getLatestDataset', () => {
    it('should return latest dataset', async () => {
      const mockRow = {
        id: 'dataset-1',
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality: 0.95,
        stops_count: 1000,
        routes_count: 500,
        flights_count: 2000,
        odata_hash: 'abc123',
        build_timestamp: new Date('2025-01-15T10:00:00Z'),
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.getLatestDataset();

      expect(result).toBeDefined();
      expect(result?.id).toBe('dataset-1');
    });
  });

  describe('getActiveDataset', () => {
    it('should return active dataset', async () => {
      const mockRow = {
        id: 'dataset-1',
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality: 0.95,
        stops_count: 1000,
        routes_count: 500,
        flights_count: 2000,
        odata_hash: 'abc123',
        build_timestamp: new Date('2025-01-15T10:00:00Z'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
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
      const dataset = new Dataset({
        id: 'dataset-1',
        version: 'v1.0.0',
        sourceType: 'ODATA',
        quality: 0.95,
        stopsCount: 1000,
        routesCount: 500,
        flightsCount: 2000,
        odataHash: 'abc123',
        buildTimestamp: new Date(),
        isActive: false,
      });

      const mockRow = {
        id: 'dataset-1',
        version: 'v1.0.0',
        source_type: 'ODATA',
        quality: 0.95,
        stops_count: 1000,
        routes_count: 500,
        flights_count: 2000,
        odata_hash: 'abc123',
        build_timestamp: new Date(),
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([mockRow])
      );

      const result = await repository.saveDataset(dataset);

      expect(result).toBeDefined();
      expect(result.id).toBe('dataset-1');
    });
  });

  describe('setActiveDataset', () => {
    it('should set dataset as active', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([], 1)
      );

      await repository.setActiveDataset('dataset-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE datasets'),
        expect.arrayContaining(['dataset-1'])
      );
    });
  });

  describe('existsByODataHash', () => {
    it('should return true when hash exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([{ count: '1' }])
      );

      const result = await repository.existsByODataHash('abc123');

      expect(result).toBe(true);
    });

    it('should return false when hash does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        createMockQueryResult([{ count: '0' }])
      );

      const result = await repository.existsByODataHash('non-existent');

      expect(result).toBe(false);
    });
  });
});

