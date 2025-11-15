/**
 * Value Object для предпочтений поиска маршрута
 */
export type RoutePreferenceType = 'fast' | 'cheap' | 'reliable';

export class RoutePreference {
  constructor(public readonly type: RoutePreferenceType) {
    const validTypes: RoutePreferenceType[] = ['fast', 'cheap', 'reliable'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid route preference type: ${type}`);
    }
  }

  /**
   * Вычисляет вес для сортировки маршрутов
   */
  getWeight(duration: number, price: number, riskScore: number): number {
    switch (this.type) {
      case 'fast':
        return duration;
      case 'cheap':
        return price;
      case 'reliable':
        return riskScore;
      default:
        return duration + price + riskScore;
    }
  }
}

