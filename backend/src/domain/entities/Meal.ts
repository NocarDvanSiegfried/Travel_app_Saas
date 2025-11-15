import { BaseEntity } from './BaseEntity';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Питание в туре
 */
export class Meal extends BaseEntity {
  constructor(
    id: string,
    public readonly type: MealType,
    public readonly name: string,
    public readonly description: string,
    public readonly restaurant?: string,
    public readonly location?: string,
    public readonly time?: Date,
    public readonly dietaryOptions?: string[], // vegetarian, vegan, gluten-free, etc.
    public readonly menu?: string[]
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    // Базовая валидация
  }
}

