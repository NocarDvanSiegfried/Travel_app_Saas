/**
 * Калькулятор риска для поездов
 * 
 * Учитывает специфичные факторы риска для железнодорожного транспорта:
 * - Погодные условия (снег, гололёд)
 * - Состояние путей
 * - Сезонные ограничения
 * - Время стыковки
 */

import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
import type {
  IRiskCalculator,
  IRiskCalculatorConfig,
} from '../../../domain/interfaces/risk-engine/IRiskCalculator';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { UnifiedRiskCalculator } from './UnifiedRiskCalculator';

/**
 * Веса факторов для поездов
 */
const TRAIN_FACTOR_WEIGHTS: Record<string, number> = {
  weather: 1.5,
  delays: 1.0,
  cancellations: 1.5,
  transfers: 0.8,
  infrastructure: 1.0,
  seasonality: 0.5,
  occupancy: 0.6,
  scheduleRegularity: 0.9,
};

/**
 * Калькулятор риска для поездов
 */
export class TrainRiskCalculator implements IRiskCalculator {
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
   * Скорректировать веса факторов для поездов
   * 
   * @param factorResults - Результаты факторов
   * @returns Скорректированные результаты
   */
  private adjustFactorWeights(factorResults: IRiskFactorResult[]): IRiskFactorResult[] {
    return factorResults.map((result) => {
      const adjustedWeight = TRAIN_FACTOR_WEIGHTS[result.description] ?? result.weight;
      return {
        ...result,
        weight: adjustedWeight,
      };
    });
  }
}


