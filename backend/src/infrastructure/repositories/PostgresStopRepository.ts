import type { Pool, PoolClient } from 'pg';
import type { IStopRepository } from '../../domain/repositories/IStopRepository';
import { RealStop, VirtualStop } from '../../domain/entities';

/**
 * PostgreSQL implementation of IStopRepository
 * 
 * Handles persistent storage of real and virtual stops.
 * Never recreates data on startup - only reads and updates.
 * 
 * @implements {IStopRepository}
 */
export class PostgresStopRepository implements IStopRepository {
  constructor(private readonly pool: Pool) {}

  // ============================================================================
  // Real Stops
  // ============================================================================

  async findRealStopById(id: string): Promise<RealStop | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM stops WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToRealStop(result.rows[0]);
  }

  async getAllRealStops(): Promise<RealStop[]> {
    const result = await this.pool.query('SELECT * FROM stops ORDER BY name');
    return result.rows.map(row => this.mapRowToRealStop(row));
  }

  async getRealStopsByCity(cityId: string): Promise<RealStop[]> {
    const result = await this.pool.query(
      'SELECT * FROM stops WHERE city_id = $1 ORDER BY name',
      [cityId]
    );
    return result.rows.map(row => this.mapRowToRealStop(row));
  }

  async getRealStopsByType(
    isAirport?: boolean,
    isRailwayStation?: boolean
  ): Promise<RealStop[]> {
    let query = 'SELECT * FROM stops WHERE 1=1';
    const params: unknown[] = [];

    if (isAirport !== undefined) {
      params.push(isAirport);
      query += ` AND is_airport = $${params.length}`;
    }

    if (isRailwayStation !== undefined) {
      params.push(isRailwayStation);
      query += ` AND is_railway_station = $${params.length}`;
    }

    query += ' ORDER BY name';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToRealStop(row));
  }

  async saveRealStop(stop: RealStop): Promise<RealStop> {
    const query = `
      INSERT INTO stops (
        id, name, latitude, longitude, city_id,
        is_airport, is_railway_station, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        city_id = EXCLUDED.city_id,
        is_airport = EXCLUDED.is_airport,
        is_railway_station = EXCLUDED.is_railway_station,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      stop.id,
      stop.name,
      stop.latitude,
      stop.longitude,
      stop.cityId,
      stop.isAirport,
      stop.isRailwayStation,
      JSON.stringify(stop.metadata || null),
      stop.createdAt || new Date(),
      new Date()
    ]);

    return this.mapRowToRealStop(result.rows[0]);
  }

  async saveRealStopsBatch(stops: RealStop[]): Promise<RealStop[]> {
    if (stops.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const savedStops: RealStop[] = [];
      for (const stop of stops) {
        const query = `
          INSERT INTO stops (
            id, name, latitude, longitude, city_id,
            is_airport, is_railway_station, metadata, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id)
          DO UPDATE SET
            name = EXCLUDED.name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            city_id = EXCLUDED.city_id,
            is_airport = EXCLUDED.is_airport,
            is_railway_station = EXCLUDED.is_railway_station,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING *
        `;

        const result = await client.query(query, [
          stop.id,
          stop.name,
          stop.latitude,
          stop.longitude,
          stop.cityId,
          stop.isAirport,
          stop.isRailwayStation,
          JSON.stringify(stop.metadata || null),
          stop.createdAt || new Date(),
          new Date()
        ]);

        savedStops.push(this.mapRowToRealStop(result.rows[0]));
      }

      await client.query('COMMIT');
      return savedStops;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRealStop(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM stops WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async countRealStops(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM stops');
    return parseInt(result.rows[0].count, 10);
  }

  async findRealStopsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<RealStop[]> {
    // Using PostGIS point distance calculation
    // Formula: distance in km = distance in degrees * 111.32 (approximate)
    const query = `
      SELECT *,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM stops
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) <= $3
      ORDER BY distance
    `;

    const result = await this.pool.query(query, [latitude, longitude, radiusKm]);
    return result.rows.map(row => this.mapRowToRealStop(row));
  }

  // ============================================================================
  // Virtual Stops
  // ============================================================================

  async findVirtualStopById(id: string): Promise<VirtualStop | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_stops WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToVirtualStop(result.rows[0]);
  }

  async getAllVirtualStops(): Promise<VirtualStop[]> {
    const result = await this.pool.query('SELECT * FROM virtual_stops ORDER BY name');
    return result.rows.map(row => this.mapRowToVirtualStop(row));
  }

  async getVirtualStopsByCity(cityId: string): Promise<VirtualStop[]> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_stops WHERE city_id = $1 ORDER BY name',
      [cityId]
    );
    return result.rows.map(row => this.mapRowToVirtualStop(row));
  }

  async saveVirtualStop(stop: VirtualStop): Promise<VirtualStop> {
    const query = `
      INSERT INTO virtual_stops (
        id, name, latitude, longitude, city_id, grid_type,
        grid_position, real_stops_nearby, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        city_id = EXCLUDED.city_id,
        grid_type = EXCLUDED.grid_type,
        grid_position = EXCLUDED.grid_position,
        real_stops_nearby = EXCLUDED.real_stops_nearby
      RETURNING *
    `;

    // Convert grid_position to JSONB (single object, not array)
    const gridPositionJson = stop.gridPosition ? JSON.stringify(stop.gridPosition) : null;

    // Convert real_stops_nearby to JSONB[] array
    // If empty array, use NULL; otherwise convert each element to JSONB
    let realStopsNearbyJson: string[] | null = null;
    if (stop.realStopsNearby && stop.realStopsNearby.length > 0) {
      realStopsNearbyJson = stop.realStopsNearby.map(item => JSON.stringify(item));
    }

    const result = await this.pool.query(query, [
      stop.id,
      stop.name,
      stop.latitude,
      stop.longitude,
      stop.cityId,
      stop.gridType,
      gridPositionJson,
      realStopsNearbyJson, // PostgreSQL will convert string[] to JSONB[]
      stop.createdAt || new Date()
    ]);

    return this.mapRowToVirtualStop(result.rows[0]);
  }

  async saveVirtualStopsBatch(stops: VirtualStop[]): Promise<VirtualStop[]> {
    if (stops.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const savedStops: VirtualStop[] = [];
      for (const stop of stops) {
        const query = `
          INSERT INTO virtual_stops (
            id, name, latitude, longitude, city_id, grid_type,
            grid_position, real_stops_nearby, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id)
          DO UPDATE SET
            name = EXCLUDED.name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            city_id = EXCLUDED.city_id,
            grid_type = EXCLUDED.grid_type,
            grid_position = EXCLUDED.grid_position,
            real_stops_nearby = EXCLUDED.real_stops_nearby
          RETURNING *
        `;

        // Convert grid_position to JSONB (single object, not array)
        const gridPositionJson = stop.gridPosition ? JSON.stringify(stop.gridPosition) : null;

        // Convert real_stops_nearby to JSONB[] array
        // If empty array, use NULL; otherwise convert each element to JSONB
        let realStopsNearbyJson: string[] | null = null;
        if (stop.realStopsNearby && stop.realStopsNearby.length > 0) {
          realStopsNearbyJson = stop.realStopsNearby.map(item => JSON.stringify(item));
        }

        const result = await client.query(query, [
          stop.id,
          stop.name,
          stop.latitude,
          stop.longitude,
          stop.cityId,
          stop.gridType,
          gridPositionJson,
          realStopsNearbyJson, // PostgreSQL will convert string[] to JSONB[]
          stop.createdAt || new Date()
        ]);

        savedStops.push(this.mapRowToVirtualStop(result.rows[0]));
      }

      await client.query('COMMIT');
      return savedStops;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAllVirtualStops(): Promise<number> {
    const result = await this.pool.query('DELETE FROM virtual_stops');
    return result.rowCount || 0;
  }

  async countVirtualStops(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM virtual_stops');
    return parseInt(result.rows[0].count, 10);
  }

  async findVirtualStopsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<VirtualStop[]> {
    const query = `
      SELECT *,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM virtual_stops
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) <= $3
      ORDER BY distance
    `;

    const result = await this.pool.query(query, [latitude, longitude, radiusKm]);
    return result.rows.map(row => this.mapRowToVirtualStop(row));
  }

  // ============================================================================
  // Mapping Functions
  // ============================================================================

  /**
   * Maps database row to RealStop entity
   */
  private mapRowToRealStop(row: Record<string, unknown>): RealStop {
    // Handle DECIMAL types from PostgreSQL (can be string or number)
    const latitude = typeof row.latitude === 'number' 
      ? row.latitude 
      : parseFloat(String(row.latitude));
    const longitude = typeof row.longitude === 'number' 
      ? row.longitude 
      : parseFloat(String(row.longitude));

    return new RealStop(
      row.id as string,
      row.name as string,
      latitude,
      longitude,
      row.city_id as string | undefined,
      row.is_airport as boolean,
      row.is_railway_station as boolean,
      row.metadata as Record<string, unknown> | undefined,
      row.created_at as Date,
      row.updated_at as Date
    );
  }

  /**
   * Maps database row to VirtualStop entity
   */
  private mapRowToVirtualStop(row: Record<string, unknown>): VirtualStop {
    // Handle DECIMAL types from PostgreSQL (can be string or number)
    const latitude = typeof row.latitude === 'number' 
      ? row.latitude 
      : parseFloat(String(row.latitude));
    const longitude = typeof row.longitude === 'number' 
      ? row.longitude 
      : parseFloat(String(row.longitude));

    // Parse real_stops_nearby from JSONB[] array
    let realStopsNearby: Array<{ stopId: string; distance: number }> = [];
    if (row.real_stops_nearby) {
      if (Array.isArray(row.real_stops_nearby)) {
        // If it's already an array, parse each JSONB element
        realStopsNearby = row.real_stops_nearby
          .map((item: unknown) => {
            if (typeof item === 'string') {
              try {
                return JSON.parse(item) as { stopId: string; distance: number };
              } catch {
                return null;
              }
            }
            return item as { stopId: string; distance: number };
          })
          .filter((item): item is { stopId: string; distance: number } => item !== null);
      } else if (typeof row.real_stops_nearby === 'string') {
        // If it's a string, try to parse as JSON array
        try {
          const parsed = JSON.parse(row.real_stops_nearby);
          realStopsNearby = Array.isArray(parsed) ? parsed : [];
        } catch {
          realStopsNearby = [];
        }
      }
    }

    return new VirtualStop(
      row.id as string,
      row.name as string,
      latitude,
      longitude,
      row.grid_type as 'MAIN_GRID' | 'DENSE_CITY' | 'AIRPORT_GRID',
      row.city_id as string | undefined,
      row.grid_position as { x: number; y: number } | undefined,
      realStopsNearby,
      row.created_at as Date
    );
  }
}

