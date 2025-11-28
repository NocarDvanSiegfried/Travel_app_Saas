/**
 * Единый калькулятор риска для всех типов транспорта
 * 
 * Реализует общую логику вычисления риска на основе результатов факторов.
 * Обеспечивает единую шкалу оценки (1-10) для всех типов транспорта.
 */

import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import type {
  IRiskCalculator,
  IRiskCalculatorConfig,
} from '../../../domain/interfaces/risk-engine/IRiskCalculator';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';

/**
 * Конфигурация по умолчанию
 */
const DEFAULT_CONFIG: IRiskCalculatorConfig = {
  minValue: 1,
  maxValue: 10,
  baseValue: 1,
};

/**
 * Единый калькулятор риска
 */
export class UnifiedRiskCalculator implements IRiskCalculator {
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
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    let totalRisk = finalConfig.baseValue;
    
    for (const factorResult of factorResults) {
      const weightedValue = factorResult.value * factorResult.weight;
      totalRisk += weightedValue;
    }
    
    const normalizedValue = this.normalize(totalRisk, finalConfig);
    const level = this.getRiskLevel(normalizedValue);
    const description = this.getRiskDescription(normalizedValue);
    
    return {
      value: normalizedValue,
      level,
      description,
    };
  }
  
  /**
   * Нормализовать значение риска в диапазон [min, max]
   * 
   * @param value - Значение для нормализации
   * @param config - Конфигурация калькулятора
   * @returns Нормализованное значение
   */
  normalize(value: number, config?: Partial<IRiskCalculatorConfig>): number {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const clamped = Math.max(finalConfig.minValue, Math.min(finalConfig.maxValue, value));
    return Math.round(clamped);
  }
  
  /**
   * Определить уровень риска по значению
   * 
   * @param score - Значение риска
   * @returns Уровень риска
   */
  private getRiskLevel(score: number): RiskLevel {
    if (score <= 2) {
      return RiskLevel.VERY_LOW;
    }
    if (score <= 4) {
      return RiskLevel.LOW;
    }
    if (score <= 6) {
      return RiskLevel.MEDIUM;
    }
    if (score <= 8) {
      return RiskLevel.HIGH;
    }
    return RiskLevel.VERY_HIGH;
  }
  
  /**
   * Получить описание риска по значению
   * 
   * @param score - Значение риска
   * @returns Описание риска
   */
  private getRiskDescription(score: number): string {
    if (score <= 2) {
      return 'Очень низкий риск задержек';
    }
    if (score <= 4) {
      return 'Низкий риск задержек';
    }
    if (score <= 6) {
      return 'Средний риск задержек';
    }
    if (score <= 8) {
      return 'Высокий риск задержек';
    }
    return 'Очень высокий риск задержек';
  }
}

