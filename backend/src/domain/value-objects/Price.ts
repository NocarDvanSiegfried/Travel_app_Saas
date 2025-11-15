/**
 * Value Object для цены
 */
export class Price {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'RUB'
  ) {
    if (amount < 0) {
      throw new Error('Price amount cannot be negative');
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a 3-letter code');
    }
  }

  add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add prices with different currencies');
    }
    return new Price(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Price {
    return new Price(this.amount * factor, this.currency);
  }
}

