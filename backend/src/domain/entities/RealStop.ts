import type { BaseEntity } from './BaseEntity';

/**
 * RealStop entity - represents a real stop from OData API
 * 
 * This entity is stored permanently in PostgreSQL and never recreated on startup.
 * Updated only by Worker 1 when OData changes are detected.
 * 
 * @example
 * ```typescript
 * const stop = new RealStop({
 *   id: 'yakutsk-airport',
 *   name: 'Якутск (Аэропорт)',
 *   latitude: 62.093056,
 *   longitude: 129.770556,
 *   cityId: 'yakutsk',
 *   isAirport: true
 * });
 * ```
 */
export class RealStop implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly cityId?: string,
    public readonly isAirport: boolean = false,
    public readonly isRailwayStation: boolean = false,
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
      throw new Error('RealStop: id is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('RealStop: name is required');
    }

    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error(`RealStop: invalid latitude ${this.latitude}`);
    }

    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error(`RealStop: invalid longitude ${this.longitude}`);
    }
  }

  /**
   * Checks if this stop is a major transport hub (airport or railway station)
   */
  public isMajorHub(): boolean {
    return this.isAirport || this.isRailwayStation;
  }

  /**
   * Calculates distance to another stop in kilometers
   */
  public distanceTo(other: RealStop): number {
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
   * Creates a copy with updated fields
   */
  public update(updates: Partial<Omit<RealStop, 'id'>>): RealStop {
    return new RealStop(
      this.id,
      updates.name ?? this.name,
      updates.latitude ?? this.latitude,
      updates.longitude ?? this.longitude,
      updates.cityId ?? this.cityId,
      updates.isAirport ?? this.isAirport,
      updates.isRailwayStation ?? this.isRailwayStation,
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
      name: this.name,
      latitude: this.latitude,
      longitude: this.longitude,
      cityId: this.cityId,
      isAirport: this.isAirport,
      isRailwayStation: this.isRailwayStation,
      metadata: this.metadata,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString()
    };
  }
}

