/**
 * Фактор риска от отмен
 * 
 * Учитывает исторические данные об отменах рейсов.
 * Высокий процент отмен увеличивает риск.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от отмен
 */
export class CancellationRiskFactor extends BaseRiskFactor {
  readonly name = 'cancellations';
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
    _route: IBuiltRoute,
    _context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const cancellationRate = (data.get('cancellationRate90') as number) ?? 0;
    
    let riskValue = 0;
    
    if (cancellationRate < 0.05) {
      riskValue = 0;
    } else if (cancellationRate < 0.1) {
      riskValue = 0.5;
    } else if (cancellationRate < 0.2) {
      riskValue = 1.0;
    } else {
      riskValue = 1.5 + cancellationRate * 5;
    }
    
    const weight = 2.0;
    const description = `Процент отмен: ${(cancellationRate * 100).toFixed(1)}%`;
    
    return this.createResult(riskValue, weight, description, {
      cancellationRate,
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
    const cancellationRate = (data.get('cancellationRate') as number) ?? 0;
    
    let riskValue = 0;
    
    if (cancellationRate < 0.05) {
      riskValue = 0;
    } else if (cancellationRate < 0.1) {
      riskValue = 0.5;
    } else if (cancellationRate < 0.2) {
      riskValue = 1.0;
    } else {
      riskValue = 1.5 + cancellationRate * 5;
    }
    
    const weight = 2.0;
    const description = `Процент отмен: ${(cancellationRate * 100).toFixed(1)}%`;
    
    return this.createResult(riskValue, weight, description, {
      cancellationRate,
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

