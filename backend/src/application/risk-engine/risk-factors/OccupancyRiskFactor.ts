/**
 * Фактор риска от загруженности
 * 
 * Учитывает загруженность транспорта и доступность мест.
 * Высокая загруженность увеличивает риск отсутствия мест.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Фактор риска от загруженности
 */
export class OccupancyRiskFactor extends BaseRiskFactor {
  readonly name = 'occupancy';
  readonly priority = 6;
  
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
    const averageOccupancy = (data.get('averageOccupancy') as number) ?? 0;
    const highOccupancySegments = (data.get('highOccupancySegments') as number) ?? 0;
    const lowAvailabilitySegments = (data.get('lowAvailabilitySegments') as number) ?? 0;
    
    let riskValue = 0;
    
    if (averageOccupancy > 0.9) {
      riskValue += 1.0;
    } else if (averageOccupancy > 0.8) {
      riskValue += 0.5;
    }
    
    riskValue += highOccupancySegments * 0.3;
    riskValue += lowAvailabilitySegments * 0.5;
    
    const totalRisk = Math.min(2, riskValue);
    
    const weight = 0.8;
    const description = `Средняя загруженность: ${(averageOccupancy * 100).toFixed(0)}%`;
    
    return this.createResult(totalRisk, weight, description, {
      averageOccupancy,
      highOccupancySegments,
      lowAvailabilitySegments,
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
    const occupancy = (data.get('occupancy') as number) ?? 0;
    const availableSeats = (data.get('availableSeats') as number) ?? undefined;
    
    let riskValue = 0;
    
    if (occupancy > 0.9) {
      riskValue = 1.0;
    } else if (occupancy > 0.8) {
      riskValue = 0.5;
    }
    
    if (availableSeats !== undefined && availableSeats < 10) {
      riskValue += 0.5;
    }
    
    const totalRisk = Math.min(2, riskValue);
    
    const weight = 0.8;
    const description = `Загруженность: ${(occupancy * 100).toFixed(0)}%`;
    
    return this.createResult(totalRisk, weight, description, {
      occupancy,
      availableSeats,
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

