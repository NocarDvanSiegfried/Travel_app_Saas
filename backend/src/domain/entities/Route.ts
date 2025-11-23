import type { BaseEntity } from './BaseEntity';

/**
 * Transport types for routes
 */
export type TransportType = 'BUS' | 'TRAIN' | 'PLANE' | 'WATER' | 'FERRY';

/**
 * Stop in route sequence with timing
 */
export type RouteStop = {
  stopId: string;
  order: number;
  arrivalTime?: string; // HH:MM format
  departureTime?: string; // HH:MM format
};

/**
 * Route entity - represents a real route from OData API
 * 
 * Stored permanently in PostgreSQL and updated by Worker 1 when OData changes.
 * Contains the full sequence of stops and timing information.
 * 
 * @example
 * ```typescript
 * const route = new Route({
 *   id: 'route-yakutsk-moscow',
 *   routeNumber: 'ЯК-001',
 *   transportType: 'PLANE',
 *   fromStopId: 'yakutsk-airport',
 *   toStopId: 'moscow-airport',
 *   stopsSequence: [
 *     { stopId: 'yakutsk-airport', order: 1, departureTime: '08:00' },
 *     { stopId: 'moscow-airport', order: 2, arrivalTime: '14:00' }
 *   ],
 *   durationMinutes: 360,
 *   distanceKm: 4900
 * });
 * ```
 */
export class Route implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly transportType: TransportType,
    public readonly fromStopId: string,
    public readonly toStopId: string,
    public readonly stopsSequence: RouteStop[],
    public readonly routeNumber?: string,
    public readonly durationMinutes?: number,
    public readonly distanceKm?: number,
    public readonly operator?: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates the entity
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Route: id is required');
    }

    if (!this.fromStopId || this.fromStopId.trim().length === 0) {
      throw new Error('Route: fromStopId is required');
    }

    if (!this.toStopId || this.toStopId.trim().length === 0) {
      throw new Error('Route: toStopId is required');
    }

    if (this.stopsSequence.length < 2) {
      throw new Error('Route: stopsSequence must have at least 2 stops');
    }

    const validTransportTypes: TransportType[] = ['BUS', 'TRAIN', 'PLANE', 'WATER', 'FERRY'];
    if (!validTransportTypes.includes(this.transportType)) {
      throw new Error(`Route: invalid transportType ${this.transportType}`);
    }

    // Validate stop sequence order
    const orders = this.stopsSequence.map(s => s.order);
    const sortedOrders = [...orders].sort((a, b) => a - b);
    if (JSON.stringify(orders) !== JSON.stringify(sortedOrders)) {
      throw new Error('Route: stopsSequence order must be sequential');
    }
  }

  /**
   * Gets the number of intermediate stops (excluding start and end)
   */
  public getIntermediateStopsCount(): number {
    return Math.max(0, this.stopsSequence.length - 2);
  }

  /**
   * Checks if this is a direct route (no intermediate stops)
   */
  public isDirect(): boolean {
    return this.stopsSequence.length === 2;
  }

  /**
   * Gets stop by its order in sequence
   */
  public getStopByOrder(order: number): RouteStop | undefined {
    return this.stopsSequence.find(s => s.order === order);
  }

  /**
   * Gets all stop IDs in order
   */
  public getStopIds(): string[] {
    return this.stopsSequence.map(s => s.stopId);
  }

  /**
   * Checks if a stop is part of this route
   */
  public hasStop(stopId: string): boolean {
    return this.stopsSequence.some(s => s.stopId === stopId);
  }

  /**
   * Calculates average speed in km/h if duration and distance are available
   */
  public getAverageSpeed(): number | undefined {
    if (!this.durationMinutes || !this.distanceKm || this.durationMinutes === 0) {
      return undefined;
    }
    return (this.distanceKm / this.durationMinutes) * 60;
  }

  /**
   * Creates a copy with updated fields
   */
  public update(updates: Partial<Omit<Route, 'id'>>): Route {
    return new Route(
      this.id,
      updates.transportType ?? this.transportType,
      updates.fromStopId ?? this.fromStopId,
      updates.toStopId ?? this.toStopId,
      updates.stopsSequence ?? this.stopsSequence,
      updates.routeNumber ?? this.routeNumber,
      updates.durationMinutes ?? this.durationMinutes,
      updates.distanceKm ?? this.distanceKm,
      updates.operator ?? this.operator,
      updates.metadata ?? this.metadata,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Converts to plain object for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      routeNumber: this.routeNumber,
      transportType: this.transportType,
      fromStopId: this.fromStopId,
      toStopId: this.toStopId,
      stopsSequence: this.stopsSequence,
      durationMinutes: this.durationMinutes,
      distanceKm: this.distanceKm,
      operator: this.operator,
      metadata: this.metadata,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString()
    };
  }
}




