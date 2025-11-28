/**
 * Калькулятор риска для авиаперелётов
 * 
 * Учитывает специфичные факторы риска для авиационного транспорта:
 * - Погодные условия (видимость, ветер, грозы)
 * - Состояние аэропортов
 * - Время стыковки
 * - Загруженность терминалов
 */

import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
import type {
  IRiskCalculator,
  IRiskCalculatorConfig,
} from '../../../domain/interfaces/risk-engine/IRiskCalculator';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { UnifiedRiskCalculator } from './UnifiedRiskCalculator';

/**
 * Веса факторов для авиаперелётов
 */
const AIRPLANE_FACTOR_WEIGHTS: Record<string, number> = {
  weather: 2.0,
  delays: 1.5,
  cancellations: 2.0,
  transfers: 1.0,
  infrastructure: 0.5,
  seasonality: 0.3,
  occupancy: 0.8,
  scheduleRegularity: 0.7,
};

/**
 * Калькулятор риска для авиаперелётов
 */
export class AirplaneRiskCalculator implements IRiskCalculator {
  private readonly baseCalculator: UnifiedRiskCalculator;
  
  constructor() {
    this.baseCalculator = new UnifiedRiskCalculator();
  }
  
  /**
   * Вычислить итоговую оценку риска на основе результатов факторов
   * 
   * @param factorResults - Результаты оценки факторов
   * @param config - Конфигурация калькулятора
   * @returns Promise с итоговой оценкой риска
   */
  async calculate(
    factorResults: IRiskFactorResult[],
    config?: Partial<IRiskCalculatorConfig>
  ): Promise<IRiskScore> {
    const adjustedResults = this.adjustFactorWeights(factorResults);
    return this.baseCalculator.calculate(adjustedResults, config);
  }
  
  /**
   * Нормализовать значение риска в диапазон [min, max]
   * 
   * @param value - Значение для нормализации
   * @param config - Конфигурация калькулятора
   * @returns Нормализованное значение
   */
  normalize(value: number, config?: Partial<IRiskCalculatorConfig>): number {
    return this.baseCalculator.normalize(value, config);
  }
  
  /**
   * Скорректировать веса факторов для авиаперелётов
   * 
   * @param factorResults - Результаты факторов
   * @returns Скорректированные результаты
   */
  private adjustFactorWeights(factorResults: IRiskFactorResult[]): IRiskFactorResult[] {
    return factorResults.map((result) => {
      const adjustedWeight = AIRPLANE_FACTOR_WEIGHTS[result.description] ?? result.weight;
      return {
        ...result,
        weight: adjustedWeight,
      };
    });
  }
}


