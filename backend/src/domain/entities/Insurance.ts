import { BaseEntity } from './BaseEntity';
import { Price } from '../value-objects/Price';

export type InsuranceType = 'travel' | 'medical' | 'cancellation' | 'baggage';

/**
 * Страховой продукт
 */
export class Insurance extends BaseEntity {
  constructor(
    id: string,
    public readonly name: string,
    public readonly type: InsuranceType,
    public readonly description: string,
    public readonly price: Price,
    public readonly coverage: {
      medical?: number;
      cancellation?: number;
      baggage?: number;
      travel?: number;
    },
    public readonly terms?: string[],
    public readonly isActive: boolean = true
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.price.amount < 0) {
      throw new Error('Price cannot be negative');
    }
  }
}

