import type { Pool } from 'pg';
import type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
import { Dataset } from '../../domain/entities';
import type { DataSourceType } from '../../domain/entities';

/**
 * PostgreSQL implementation of IDatasetRepository
 * 
 * Handles persistent storage of dataset metadata and versioning.
 * Tracks dataset history, quality scores, and OData hashes.
 * 
 * @implements {IDatasetRepository}
 */
export class PostgresDatasetRepository implements IDatasetRepository {
  constructor(private readonly pool: Pool) {}

  // ============================================================================
  // Basic CRUD Operations
  // ============================================================================

  async findById(id: number): Promise<Dataset | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToDataset(result.rows[0]);
  }

  async findByVersion(version: string): Promise<Dataset | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets WHERE version = $1',
      [version]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToDataset(result.rows[0]);
  }

  async getActiveDataset(): Promise<Dataset | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets WHERE is_active = TRUE LIMIT 1'
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToDataset(result.rows[0]);
  }

  async getLatestDataset(): Promise<Dataset | undefined> {
    const result = await this.pool.query(
      'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToDataset(result.rows[0]);
  }

  async getAllDatasets(limit?: number): Promise<Dataset[]> {
    const query = limit
      ? 'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets ORDER BY created_at DESC LIMIT $1'
      : 'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets ORDER BY created_at DESC';

    const result = limit
      ? await this.pool.query(query, [limit])
      : await this.pool.query(query);

    return result.rows.map(row => this.mapRowToDataset(row));
  }

  async getDatasetsBySourceType(sourceType: string): Promise<Dataset[]> {
    const result = await this.pool.query(
      'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets WHERE source_type = $1 ORDER BY created_at DESC',
      [sourceType]
    );
    return result.rows.map(row => this.mapRowToDataset(row));
  }

  async getDatasetsByQuality(minQualityScore: number): Promise<Dataset[]> {
    const result = await this.pool.query(
      'SELECT id, version, source_type, quality_score, total_stops, total_routes, total_flights, total_virtual_stops, total_virtual_routes, odata_hash, metadata, created_at, is_active FROM datasets WHERE quality_score >= $1 ORDER BY quality_score DESC, created_at DESC',
      [minQualityScore]
    );
    return result.rows.map(row => this.mapRowToDataset(row));
  }

  // ============================================================================
  // Save Operations
  // ============================================================================

  async saveDataset(dataset: Dataset): Promise<Dataset> {
    const query = `
      INSERT INTO datasets (
        version, source_type, quality_score,
        total_stops, total_routes, total_flights,
        total_virtual_stops, total_virtual_routes,
        odata_hash, metadata, created_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (version)
      DO UPDATE SET
        source_type = EXCLUDED.source_type,
        quality_score = EXCLUDED.quality_score,
        total_stops = EXCLUDED.total_stops,
        total_routes = EXCLUDED.total_routes,
        total_flights = EXCLUDED.total_flights,
        total_virtual_stops = EXCLUDED.total_virtual_stops,
        total_virtual_routes = EXCLUDED.total_virtual_routes,
        odata_hash = EXCLUDED.odata_hash,
        metadata = EXCLUDED.metadata,
        is_active = EXCLUDED.is_active
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      dataset.version,
      dataset.sourceType,
      dataset.qualityScore,
      dataset.totalStops,
      dataset.totalRoutes,
      dataset.totalFlights,
      dataset.totalVirtualStops,
      dataset.totalVirtualRoutes,
      dataset.odataHash,
      JSON.stringify(dataset.metadata || null),
      dataset.createdAt || new Date(),
      dataset.isActive
    ]);

    return this.mapRowToDataset(result.rows[0]);
  }

  async setActiveDataset(version: string): Promise<Dataset> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate all datasets
      await client.query('UPDATE datasets SET is_active = FALSE');

      // Activate the specified version
      const result = await client.query(
        'UPDATE datasets SET is_active = TRUE WHERE version = $1 RETURNING *',
        [version]
      );

      if (result.rows.length === 0) {
        throw new Error(`Dataset with version ${version} not found`);
      }

      await client.query('COMMIT');
      return this.mapRowToDataset(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatistics(
    version: string,
    stats: {
      totalStops?: number;
      totalRoutes?: number;
      totalFlights?: number;
      totalVirtualStops?: number;
      totalVirtualRoutes?: number;
      qualityScore?: number;
    }
  ): Promise<Dataset> {
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramCount = 1;

    if (stats.totalStops !== undefined) {
      updates.push(`total_stops = $${paramCount++}`);
      values.push(stats.totalStops);
    }
    if (stats.totalRoutes !== undefined) {
      updates.push(`total_routes = $${paramCount++}`);
      values.push(stats.totalRoutes);
    }
    if (stats.totalFlights !== undefined) {
      updates.push(`total_flights = $${paramCount++}`);
      values.push(stats.totalFlights);
    }
    if (stats.totalVirtualStops !== undefined) {
      updates.push(`total_virtual_stops = $${paramCount++}`);
      values.push(stats.totalVirtualStops);
    }
    if (stats.totalVirtualRoutes !== undefined) {
      updates.push(`total_virtual_routes = $${paramCount++}`);
      values.push(stats.totalVirtualRoutes);
    }
    if (stats.qualityScore !== undefined) {
      updates.push(`quality_score = $${paramCount++}`);
      values.push(stats.qualityScore);
    }

    if (updates.length === 0) {
      throw new Error('No statistics provided to update');
    }

    values.push(version);
    const query = `
      UPDATE datasets
      SET ${updates.join(', ')}
      WHERE version = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Dataset with version ${version} not found`);
    }

    return this.mapRowToDataset(result.rows[0]);
  }

  // ============================================================================
  // Delete Operations
  // ============================================================================

  async deleteDataset(id: number): Promise<boolean> {
    // Prevent deletion of active dataset
    const activeCheck = await this.pool.query(
      'SELECT is_active FROM datasets WHERE id = $1',
      [id]
    );

    if (activeCheck.rows.length > 0 && activeCheck.rows[0].is_active === true) {
      throw new Error('Cannot delete active dataset');
    }

    const result = await this.pool.query('DELETE FROM datasets WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteOldDatasets(keepCount: number): Promise<number> {
    if (keepCount < 1) {
      throw new Error('keepCount must be at least 1');
    }

    const query = `
      DELETE FROM datasets
      WHERE id NOT IN (
        SELECT id FROM datasets
        WHERE is_active = TRUE
        UNION
        SELECT id FROM datasets
        ORDER BY created_at DESC
        LIMIT $1
      )
    `;

    const result = await this.pool.query(query, [keepCount]);
    return result.rowCount || 0;
  }

  // ============================================================================
  // Count and Check Operations
  // ============================================================================

  async countDatasets(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM datasets');
    return parseInt(result.rows[0].count, 10);
  }

  async existsByODataHash(odataHash: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT EXISTS(SELECT 1 FROM datasets WHERE odata_hash = $1) as exists',
      [odataHash]
    );
    return result.rows[0].exists;
  }

  // ============================================================================
  // Statistics Operations
  // ============================================================================

  async getStatisticsSummary(): Promise<{
    totalDatasets: number;
    activeVersion: string | null;
    averageQualityScore: number;
    latestVersion: string | null;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_datasets,
        AVG(quality_score) as avg_quality_score,
        (SELECT version FROM datasets WHERE is_active = TRUE LIMIT 1) as active_version,
        (SELECT version FROM datasets ORDER BY created_at DESC LIMIT 1) as latest_version
      FROM datasets
    `;

    const result = await this.pool.query(query);
    const row = result.rows[0];

    return {
      totalDatasets: parseInt(row.total_datasets, 10),
      activeVersion: row.active_version || null,
      averageQualityScore: row.avg_quality_score ? parseFloat(row.avg_quality_score) : 0,
      latestVersion: row.latest_version || null,
    };
  }

  // ============================================================================
  // Mapping Functions
  // ============================================================================

  /**
   * Maps database row to Dataset entity
   */
  private mapRowToDataset(row: Record<string, unknown>): Dataset {
    // Parse metadata from JSONB
    let metadata: Record<string, unknown> | undefined = undefined;
    if (row.metadata) {
      metadata = typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, unknown>;
    }

    return new Dataset(
      typeof row.id === 'number' ? row.id : parseInt(row.id as string, 10),
      row.version as string,
      row.source_type as DataSourceType,
      typeof row.quality_score === 'number' 
        ? row.quality_score 
        : parseInt(row.quality_score as string, 10),
      parseInt(row.total_stops as string, 10),
      parseInt(row.total_routes as string, 10),
      parseInt(row.total_flights as string, 10),
      parseInt(row.total_virtual_stops as string, 10),
      parseInt(row.total_virtual_routes as string, 10),
      row.odata_hash as string | undefined,
      metadata,
      row.created_at as Date,
      row.is_active as boolean
    );
  }
}

