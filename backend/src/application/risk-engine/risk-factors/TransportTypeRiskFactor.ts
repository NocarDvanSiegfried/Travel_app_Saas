/**
 * Фактор риска от типа транспорта
 * 
 * Учитывает специфичные риски для разных типов транспорта:
 * - Речной/паромный транспорт - высокий риск
 * - Смешанные типы - средний риск
 * - Автобус - небольшой риск
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { BaseRiskFactor } from '../base/BaseRiskFactor';

/**
 * Веса риска для разных типов транспорта
 */
const TRANSPORT_TYPE_WEIGHTS: Record<TransportType, number> = {
  [TransportType.AIRPLANE]: 0.0,
  [TransportType.TRAIN]: 0.0,
  [TransportType.BUS]: 0.3,
  [TransportType.FERRY]: 1.5,
  [TransportType.TAXI]: 0.2,
  [TransportType.WINTER_ROAD]: 1.0,
  [TransportType.UNKNOWN]: 0.5,
};

/**
 * Фактор риска от типа транспорта
 */
export class TransportTypeRiskFactor extends BaseRiskFactor {
  readonly name = 'transportType';
  readonly priority = 2;
  
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
    const transportTypes = route.transportTypes ?? [];
    const hasFerry = transportTypes.includes(TransportType.FERRY);
    const hasRiverTransport = transportTypes.some(
      (t) => t === TransportType.FERRY || t.toString().toLowerCase().includes('river')
    );
    const hasMixedTransport = transportTypes.length > 1;
    
    let riskValue = 0;
    
    if (hasFerry || hasRiverTransport) {
      riskValue += 1.5;
    }
    
    if (hasMixedTransport) {
      riskValue += 0.5;
    }
    
    for (const transportType of transportTypes) {
      const typeRisk = TRANSPORT_TYPE_WEIGHTS[transportType] ?? 0;
      riskValue += typeRisk;
    }
    
    const weight = 1.0;
    const transportTypesStr = transportTypes.join(', ');
    const description = `Типы транспорта: ${transportTypesStr}`;
    
    return this.createResult(riskValue, weight, description, {
      transportTypes,
      hasFerry,
      hasRiverTransport,
      hasMixedTransport,
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
    _data: Map<string, unknown>
  ): Promise<IRiskFactorResult> {
    const transportType = segment.transportType;
    const typeRisk = TRANSPORT_TYPE_WEIGHTS[transportType] ?? 0;
    
    const weight = 1.0;
    const description = `Тип транспорта: ${transportType}`;
    
    return this.createResult(typeRisk, weight, description, {
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
}

