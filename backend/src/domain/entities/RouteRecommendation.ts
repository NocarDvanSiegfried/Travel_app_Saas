import { BaseEntity } from './BaseEntity';
import { Route } from './Route';

/**
 * Рекомендация маршрута от ИИ-агента
 */
export class RouteRecommendation extends BaseEntity {
  constructor(
    id: string,
    public readonly route: Route,
    public readonly score: number, // 0-100
    public readonly explanation: string,
    public readonly reasons: string[],
    public readonly personalizedFactors?: {
      userPreferences?: string[];
      travelHistory?: string[];
      riskTolerance?: 'low' | 'medium' | 'high';
    }
  ) {
    super(id);
    this.validate();
  }

  private validate(): void {
    if (this.score < 0 || this.score > 100) {
      throw new Error('Score must be between 0 and 100');
    }

    if (!this.explanation || this.explanation.trim().length === 0) {
      throw new Error('Explanation is required');
    }

    if (this.reasons.length === 0) {
      throw new Error('At least one reason is required');
    }
  }

  /**
   * Проверяет, является ли рекомендация высокой (score >= 70)
   */
  isHighScore(): boolean {
    return this.score >= 70;
  }

  /**
   * Проверяет, является ли рекомендация низкой (score < 50)
   */
  isLowScore(): boolean {
    return this.score < 50;
  }
}

