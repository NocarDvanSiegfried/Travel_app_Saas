/**
 * Предпочтения пользователя для персонализации рекомендаций
 */
export type RoutePreferenceType = 'fastest' | 'cheapest' | 'most_reliable';

export type RiskTolerance = 'low' | 'medium' | 'high';

export class UserPreferences {
  constructor(
    public readonly routePreference: RoutePreferenceType = 'most_reliable',
    public readonly riskTolerance: RiskTolerance = 'medium',
    public readonly preferredTransportTypes?: string[],
    public readonly maxTransfers?: number,
    public readonly maxPrice?: number
  ) {}

  /**
   * Проверяет, соответствует ли маршрут предпочтениям пользователя
   */
  matchesRoute(route: {
    duration: number;
    price: number;
    transfers: number;
    riskScore?: number;
    transportTypes: string[];
  }): boolean {
    if (this.maxTransfers !== undefined && route.transfers > this.maxTransfers) {
      return false;
    }

    if (this.maxPrice !== undefined && route.price > this.maxPrice) {
      return false;
    }

    if (
      this.preferredTransportTypes &&
      this.preferredTransportTypes.length > 0 &&
      !route.transportTypes.some(type => this.preferredTransportTypes?.includes(type))
    ) {
      return false;
    }

    return true;
  }
}

