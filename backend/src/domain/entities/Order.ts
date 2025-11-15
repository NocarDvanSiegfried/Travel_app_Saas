import { BaseEntity } from './BaseEntity';
import { Price } from '../value-objects/Price';
import { OrderPassenger } from './OrderPassenger';
import { OrderService } from './OrderService';

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

/**
 * Заказ мультимодального маршрута
 */
export class Order extends BaseEntity {
  constructor(
    id: string,
    public readonly userId: string,
    public readonly routeId: string,
    public readonly status: OrderStatus,
    public readonly totalPrice: Price,
    public readonly passengers: OrderPassenger[],
    public readonly services: OrderService[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly confirmedAt?: Date,
    public readonly cancelledAt?: Date
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.passengers.length === 0) {
      throw new Error('Order must have at least one passenger');
    }

    if (this.totalPrice.amount < 0) {
      throw new Error('Total price cannot be negative');
    }
  }

  /**
   * Подтверждение заказа
   */
  confirm(): Order {
    if (this.status !== 'pending') {
      throw new Error('Only pending orders can be confirmed');
    }
    return new Order(
      this.id,
      this.userId,
      this.routeId,
      'confirmed',
      this.totalPrice,
      this.passengers,
      this.services,
      this.createdAt,
      new Date(),
      new Date(),
      this.cancelledAt
    );
  }

  /**
   * Отмена заказа
   */
  cancel(): Order {
    if (this.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }
    if (this.status === 'completed') {
      throw new Error('Cannot cancel completed order');
    }
    return new Order(
      this.id,
      this.userId,
      this.routeId,
      'cancelled',
      this.totalPrice,
      this.passengers,
      this.services,
      this.createdAt,
      new Date(),
      this.confirmedAt,
      new Date()
    );
  }
}

