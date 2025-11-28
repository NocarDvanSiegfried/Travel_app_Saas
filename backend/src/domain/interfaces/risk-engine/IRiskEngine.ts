/**
 * Интерфейс движка оценки риска
 * 
 * Определяет единый интерфейс для оценки риска маршрутов и сегментов.
 */

import type { IBuiltRoute } from '../../entities/BuiltRoute';
import type { IRouteSegment } from '../../entities/RouteSegment';
import type { IRiskAssessment } from '../../entities/RiskAssessment';
import type { IRiskScore } from '../../entities/RiskAssessment';
import type { IRiskDataContext } from './IRiskDataProvider';

/**
 * Интерфейс движка оценки риска
 */
export interface IRiskEngine {
  /**
   * Оценить риск для сегмента маршрута
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с оценкой риска сегмента
   */
  getRiskScore(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<IRiskScore>;
  
  /**
   * Оценить риск для всего маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска (опционально)
   * @returns Promise с оценкой риска маршрута
   */
  getRiskScore(
    route: IBuiltRoute,
    context?: IRiskDataContext
  ): Promise<IRiskAssessment>;
}


