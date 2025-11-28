/**
 * Фактор риска от дорожных условий
 * 
 * Учитывает состояние дорог, пробки и другие факторы для дорожного транспорта:
 * - Автобус: высокий вес фактора
 * - Такси: средний вес фактора
 * - Зимние дороги: очень высокий вес фактора
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от дорожных условий
 */
export class RoadConditionsRiskFactor extends BaseRiskFactor {
  readonly name = 'roadConditions';
  readonly priority = 3;
  
  /**
   * Вычислить вклад фактора для маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @param data - Данные от провайдеров
   * @returns Promise с результатом оценки фактора
   */
  async calculateForRoute(
    route: IBuiltRoute,
    _context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const roadConditionsData = data.get('roadConditions') as {
      riskLevel: number;
      trafficCoefficient: number;
      conditions: string[];
    } | undefined;
    
    if (!roadConditionsData) {
      return this.createResult(0, 1.0, 'Данные о дорожных условиях недоступны', {});
    }
    
    const hasRoadTransport = route.transportTypes?.some((t) =>
      [TransportType.BUS, TransportType.TAXI, TransportType.WINTER_ROAD].includes(t)
    ) ?? false;
    
    if (!hasRoadTransport) {
      return this.createResult(0, 1.0, 'Маршрут не содержит дорожного транспорта', {});
    }
    
    const riskValue = roadConditionsData.riskLevel * 1.5;
    const weight = 1.0;
    const conditionsStr = roadConditionsData.conditions.length > 0
      ? roadConditionsData.conditions.join(', ')
      : 'Нормальные условия';
    const description = `Дорожные условия: ${conditionsStr}`;
    
    return this.createResult(riskValue, weight, description, {
      riskLevel: roadConditionsData.riskLevel,
      trafficCoefficient: roadConditionsData.trafficCoefficient,
      conditions: roadConditionsData.conditions,
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
    const roadConditionsData = data.get('roadConditions') as {
      riskLevel: number;
      trafficCoefficient: number;
      conditions: string[];
    } | undefined;
    
    if (!roadConditionsData) {
      return this.createResult(0, 1.0, 'Данные о дорожных условиях недоступны', {});
    }
    
    const transportType = segment.transportType;
    if (!this.isRoadTransport(transportType)) {
      return this.createResult(0, 1.0, 'Сегмент не является дорожным транспортом', {});
    }
    
    const adjustedRisk = this.adjustRiskForTransportType(
      roadConditionsData.riskLevel,
      transportType
    );
    
    const riskValue = adjustedRisk * 1.5;
    const weight = this.getWeightForTransportType(transportType);
    const conditionsStr = roadConditionsData.conditions.length > 0
      ? roadConditionsData.conditions.join(', ')
      : 'Нормальные условия';
    const description = `Дорожные условия: ${conditionsStr}`;
    
    return this.createResult(riskValue, weight, description, {
      riskLevel: roadConditionsData.riskLevel,
      adjustedRisk,
      trafficCoefficient: roadConditionsData.trafficCoefficient,
      conditions: roadConditionsData.conditions,
      transportType,
    });
  }
  
  /**
   * Проверить, применим ли фактор к типу транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns true, если фактор применим
   */
  isApplicable(transportType: TransportType): boolean {
    return this.isRoadTransport(transportType);
  }

  /**
   * Проверить, является ли транспорт дорожным
   * 
   * @param transportType - Тип транспорта
   * @returns true, если транспорт дорожный
   */
  private isRoadTransport(transportType: TransportType): boolean {
    return [TransportType.BUS, TransportType.TAXI, TransportType.WINTER_ROAD].includes(transportType);
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
    if (transportType === TransportType.WINTER_ROAD) {
      return baseRisk * 1.5;
    }
    if (transportType === TransportType.BUS) {
      return baseRisk * 1.2;
    }
    if (transportType === TransportType.TAXI) {
      return baseRisk * 0.9;
    }
    return baseRisk;
  }

  /**
   * Получить вес фактора для типа транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns Вес фактора
   */
  private getWeightForTransportType(transportType: TransportType): number {
    if (transportType === TransportType.WINTER_ROAD) {
      return 1.5;
    }
    if (transportType === TransportType.BUS) {
      return 1.0;
    }
    if (transportType === TransportType.TAXI) {
      return 0.8;
    }
    return 1.0;
  }
}

