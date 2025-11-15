import { BaseEntity } from './BaseEntity';
import { Coordinates } from '../value-objects/Coordinates';
import { Price } from '../value-objects/Price';

export type TransportType = 'air' | 'rail' | 'bus' | 'river';

/**
 * Сегмент маршрута (один участок пути)
 */
export class RouteSegment extends BaseEntity {
  constructor(
    id: string,
    public readonly transportType: TransportType,
    public readonly fromCity: string,
    public readonly toCity: string,
    public readonly fromCoordinates: Coordinates,
    public readonly toCoordinates: Coordinates,
    public readonly departureTime: Date,
    public readonly arrivalTime: Date,
    public readonly price: Price,
    public readonly carrier?: string,
    public readonly vehicleNumber?: string
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.arrivalTime <= this.departureTime) {
      throw new Error('Arrival time must be after departure time');
    }
  }

  /**
   * Длительность сегмента в минутах
   */
  getDurationMinutes(): number {
    return Math.round(
      (this.arrivalTime.getTime() - this.departureTime.getTime()) / (1000 * 60)
    );
  }

  /**
   * Проверяет, является ли это пересадкой
   */
  isTransfer(): boolean {
    return this.departureTime.getTime() - this.arrivalTime.getTime() > 0;
  }
}

