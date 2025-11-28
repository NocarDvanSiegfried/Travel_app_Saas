/**
 * Фактор риска от пересадок
 * 
 * Учитывает количество пересадок в маршруте.
 * Больше пересадок = выше риск задержек и пропуска стыковок.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от пересадок
 */
export class TransferRiskFactor extends BaseRiskFactor {
  readonly name = 'transfers';
  readonly priority = 5;
  
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
    _data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const transferCount = route.transferCount ?? 0;
    let riskValue = 0;
    
    if (transferCount === 0) {
      riskValue = 0;
    } else if (transferCount === 1) {
      riskValue = 0.5;
    } else if (transferCount === 2) {
      riskValue = 1.0;
    } else {
      riskValue = 1.5 + (transferCount - 2) * 0.5;
    }
    
    const weight = 1.0;
    const description = `Количество пересадок: ${transferCount}`;
    
    return this.createResult(riskValue, weight, description, {
      transferCount,
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
    const transferTime = data.get('transferTime') as number | undefined;
    
    if (!transferTime || transferTime <= 0) {
      return this.createResult(0, 1.0, 'Нет пересадки', {});
    }
    
    let riskValue = 0;
    const minutes = transferTime;
    
    if (minutes < 30) {
      riskValue = 1.5;
    } else if (minutes < 60) {
      riskValue = 1.0;
    } else if (minutes < 90) {
      riskValue = 0.5;
    } else {
      riskValue = 0;
    }
    
    const weight = 1.0;
    const description = `Время стыковки: ${minutes} мин`;
    
    return this.createResult(riskValue, weight, description, {
      transferTime: minutes,
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
}

