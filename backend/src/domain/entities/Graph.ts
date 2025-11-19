import type { BaseEntity } from './BaseEntity';

/**
 * Graph entity - represents metadata about a built graph
 * 
 * Tracks graph versions, build statistics, and links to Redis keys and MinIO backups.
 * Only one graph version is active at a time.
 * 
 * @example
 * ```typescript
 * const graph = new Graph({
 *   id: 1,
 *   version: 'graph-v1.2.3',
 *   datasetVersion: 'ds-v1.2.3',
 *   totalNodes: 15234,
 *   totalEdges: 45678,
 *   buildDurationMs: 5432,
 *   redisKey: 'graph:v1.2.3',
 *   minioBackupPath: 'graph/export-v1.2.3.json',
 *   isActive: true
 * });
 * ```
 */
export class Graph implements BaseEntity {
  constructor(
    public readonly id: number,
    public readonly version: string,
    public readonly datasetVersion: string,
    public readonly totalNodes: number,
    public readonly totalEdges: number,
    public readonly buildDurationMs: number,
    public readonly redisKey: string,
    public readonly minioBackupPath: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly createdAt?: Date,
    public readonly isActive: boolean = false
  ) {
    this.validate();
  }

  /**
   * Validates the entity
   */
  private validate(): void {
    if (!this.version || this.version.trim().length === 0) {
      throw new Error('Graph: version is required');
    }

    if (!this.datasetVersion || this.datasetVersion.trim().length === 0) {
      throw new Error('Graph: datasetVersion is required');
    }

    if (this.totalNodes < 0) {
      throw new Error('Graph: totalNodes must be non-negative');
    }

    if (this.totalEdges < 0) {
      throw new Error('Graph: totalEdges must be non-negative');
    }

    if (this.buildDurationMs < 0) {
      throw new Error('Graph: buildDurationMs must be non-negative');
    }

    if (!this.redisKey || this.redisKey.trim().length === 0) {
      throw new Error('Graph: redisKey is required');
    }

    if (!this.minioBackupPath || this.minioBackupPath.trim().length === 0) {
      throw new Error('Graph: minioBackupPath is required');
    }
  }

  /**
   * Checks if graph is empty
   */
  public isEmpty(): boolean {
    return this.totalNodes === 0 || this.totalEdges === 0;
  }

  /**
   * Calculates average edges per node
   */
  public getAverageEdgesPerNode(): number {
    if (this.totalNodes === 0) return 0;
    return this.totalEdges / this.totalNodes;
  }

  /**
   * Calculates graph density (actual edges / possible edges)
   * For directed graph: density = edges / (nodes * (nodes - 1))
   */
  public getDensity(): number {
    if (this.totalNodes <= 1) return 0;
    const possibleEdges = this.totalNodes * (this.totalNodes - 1);
    return this.totalEdges / possibleEdges;
  }

  /**
   * Gets graph density as percentage
   */
  public getDensityPercentage(): number {
    return this.getDensity() * 100;
  }

  /**
   * Checks if graph is sparse (density < 5%)
   */
  public isSparse(): boolean {
    return this.getDensityPercentage() < 5;
  }

  /**
   * Checks if graph is dense (density > 50%)
   */
  public isDense(): boolean {
    return this.getDensityPercentage() > 50;
  }

  /**
   * Gets build performance rating
   */
  public getBuildPerformance(): 'Excellent' | 'Good' | 'Fair' | 'Slow' {
    const secondsPerThousandNodes = (this.buildDurationMs / 1000) / (this.totalNodes / 1000);
    
    if (secondsPerThousandNodes < 1) return 'Excellent'; // < 1 second per 1000 nodes
    if (secondsPerThousandNodes < 5) return 'Good'; // < 5 seconds per 1000 nodes
    if (secondsPerThousandNodes < 10) return 'Fair'; // < 10 seconds per 1000 nodes
    return 'Slow';
  }

  /**
   * Checks if graph build was fast enough (< 10 seconds)
   */
  public wasBuildFastEnough(): boolean {
    return this.buildDurationMs < 10000;
  }

  /**
   * Gets estimated memory usage in MB (rough approximation)
   * Assumes ~200 bytes per node and ~100 bytes per edge
   */
  public getEstimatedMemoryMB(): number {
    const bytesPerNode = 200;
    const bytesPerEdge = 100;
    const totalBytes = this.totalNodes * bytesPerNode + this.totalEdges * bytesPerEdge;
    return totalBytes / (1024 * 1024);
  }

  /**
   * Checks if graph is suitable for production (has good metrics)
   */
  public isSuitableForProduction(): boolean {
    return (
      !this.isEmpty() &&
      this.wasBuildFastEnough() &&
      this.getAverageEdgesPerNode() >= 2 // Each node should have at least 2 connections on average
    );
  }

  /**
   * Creates metadata for graph
   */
  public static createMetadata(additionalInfo?: Record<string, unknown>): Record<string, unknown> {
    return {
      buildTimestamp: new Date().toISOString(),
      buildTool: 'GraphBuilderWorker',
      format: 'adjacency-list',
      storage: 'redis',
      ...additionalInfo
    };
  }

  /**
   * Converts to plain object for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      version: this.version,
      datasetVersion: this.datasetVersion,
      totalNodes: this.totalNodes,
      totalEdges: this.totalEdges,
      buildDurationMs: this.buildDurationMs,
      redisKey: this.redisKey,
      minioBackupPath: this.minioBackupPath,
      metadata: this.metadata,
      createdAt: this.createdAt?.toISOString(),
      isActive: this.isActive,
      // Computed properties
      averageEdgesPerNode: this.getAverageEdgesPerNode(),
      densityPercentage: this.getDensityPercentage(),
      buildPerformance: this.getBuildPerformance(),
      estimatedMemoryMB: this.getEstimatedMemoryMB(),
      suitableForProduction: this.isSuitableForProduction()
    };
  }
}

