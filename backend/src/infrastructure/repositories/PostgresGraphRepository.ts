import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import type { IGraphRepository, GraphNeighbor, GraphMetadata } from '../../domain/repositories/IGraphRepository';
import { Graph } from '../../domain/entities';

/**
 * Hybrid implementation of IGraphRepository
 * 
 * Uses Redis for graph structure storage (adjacency lists, edges).
 * Uses PostgreSQL for graph metadata (versioning, statistics).
 * 
 * @implements {IGraphRepository}
 */
export class PostgresGraphRepository implements IGraphRepository {
  private readonly REDIS_PREFIX = 'graph:';
  private readonly REDIS_VERSION_KEY = 'graph:current:version';
  private readonly REDIS_METADATA_KEY = 'graph:current:metadata';

  constructor(
    private readonly pool: Pool,
    private readonly redis: RedisClientType
  ) {}

  // ============================================================================
  // Redis Operations (Graph Structure)
  // ============================================================================

  async getGraphVersion(): Promise<string | undefined> {
    const version = await this.redis.get(this.REDIS_VERSION_KEY);
    return version || undefined;
  }

  async getGraphMetadata(): Promise<GraphMetadata | undefined> {
    const data = await this.redis.get(this.REDIS_METADATA_KEY);
    if (!data) return undefined;

    return JSON.parse(data);
  }

  async getAllNodes(): Promise<string[]> {
    const version = await this.getGraphVersion();
    if (!version) return [];

    const nodesKey = `${this.REDIS_PREFIX}${version}:nodes`;
    const nodes = await this.redis.sMembers(nodesKey);
    return nodes;
  }

  async getNeighbors(nodeId: string): Promise<GraphNeighbor[]> {
    const version = await this.getGraphVersion();
    if (!version) return [];

    const neighborsKey = `${this.REDIS_PREFIX}${version}:neighbors:${nodeId}`;
    const data = await this.redis.get(neighborsKey);
    if (!data) return [];

    return JSON.parse(data);
  }

  async getEdgeWeight(fromNodeId: string, toNodeId: string): Promise<number | undefined> {
    const neighbors = await this.getNeighbors(fromNodeId);
    const neighbor = neighbors.find(n => n.neighborId === toNodeId);
    return neighbor?.weight;
  }

  async getEdgeMetadata(
    fromNodeId: string,
    toNodeId: string
  ): Promise<GraphNeighbor['metadata'] | undefined> {
    const neighbors = await this.getNeighbors(fromNodeId);
    const neighbor = neighbors.find(n => n.neighborId === toNodeId);
    return neighbor?.metadata;
  }

  async hasNode(nodeId: string): Promise<boolean> {
    const version = await this.getGraphVersion();
    if (!version) return false;

    const nodesKey = `${this.REDIS_PREFIX}${version}:nodes`;
    const exists = await this.redis.sIsMember(nodesKey, nodeId);
    return exists;
  }

  async hasEdge(fromNodeId: string, toNodeId: string): Promise<boolean> {
    const neighbors = await this.getNeighbors(fromNodeId);
    return neighbors.some(n => n.neighborId === toNodeId);
  }

  async saveGraph(
    version: string,
    nodes: string[],
    edges: Map<string, GraphNeighbor[]>,
    metadata: GraphMetadata
  ): Promise<void> {
    const multi = this.redis.multi();

    // Save nodes as Set
    const nodesKey = `${this.REDIS_PREFIX}${version}:nodes`;
    for (const nodeId of nodes) {
      multi.sAdd(nodesKey, nodeId);
    }

    // Save neighbors for each node
    for (const [nodeId, neighbors] of edges.entries()) {
      const neighborsKey = `${this.REDIS_PREFIX}${version}:neighbors:${nodeId}`;
      multi.set(neighborsKey, JSON.stringify(neighbors));
    }

    // Save metadata
    multi.set(this.REDIS_METADATA_KEY, JSON.stringify(metadata));

    // Save version
    multi.set(this.REDIS_VERSION_KEY, version);

    await multi.exec();
  }

  async setGraphVersion(version: string): Promise<void> {
    await this.redis.set(this.REDIS_VERSION_KEY, version);
  }

  async deleteGraph(version?: string): Promise<void> {
    const targetVersion = version || await this.getGraphVersion();
    if (!targetVersion) return;

    const pattern = `${this.REDIS_PREFIX}${targetVersion}:*`;
    
    // Use SCAN instead of KEYS to avoid blocking Redis
    const { scanKeys } = await import('../cache/redis-scan');
    const keys = await scanKeys(this.redis, pattern);

    if (keys.length > 0) {
      await this.redis.del(keys);
    }

    // Clear current version if deleting active graph
    if (!version || version === await this.getGraphVersion()) {
      await this.redis.del([this.REDIS_VERSION_KEY, this.REDIS_METADATA_KEY]);
    }
  }

  // ============================================================================
  // PostgreSQL Operations (Graph Metadata)
  // ============================================================================

  async findMetadataById(id: number): Promise<Graph | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToGraph(result.rows[0]);
  }

  async findMetadataByVersion(version: string): Promise<Graph | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs WHERE version = $1',
      [version]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToGraph(result.rows[0]);
  }

  async getActiveGraphMetadata(): Promise<Graph | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs WHERE is_active = TRUE LIMIT 1'
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToGraph(result.rows[0]);
  }

  async getLatestGraphMetadata(): Promise<Graph | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToGraph(result.rows[0]);
  }

  async getAllGraphMetadata(limit?: number): Promise<Graph[]> {
    const query = limit
      ? 'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs ORDER BY created_at DESC LIMIT $1'
      : 'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs ORDER BY created_at DESC';

    const result = limit
      ? await this.pool.query(query, [limit])
      : await this.pool.query(query);

    return result.rows.map(row => this.mapRowToGraph(row));
  }

  async getGraphMetadataByDatasetVersion(datasetVersion: string): Promise<Graph[]> {
    const result = await this.pool.query(
      'SELECT id, version, dataset_version, total_nodes, total_edges, build_duration_ms, redis_key, minio_backup_path, metadata, created_at, is_active FROM graphs WHERE dataset_version = $1 ORDER BY created_at DESC',
      [datasetVersion]
    );
    return result.rows.map(row => this.mapRowToGraph(row));
  }

  async saveGraphMetadata(graph: Graph): Promise<Graph> {
    const query = `
      INSERT INTO graphs (
        version, dataset_version, total_nodes, total_edges,
        build_duration_ms, redis_key, minio_backup_path,
        metadata, created_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (version)
      DO UPDATE SET
        dataset_version = EXCLUDED.dataset_version,
        total_nodes = EXCLUDED.total_nodes,
        total_edges = EXCLUDED.total_edges,
        build_duration_ms = EXCLUDED.build_duration_ms,
        redis_key = EXCLUDED.redis_key,
        minio_backup_path = EXCLUDED.minio_backup_path,
        metadata = EXCLUDED.metadata,
        is_active = EXCLUDED.is_active
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      graph.version,
      graph.datasetVersion,
      graph.totalNodes,
      graph.totalEdges,
      graph.buildDurationMs,
      graph.redisKey,
      graph.minioBackupPath,
      JSON.stringify(graph.metadata || null),
      graph.createdAt || new Date(),
      graph.isActive
    ]);

    return this.mapRowToGraph(result.rows[0]);
  }

  async setActiveGraphMetadata(version: string): Promise<Graph> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate all graphs
      await client.query('UPDATE graphs SET is_active = FALSE');

      // Activate the specified version
      const result = await client.query(
        'UPDATE graphs SET is_active = TRUE WHERE version = $1 RETURNING *',
        [version]
      );

      if (result.rows.length === 0) {
        throw new Error(`Graph with version ${version} not found`);
      }

      await client.query('COMMIT');
      return this.mapRowToGraph(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteGraphMetadata(id: number): Promise<boolean> {
    // Prevent deletion of active graph metadata
    const activeCheck = await this.pool.query(
      'SELECT is_active FROM graphs WHERE id = $1',
      [id]
    );

    if (activeCheck.rows.length > 0 && activeCheck.rows[0].is_active === true) {
      throw new Error('Cannot delete active graph metadata');
    }

    const result = await this.pool.query('DELETE FROM graphs WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteOldGraphMetadata(keepCount: number): Promise<number> {
    if (keepCount < 1) {
      throw new Error('keepCount must be at least 1');
    }

    const query = `
      DELETE FROM graphs
      WHERE id NOT IN (
        SELECT id FROM graphs
        WHERE is_active = TRUE
        UNION
        SELECT id FROM graphs
        ORDER BY created_at DESC
        LIMIT $1
      )
    `;

    const result = await this.pool.query(query, [keepCount]);
    return result.rowCount || 0;
  }

  async countGraphMetadata(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM graphs');
    return parseInt(result.rows[0].count, 10);
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  async exportGraphStructure(version?: string): Promise<{
    version: string;
    metadata: GraphMetadata;
    nodes: string[];
    edges: Record<string, GraphNeighbor[]>;
  }> {
    const targetVersion = version || await this.getGraphVersion();
    if (!targetVersion) {
      throw new Error('No graph version available for export');
    }

    const metadata = await this.getGraphMetadata();
    if (!metadata) {
      throw new Error(`Graph metadata for version ${targetVersion} not found`);
    }

    const nodes = await this.getAllNodes();
    const edges: Record<string, GraphNeighbor[]> = {};

    for (const nodeId of nodes) {
      const neighbors = await this.getNeighbors(nodeId);
      edges[nodeId] = neighbors;
    }

    return {
      version: targetVersion,
      metadata,
      nodes,
      edges
    };
  }

  async importGraphStructure(data: {
    version: string;
    metadata: GraphMetadata;
    nodes: string[];
    edges: Record<string, GraphNeighbor[]>;
  }): Promise<void> {
    const edgesMap = new Map<string, GraphNeighbor[]>();
    
    for (const [nodeId, neighbors] of Object.entries(data.edges)) {
      edgesMap.set(nodeId, neighbors);
    }

    await this.saveGraph(data.version, data.nodes, edgesMap, data.metadata);
  }

  async getGraphStatistics(version?: string): Promise<{
    version: string;
    totalNodes: number;
    totalEdges: number;
    averageEdgesPerNode: number;
    densityPercentage: number;
  }> {
    const targetVersion = version || await this.getGraphVersion();
    if (!targetVersion) {
      throw new Error('No graph version available');
    }

    const nodes = await this.getAllNodes();
    let totalEdges = 0;

    for (const nodeId of nodes) {
      const neighbors = await this.getNeighbors(nodeId);
      totalEdges += neighbors.length;
    }

    const totalNodes = nodes.length;
    const averageEdgesPerNode = totalNodes === 0 ? 0 : totalEdges / totalNodes;
    
    const possibleEdges = totalNodes * (totalNodes - 1);
    const densityPercentage = possibleEdges === 0 ? 0 : (totalEdges / possibleEdges) * 100;

    return {
      version: targetVersion,
      totalNodes,
      totalEdges,
      averageEdgesPerNode,
      densityPercentage
    };
  }

  // ============================================================================
  // Mapping Functions
  // ============================================================================

  /**
   * Maps database row to Graph entity
   */
  private mapRowToGraph(row: Record<string, unknown>): Graph {
    // Parse metadata from JSONB
    let metadata: Record<string, unknown> | undefined = undefined;
    if (row.metadata) {
      metadata = typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, unknown>;
    }

    // Parse numeric fields, handling both number and string types
    const id = typeof row.id === 'number' ? row.id : parseInt(String(row.id || '0'), 10);
    const totalNodes = typeof row.total_nodes === 'number' ? row.total_nodes : parseInt(String(row.total_nodes || '0'), 10);
    const totalEdges = typeof row.total_edges === 'number' ? row.total_edges : parseInt(String(row.total_edges || '0'), 10);
    const buildDurationMs = typeof row.build_duration_ms === 'number' ? row.build_duration_ms : parseInt(String(row.build_duration_ms || '0'), 10);

    return new Graph(
      id,
      row.version as string,
      row.dataset_version as string,
      totalNodes,
      totalEdges,
      buildDurationMs,
      row.redis_key as string,
      row.minio_backup_path as string,
      metadata,
      row.created_at as Date,
      row.is_active as boolean
    );
  }
}




