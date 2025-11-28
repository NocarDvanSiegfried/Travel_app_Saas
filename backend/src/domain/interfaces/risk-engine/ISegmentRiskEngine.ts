/**
 * Интерфейс движка оценки риска сегментов
 * 
 * Определяет контракт для оценки риска отдельных сегментов маршрута.
 */

import type { IRouteSegment } from '../../entities/RouteSegment';
import type { IRiskScore } from '../../entities/RiskAssessment';
import type { IRiskDataContext } from './IRiskDataProvider';

/**
 * Интерфейс движка оценки риска сегментов
 */
export interface ISegmentRiskEngine {
  /**
   * Оценить риск для сегмента маршрута
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с оценкой риска сегмента
   */
  assessSegmentRisk(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<IRiskScore>;
  
  /**
   * Оценить риск для нескольких сегментов параллельно
   * 
   * @param segments - Сегменты для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с массивом оценок риска
   */
  assessSegmentsRisk(
    segments: IRouteSegment[],
    context: IRiskDataContext
  ): Promise<IRiskScore[]>;
}

