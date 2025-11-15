import { BaseEntity } from './BaseEntity';
import { Price } from '../value-objects/Price';
import { Accommodation } from './Accommodation';
import { Activity } from './Activity';
import { Meal } from './Meal';

export type TourComponentType = 'accommodation' | 'activity' | 'meal' | 'transport';

/**
 * Компонент тура (размещение, активность, питание, транспорт)
 */
export class TourComponent extends BaseEntity {
  constructor(
    id: string,
    public readonly type: TourComponentType,
    public readonly name: string,
    public readonly description: string,
    public readonly price: Price,
    public readonly accommodation?: Accommodation,
    public readonly activity?: Activity,
    public readonly meal?: Meal,
    public readonly transportDetails?: {
      type: string;
      from: string;
      to: string;
      departureTime?: Date;
      arrivalTime?: Date;
    },
    public readonly startDate?: Date,
    public readonly endDate?: Date
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    // Проверка соответствия типа и данных
    if (this.type === 'accommodation' && !this.accommodation) {
      throw new Error('Accommodation component must have accommodation data');
    }

    if (this.type === 'activity' && !this.activity) {
      throw new Error('Activity component must have activity data');
    }

    if (this.type === 'meal' && !this.meal) {
      throw new Error('Meal component must have meal data');
    }

    if (this.type === 'transport' && !this.transportDetails) {
      throw new Error('Transport component must have transport details');
    }

    if (this.price.amount < 0) {
      throw new Error('Price cannot be negative');
    }
  }
}

