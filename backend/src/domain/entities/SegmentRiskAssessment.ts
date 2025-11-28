/**
 * Оценка риска сегмента маршрута
 */

import type { IRiskScore } from './RiskAssessment';
import type { IRouteSegment } from './RouteSegment';

/**
 * Оценка риска сегмента маршрута
 */
export interface ISegmentRiskAssessment {
  /**
   * ID сегмента
   */
  segmentId: string;
  
  /**
   * Оценка риска
   */
  riskScore: IRiskScore;
  
  /**
   * Сегмент, для которого выполнена оценка
   */
  segment: IRouteSegment;
  
  /**
   * Дополнительные факторы риска для сегмента
   */
  factors?: {
    /**
     * Риск от погоды
     */
    weather?: number;
    
    /**
     * Риск от задержек
     */
    delays?: number;
    
    /**
     * Риск от отмен
     */
    cancellations?: number;
    
    /**
     * Риск от инфраструктуры
     */
    infrastructure?: number;
    
    /**
     * Риск от загруженности
     */
    occupancy?: number;
  };
  
  /**
   * Рекомендации для сегмента
   */
  recommendations?: string[];
}


