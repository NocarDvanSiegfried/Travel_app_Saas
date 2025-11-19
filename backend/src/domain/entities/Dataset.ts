import type { BaseEntity } from './BaseEntity';

/**
 * Data source types
 */
export type DataSourceType = 'ODATA' | 'MOCK' | 'HYBRID';

/**
 * Dataset entity - represents metadata about a dataset version
 * 
 * Tracks changes via OData hash and stores statistics.
 * Only one dataset version is active at a time.
 * 
 * @example
 * ```typescript
 * const dataset = new Dataset({
 *   version: 'ds-v1.2.3',
 *   sourceType: 'ODATA',
 *   qualityScore: 95,
 *   totalStops: 1500,
 *   totalRoutes: 350,
 *   totalFlights: 5000,
 *   totalVirtualStops: 2000,
 *   totalVirtualRoutes: 8000,
 *   odataHash: 'sha256-hash-here',
 *   isActive: true
 * });
 * ```
 */
export class Dataset implements BaseEntity {
  constructor(
    public readonly id: number,
    public readonly version: string,
    public readonly sourceType: DataSourceType,
    public readonly qualityScore: number,
    public readonly totalStops: number = 0,
    public readonly totalRoutes: number = 0,
    public readonly totalFlights: number = 0,
    public readonly totalVirtualStops: number = 0,
    public readonly totalVirtualRoutes: number = 0,
    public readonly odataHash?: string,
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
      throw new Error('Dataset: version is required');
    }

    const validSourceTypes: DataSourceType[] = ['ODATA', 'MOCK', 'HYBRID'];
    if (!validSourceTypes.includes(this.sourceType)) {
      throw new Error(`Dataset: invalid sourceType ${this.sourceType}`);
    }

    if (this.qualityScore < 0 || this.qualityScore > 100) {
      throw new Error(`Dataset: qualityScore must be between 0 and 100, got ${this.qualityScore}`);
    }

    if (this.totalStops < 0) {
      throw new Error('Dataset: totalStops must be non-negative');
    }

    if (this.totalRoutes < 0) {
      throw new Error('Dataset: totalRoutes must be non-negative');
    }

    if (this.totalFlights < 0) {
      throw new Error('Dataset: totalFlights must be non-negative');
    }
  }

  /**
   * Calculates total entities (real + virtual)
   */
  public getTotalEntities(): number {
    return (
      this.totalStops +
      this.totalRoutes +
      this.totalFlights +
      this.totalVirtualStops +
      this.totalVirtualRoutes
    );
  }

  /**
   * Calculates percentage of virtual entities
   */
  public getVirtualPercentage(): number {
    const virtual = this.totalVirtualStops + this.totalVirtualRoutes;
    const total = this.getTotalEntities();
    
    if (total === 0) return 0;
    return (virtual / total) * 100;
  }

  /**
   * Checks if dataset has sufficient data for graph building
   */
  public hasSufficientData(): boolean {
    return this.totalStops >= 10 && this.totalRoutes >= 5;
  }

  /**
   * Checks if dataset quality is good enough
   */
  public hasGoodQuality(): boolean {
    return this.qualityScore >= 70;
  }

  /**
   * Gets quality rating as string
   */
  public getQualityRating(): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (this.qualityScore >= 90) return 'Excellent';
    if (this.qualityScore >= 70) return 'Good';
    if (this.qualityScore >= 50) return 'Fair';
    return 'Poor';
  }

  /**
   * Creates a new version with updated statistics
   */
  public createNewVersion(
    newVersion: string,
    updates: Partial<Pick<Dataset,
      | 'totalStops'
      | 'totalRoutes'
      | 'totalFlights'
      | 'totalVirtualStops'
      | 'totalVirtualRoutes'
      | 'qualityScore'
      | 'odataHash'
      | 'metadata'
    >>
  ): Dataset {
    return new Dataset(
      0, // ID will be assigned by database
      newVersion,
      this.sourceType,
      updates.qualityScore ?? this.qualityScore,
      updates.totalStops ?? this.totalStops,
      updates.totalRoutes ?? this.totalRoutes,
      updates.totalFlights ?? this.totalFlights,
      updates.totalVirtualStops ?? this.totalVirtualStops,
      updates.totalVirtualRoutes ?? this.totalVirtualRoutes,
      updates.odataHash ?? this.odataHash,
      updates.metadata ?? this.metadata,
      new Date(),
      false // New version is not active by default
    );
  }

  /**
   * Converts to plain object for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      version: this.version,
      sourceType: this.sourceType,
      qualityScore: this.qualityScore,
      totalStops: this.totalStops,
      totalRoutes: this.totalRoutes,
      totalFlights: this.totalFlights,
      totalVirtualStops: this.totalVirtualStops,
      totalVirtualRoutes: this.totalVirtualRoutes,
      odataHash: this.odataHash,
      metadata: this.metadata,
      createdAt: this.createdAt?.toISOString(),
      isActive: this.isActive
    };
  }
}

