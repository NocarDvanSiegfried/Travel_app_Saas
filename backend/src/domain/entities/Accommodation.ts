import { BaseEntity } from './BaseEntity';
import { Coordinates } from '../value-objects/Coordinates';

export type AccommodationType = 'hotel' | 'hostel' | 'apartment' | 'resort' | 'camping';

/**
 * Размещение в туре
 */
export class Accommodation extends BaseEntity {
  constructor(
    id: string,
    public readonly name: string,
    public readonly type: AccommodationType,
    public readonly address: string,
    public readonly coordinates: Coordinates,
    public readonly rating?: number,
    public readonly amenities?: string[],
    public readonly checkIn?: Date,
    public readonly checkOut?: Date,
    public readonly roomType?: string,
    public readonly images?: string[]
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.rating !== undefined && (this.rating < 0 || this.rating > 5)) {
      throw new Error('Rating must be between 0 and 5');
    }
  }
}

