import { Route } from '@domain/entities/Route';
import { RouteRecommendation } from '@domain/entities/RouteRecommendation';
import { UserPreferences, RiskTolerance } from '@domain/value-objects/UserPreferences';
import { v4 as uuidv4 } from 'uuid';

/**
 * Сервис для генерации ИИ-рекомендаций маршрутов
 */
export class AIRecommendationService {
  /**
   * Генерация рекомендаций для списка маршрутов
   */
  generateRecommendations(
    routes: Route[],
    userPreferences?: UserPreferences,
    userTravelHistory?: string[]
  ): RouteRecommendation[] {
    const recommendations: RouteRecommendation[] = [];

    for (const route of routes) {
      const score = this.calculateScore(route, userPreferences, userTravelHistory);
      const explanation = this.generateExplanation(route, score, userPreferences);
      const reasons = this.generateReasons(route, userPreferences);

      const personalizedFactors = userPreferences
        ? {
            userPreferences: this.extractPreferences(userPreferences),
            travelHistory: userTravelHistory,
            riskTolerance: userPreferences.riskTolerance,
          }
        : undefined;

      const recommendation = new RouteRecommendation(
        uuidv4(),
        route,
        score,
        explanation,
        reasons,
        personalizedFactors
      );

      recommendations.push(recommendation);
    }

    // Сортировка по score (от большего к меньшему)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Расчет score для маршрута (0-100)
   */
  private calculateScore(
    route: Route,
    userPreferences?: UserPreferences,
    userTravelHistory?: string[]
  ): number {
    let score = 50; // Базовый score

    // Фактор 1: Цена (чем дешевле, тем выше score)
    const priceScore = this.calculatePriceScore(route.totalPrice.amount);
    score += priceScore * 0.3;

    // Фактор 2: Длительность (чем быстрее, тем выше score)
    const durationScore = this.calculateDurationScore(route.getTotalDurationMinutes());
    score += durationScore * 0.25;

    // Фактор 3: Количество пересадок (чем меньше, тем выше score)
    const transfersScore = this.calculateTransfersScore(route.getTransfersCount());
    score += transfersScore * 0.2;

    // Фактор 4: Риск (чем ниже риск, тем выше score)
    const riskScore = this.calculateRiskScore(route.riskScore || 0);
    score += riskScore * 0.15;

    // Фактор 5: Соответствие предпочтениям пользователя
    if (userPreferences) {
      const preferenceScore = this.calculatePreferenceScore(route, userPreferences);
      score += preferenceScore * 0.1;
    }

    // Фактор 6: История поездок (бонус за знакомые маршруты)
    if (userTravelHistory && userTravelHistory.length > 0) {
      const historyScore = this.calculateHistoryScore(route, userTravelHistory);
      score += historyScore * 0.05;
    }

    // Нормализация в диапазон 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Расчет score по цене
   */
  private calculatePriceScore(price: number): number {
    // Нормализация: предполагаем, что средняя цена ~30000 руб
    // Чем дешевле относительно средней, тем выше score
    const averagePrice = 30000;
    const ratio = price / averagePrice;

    if (ratio <= 0.5) return 20; // Очень дешево
    if (ratio <= 0.7) return 15; // Дешево
    if (ratio <= 1.0) return 10; // Средняя цена
    if (ratio <= 1.5) return 5; // Дорого
    return 0; // Очень дорого
  }

  /**
   * Расчет score по длительности
   */
  private calculateDurationScore(durationMinutes: number): number {
    // Нормализация: предполагаем, что средняя длительность ~24 часа (1440 минут)
    const averageDuration = 1440;
    const ratio = durationMinutes / averageDuration;

    if (ratio <= 0.5) return 20; // Очень быстро
    if (ratio <= 0.7) return 15; // Быстро
    if (ratio <= 1.0) return 10; // Средняя длительность
    if (ratio <= 1.5) return 5; // Долго
    return 0; // Очень долго
  }

  /**
   * Расчет score по пересадкам
   */
  private calculateTransfersScore(transfers: number): number {
    if (transfers === 0) return 20; // Прямой маршрут
    if (transfers === 1) return 15; // Одна пересадка
    if (transfers === 2) return 10; // Две пересадки
    if (transfers === 3) return 5; // Три пересадки
    return 0; // Много пересадок
  }

  /**
   * Расчет score по риску
   */
  private calculateRiskScore(riskScore: number): number {
    // riskScore в диапазоне 0-1, чем меньше, тем лучше
    return (1 - riskScore) * 20;
  }

  /**
   * Расчет score по соответствию предпочтениям
   */
  private calculatePreferenceScore(route: Route, preferences: UserPreferences): number {
    let score = 0;

    const duration = route.getTotalDurationMinutes();
    const price = route.totalPrice.amount;
    const transfers = route.getTransfersCount();
    const risk = route.riskScore || 0;

    switch (preferences.routePreference) {
      case 'fastest':
        // Приоритет скорости
        if (duration < 1440) score += 10; // Меньше суток
        if (duration < 720) score += 5; // Меньше 12 часов
        break;

      case 'cheapest':
        // Приоритет цены
        if (price < 20000) score += 10; // Дешевле 20к
        if (price < 15000) score += 5; // Дешевле 15к
        break;

      case 'most_reliable':
        // Приоритет надежности (низкий риск, мало пересадок)
        if (risk < 0.15) score += 10; // Низкий риск
        if (transfers <= 1) score += 5; // Мало пересадок
        break;
    }

    // Учет tolerance к риску
    if (preferences.riskTolerance === 'low' && risk < 0.1) {
      score += 5;
    } else if (preferences.riskTolerance === 'high' && risk > 0.2) {
      score += 5; // Высокий риск может быть приемлем для некоторых
    }

    return score;
  }

  /**
   * Расчет score по истории поездок
   */
  private calculateHistoryScore(route: Route, travelHistory: string[]): number {
    // Бонус за знакомые города в маршруте
    const routeCities = [
      route.fromCity,
      route.toCity,
      ...route.segments.map(s => s.fromCity),
      ...route.segments.map(s => s.toCity),
    ];

    const familiarCities = routeCities.filter(city =>
      travelHistory.some(history => history.toLowerCase().includes(city.toLowerCase()))
    );

    if (familiarCities.length > 0) {
      return Math.min(10, familiarCities.length * 3);
    }

    return 0;
  }

  /**
   * Генерация объяснения рекомендации
   */
  private generateExplanation(
    route: Route,
    score: number,
    userPreferences?: UserPreferences
  ): string {
    const parts: string[] = [];

    if (score >= 80) {
      parts.push('Отличный выбор!');
    } else if (score >= 70) {
      parts.push('Хороший вариант');
    } else if (score >= 60) {
      parts.push('Приемлемый маршрут');
    } else {
      parts.push('Маршрут имеет некоторые ограничения');
    }

    // Добавление деталей
    if (route.getTransfersCount() === 0) {
      parts.push('прямой маршрут без пересадок');
    } else {
      parts.push(`с ${route.getTransfersCount()} пересадкой(ами)`);
    }

    const durationHours = Math.round(route.getTotalDurationMinutes() / 60);
    parts.push(`длительность ${durationHours} часов`);

    if (userPreferences) {
      switch (userPreferences.routePreference) {
        case 'fastest':
          parts.push('оптимален по скорости');
          break;
        case 'cheapest':
          parts.push('оптимален по цене');
          break;
        case 'most_reliable':
          parts.push('надежный вариант');
          break;
      }
    }

    return parts.join(', ') + '.';
  }

  /**
   * Генерация списка причин рекомендации
   */
  private generateReasons(route: Route, userPreferences?: UserPreferences): string[] {
    const reasons: string[] = [];

    // Причина 1: Цена
    if (route.totalPrice.amount < 20000) {
      reasons.push('Привлекательная цена');
    }

    // Причина 2: Пересадки
    if (route.getTransfersCount() === 0) {
      reasons.push('Прямой маршрут без пересадок');
    } else if (route.getTransfersCount() <= 1) {
      reasons.push('Минимальное количество пересадок');
    }

    // Причина 3: Риск
    if (route.riskScore !== undefined && route.riskScore < 0.15) {
      reasons.push('Низкий риск задержек');
    }

    // Причина 4: Длительность
    const durationHours = route.getTotalDurationMinutes() / 60;
    if (durationHours < 24) {
      reasons.push('Быстрое время в пути');
    }

    // Причина 5: Предпочтения
    if (userPreferences) {
      switch (userPreferences.routePreference) {
        case 'fastest':
          reasons.push('Соответствует вашим предпочтениям по скорости');
          break;
        case 'cheapest':
          reasons.push('Соответствует вашим предпочтениям по цене');
          break;
        case 'most_reliable':
          reasons.push('Соответствует вашим предпочтениям по надежности');
          break;
      }
    }

    // Если причин нет, добавляем общую
    if (reasons.length === 0) {
      reasons.push('Доступный вариант маршрута');
    }

    return reasons;
  }

  /**
   * Извлечение предпочтений в строковый формат
   */
  private extractPreferences(preferences: UserPreferences): string[] {
    const prefs: string[] = [];

    prefs.push(`Предпочтение: ${preferences.routePreference}`);
    prefs.push(`Толерантность к риску: ${preferences.riskTolerance}`);

    if (preferences.maxTransfers !== undefined) {
      prefs.push(`Максимум пересадок: ${preferences.maxTransfers}`);
    }

    if (preferences.maxPrice !== undefined) {
      prefs.push(`Максимальная цена: ${preferences.maxPrice} руб`);
    }

    return prefs;
  }
}

