import { BaseEntity } from './BaseEntity';
import { Price } from '../value-objects/Price';
import { TourComponent } from './TourComponent';

export type TourStatus = 'available' | 'sold_out' | 'cancelled';

/**
 * Туристический тур
 */
export class Tour extends BaseEntity {
  constructor(
    id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly destination: string,
    public readonly durationDays: number,
    public readonly price: Price,
    public readonly status: TourStatus,
    public readonly components: TourComponent[],
    public readonly maxParticipants?: number,
    public readonly currentParticipants?: number,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly images?: string[],
    public readonly tags?: string[]
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.durationDays <= 0) {
      throw new Error('Duration must be positive');
    }

    if (this.price.amount < 0) {
      throw new Error('Price cannot be negative');
    }

    if (this.components.length === 0) {
      throw new Error('Tour must have at least one component');
    }

    if (this.maxParticipants !== undefined && this.maxParticipants <= 0) {
      throw new Error('Max participants must be positive');
    }

    if (
      this.currentParticipants !== undefined &&
      this.maxParticipants !== undefined &&
      this.currentParticipants > this.maxParticipants
    ) {
      throw new Error('Current participants cannot exceed max participants');
    }
  }

  /**
   * Проверяет доступность тура
   */
  isAvailable(): boolean {
    if (this.status !== 'available') {
      return false;
    }

    if (this.maxParticipants !== undefined && this.currentParticipants !== undefined) {
      return this.currentParticipants < this.maxParticipants;
    }

    return true;
  }

  /**
   * Проверяет, есть ли свободные места
   */
  hasAvailableSpots(count: number = 1): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    if (this.maxParticipants === undefined || this.currentParticipants === undefined) {
      return true;
    }

    return this.currentParticipants + count <= this.maxParticipants;
  }

  /**
   * Получение общей стоимости всех компонентов
   */
  getTotalComponentsPrice(): Price {
    return this.components.reduce(
      (total, component) => total.add(component.price),
      new Price(0)
    );
  }
}

