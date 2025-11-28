/**
 * Фабрика факторов риска
 * 
 * Управляет регистрацией и получением факторов риска.
 * Обеспечивает приоритизацию и фильтрацию факторов по типу транспорта.
 */

import type { IRiskFactor } from '../../../domain/interfaces/risk-engine/IRiskFactor';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { TransferRiskFactor } from './TransferRiskFactor';
import { DelayRiskFactor } from './DelayRiskFactor';
import { CancellationRiskFactor } from './CancellationRiskFactor';
import { OccupancyRiskFactor } from './OccupancyRiskFactor';
import { ScheduleRegularityRiskFactor } from './ScheduleRegularityRiskFactor';
import { SeasonalityRiskFactor } from './SeasonalityRiskFactor';
import { TransportTypeRiskFactor } from './TransportTypeRiskFactor';
import { WeatherRiskFactor } from './WeatherRiskFactor';
import { RoadConditionsRiskFactor } from './RoadConditionsRiskFactor';

/**
 * Фабрика факторов риска
 */
export class RiskFactorFactory {
  private static readonly factors: IRiskFactor[] = [];
  private static initialized = false;
  
  /**
   * Инициализировать фабрику с базовыми факторами
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }
    
    this.factors.push(
      new WeatherRiskFactor(),
      new RoadConditionsRiskFactor(),
      new TransportTypeRiskFactor(),
      new CancellationRiskFactor(),
      new DelayRiskFactor(),
      new TransferRiskFactor(),
      new OccupancyRiskFactor(),
      new ScheduleRegularityRiskFactor(),
      new SeasonalityRiskFactor()
    );
    
    this.sortByPriority();
    this.initialized = true;
  }
  
  /**
   * Получить все факторы, применимые к типу транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns Массив факторов риска
   */
  static getFactorsForTransportType(transportType: TransportType): IRiskFactor[] {
    this.ensureInitialized();
    return this.factors.filter((factor) => factor.isApplicable(transportType));
  }
  
  /**
   * Получить все факторы
   * 
   * @returns Массив всех факторов риска
   */
  static getAllFactors(): IRiskFactor[] {
    this.ensureInitialized();
    return [...this.factors];
  }
  
  /**
   * Получить фактор по имени
   * 
   * @param name - Имя фактора
   * @returns Фактор риска или undefined
   */
  static getFactorByName(name: string): IRiskFactor | undefined {
    this.ensureInitialized();
    return this.factors.find((factor) => factor.name === name);
  }
  
  /**
   * Зарегистрировать новый фактор
   * 
   * @param factor - Фактор риска для регистрации
   */
  static registerFactor(factor: IRiskFactor): void {
    this.ensureInitialized();
    const existingIndex = this.factors.findIndex((f) => f.name === factor.name);
    if (existingIndex >= 0) {
      this.factors[existingIndex] = factor;
    } else {
      this.factors.push(factor);
    }
    this.sortByPriority();
  }
  
  /**
   * Удалить фактор по имени
   * 
   * @param name - Имя фактора
   */
  static unregisterFactor(name: string): void {
    this.ensureInitialized();
    const index = this.factors.findIndex((f) => f.name === name);
    if (index >= 0) {
      this.factors.splice(index, 1);
    }
  }
  
  /**
   * Очистить все факторы
   */
  static clear(): void {
    this.factors.length = 0;
    this.initialized = false;
  }
  
  /**
   * Отсортировать факторы по приоритету (от большего к меньшему)
   */
  private static sortByPriority(): void {
    this.factors.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Убедиться, что фабрика инициализирована
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

