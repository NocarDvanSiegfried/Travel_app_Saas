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
        expect(mockRedis.get).toHaveBeenCalledWith('graph:version');
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

        expect(mockRedis.set).toHaveBeenCalledWith('graph:version', 'graph-v1.0.0');
      });
    });

    describe('hasNode', () => {
      it('should return true when node exists', async () => {
        (mockRedis.exists as jest.Mock).mockResolvedValue(1);

        const result = await repository.hasNode('stop-1');

        expect(result).toBe(true);
        expect(mockRedis.exists).toHaveBeenCalledWith('graph:node:stop-1');
      });

      it('should return false when node does not exist', async () => {
        (mockRedis.exists as jest.Mock).mockResolvedValue(0);

        const result = await repository.hasNode('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('getNeighbors', () => {
      it('should return neighbors from Redis', async () => {
        const neighbors = [
          { neighborId: 'stop-2', weight: 60, distance: 50, transportType: 'BUS', routeId: 'route-1' },
          { neighborId: 'stop-3', weight: 120, distance: 100, transportType: 'BUS', routeId: 'route-2' },
        ];

        (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(neighbors));

        const result = await repository.getNeighbors('stop-1');

        expect(result).toHaveLength(2);
        expect(result[0].neighborId).toBe('stop-2');
        expect(result[0].weight).toBe(60);
      });

      it('should return empty array when no neighbors', async () => {
        (mockRedis.get as jest.Mock).mockResolvedValue(null);

        const result = await repository.getNeighbors('stop-1');

        expect(result).toHaveLength(0);
      });
    });

    describe('getEdgeWeight', () => {
      it('should return edge weight from neighbors', async () => {
        const neighbors = [
          { neighborId: 'stop-2', weight: 60 },
        ];

        (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(neighbors));

        const weight = await repository.getEdgeWeight('stop-1', 'stop-2');

        expect(weight).toBe(60);
      });

      it('should return undefined when edge does not exist', async () => {
        const neighbors = [
          { neighborId: 'stop-3', weight: 120 },
        ];

        (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(neighbors));

        const weight = await repository.getEdgeWeight('stop-1', 'stop-2');

        expect(weight).toBeUndefined();
      });
    });
  });

  describe('PostgreSQL Operations', () => {
    describe('findMetadataById', () => {
      it('should return graph metadata when found', async () => {
        const mockRow = {
          id: 'graph-1',
          version: 'graph-v1.0.0',
          dataset_version: 'v1.0.0',
          nodes_count: 1000,
          edges_count: 5000,
          build_timestamp: new Date('2025-01-15T10:00:00Z'),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.findMetadataById('graph-1');

        expect(result).toBeDefined();
        expect(result?.id).toBe('graph-1');
        expect(result?.version).toBe('graph-v1.0.0');
      });
    });

    describe('saveGraphMetadata', () => {
      it('should save graph metadata', async () => {
        const graph = new Graph({
          id: 'graph-1',
          version: 'graph-v1.0.0',
          datasetVersion: 'v1.0.0',
          nodesCount: 1000,
          edgesCount: 5000,
          buildTimestamp: new Date(),
          isActive: false,
        });

        const mockRow = {
          id: 'graph-1',
          version: 'graph-v1.0.0',
          dataset_version: 'v1.0.0',
          nodes_count: 1000,
          edges_count: 5000,
          build_timestamp: new Date(),
          is_active: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([mockRow])
        );

        const result = await repository.saveGraphMetadata(graph);

        expect(result).toBeDefined();
        expect(result.id).toBe('graph-1');
      });
    });

    describe('setActiveGraphMetadata', () => {
      it('should set graph as active', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue(
          createMockQueryResult([], 1)
        );

        await repository.setActiveGraphMetadata('graph-1');

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE graphs'),
          expect.arrayContaining(['graph-1'])
        );
      });
    });
  });
});

