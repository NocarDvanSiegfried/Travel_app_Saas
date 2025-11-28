/**
 * Use Case для оценки риска сегмента маршрута
 */

import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import type { ISegmentRiskAssessment } from '../../../domain/entities/SegmentRiskAssessment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import { SegmentRiskService } from '../risk-service/SegmentRiskService';
import { RiskContext } from '../base/RiskContext';

/**
 * Use Case для оценки риска сегмента
 */
export class AssessSegmentRiskUseCase {
  private segmentRiskService: SegmentRiskService | null = null;
  
  constructor() {
    try {
      this.segmentRiskService = new SegmentRiskService();
    } catch (error) {
      // Сервис не инициализирован, будет использоваться fallback
    }
  }
  
  /**
   * Выполнить оценку риска сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска (опционально)
   * @returns Promise с оценкой риска сегмента
   */
  async execute(
    segment: IRouteSegment,
    context?: IRiskDataContext
  ): Promise<ISegmentRiskAssessment> {
    const defaultContext = new RiskContext(
      new Date().toISOString().split('T')[0]
    );
    const riskContext = context || defaultContext;
    
    if (!this.segmentRiskService) {
      return this.createDefaultAssessment(segment, riskContext);
    }
    
    try {
      const riskScore = await this.segmentRiskService.assessSegmentRisk(
        segment,
        riskContext
      );
      
      return {
        segmentId: segment.segmentId,
        riskScore,
        segment,
        factors: {},
        recommendations: this.generateRecommendations(riskScore.value, segment),
      };
    } catch (error) {
      return this.createDefaultAssessment(segment, riskContext);
    }
  }
  
  /**
   * Создать дефолтную оценку риска
   * 
   * @param segment - Сегмент
   * @param context - Контекст
   * @returns Дефолтная оценка риска
   */
  private createDefaultAssessment(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): ISegmentRiskAssessment {
    return {
      segmentId: segment.segmentId,
      riskScore: {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск (оценка по умолчанию)',
      },
      segment,
      factors: {},
      recommendations: ['Оценка риска для сегмента находится в разработке'],
    };
  }
  
  /**
   * Сгенерировать рекомендации на основе оценки риска
   * 
   * @param riskScore - Оценка риска
   * @param segment - Сегмент
   * @returns Массив рекомендаций
   */
  private generateRecommendations(
    riskScore: number,
    segment: IRouteSegment
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskScore >= 7) {
      recommendations.push('Высокий риск задержек на данном сегменте');
    }
    
    if (segment.transportType === TransportType.FERRY) {
      recommendations.push('Водный транспорт может быть задержан из-за погоды');
    }
    
    if (segment.transportType === TransportType.WINTER_ROAD) {
      recommendations.push('Зимняя дорога - возможны сложные условия');
    }
    
    return recommendations;
  }
}

