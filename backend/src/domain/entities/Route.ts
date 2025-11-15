import { BaseEntity } from './BaseEntity';
import { RouteSegment } from './RouteSegment';
import { Price } from '../value-objects/Price';

export type RouteStatus = 'available' | 'unavailable';

/**
 * Мультимодальный маршрут (цепочка сегментов)
 */
export class Route extends BaseEntity {
  constructor(
    id: string,
    public readonly segments: RouteSegment[],
    public readonly fromCity: string,
    public readonly toCity: string,
    public readonly totalPrice: Price,
    public readonly status: RouteStatus = 'available',
    public readonly riskScore?: number
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.segments.length === 0) {
      throw new Error('Route must have at least one segment');
    }

    // Проверка цепочки сегментов
    for (let i = 0; i < this.segments.length - 1; i++) {
      const current = this.segments[i];
      const next = this.segments[i + 1];

      if (current.toCity !== next.fromCity) {
        throw new Error('Route segments must form a continuous chain');
      }
    }

    // Проверка начального и конечного города
    if (this.segments[0].fromCity !== this.fromCity) {
      throw new Error('First segment must start from route origin');
    }

    if (this.segments[this.segments.length - 1].toCity !== this.toCity) {
      throw new Error('Last segment must end at route destination');
    }
  }

  /**
   * Общая длительность маршрута в минутах
   */
  getTotalDurationMinutes(): number {
    return this.segments.reduce(
      (total, segment) => total + segment.getDurationMinutes(),
      0
    );
  }

  /**
   * Количество пересадок
   */
  getTransfersCount(): number {
    return Math.max(0, this.segments.length - 1);
  }

  /**
   * Проверяет доступность маршрута на указанную дату
   */
  isAvailableOn(date: Date): boolean {
    if (this.status !== 'available') {
      return false;
    }

    const firstSegment = this.segments[0];
    const routeDate = new Date(firstSegment.departureTime);
    return (
      routeDate.getFullYear() === date.getFullYear() &&
      routeDate.getMonth() === date.getMonth() &&
      routeDate.getDate() === date.getDate()
    );
  }
}

