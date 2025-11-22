/**
 * Unit Tests: PostgresGraphRepository
 * 
 * Tests for hybrid PostgreSQL + Redis graph repository.
 */

import { PostgresGraphRepository } from '../../../infrastructure/repositories/PostgresGraphRepository';
import { Graph } from '../../../domain/entities';
import { createMockPool, createMockQueryResult } from '../../mocks/database.mock';
import { createMockRedisClient } from '../../mocks/redis.mock';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

describe('PostgresGraphRepository', () => {
  let repository: PostgresGraphRepository;
  let mockPool: Partial<Pool>;
  let mockRedis: Partial<RedisClientType>;

  beforeEach(() => {
    mockPool = createMockPool();
    mockRedis = createMockRedisClient();
    repository = new PostgresGraphRepository(mockPool as Pool, mockRedis as RedisClientType);
  });

  afterEach(() => {
    jest.clearAllMocks();
    (mockRedis as any).clearStorage();
  });

  describe('Redis Operations', () => {
    describe('getGraphVersion', () => {
      it('should return graph version from Redis', async () => {
        (mockRedis.set as jest.Mock).mockResolvedValue('OK');
        (mockRedis.get as jest.Mock).mockResolvedValue('graph-v1.0.0');

        const version = await repository.getGraphVersion();

        expect(version).toBe('graph-v1.0.0');
        expect(mockRedis.get).toHaveBeenCalledWith('graph:current:version');
      });

      it('should return undefined when version not set', async () => {
        (mockRedis.get as jest.Mock).mockResolvedValue(null);

        const version = await repository.getGraphVersion();

        expect(version).toBeUndefined();
      });
    });

    describe('setGraphVersion', () => {
      it('should set graph version in Redis', async () => {
        (mockRedis.set as jest.Mock).mockResolvedValue('OK');

        await repository.setGraphVersion('graph-v1.0.0');

        expect(mockRedis.set).toHaveBeenCalledWith('graph:current:version', 'graph-v1.0.0');
      });
    });

    describe('hasNode', () => {
      it('should return true when node exists', async () => {
        (mockRedis.get as jest.Mock).mockResolvedValue('graph-v1.0.0');
        (mockRedis.sIsMember as jest.Mock).mockResolvedValue(true);

        const result = await repository.hasNode('stop-1');

        expect(result).toBe(true);
        expect(mockRedis.get).toHaveBeenCalledWith('graph:current:version');
        expect(mockRedis.sIsMember).toHaveBeenCalledWith('graph:graph-v1.0.0:nodes', 'stop-1');
      });

      it('should return false when node does not exist', async () => {
        (mockRedis.get as jest.Mock).mockResolvedValue('graph-v1.0.0');
        (mockRedis.sIsMember as jest.Mock).mockResolvedValue(false);

        const result = await repository.hasNode('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('getNeighbors', () => {
      it('should return neighbors from Redis', async () => {
        const neighbors = [
          { neighborId: 'stop-2', weight: 60, metadata: { distance: 50, transportType: 'BUS', routeId: 'route-1' } },
          { neighborId: 'stop-3', weight: 120, metadata: { distance: 100, transportType: 'BUS', routeId: 'route-2' } },
        ];

        (mockRedis.get as jest.Mock)
          .mockResolvedValueOnce('graph-v1.0.0') // First call: getGraphVersion()
          .mockResolvedValueOnce(JSON.stringify(neighbors)); // Second call: getNeighbors()

        const result = await repository.getNeighbors('stop-1');

        expect(result).toHaveLength(2);
        expect(result[0].neighborId).toBe('stop-2');
        expect(result[0].weight).toBe(60);
      });

      it('should return empty array when no neighbors', async () => {
        (mockRedis.get as jest.Mock)
          .mockResolvedValueOnce('graph-v1.0.0') // First call: getGraphVersion()
          .mockResolvedValueOnce(null); // Second call: getNeighbors() - no data

        const result = await repository.getNeighbors('stop-1');

        expect(result).toHaveLength(0);
      });
    });

    describe('getEdgeWeight', () => {
      it('should return edge weight from neighbors', async () => {
        const neighbors = [
          { neighborId: 'stop-2', weight: 60 },
        ];

        (mockRedis.get as jest.Mock)
          .mockResolvedValueOnce('graph-v1.0.0') // First call: getGraphVersion()
          .mockResolvedValueOnce(JSON.stringify(neighbors)); // Second call: getNeighbors()

        const weight = await repository.getEdgeWeight('stop-1', 'stop-2');

        expect(weight).toBe(60);
      });

      it('should return undefined when edge does not exist', async () => {
        const neighbors = [
          { neighborId: 'stop-3', weight: 120 },
        ];

        (mockRedis.get as jest.Mock)
          .mockResolvedValueOnce('graph-v1.0.0') // First call: getGraphVersion()
          .mockResolvedValueOnce(JSON.stringify(neighbors)); // Second call: getNeighbors()

        const weight = await repository.getEdgeWeight('stop-1', 'stop-2');

        expect(weight).toBeUndefined();
      });
    });
  });

  describe('PostgreSQL Operations', () => {
    describe('findMetadataById', () => {
      it('should return graph metadata when found', async () => {
        const mockRow = {
          id: 1,
          version: 'graph-v1.0.0',
          dataset_version: 'v1.0.0',
          total_nodes: 1000,
          total_edges: 5000,
          build_duration_ms: 1000,
          redis_key: 'graph:v1.0.0',
          minio_backup_path: 'graph/export-v1.0.0.json',
          metadata: null,
          created_at: new Date(),
          is_active: true,
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.findMetadataById(1);

        expect(result).toBeDefined();
        expect(result?.id).toBe(1);
        expect(result?.version).toBe('graph-v1.0.0');
      });
    });

    describe('saveGraphMetadata', () => {
      it('should save graph metadata', async () => {
        const graph = new Graph(
          1, // id
          'graph-v1.0.0', // version
          'v1.0.0', // datasetVersion
          1000, // totalNodes
          5000, // totalEdges
          1000, // buildDurationMs
          'graph:v1.0.0', // redisKey
          'graph/export-v1.0.0.json', // minioBackupPath
          undefined, // metadata
          new Date(), // createdAt
          false // isActive
        );

        const mockRow = {
          id: 1,
          version: 'graph-v1.0.0',
          dataset_version: 'v1.0.0',
          total_nodes: 1000,
          total_edges: 5000,
          build_duration_ms: 1000,
          redis_key: 'graph:v1.0.0',
          minio_backup_path: 'graph/export-v1.0.0.json',
          metadata: null,
          created_at: new Date(),
          is_active: false,
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveGraphMetadata(graph);

        expect(result).toBeDefined();
        expect(result.id).toBe(1);
      });
    });

    describe('setActiveGraphMetadata', () => {
      it('should set graph as active', async () => {
        const mockRow = {
          id: 1,
          version: 'graph-v1.0.0',
          dataset_version: 'v1.0.0',
          total_nodes: 1000,
          total_edges: 5000,
          build_duration_ms: 1000,
          redis_key: 'graph:v1.0.0',
          minio_backup_path: 'graph/export-v1.0.0.json',
          metadata: null,
          created_at: new Date(),
          is_active: true,
        };

        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce(createMockQueryResult([], 1)) // BEGIN
            .mockResolvedValueOnce(createMockQueryResult([], 1)) // UPDATE all to inactive
            .mockResolvedValueOnce(createMockQueryResult([mockRow])) // UPDATE specific graph to active (RETURNING *)
            .mockResolvedValueOnce(createMockQueryResult([], 1)), // COMMIT
          release: jest.fn(),
        };

        (mockPool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);

        const result = await repository.setActiveGraphMetadata('graph-v1.0.0');

        expect(result).toBeDefined();
        expect(result.id).toBe(1);
        expect(result.isActive).toBe(true);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE graphs'),
          expect.arrayContaining(['graph-v1.0.0'])
        );
      });
    });
  });
});




