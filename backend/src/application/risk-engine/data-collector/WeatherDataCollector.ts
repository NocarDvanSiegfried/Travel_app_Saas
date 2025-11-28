/**
 * Сборщик данных о погоде
 * 
 * Использует WeatherDataProvider для получения данных о погоде из внешних API.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IWeatherData } from '../../../domain/entities/RiskAssessment';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { WeatherDataProvider } from '../data-providers/WeatherDataProvider';
import { RiskContext } from '../base/RiskContext';

/**
 * Сборщик данных о погоде
 */
export class WeatherDataCollector {
  private readonly weatherProvider: WeatherDataProvider;
  
  constructor() {
    this.weatherProvider = new WeatherDataProvider();
  }
  
  /**
   * Получить данные о погоде для маршрута
   * 
   * @param route - Маршрут для оценки
   * @returns Promise с данными о погоде
   */
  async collectWeatherData(route: IBuiltRoute): Promise<IWeatherData> {
    try {
      const context = new RiskContext(route.date);
      const weatherData = await this.weatherProvider.getDataForRoute(route, context);
      
      return {
        riskLevel: weatherData.riskLevel,
        conditions: weatherData.conditions || [],
      };
    } catch (error) {
      console.error('[WeatherDataCollector] Error collecting weather data:', error);
      return {
        riskLevel: 0.2,
        conditions: [],
      };
    }
  }
  
  /**
   * Вычислить риск погоды для сегмента
   * 
   * @param city - Название города
   * @param date - Дата
   * @returns Данные о риске погоды
   */
  async calculateWeatherRisk(
    city: string,
    date: string
  ): Promise<IWeatherData> {
    try {
      const context = new RiskContext(date);
      const segment: IRouteSegment = {
        segmentId: `temp-${city}-${date}`,
        fromStopId: `stop-${city}-from`,
        toStopId: `stop-${city}-to`,
        routeId: `route-temp-${city}`,
        transportType: TransportType.AIRPLANE, // Используем валидный тип транспорта вместо 'unknown'
      };
      
      const weatherData = await this.weatherProvider.getDataForSegment(segment, context);
      
      return {
        riskLevel: weatherData.riskLevel,
        conditions: weatherData.conditions || [],
      };
    } catch (error) {
      console.error('[WeatherDataCollector] Error calculating weather risk:', error);
      return {
        riskLevel: 0.2,
        conditions: [],
      };
    }
  }
}

