/**
 * Сборщик данных о погоде (заглушка для будущей интеграции)
 */

import { IWeatherData } from '../../../domain/entities/RiskAssessment';

export class WeatherDataCollector {
  /**
   * Получить данные о погоде для маршрута
   * Пока возвращает заглушку
   */
  async collectWeatherData(
    _route: {
      fromCity: string;
      toCity: string;
      date: string;
      segments: Array<{
        departureTime: string;
        arrivalTime: string;
      }>;
    }
  ): Promise<IWeatherData> {
    return {
      riskLevel: 0.2,
      conditions: [],
    };
  }

  /**
   * Вычислить риск погоды для сегмента
   */
  calculateWeatherRisk(
    _city: string,
    _date: string
  ): { riskLevel: number; conditions?: string[] } {
    return {
      riskLevel: 0.2,
      conditions: [],
    };
  }
}

