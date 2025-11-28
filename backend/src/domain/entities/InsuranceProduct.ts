/**
 * Страховые продукты для маршрутов
 */

import type { BaseEntity } from './BaseEntity';
import type { IRiskScore } from './RiskAssessment';
import { RiskLevel } from './RiskAssessment';

/**
 * Типы страховых продуктов
 */
export enum InsuranceProductType {
  /** Страхование багажа */
  BAGGAGE = 'baggage',
  /** Страхование всей семьи */
  FAMILY = 'family',
  /** Страхование поездки (Travel Insurance) */
  TRAVEL = 'travel',
  /** Страхование отмены поездки (Trip Cancellation) */
  TRIP_CANCELLATION = 'trip_cancellation',
  /** Страхование задержки рейса (Delay Coverage) */
  DELAY_COVERAGE = 'delay_coverage',
}

/**
 * Интерфейс страхового продукта
 */
export interface IInsuranceProduct extends BaseEntity {
  /** Тип страхового продукта */
  readonly type: InsuranceProductType;
  /** Название продукта */
  readonly name: string;
  /** Описание покрытия */
  readonly description: string;
  /** Базовая цена (в копейках) */
  readonly basePrice: number;
  /** Минимальная цена (в копейках) */
  readonly minPrice: number;
  /** Максимальная цена (в копейках) */
  readonly maxPrice: number;
  /** Множитель риска для расчета цены */
  readonly riskMultiplier: number;
  /** Минимальный уровень риска для предложения */
  readonly minRiskLevel: RiskLevel;
  /** Максимальный уровень риска для предложения */
  readonly maxRiskLevel?: RiskLevel;
  /** Активен ли продукт */
  readonly isActive: boolean;
  /** Порядок отображения */
  readonly displayOrder: number;
  
  /**
   * Рассчитывает цену страховки на основе риска
   * 
   * @param riskScore - Оценка риска
   * @returns Цена страховки в копейках
   */
  calculatePrice(riskScore: IRiskScore): number;
  
  /**
   * Проверяет, должен ли продукт быть предложен для данного уровня риска
   * 
   * @param riskScore - Оценка риска
   * @returns true, если продукт должен быть рекомендован
   */
  shouldBeRecommended(riskScore: IRiskScore): boolean;
  
  /**
   * Преобразует объект в JSON
   */
  toJSON(): Record<string, unknown>;
}

/**
 * Класс страхового продукта
 */
export class InsuranceProduct implements IInsuranceProduct {
  public readonly id: string;
  public readonly type: InsuranceProductType;
  public readonly name: string;
  public readonly description: string;
  public readonly basePrice: number;
  public readonly minPrice: number;
  public readonly maxPrice: number;
  public readonly riskMultiplier: number;
  public readonly minRiskLevel: RiskLevel;
  public readonly maxRiskLevel?: RiskLevel;
  public readonly isActive: boolean;
  public readonly displayOrder: number;

  constructor(params: {
    id: string;
    type: InsuranceProductType;
    name: string;
    description: string;
    basePrice: number;
    minPrice?: number;
    maxPrice?: number;
    riskMultiplier?: number;
    minRiskLevel: RiskLevel;
    maxRiskLevel?: RiskLevel;
    isActive?: boolean;
    displayOrder?: number;
  }) {
    this.id = params.id;
    this.type = params.type;
    this.name = params.name;
    this.description = params.description;
    this.basePrice = params.basePrice;
    this.minPrice = params.minPrice ?? Math.round(params.basePrice * 0.5);
    this.maxPrice = params.maxPrice ?? Math.round(params.basePrice * 3);
    this.riskMultiplier = params.riskMultiplier ?? 0.1;
    this.minRiskLevel = params.minRiskLevel;
    this.maxRiskLevel = params.maxRiskLevel;
    this.isActive = params.isActive ?? true;
    this.displayOrder = params.displayOrder ?? 0;
  }

  /**
   * Рассчитывает цену страховки на основе риска
   * 
   * Формула: basePrice * (1 + (riskScore.value - 1) * riskMultiplier)
   * 
   * @param riskScore - Оценка риска
   * @returns Цена страховки в копейках
   */
  public calculatePrice(riskScore: IRiskScore): number {
    const riskValue = Math.max(1, Math.min(10, riskScore.value));
    const calculatedPrice = Math.round(
      this.basePrice * (1 + (riskValue - 1) * this.riskMultiplier)
    );
    
    // Ограничиваем минимальной и максимальной ценой
    return Math.max(this.minPrice, Math.min(this.maxPrice, calculatedPrice));
  }

  /**
   * Проверяет, должен ли продукт быть предложен для данного уровня риска
   */
  public shouldBeRecommended(riskScore: IRiskScore): boolean {
    if (!this.isActive) {
      return false;
    }

    const riskLevel = riskScore.level;
    
    // Проверяем минимальный уровень риска
    const riskLevels = [
      RiskLevel.VERY_LOW,
      RiskLevel.LOW,
      RiskLevel.MEDIUM,
      RiskLevel.HIGH,
      RiskLevel.VERY_HIGH,
    ];
    
    const minRiskIndex = riskLevels.indexOf(this.minRiskLevel);
    const currentRiskIndex = riskLevels.indexOf(riskLevel);
    
    if (currentRiskIndex < minRiskIndex) {
      return false;
    }
    
    // Проверяем максимальный уровень риска, если указан
    if (this.maxRiskLevel) {
      const maxRiskIndex = riskLevels.indexOf(this.maxRiskLevel);
      if (currentRiskIndex > maxRiskIndex) {
        return false;
      }
    }
    
    return true;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      basePrice: this.basePrice,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      riskMultiplier: this.riskMultiplier,
      minRiskLevel: this.minRiskLevel,
      maxRiskLevel: this.maxRiskLevel,
      isActive: this.isActive,
      displayOrder: this.displayOrder,
    };
  }
}

/**
 * Интерфейс предложения страхового продукта с рассчитанной ценой
 */
export interface IInsuranceOffer {
  /** Страховой продукт */
  readonly product: IInsuranceProduct;
  /** Рассчитанная цена (в копейках) */
  readonly price: number;
  /** Оценка риска, на основе которой рассчитана цена */
  readonly riskScore: IRiskScore;
  /** Рекомендуется ли продукт */
  readonly isRecommended: boolean;
  /** Приоритет отображения */
  readonly priority: number;
  /**
   * Преобразует объект в JSON
   *
   * @returns Объект в формате JSON
   */
  toJSON(): Record<string, unknown>;
}

/**
 * Класс предложения страхового продукта
 */
export class InsuranceOffer implements IInsuranceOffer {
  public readonly product: IInsuranceProduct;
  public readonly price: number;
  public readonly riskScore: IRiskScore;
  public readonly isRecommended: boolean;
  public readonly priority: number;

  constructor(params: {
    product: IInsuranceProduct;
    riskScore: IRiskScore;
    isRecommended?: boolean;
    priority?: number;
  }) {
    this.product = params.product;
    this.riskScore = params.riskScore;
    this.price = params.product.calculatePrice(params.riskScore);
    this.isRecommended = params.isRecommended ?? params.product.shouldBeRecommended(params.riskScore);
    this.priority = params.priority ?? params.product.displayOrder;
  }

  public toJSON(): Record<string, unknown> {
    return {
      product: this.product.toJSON(),
      price: this.price,
      riskScore: this.riskScore,
      isRecommended: this.isRecommended,
      priority: this.priority,
    };
  }
}

