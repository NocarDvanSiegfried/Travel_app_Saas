/**
 * Фабрика калькуляторов риска
 * 
 * Создаёт калькуляторы риска в зависимости от типа транспорта.
 * Использует паттерн Factory для выбора подходящего калькулятора.
 */

import { TransportType } from '../../../domain/entities/RouteSegment';
import type { IRiskCalculator } from '../../../domain/interfaces/risk-engine/IRiskCalculator';
import { UnifiedRiskCalculator } from './UnifiedRiskCalculator';
import { AirplaneRiskCalculator } from './AirplaneRiskCalculator';
import { TrainRiskCalculator } from './TrainRiskCalculator';
import { BusRiskCalculator } from './BusRiskCalculator';
import { CarRiskCalculator } from './CarRiskCalculator';

/**
 * Фабрика калькуляторов риска
 */
export class RiskCalculatorFactory {
  private static readonly calculators = new Map<TransportType, IRiskCalculator>();
  
  /**
   * Получить калькулятор риска для типа транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns Калькулятор риска
   */
  static getCalculator(transportType: TransportType): IRiskCalculator {
    if (this.calculators.has(transportType)) {
      return this.calculators.get(transportType)!;
    }
    
    const calculator = this.createCalculator(transportType);
    this.calculators.set(transportType, calculator);
    return calculator;
  }
  
  /**
   * Создать калькулятор риска для типа транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns Калькулятор риска
   */
  private static createCalculator(transportType: TransportType): IRiskCalculator {
    switch (transportType) {
      case TransportType.AIRPLANE:
        return new AirplaneRiskCalculator();
      case TransportType.TRAIN:
        return new TrainRiskCalculator();
      case TransportType.BUS:
        return new BusRiskCalculator();
      case TransportType.TAXI:
      case TransportType.WINTER_ROAD:
        return new CarRiskCalculator();
      case TransportType.FERRY:
        return new UnifiedRiskCalculator();
      default:
        return new UnifiedRiskCalculator();
    }
  }
  
  /**
   * Получить единый калькулятор (для смешанных типов транспорта)
   * 
   * @returns Единый калькулятор риска
   */
  static getUnifiedCalculator(): IRiskCalculator {
    return new UnifiedRiskCalculator();
  }
  
  /**
   * Очистить кэш калькуляторов
   */
  static clearCache(): void {
    this.calculators.clear();
  }
}

