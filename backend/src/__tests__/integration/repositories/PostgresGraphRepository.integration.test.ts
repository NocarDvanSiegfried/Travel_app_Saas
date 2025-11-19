/**
 * Integration Tests: PostgresGraphRepository
 * 
 * Tests real Redis and PostgreSQL interactions for graph repository.
 */

import { PostgresGraphRepository } from '../../../infrastructure/repositories/PostgresGraphRepository';
import { setupIntegrationTests, teardownIntegrationTests, cleanTestDatabase, cleanTestRedis } from '../setup';
import { createTestGraph, createTestGraphStructure } from '../helpers/test-data';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

describe('PostgresGraphRepository Integration', () => {
  let repository: PostgresGraphRepository;
  let dbPool: Pool;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    dbPool = setup.dbPool;
    redisClient = setup.redisClient;
    repository = new PostgresGraphRepository(dbPool, redisClient);
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await cleanTestDatabase(dbPool);
    await cleanTestRedis(redisClient);
  });

  describe('Redis Operations', () => {
    it('should set and get graph version', async () => {
      await repository.setGraphVersion('graph-v1.0.0');

      const version = await repository.getGraphVersion();
      expect(version).toBe('graph-v1.0.0');
    });

    it('should save and retrieve graph structure', async () => {
      const { nodes, edges } = createTestGraphStructure();

      await repository.saveGraph(nodes, edges);
      await repository.setGraphVersion('graph-v1.0.0');

      const allNodes = await repository.getAllNodes();
      expect(allNodes).toHaveLength(3);
      expect(allNodes).toContain('stop-1');
      expect(allNodes).toContain('stop-2');
      expect(allNodes).toContain('stop-3');

      const hasNode1 = await repository.hasNode('stop-1');
      expect(hasNode1).toBe(true);

      const hasNode4 = await repository.hasNode('stop-4');
      expect(hasNode4).toBe(false);
    });

    it('should get neighbors for a node', async () => {
      const { nodes, edges } = createTestGraphStructure();

      await repository.saveGraph(nodes, edges);

      const neighbors = await repository.getNeighbors('stop-1');

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].neighborId).toBe('stop-2');
      expect(neighbors[0].weight).toBe(60);
      expect(neighbors[0].distance).toBe(50);
      expect(neighbors[0].transportType).toBe('BUS');
    });

    it('should get edge weight between nodes', async () => {
      const { nodes, edges } = createTestGraphStructure();

      await repository.saveGraph(nodes, edges);

      const weight = await repository.getEdgeWeight('stop-1', 'stop-2');
      expect(weight).toBe(60);

      const noWeight = await repository.getEdgeWeight('stop-1', 'stop-3');
      expect(noWeight).toBeUndefined();
    });

    it('should get edge metadata', async () => {
      const { nodes, edges } = createTestGraphStructure();

      await repository.saveGraph(nodes, edges);

      const metadata = await repository.getEdgeMetadata('stop-1', 'stop-2');

      expect(metadata).toBeDefined();
      expect(metadata?.distance).toBe(50);
      expect(metadata?.transportType).toBe('BUS');
      expect(metadata?.routeId).toBe('route-1');
    });

    it('should delete graph', async () => {
      const { nodes, edges } = createTestGraphStructure();

      await repository.saveGraph(nodes, edges);
      await repository.setGraphVersion('graph-v1.0.0');

      await repository.deleteGraph();

      const version = await repository.getGraphVersion();
      expect(version).toBeUndefined();

      const allNodes = await repository.getAllNodes();
      expect(allNodes).toHaveLength(0);
    });
  });

  describe('PostgreSQL Operations', () => {
    it('should save and retrieve graph metadata', async () => {
      const graph = createTestGraph({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: 100,
        edgesCount: 500,
      });

      const saved = await repository.saveGraphMetadata(graph);

      expect(saved.id).toBe(graph.id);
      expect(saved.version).toBe(graph.version);
      expect(saved.nodesCount).toBe(100);
      expect(saved.edgesCount).toBe(500);

      const retrieved = await repository.findMetadataById('graph-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('graph-v1.0.0');
    });

    it('should set active graph metadata', async () => {
      const graph1 = createTestGraph({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        isActive: false,
      });

      const graph2 = createTestGraph({
        id: 'graph-2',
        version: 'graph-v2.0.0',
        isActive: false,
      });

      await repository.saveGraphMetadata(graph1);
      await repository.saveGraphMetadata(graph2);

      await repository.setActiveGraphMetadata('graph-2');

      const active = await repository.getActiveGraphMetadata();
      expect(active).toBeDefined();
      expect(active?.id).toBe('graph-2');
      expect(active?.isActive).toBe(true);
    });

    it('should find graph metadata by version', async () => {
      const graph = createTestGraph({
        id: 'graph-1',
        version: 'graph-v1.0.0',
      });

      await repository.saveGraphMetadata(graph);

      const found = await repository.findMetadataByVersion('graph-v1.0.0');

      expect(found).toBeDefined();
      expect(found?.version).toBe('graph-v1.0.0');
    });

    it('should get graph metadata by dataset version', async () => {
      const graph1 = createTestGraph({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
      });

      const graph2 = createTestGraph({
        id: 'graph-2',
        version: 'graph-v2.0.0',
        datasetVersion: 'v2.0.0',
      });

      await repository.saveGraphMetadata(graph1);
      await repository.saveGraphMetadata(graph2);

      const graphs = await repository.getGraphMetadataByDatasetVersion('v1.0.0');

      expect(graphs).toHaveLength(1);
      expect(graphs[0].datasetVersion).toBe('v1.0.0');
    });
  });

  describe('Hybrid Operations', () => {
    it('should save graph structure to Redis and metadata to PostgreSQL', async () => {
      const { nodes, edges } = createTestGraphStructure();
      const graph = createTestGraph({
        id: 'graph-1',
        version: 'graph-v1.0.0',
        datasetVersion: 'v1.0.0',
        nodesCount: nodes.length,
        edgesCount: Object.values(edges).reduce((sum, e) => sum + e.length, 0),
      });

      // Save to Redis
      await repository.saveGraph(nodes, edges);
      await repository.setGraphVersion('graph-v1.0.0');

      // Save metadata to PostgreSQL
      await repository.saveGraphMetadata(graph);

      // Verify Redis
      const version = await repository.getGraphVersion();
      expect(version).toBe('graph-v1.0.0');

      const allNodes = await repository.getAllNodes();
      expect(allNodes).toHaveLength(3);

      // Verify PostgreSQL
      const metadata = await repository.findMetadataById('graph-1');
      expect(metadata).toBeDefined();
      expect(metadata?.nodesCount).toBe(3);
    });

    it('should export and import graph structure', async () => {
      const { nodes, edges } = createTestGraphStructure();

      await repository.saveGraph(nodes, edges);

      const exported = await repository.exportGraphStructure();

      expect(exported.nodes).toHaveLength(3);
      expect(exported.edges).toBeDefined();
      expect(exported.edges['stop-1']).toBeDefined();

      // Clear and import
      await repository.deleteGraph();

      await repository.importGraphStructure(exported);

      const importedNodes = await repository.getAllNodes();
      expect(importedNodes).toHaveLength(3);
    });
  });
});

