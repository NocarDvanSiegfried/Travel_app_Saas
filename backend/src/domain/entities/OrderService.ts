import { BaseEntity } from './BaseEntity';
import { Price } from '../value-objects/Price';

export type ServiceType = 'insurance' | 'premium-support';

/**
 * Услуга в заказе (страховка, поддержка и т.д.)
 */
export class OrderService extends BaseEntity {
  constructor(
    id: string,
    public readonly orderId: string,
    public readonly serviceType: ServiceType,
    public readonly serviceId: string,
    public readonly name: string,
    public readonly price: Price,
    public readonly createdAt?: Date
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Service name is required');
    }
    if (!this.serviceId || this.serviceId.trim().length === 0) {
      throw new Error('Service ID is required');
    }
  }
}

