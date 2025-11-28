/**
 * Движок оценки риска сегментов
 * 
 * Реализует ISegmentRiskEngine для оценки риска отдельных сегментов маршрута.
 */

import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import type { ISegmentRiskEngine } from '../../../domain/interfaces/risk-engine/ISegmentRiskEngine';
import { SegmentRiskService } from '../risk-service/SegmentRiskService';

/**
 * Движок оценки риска сегментов
 */
export class SegmentRiskEngine implements ISegmentRiskEngine {
  private readonly segmentRiskService: SegmentRiskService;
  
  constructor() {
    this.segmentRiskService = new SegmentRiskService();
  }
  
  /**
   * Оценить риск для сегмента маршрута
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с оценкой риска сегмента
   */
  async assessSegmentRisk(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<IRiskScore> {
    return this.segmentRiskService.assessSegmentRisk(segment, context);
  }
  
  /**
   * Оценить риск для нескольких сегментов параллельно
   * 
   * @param segments - Сегменты для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с массивом оценок риска
   */
  async assessSegmentsRisk(
    segments: IRouteSegment[],
    context: IRiskDataContext
  ): Promise<IRiskScore[]> {
    return this.segmentRiskService.assessSegmentsRisk(segments, context);
  }
}

