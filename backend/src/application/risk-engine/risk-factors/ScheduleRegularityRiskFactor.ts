/**
 * Фактор риска от регулярности расписания
 * 
 * Учитывает регулярность расписания рейсов.
 * Нерегулярное расписание увеличивает риск задержек.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от регулярности расписания
 */
export class ScheduleRegularityRiskFactor extends BaseRiskFactor {
  readonly name = 'scheduleRegularity';
  readonly priority = 7;
  
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
    const regularity = (data.get('scheduleRegularity') as number) ?? 1;
    
    let riskValue = 0;
    
    if (regularity > 0.8) {
      riskValue = 0;
    } else if (regularity > 0.6) {
      riskValue = 0.3;
    } else if (regularity > 0.4) {
      riskValue = 0.7;
    } else {
      riskValue = 1.0;
    }
    
    const weight = 0.7;
    const description = `Регулярность расписания: ${(regularity * 100).toFixed(0)}%`;
    
    return this.createResult(riskValue, weight, description, {
      scheduleRegularity: regularity,
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
    const regularity = (data.get('scheduleRegularity') as number) ?? 1;
    
    let riskValue = 0;
    
    if (regularity > 0.8) {
      riskValue = 0;
    } else if (regularity > 0.6) {
      riskValue = 0.3;
    } else if (regularity > 0.4) {
      riskValue = 0.7;
    } else {
      riskValue = 1.0;
    }
    
    const weight = 0.7;
    const description = `Регулярность расписания: ${(regularity * 100).toFixed(0)}%`;
    
    return this.createResult(riskValue, weight, description, {
      scheduleRegularity: regularity,
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

