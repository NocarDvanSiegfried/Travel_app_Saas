import { BaseEntity } from './BaseEntity';
import { Coordinates } from '../value-objects/Coordinates';

export type ActivityType = 'excursion' | 'adventure' | 'cultural' | 'nature' | 'entertainment';

/**
 * Активность в туре
 */
export class Activity extends BaseEntity {
  constructor(
    id: string,
    public readonly name: string,
    public readonly type: ActivityType,
    public readonly description: string,
    public readonly location: string,
    public readonly coordinates?: Coordinates,
    public readonly durationHours?: number,
    public readonly startTime?: Date,
    public readonly endTime?: Date,
    public readonly difficulty?: 'easy' | 'medium' | 'hard',
    public readonly images?: string[],
    public readonly requirements?: string[]
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.durationHours !== undefined && this.durationHours <= 0) {
      throw new Error('Duration must be positive');
    }
  }
}

