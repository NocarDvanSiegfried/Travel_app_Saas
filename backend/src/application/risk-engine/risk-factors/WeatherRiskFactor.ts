/**
 * Фактор риска от погоды
 * 
 * Учитывает погодные условия для разных типов транспорта:
 * - Авиа: видимость, ветер, грозы, туман
 * - ЖД: снег, гололёд, сильный мороз
 * - Автобус/Авто: дождь, туман, гололёд
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от погоды
 */
export class WeatherRiskFactor extends BaseRiskFactor {
  readonly name = 'weather';
  readonly priority = 1;
  
  /**
   * Вычислить вклад фактора для маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @param data - Данные от провайдеров
   * @returns Promise с результатом оценки фактора
   */
  async calculateForRoute(
    _route: IBuiltRoute,
    _context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const weatherData = data.get('weather') as {
      riskLevel: number;
      conditions: string[];
    } | undefined;
    
    if (!weatherData) {
      return this.createResult(0, 1.5, 'Данные о погоде недоступны', {});
    }
    
    const riskValue = weatherData.riskLevel * 2;
    const weight = 1.5;
    const conditionsStr = weatherData.conditions.length > 0
      ? weatherData.conditions.join(', ')
      : 'Нормальные условия';
    const description = `Погода: ${conditionsStr}`;
    
    return this.createResult(riskValue, weight, description, {
      riskLevel: weatherData.riskLevel,
      conditions: weatherData.conditions,
    });
  }
  
  /**
   * Вычислить вклад фактора для сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @param data - Данные от провайдеров
   * @returns Promise с результатом оценки фактора
   */
  async calculateForSegment(
    segment: IRouteSegment,
    _context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const weatherData = data.get('weather') as {
      riskLevel: number;
      conditions: string[];
    } | undefined;
    
    if (!weatherData) {
      return this.createResult(0, 1.5, 'Данные о погоде недоступны', {});
    }
    
    const transportType = segment.transportType;
    const adjustedRisk = this.adjustRiskForTransportType(
      weatherData.riskLevel,
      transportType
    );
    
    const riskValue = adjustedRisk * 2;
    const weight = 1.5;
    const conditionsStr = weatherData.conditions.length > 0
      ? weatherData.conditions.join(', ')
      : 'Нормальные условия';
    const description = `Погода: ${conditionsStr}`;
    
    return this.createResult(riskValue, weight, description, {
      riskLevel: weatherData.riskLevel,
      adjustedRisk,
      conditions: weatherData.conditions,
      transportType,
    });
  }
  
  /**
   * Проверить, применим ли фактор к типу транспорта
   * 
   * @param _transportType - Тип транспорта
   * @returns true, если фактор применим
   */
  isApplicable(_transportType: TransportType): boolean {
    return true;
  }
  
  /**
   * Скорректировать риск для типа транспорта
   * 
   * @param baseRisk - Базовый риск
   * @param transportType - Тип транспорта
   * @returns Скорректированный риск
   */
  private adjustRiskForTransportType(
    baseRisk: number,
    transportType: TransportType
  ): number {
    if (transportType === TransportType.AIRPLANE) {
      return baseRisk * 1.2;
    }
    if (transportType === TransportType.TRAIN) {
      return baseRisk * 0.8;
    }
    if (transportType === TransportType.BUS || transportType === TransportType.TAXI) {
      return baseRisk * 0.9;
    }
    return baseRisk;
  }
}

