import type { Pool } from 'pg';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
import { Route, VirtualRoute } from '../../domain/entities';
import type { RouteStop, TransportType, VirtualRouteType, VirtualTransportMode } from '../../domain/entities';

/**
 * PostgreSQL implementation of IRouteRepository
 * 
 * Handles persistent storage of real and virtual routes.
 * Real routes updated by Worker 1, virtual routes created once by Worker 2.
 * 
 * @implements {IRouteRepository}
 */
export class PostgresRouteRepository implements IRouteRepository {
  constructor(private readonly pool: Pool) {}

  // ============================================================================
  // Real Routes
  // ============================================================================

  async findRouteById(id: string): Promise<Route | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM routes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToRoute(result.rows[0]);
  }

  async getAllRoutes(): Promise<Route[]> {
    const result = await this.pool.query(
      'SELECT * FROM routes ORDER BY route_number, from_stop_id'
    );
    return result.rows.map(row => this.mapRowToRoute(row));
  }

  async getRoutesByTransportType(transportType: string): Promise<Route[]> {
    const result = await this.pool.query(
      'SELECT * FROM routes WHERE transport_type = $1 ORDER BY route_number',
      [transportType]
    );
    return result.rows.map(row => this.mapRowToRoute(row));
  }

  async getRoutesFromStop(stopId: string): Promise<Route[]> {
    const result = await this.pool.query(
      'SELECT * FROM routes WHERE from_stop_id = $1 ORDER BY route_number',
      [stopId]
    );
    return result.rows.map(row => this.mapRowToRoute(row));
  }

  async getRoutesToStop(stopId: string): Promise<Route[]> {
    const result = await this.pool.query(
      'SELECT * FROM routes WHERE to_stop_id = $1 ORDER BY route_number',
      [stopId]
    );
    return result.rows.map(row => this.mapRowToRoute(row));
  }

  async findDirectRoutes(fromStopId: string, toStopId: string): Promise<Route[]> {
    const result = await this.pool.query(
      'SELECT * FROM routes WHERE from_stop_id = $1 AND to_stop_id = $2 ORDER BY duration_minutes',
      [fromStopId, toStopId]
    );
    return result.rows.map(row => this.mapRowToRoute(row));
  }

  async saveRoute(route: Route): Promise<Route> {
    const query = `
      INSERT INTO routes (
        id, route_number, transport_type, from_stop_id, to_stop_id,
        stops_sequence, duration_minutes, distance_km, operator,
        metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id)
      DO UPDATE SET
        route_number = EXCLUDED.route_number,
        transport_type = EXCLUDED.transport_type,
        from_stop_id = EXCLUDED.from_stop_id,
        to_stop_id = EXCLUDED.to_stop_id,
        stops_sequence = EXCLUDED.stops_sequence,
        duration_minutes = EXCLUDED.duration_minutes,
        distance_km = EXCLUDED.distance_km,
        operator = EXCLUDED.operator,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      route.id,
      route.routeNumber,
      route.transportType,
      route.fromStopId,
      route.toStopId,
      JSON.stringify(route.stopsSequence),
      route.durationMinutes,
      route.distanceKm,
      route.operator,
      JSON.stringify(route.metadata || null),
      route.createdAt || new Date(),
      new Date()
    ]);

    return this.mapRowToRoute(result.rows[0]);
  }

  async saveRoutesBatch(routes: Route[]): Promise<Route[]> {
    if (routes.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const savedRoutes: Route[] = [];
      for (const route of routes) {
        const query = `
          INSERT INTO routes (
            id, route_number, transport_type, from_stop_id, to_stop_id,
            stops_sequence, duration_minutes, distance_km, operator,
            metadata, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id)
          DO UPDATE SET
            route_number = EXCLUDED.route_number,
            transport_type = EXCLUDED.transport_type,
            from_stop_id = EXCLUDED.from_stop_id,
            to_stop_id = EXCLUDED.to_stop_id,
            stops_sequence = EXCLUDED.stops_sequence,
            duration_minutes = EXCLUDED.duration_minutes,
            distance_km = EXCLUDED.distance_km,
            operator = EXCLUDED.operator,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING *
        `;

        const result = await client.query(query, [
          route.id,
          route.routeNumber,
          route.transportType,
          route.fromStopId,
          route.toStopId,
          JSON.stringify(route.stopsSequence),
          route.durationMinutes,
          route.distanceKm,
          route.operator,
          JSON.stringify(route.metadata || null),
          route.createdAt || new Date(),
          new Date()
        ]);

        savedRoutes.push(this.mapRowToRoute(result.rows[0]));
      }

      await client.query('COMMIT');
      return savedRoutes;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRoute(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM routes WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async countRoutes(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM routes');
    return parseInt(result.rows[0].count, 10);
  }

  // ============================================================================
  // Virtual Routes
  // ============================================================================

  async findVirtualRouteById(id: string): Promise<VirtualRoute | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_routes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return undefined;

    return this.mapRowToVirtualRoute(result.rows[0]);
  }

  async getAllVirtualRoutes(): Promise<VirtualRoute[]> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_routes ORDER BY route_type, from_stop_id'
    );
    return result.rows.map(row => this.mapRowToVirtualRoute(row));
  }

  async getVirtualRoutesByType(routeType: string): Promise<VirtualRoute[]> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_routes WHERE route_type = $1 ORDER BY from_stop_id',
      [routeType]
    );
    return result.rows.map(row => this.mapRowToVirtualRoute(row));
  }

  async getVirtualRoutesFromStop(stopId: string): Promise<VirtualRoute[]> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_routes WHERE from_stop_id = $1 ORDER BY distance_km',
      [stopId]
    );
    return result.rows.map(row => this.mapRowToVirtualRoute(row));
  }

  async getVirtualRoutesToStop(stopId: string): Promise<VirtualRoute[]> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_routes WHERE to_stop_id = $1 ORDER BY distance_km',
      [stopId]
    );
    return result.rows.map(row => this.mapRowToVirtualRoute(row));
  }

  async findVirtualConnections(
    fromStopId: string,
    toStopId: string
  ): Promise<VirtualRoute[]> {
    const result = await this.pool.query(
      'SELECT * FROM virtual_routes WHERE from_stop_id = $1 AND to_stop_id = $2 ORDER BY duration_minutes',
      [fromStopId, toStopId]
    );
    return result.rows.map(row => this.mapRowToVirtualRoute(row));
  }

  async saveVirtualRoute(route: VirtualRoute): Promise<VirtualRoute> {
    const query = `
      INSERT INTO virtual_routes (
        id, route_type, from_stop_id, to_stop_id,
        distance_km, duration_minutes, transport_mode,
        metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id)
      DO UPDATE SET
        route_type = EXCLUDED.route_type,
        from_stop_id = EXCLUDED.from_stop_id,
        to_stop_id = EXCLUDED.to_stop_id,
        distance_km = EXCLUDED.distance_km,
        duration_minutes = EXCLUDED.duration_minutes,
        transport_mode = EXCLUDED.transport_mode,
        metadata = EXCLUDED.metadata
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      route.id,
      route.routeType,
      route.fromStopId,
      route.toStopId,
      route.distanceKm,
      route.durationMinutes,
      route.transportMode,
      JSON.stringify(route.metadata || null),
      route.createdAt || new Date()
    ]);

    return this.mapRowToVirtualRoute(result.rows[0]);
  }

  async saveVirtualRoutesBatch(routes: VirtualRoute[]): Promise<VirtualRoute[]> {
    if (routes.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const savedRoutes: VirtualRoute[] = [];
      for (const route of routes) {
        const query = `
          INSERT INTO virtual_routes (
            id, route_type, from_stop_id, to_stop_id,
            distance_km, duration_minutes, transport_mode,
            metadata, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id)
          DO UPDATE SET
            route_type = EXCLUDED.route_type,
            from_stop_id = EXCLUDED.from_stop_id,
            to_stop_id = EXCLUDED.to_stop_id,
            distance_km = EXCLUDED.distance_km,
            duration_minutes = EXCLUDED.duration_minutes,
            transport_mode = EXCLUDED.transport_mode,
            metadata = EXCLUDED.metadata
          RETURNING *
        `;

        const result = await client.query(query, [
          route.id,
          route.routeType,
          route.fromStopId,
          route.toStopId,
          route.distanceKm,
          route.durationMinutes,
          route.transportMode,
          JSON.stringify(route.metadata || null),
          route.createdAt || new Date()
        ]);

        savedRoutes.push(this.mapRowToVirtualRoute(result.rows[0]));
      }

      await client.query('COMMIT');
      return savedRoutes;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAllVirtualRoutes(): Promise<number> {
    const result = await this.pool.query('DELETE FROM virtual_routes');
    return result.rowCount || 0;
  }

  async countVirtualRoutes(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM virtual_routes');
    return parseInt(result.rows[0].count, 10);
  }

  // ============================================================================
  // Mapping Functions
  // ============================================================================

  /**
   * Maps database row to Route entity
   */
  private mapRowToRoute(row: Record<string, unknown>): Route {
    // Parse stops_sequence from JSONB
    let stopsSequence: RouteStop[] = [];
    if (row.stops_sequence) {
      const parsed = typeof row.stops_sequence === 'string' 
        ? JSON.parse(row.stops_sequence) 
        : row.stops_sequence;
      stopsSequence = Array.isArray(parsed) ? parsed : [];
    }

    // Parse metadata from JSONB
    let metadata: Record<string, unknown> | undefined = undefined;
    if (row.metadata) {
      metadata = typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, unknown>;
    }

    return new Route(
      row.id as string,
      row.transport_type as TransportType,
      row.from_stop_id as string,
      row.to_stop_id as string,
      stopsSequence,
      row.route_number as string | undefined,
      row.duration_minutes 
        ? (typeof row.duration_minutes === 'number' ? row.duration_minutes : parseInt(String(row.duration_minutes), 10))
        : undefined,
      row.distance_km 
        ? (typeof row.distance_km === 'number' ? row.distance_km : parseFloat(String(row.distance_km)))
        : undefined,
      row.operator as string | undefined,
      metadata,
      row.created_at as Date,
      row.updated_at as Date
    );
  }

  /**
   * Maps database row to VirtualRoute entity
   */
  private mapRowToVirtualRoute(row: Record<string, unknown>): VirtualRoute {
    // Parse metadata from JSONB
    let metadata: Record<string, unknown> | undefined = undefined;
    if (row.metadata) {
      metadata = typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, unknown>;
    }

    return new VirtualRoute(
      row.id as string,
      row.route_type as VirtualRouteType,
      row.from_stop_id as string,
      row.to_stop_id as string,
      typeof row.distance_km === 'number' 
        ? row.distance_km 
        : parseFloat(String(row.distance_km)),
      typeof row.duration_minutes === 'number' 
        ? row.duration_minutes 
        : parseInt(String(row.duration_minutes), 10),
      row.transport_mode as VirtualTransportMode,
      metadata,
      row.created_at as Date
    );
  }
}

