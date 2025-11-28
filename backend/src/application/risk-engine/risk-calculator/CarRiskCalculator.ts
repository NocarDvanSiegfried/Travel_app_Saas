/**
 * Калькулятор риска для автомобилей
 * 
 * Учитывает специфичные факторы риска для автомобильного транспорта:
 * - Погодные условия (дождь, снег, гололёд, туман)
 * - Состояние дорог
 * - Пробки
 * - Зимние дороги
 */

import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
import type {
  IRiskCalculator,
  IRiskCalculatorConfig,
} from '../../../domain/interfaces/risk-engine/IRiskCalculator';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { UnifiedRiskCalculator } from './UnifiedRiskCalculator';

/**
 * Веса факторов для автомобилей
 */
const CAR_FACTOR_WEIGHTS: Record<string, number> = {
  weather: 2.0,
  delays: 1.0,
  cancellations: 0.5,
  transfers: 0.3,
  infrastructure: 1.5,
  seasonality: 0.6,
  occupancy: 0.2,
  scheduleRegularity: 0.4,
};

/**
 * Калькулятор риска для автомобилей
 */
export class CarRiskCalculator implements IRiskCalculator {
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
   * Скорректировать веса факторов для автомобилей
   * 
   * @param factorResults - Результаты факторов
   * @returns Скорректированные результаты
   */
  private adjustFactorWeights(factorResults: IRiskFactorResult[]): IRiskFactorResult[] {
    return factorResults.map((result) => {
      const adjustedWeight = CAR_FACTOR_WEIGHTS[result.description] ?? result.weight;
      return {
        ...result,
        weight: adjustedWeight,
      };
    });
  }
}


