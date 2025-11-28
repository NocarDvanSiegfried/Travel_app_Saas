/**
 * Фактор риска от сезонности
 * 
 * Учитывает сезонные факторы: месяц, день недели, туристический сезон.
 * Высокий сезон увеличивает загруженность и риск.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от сезонности
 */
export class SeasonalityRiskFactor extends BaseRiskFactor {
  readonly name = 'seasonality';
  readonly priority = 8;
  
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
    const seasonFactor = (data.get('seasonFactor') as number) ?? this.calculateSeasonFactor(route.date);
    
    let riskValue = 0;
    
    if (seasonFactor > 1.15) {
      riskValue = 0.5;
    } else if (seasonFactor > 1.1) {
      riskValue = 0.3;
    }
    
    const weight = 0.3;
    const description = `Сезонный коэффициент: ${seasonFactor.toFixed(2)}`;
    
    return this.createResult(riskValue, weight, description, {
      seasonFactor,
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
    context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const seasonFactor = (data.get('seasonFactor') as number) ?? this.calculateSeasonFactor(context.date);
    
    let riskValue = 0;
    
    if (seasonFactor > 1.15) {
      riskValue = 0.5;
    } else if (seasonFactor > 1.1) {
      riskValue = 0.3;
    }
    
    const weight = 0.3;
    const description = `Сезонный коэффициент: ${seasonFactor.toFixed(2)}`;
    
    return this.createResult(riskValue, weight, description, {
      seasonFactor,
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
   * Вычислить сезонный коэффициент для даты
   * 
   * @param date - Дата в формате ISO string
   * @returns Сезонный коэффициент
   */
  private calculateSeasonFactor(date: string): number {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const dayOfWeek = d.getDay();
    
    let seasonFactor = 1.0;
    
    if (month >= 12 || month <= 2) {
      seasonFactor = 1.2;
    } else if (month >= 6 && month <= 8) {
      seasonFactor = 1.1;
    }
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      seasonFactor *= 1.1;
    }
    
    return seasonFactor;
  }
}

