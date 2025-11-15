import { BaseEntity } from './BaseEntity';
import { Price } from '../value-objects/Price';
import { Tour } from './Tour';

export type TourOrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

/**
 * Заказ туристического тура
 */
export class TourOrder extends BaseEntity {
  constructor(
    id: string,
    public readonly userId: string,
    public readonly tourId: string,
    public readonly tour: Tour,
    public readonly status: TourOrderStatus,
    public readonly totalPrice: Price,
    public readonly participantsCount: number,
    public readonly participants: Array<{
      fullName: string;
      email: string;
      phone?: string;
      dateOfBirth?: Date;
    }>,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly confirmedAt?: Date,
    public readonly cancelledAt?: Date,
    public readonly insuranceIncluded?: boolean
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.participantsCount <= 0) {
      throw new Error('Participants count must be positive');
    }

    if (this.participants.length !== this.participantsCount) {
      throw new Error('Participants array length must match participants count');
    }

    if (this.totalPrice.amount < 0) {
      throw new Error('Total price cannot be negative');
    }
  }

  /**
   * Подтверждение заказа
   */
  confirm(): TourOrder {
    if (this.status !== 'pending') {
      throw new Error('Only pending orders can be confirmed');
    }
    return new TourOrder(
      this.id,
      this.userId,
      this.tourId,
      this.tour,
      'confirmed',
      this.totalPrice,
      this.participantsCount,
      this.participants,
      this.createdAt,
      new Date(),
      new Date(),
      this.cancelledAt,
      this.insuranceIncluded
    );
  }

  /**
   * Отмена заказа
   */
  cancel(): TourOrder {
    if (this.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }
    if (this.status === 'completed') {
      throw new Error('Cannot cancel completed order');
    }
    return new TourOrder(
      this.id,
      this.userId,
      this.tourId,
      this.tour,
      'cancelled',
      this.totalPrice,
      this.participantsCount,
      this.participants,
      this.createdAt,
      new Date(),
      this.confirmedAt,
      new Date(),
      this.insuranceIncluded
    );
  }
}

