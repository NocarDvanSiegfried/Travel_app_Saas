import type { BaseEntity } from './BaseEntity';

/**
 * Virtual route types
 */
export type VirtualRouteType = 'REAL_TO_VIRTUAL' | 'VIRTUAL_TO_REAL' | 'VIRTUAL_TO_VIRTUAL';

/**
 * Transport modes for virtual routes
 */
export type VirtualTransportMode = 'WALK' | 'TRANSFER' | 'SHUTTLE';

/**
 * VirtualRoute entity - represents a virtual connection between stops
 * 
 * Created once by Worker 2 and stored permanently in PostgreSQL.
 * Used to connect:
 * - Real stops to virtual stops
 * - Virtual stops to real stops
 * - Virtual stops to virtual stops
 * 
 * @example
 * ```typescript
 * const virtualRoute = new VirtualRoute({
 *   id: 'vroute-yakutsk-airport-to-grid',
 *   routeType: 'REAL_TO_VIRTUAL',
 *   fromStopId: 'yakutsk-airport',
 *   toStopId: 'vstop-yakutsk-grid-1-1',
 *   distanceKm: 5.2,
 *   durationMinutes: 15,
 *   transportMode: 'WALK'
 * });
 * ```
 */
export class VirtualRoute implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly routeType: VirtualRouteType,
    public readonly fromStopId: string,
    public readonly toStopId: string,
    public readonly distanceKm: number,
    public readonly durationMinutes: number,
    public readonly transportMode: VirtualTransportMode = 'WALK',
    public readonly metadata?: Record<string, unknown>,
    public readonly createdAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates the entity
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('VirtualRoute: id is required');
    }

    if (!this.fromStopId || this.fromStopId.trim().length === 0) {
      throw new Error('VirtualRoute: fromStopId is required');
    }

    if (!this.toStopId || this.toStopId.trim().length === 0) {
      throw new Error('VirtualRoute: toStopId is required');
    }

    if (this.fromStopId === this.toStopId) {
      throw new Error('VirtualRoute: fromStopId and toStopId cannot be the same');
    }

    const validRouteTypes: VirtualRouteType[] = [
      'REAL_TO_VIRTUAL',
      'VIRTUAL_TO_REAL',
      'VIRTUAL_TO_VIRTUAL'
    ];
    if (!validRouteTypes.includes(this.routeType)) {
      throw new Error(`VirtualRoute: invalid routeType ${this.routeType}`);
    }

    const validTransportModes: VirtualTransportMode[] = ['WALK', 'TRANSFER', 'SHUTTLE'];
    if (!validTransportModes.includes(this.transportMode)) {
      throw new Error(`VirtualRoute: invalid transportMode ${this.transportMode}`);
    }

    if (this.distanceKm < 0) {
      throw new Error('VirtualRoute: distanceKm must be non-negative');
    }

    if (this.durationMinutes < 0) {
      throw new Error('VirtualRoute: durationMinutes must be non-negative');
    }
  }

  /**
   * Checks if this is a connection from real stop to virtual stop
   */
  public isRealToVirtual(): boolean {
    return this.routeType === 'REAL_TO_VIRTUAL';
  }

  /**
   * Checks if this is a connection from virtual stop to real stop
   */
  public isVirtualToReal(): boolean {
    return this.routeType === 'VIRTUAL_TO_REAL';
  }

  /**
   * Checks if this is a connection between two virtual stops
   */
  public isVirtualToVirtual(): boolean {
    return this.routeType === 'VIRTUAL_TO_VIRTUAL';
  }

  /**
   * Checks if this connection requires walking
   */
  public isWalkable(): boolean {
    return this.transportMode === 'WALK';
  }

  /**
   * Calculates average speed in km/h
   */
  public getAverageSpeed(): number {
    if (this.durationMinutes === 0) return 0;
    return (this.distanceKm / this.durationMinutes) * 60;
  }

  /**
   * Gets the maximum reasonable walking distance (5 km)
   */
  public static getMaxWalkingDistance(): number {
    return 5.0;
  }

  /**
   * Checks if distance is walkable
   */
  public isDistanceWalkable(): boolean {
    return this.distanceKm <= VirtualRoute.getMaxWalkingDistance();
  }

  /**
   * Converts to plain object for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      routeType: this.routeType,
      fromStopId: this.fromStopId,
      toStopId: this.toStopId,
      distanceKm: this.distanceKm,
      durationMinutes: this.durationMinutes,
      transportMode: this.transportMode,
      metadata: this.metadata,
      createdAt: this.createdAt?.toISOString()
    };
  }
}




