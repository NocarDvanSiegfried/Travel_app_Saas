import type { Graph } from '../entities';

/**
 * Graph node representation
 */
export type GraphNode = {
  id: string;
  latitude?: number;
  longitude?: number;
  isVirtual?: boolean;
  cityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Graph node neighbor information
 */
export type GraphNeighbor = {
  neighborId: string;
  weight: number; // duration in minutes
  metadata?: {
    distance?: number;
    transportType?: string;
    isVirtual?: boolean;
    routeId?: string;
  };
};

/**
 * Graph metadata stored in Redis
 */
export type GraphMetadata = {
  version: string;
  nodes: number;
  edges: number;
  buildTimestamp: number;
  datasetVersion: string;
};

/**
 * Repository interface for Graph storage and operations
 * 
 * Defines contract for graph data access in Redis and PostgreSQL.
 * Redis stores the actual graph structure (adjacency list).
 * PostgreSQL stores graph metadata.
 * 
 * @interface
 */
export interface IGraphRepository {
  // ============================================================================
  // Redis Operations (Graph Structure)
  // ============================================================================

  /**
   * Gets the current graph version from Redis
   * 
   * @returns Current graph version or undefined if no graph exists
   */
  getGraphVersion(): Promise<string | undefined>;

  /**
   * Gets graph metadata from Redis
   * 
   * @returns Graph metadata or undefined if no graph exists
   */
  getGraphMetadata(): Promise<GraphMetadata | undefined>;

  /**
   * Gets all node IDs in the graph
   * 
   * @returns Array of all node IDs
   */
  getAllNodes(): Promise<string[]>;

  /**
   * Gets neighbors of a specific node
   * 
   * @param nodeId - Node identifier
   * @returns Array of neighbor information
   */
  getNeighbors(nodeId: string): Promise<GraphNeighbor[]>;

  /**
   * Gets edge weight between two nodes
   * 
   * @param fromNodeId - Source node ID
   * @param toNodeId - Target node ID
   * @returns Edge weight (duration in minutes) or undefined if edge doesn't exist
   */
  getEdgeWeight(fromNodeId: string, toNodeId: string): Promise<number | undefined>;

  /**
   * Gets edge metadata
   * 
   * @param fromNodeId - Source node ID
   * @param toNodeId - Target node ID
   * @returns Edge metadata or undefined if edge doesn't exist
   */
  getEdgeMetadata(
    fromNodeId: string,
    toNodeId: string
  ): Promise<GraphNeighbor['metadata'] | undefined>;

  /**
   * Checks if a node exists in the graph
   * 
   * @param nodeId - Node identifier
   * @returns True if node exists
   */
  hasNode(nodeId: string): Promise<boolean>;

  /**
   * Checks if an edge exists between two nodes
   * 
   * @param fromNodeId - Source node ID
   * @param toNodeId - Target node ID
   * @returns True if edge exists
   */
  hasEdge(fromNodeId: string, toNodeId: string): Promise<boolean>;

  /**
   * Saves complete graph structure to Redis
   * 
   * @param version - Graph version
   * @param nodes - Array of all node IDs
   * @param edges - Map of node -> neighbors
   * @param metadata - Graph metadata
   */
  saveGraph(
    version: string,
    nodes: string[],
    edges: Map<string, GraphNeighbor[]>,
    metadata: GraphMetadata
  ): Promise<void>;

  /**
   * Sets the current graph version
   * 
   * @param version - New graph version
   */
  setGraphVersion(version: string): Promise<void>;

  /**
   * Deletes entire graph from Redis
   * 
   * @param version - Graph version to delete (optional, defaults to current)
   */
  deleteGraph(version?: string): Promise<void>;

  // ============================================================================
  // PostgreSQL Operations (Graph Metadata)
  // ============================================================================

  /**
   * Finds a graph metadata by ID
   * 
   * @param id - Graph identifier
   * @returns Graph metadata if found, undefined otherwise
   */
  findMetadataById(id: number): Promise<Graph | undefined>;

  /**
   * Finds a graph metadata by version
   * 
   * @param version - Graph version string
   * @returns Graph metadata if found, undefined otherwise
   */
  findMetadataByVersion(version: string): Promise<Graph | undefined>;

  /**
   * Gets the currently active graph metadata
   * 
   * @returns Active graph metadata if exists, undefined otherwise
   */
  getActiveGraphMetadata(): Promise<Graph | undefined>;

  /**
   * Gets all graph metadata records
   * 
   * @param limit - Maximum number of records to return
   * @returns Array of graph metadata ordered by creation date (newest first)
   */
  getAllGraphMetadata(limit?: number): Promise<Graph[]>;

  /**
   * Gets graph metadata by dataset version
   * 
   * @param datasetVersion - Dataset version string
   * @returns Array of graphs built for this dataset version
   */
  getGraphMetadataByDatasetVersion(datasetVersion: string): Promise<Graph[]>;

  /**
   * Saves graph metadata (insert or update)
   * 
   * @param graph - Graph metadata to save
   * @returns Saved graph metadata
   */
  saveGraphMetadata(graph: Graph): Promise<Graph>;

  /**
   * Sets a graph as active (and deactivates others)
   * 
   * @param version - Version to activate
   * @returns Updated active graph metadata
   */
  setActiveGraphMetadata(version: string): Promise<Graph>;

  /**
   * Deletes graph metadata by ID
   * 
   * @param id - Graph identifier
   * @returns True if deleted, false otherwise
   */
  deleteGraphMetadata(id: number): Promise<boolean>;

  /**
   * Deletes graph metadata older than specified count (keeps N most recent)
   * 
   * @param keepCount - Number of most recent graphs to keep
   * @returns Number of deleted graph metadata records
   */
  deleteOldGraphMetadata(keepCount: number): Promise<number>;

  /**
   * Counts total graph metadata records
   * 
   * @returns Total count of graph metadata
   */
  countGraphMetadata(): Promise<number>;

  /**
   * Gets the most recent graph metadata
   * 
   * @returns Most recent graph metadata
   */
  getLatestGraphMetadata(): Promise<Graph | undefined>;

  // ============================================================================
  // Utility Operations
  // ============================================================================

  /**
   * Exports graph structure to plain object (for MinIO backup)
   * 
   * @param version - Graph version to export (optional, defaults to current)
   * @returns Graph structure as plain object
   */
  exportGraphStructure(version?: string): Promise<{
    version: string;
    metadata: GraphMetadata;
    nodes: string[];
    edges: Record<string, GraphNeighbor[]>;
  }>;

  /**
   * Imports graph structure from plain object (for restore from MinIO)
   * 
   * @param data - Graph structure data
   */
  importGraphStructure(data: {
    version: string;
    metadata: GraphMetadata;
    nodes: string[];
    edges: Record<string, GraphNeighbor[]>;
  }): Promise<void>;

  /**
   * Gets graph statistics (nodes, edges, density, etc.)
   * 
   * @param version - Graph version (optional, defaults to current)
   * @returns Graph statistics
   */
  getGraphStatistics(version?: string): Promise<{
    version: string;
    totalNodes: number;
    totalEdges: number;
    averageEdgesPerNode: number;
    densityPercentage: number;
  }>;
}

