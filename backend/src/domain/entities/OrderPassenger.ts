import { BaseEntity } from './BaseEntity';

/**
 * Пассажир в заказе
 */
export class OrderPassenger extends BaseEntity {
  constructor(
    id: string,
    public readonly orderId: string,
    public readonly fullName: string,
    public readonly documentNumber: string,
    public readonly createdAt?: Date
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (!this.fullName || this.fullName.trim().length === 0) {
      throw new Error('Full name is required');
    }
    if (!this.documentNumber || this.documentNumber.trim().length === 0) {
      throw new Error('Document number is required');
    }
  }
}

