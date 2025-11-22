/**
 * Integration Tests: PostgresGraphRepository
 * 
 * Tests real Redis and PostgreSQL interactions for graph repository.
 */

import { PostgresGraphRepository } from '../../../infrastructure/repositories/PostgresGraphRepository';
import { setupIntegrationTests, teardownIntegrationTests, cleanTestDatabase, cleanTestRedis } from '../setup';
import { createTestGraph, createTestGraphStructure } from '../helpers/test-data';
import { Graph } from '../../../domain/entities/Graph';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import type { GraphNeighbor } from '../../../domain/repositories/IGraphRepository';

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
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const metadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      await repository.saveGraph(version, nodes, edgesMap, metadata);
      await repository.setGraphVersion(version);

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
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const metadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      await repository.saveGraph(version, nodes, edgesMap, metadata);

      const neighbors = await repository.getNeighbors('stop-1');

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].neighborId).toBe('stop-2');
      expect(neighbors[0].weight).toBe(60);
      expect(neighbors[0].metadata?.distance).toBe(50);
      expect(neighbors[0].metadata?.transportType).toBe('BUS');
    });

    it('should get edge weight between nodes', async () => {
      const { nodes, edges } = createTestGraphStructure();
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const graphMetadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      await repository.saveGraph(version, nodes, edgesMap, graphMetadata);

      const weight = await repository.getEdgeWeight('stop-1', 'stop-2');
      expect(weight).toBe(60);

      const noWeight = await repository.getEdgeWeight('stop-1', 'stop-3');
      expect(noWeight).toBeUndefined();
    });

    it('should get edge metadata', async () => {
      const { nodes, edges } = createTestGraphStructure();
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const metadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      await repository.saveGraph(version, nodes, edgesMap, metadata);

      const edgeMetadata = await repository.getEdgeMetadata('stop-1', 'stop-2');

      expect(edgeMetadata).toBeDefined();
      expect(edgeMetadata?.distance).toBe(50);
      expect(edgeMetadata?.transportType).toBe('BUS');
      expect(edgeMetadata?.routeId).toBe('route-1');
    });

    it('should delete graph', async () => {
      const { nodes, edges } = createTestGraphStructure();
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const metadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      await repository.saveGraph(version, nodes, edgesMap, metadata);
      await repository.setGraphVersion(version);

      await repository.deleteGraph();

      const retrievedVersion = await repository.getGraphVersion();
      expect(retrievedVersion).toBeUndefined();

      const allNodes = await repository.getAllNodes();
      expect(allNodes).toHaveLength(0);
    });
  });

  describe('PostgreSQL Operations', () => {
    it('should save and retrieve graph metadata', async () => {
      const graph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        100, // totalNodes
        500, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      const saved = await repository.saveGraphMetadata(graph);

      expect(saved.id).toBe(graph.id);
      expect(saved.version).toBe(graph.version);
      expect(saved.totalNodes).toBe(100);
      expect(saved.totalEdges).toBe(500);

      const retrieved = await repository.findMetadataById(1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('graph-v1.0.0');
    });

    it('should set active graph metadata', async () => {
      const graph1 = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        100, // totalNodes
        500, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      const graph2 = new Graph(
        2, // id
        'graph-v2.0.0', // version
        'v2.0.0', // datasetVersion
        200, // totalNodes
        1000, // totalEdges
        2000, // buildDurationMs
        'graph:v2.0.0', // redisKey
        'graph/export-v2.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      await repository.saveGraphMetadata(graph1);
      await repository.saveGraphMetadata(graph2);

      await repository.setActiveGraphMetadata('graph-v2.0.0');

      const active = await repository.getActiveGraphMetadata();
      expect(active).toBeDefined();
      expect(active?.id).toBe(2);
      expect(active?.version).toBe('graph-v2.0.0');
      expect(active?.isActive).toBe(true);
    });

    it('should find graph metadata by version', async () => {
      const graph = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        100, // totalNodes
        500, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      await repository.saveGraphMetadata(graph);

      const found = await repository.findMetadataByVersion('graph-v1.0.0');

      expect(found).toBeDefined();
      expect(found?.version).toBe('graph-v1.0.0');
    });

    it('should get graph metadata by dataset version', async () => {
      const graph1 = new Graph(
        1, // id
        'graph-v1.0.0', // version
        'v1.0.0', // datasetVersion
        100, // totalNodes
        500, // totalEdges
        1000, // buildDurationMs
        'graph:v1.0.0', // redisKey
        'graph/export-v1.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      const graph2 = new Graph(
        2, // id
        'graph-v2.0.0', // version
        'v2.0.0', // datasetVersion
        200, // totalNodes
        1000, // totalEdges
        2000, // buildDurationMs
        'graph:v2.0.0', // redisKey
        'graph/export-v2.0.0.json', // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

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
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const graphMetadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      const graph = new Graph(
        1, // id
        version, // version
        'v1.0.0', // datasetVersion
        nodes.length, // totalNodes
        graphMetadata.edges, // totalEdges
        1000, // buildDurationMs
        `graph:${version}`, // redisKey
        `graph/export-${version}.json`, // minioBackupPath
        undefined, // metadata
        new Date(), // createdAt
        false // isActive
      );

      // Save to Redis
      await repository.saveGraph(version, nodes, edgesMap, graphMetadata);
      await repository.setGraphVersion(version);

      // Save metadata to PostgreSQL
      await repository.saveGraphMetadata(graph);

      // Verify Redis
      const retrievedVersion = await repository.getGraphVersion();
      expect(retrievedVersion).toBe(version);

      const allNodes = await repository.getAllNodes();
      expect(allNodes).toHaveLength(3);

      // Verify PostgreSQL
      const retrievedMetadata = await repository.findMetadataById(1);
      expect(retrievedMetadata).toBeDefined();
      expect(retrievedMetadata?.totalNodes).toBe(3);
    });

    it('should export and import graph structure', async () => {
      const { nodes, edges } = createTestGraphStructure();
      const version = 'graph-v1.0.0';
      
      // Convert edges Record to Map
      const edgesMap = new Map<string, GraphNeighbor[]>();
      for (const [nodeId, neighbors] of Object.entries(edges)) {
        edgesMap.set(nodeId, neighbors);
      }
      
      const metadata = {
        version,
        nodes: nodes.length,
        edges: Array.from(edgesMap.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
        buildTimestamp: Date.now(),
        datasetVersion: 'dataset-v1.0.0',
      };

      await repository.saveGraph(version, nodes, edgesMap, metadata);

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




