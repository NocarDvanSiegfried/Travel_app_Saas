/**
 * Фактор риска от задержек
 * 
 * Учитывает исторические данные о задержках рейсов.
 * Высокая частота задержек и большая средняя задержка увеличивают риск.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от задержек
 */
export class DelayRiskFactor extends BaseRiskFactor {
  readonly name = 'delays';
  readonly priority = 4;
  
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
    const historicalDelays90 = (data.get('historicalDelays90') as number) ?? 0;
    const delayFrequency = (data.get('delayFrequency') as number) ?? 0;
    
    const avgDelay = historicalDelays90 / 60;
    let delayRisk = 0;
    
    if (avgDelay < 15) {
      delayRisk = 0;
    } else if (avgDelay < 30) {
      delayRisk = 0.5;
    } else if (avgDelay < 60) {
      delayRisk = 1.0;
    } else {
      delayRisk = 1.5 + (avgDelay - 60) / 60;
    }
    
    const frequencyRisk = delayFrequency * 2;
    const totalRisk = Math.min(2, delayRisk + frequencyRisk);
    
    const weight = 1.5;
    const description = `Средняя задержка: ${Math.round(historicalDelays90)} мин, частота: ${(delayFrequency * 100).toFixed(1)}%`;
    
    return this.createResult(totalRisk, weight, description, {
      averageDelay: historicalDelays90,
      delayFrequency,
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
    _segment: IRouteSegment,
    _context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const historicalDelay = (data.get('historicalDelay') as number) ?? 0;
    const delayFrequency = (data.get('delayFrequency') as number) ?? 0;
    
    const avgDelay = historicalDelay / 60;
    let delayRisk = 0;
    
    if (avgDelay < 15) {
      delayRisk = 0;
    } else if (avgDelay < 30) {
      delayRisk = 0.5;
    } else if (avgDelay < 60) {
      delayRisk = 1.0;
    } else {
      delayRisk = 1.5 + (avgDelay - 60) / 60;
    }
    
    const frequencyRisk = delayFrequency * 2;
    const totalRisk = Math.min(2, delayRisk + frequencyRisk);
    
    const weight = 1.5;
    const description = `Средняя задержка: ${Math.round(historicalDelay)} мин, частота: ${(delayFrequency * 100).toFixed(1)}%`;
    
    return this.createResult(totalRisk, weight, description, {
      averageDelay: historicalDelay,
      delayFrequency,
    });
  }
  
  /**
   * Проверить, применим ли фактор к типу транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns true, если фактор применим
   */
  isApplicable(transportType: TransportType): boolean {
    return [TransportType.AIRPLANE, TransportType.TRAIN, TransportType.BUS].includes(transportType);
  }
}

