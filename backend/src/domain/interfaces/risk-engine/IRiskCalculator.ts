/**
 * Интерфейс калькулятора риска
 * 
 * Определяет контракт для вычисления итоговой оценки риска на основе результатов факторов.
 */

import type { IRiskScore } from '../../entities/RiskAssessment';
import type { IRiskFactorResult } from './IRiskFactor';

/**
 * Конфигурация калькулятора риска
 */
export interface IRiskCalculatorConfig {
  /**
   * Минимальное значение риска (обычно 1)
   */
  minValue: number;
  
  /**
   * Максимальное значение риска (обычно 10)
   */
  maxValue: number;
  
  /**
   * Базовое значение риска
   */
  baseValue: number;
  
  /**
   * Дополнительные параметры конфигурации
   */
  [key: string]: unknown;
}

/**
 * Интерфейс калькулятора риска
 */
export interface IRiskCalculator {
  /**
   * Вычислить итоговую оценку риска на основе результатов факторов
   * 
   * @param factorResults - Результаты оценки факторов
   * @param config - Конфигурация калькулятора
   * @returns Promise с итоговой оценкой риска
   */
  calculate(
    factorResults: IRiskFactorResult[],
    config?: Partial<IRiskCalculatorConfig>
  ): Promise<IRiskScore>;
  
  /**
   * Нормализовать значение риска в диапазон [min, max]
   * 
   * @param value - Значение для нормализации
   * @param config - Конфигурация калькулятора
   * @returns Нормализованное значение
   */
  normalize(value: number, config?: Partial<IRiskCalculatorConfig>): number;
}


