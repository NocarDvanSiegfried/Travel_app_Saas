import type { BaseEntity } from './BaseEntity';

/**
 * Grid types for virtual stops
 */
export type VirtualStopGridType = 'MAIN_GRID' | 'DENSE_CITY' | 'AIRPORT_GRID';

/**
 * Grid position in 2D space
 */
export type GridPosition = {
  x: number;
  y: number;
};

/**
 * Nearby real stop reference
 */
export type NearbyRealStop = {
  stopId: string;
  distance: number; // in kilometers
};

/**
 * VirtualStop entity - represents a virtual grid stop for comprehensive route coverage
 * 
 * Created once by Worker 2 and stored permanently in PostgreSQL.
 * Never recreated on requests - only used for graph building.
 * 
 * Virtual stops form a grid to ensure route availability even when real stops are sparse.
 * 
 * @example
 * ```typescript
 * const virtualStop = new VirtualStop({
 *   id: 'vstop-yakutsk-grid-1-1',
 *   name: 'Virtual Stop (Yakutsk Grid 1-1)',
 *   latitude: 62.0,
 *   longitude: 129.5,
 *   cityId: 'yakutsk',
 *   gridType: 'MAIN_GRID',
 *   gridPosition: { x: 1, y: 1 },
 *   realStopsNearby: [
 *     { stopId: 'yakutsk-center', distance: 5.2 }
 *   ]
 * });
 * ```
 */
export class VirtualStop implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly gridType: VirtualStopGridType,
    public readonly cityId?: string,
    public readonly gridPosition?: GridPosition,
    public readonly realStopsNearby: NearbyRealStop[] = [],
    public readonly createdAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates the entity
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('VirtualStop: id is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('VirtualStop: name is required');
    }

    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error(`VirtualStop: invalid latitude ${this.latitude}`);
    }

    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error(`VirtualStop: invalid longitude ${this.longitude}`);
    }

    const validGridTypes: VirtualStopGridType[] = ['MAIN_GRID', 'DENSE_CITY', 'AIRPORT_GRID'];
    if (!validGridTypes.includes(this.gridType)) {
      throw new Error(`VirtualStop: invalid gridType ${this.gridType}`);
    }
  }

  /**
   * Gets the grid spacing in kilometers based on grid type
   */
  public getGridSpacing(): number {
    switch (this.gridType) {
      case 'MAIN_GRID':
        return 50; // 50 km spacing
      case 'DENSE_CITY':
        return 10; // 10 km spacing for cities
      case 'AIRPORT_GRID':
        return 5; // 5 km spacing around airports
      default:
        return 50;
    }
  }

  /**
   * Checks if this virtual stop has nearby real stops
   */
  public hasNearbyRealStops(): boolean {
    return this.realStopsNearby.length > 0;
  }

  /**
   * Gets the closest real stop
   */
  public getClosestRealStop(): NearbyRealStop | undefined {
    if (this.realStopsNearby.length === 0) return undefined;
    
    return this.realStopsNearby.reduce((closest, current) =>
      current.distance < closest.distance ? current : closest
    );
  }

  /**
   * Calculates distance to another virtual stop in kilometers
   */
  public distanceTo(other: VirtualStop): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(other.latitude - this.latitude);
    const dLon = this.toRad(other.longitude - this.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(this.latitude)) *
        Math.cos(this.toRad(other.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Converts degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Converts to plain object for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      latitude: this.latitude,
      longitude: this.longitude,
      cityId: this.cityId,
      gridType: this.gridType,
      gridPosition: this.gridPosition,
      realStopsNearby: this.realStopsNearby,
      createdAt: this.createdAt?.toISOString()
    };
  }
}

