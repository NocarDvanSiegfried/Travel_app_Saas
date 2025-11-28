/**
 * Репозиторий страховых продуктов
 * 
 * Управляет доступом к страховым продуктам
 */

import type { IInsuranceProduct } from '../../domain/entities/InsuranceProduct';
import { InsuranceProductType } from '../../domain/entities/InsuranceProduct';
import { InsuranceProduct } from '../../domain/entities/InsuranceProduct';
import { RiskLevel } from '../../domain/entities/RiskAssessment';

/**
 * Интерфейс репозитория страховых продуктов
 */
export interface IInsuranceProductRepository {
  /**
   * Получить все активные страховые продукты
   */
  findAllActive(): Promise<IInsuranceProduct[]>;
  
  /**
   * Получить страховой продукт по типу
   */
  findByType(type: InsuranceProductType): Promise<IInsuranceProduct | null>;
  
  /**
   * Получить страховой продукт по ID
   */
  findById(id: string): Promise<IInsuranceProduct | null>;
  
  /**
   * Получить страховые продукты, рекомендуемые для уровня риска
   */
  findRecommendedForRiskLevel(riskLevel: RiskLevel): Promise<IInsuranceProduct[]>;
}

/**
 * Реализация репозитория страховых продуктов
 * 
 * В текущей версии использует in-memory хранилище.
 * В будущем можно заменить на MongoDB или другую БД.
 */
export class InsuranceProductRepository implements IInsuranceProductRepository {
  private readonly products: Map<string, IInsuranceProduct>;

  constructor() {
    this.products = new Map();
    this.initializeDefaultProducts();
  }

  /**
   * Инициализация продуктов по умолчанию
   */
  private initializeDefaultProducts(): void {
    const defaultProducts: InsuranceProduct[] = [
      new InsuranceProduct({
        id: 'insurance-baggage',
        type: InsuranceProductType.BAGGAGE,
        name: 'Страхование багажа',
        description: 'Покрытие утери, повреждения или задержки багажа до 50 000₽',
        basePrice: 50000, // 500₽ в копейках
        minPrice: 30000, // 300₽
        maxPrice: 100000, // 1000₽
        riskMultiplier: 0.08,
        minRiskLevel: RiskLevel.LOW,
        displayOrder: 1,
      }),
      new InsuranceProduct({
        id: 'insurance-family',
        type: InsuranceProductType.FAMILY,
        name: 'Страхование всей семьи',
        description: 'Комплексное страхование для всей семьи: медицинские расходы, отмена поездки, багаж',
        basePrice: 150000, // 1500₽ в копейках
        minPrice: 100000, // 1000₽
        maxPrice: 300000, // 3000₽
        riskMultiplier: 0.12,
        minRiskLevel: RiskLevel.MEDIUM,
        displayOrder: 2,
      }),
      new InsuranceProduct({
        id: 'insurance-travel',
        type: InsuranceProductType.TRAVEL,
        name: 'Страхование поездки',
        description: 'Медицинские расходы, экстренная эвакуация, юридическая помощь за границей',
        basePrice: 80000, // 800₽ в копейках
        minPrice: 50000, // 500₽
        maxPrice: 200000, // 2000₽
        riskMultiplier: 0.1,
        minRiskLevel: RiskLevel.MEDIUM,
        displayOrder: 3,
      }),
      new InsuranceProduct({
        id: 'insurance-trip-cancellation',
        type: InsuranceProductType.TRIP_CANCELLATION,
        name: 'Страхование отмены поездки',
        description: 'Возмещение расходов при отмене поездки по уважительным причинам',
        basePrice: 100000, // 1000₽ в копейках
        minPrice: 70000, // 700₽
        maxPrice: 250000, // 2500₽
        riskMultiplier: 0.15,
        minRiskLevel: RiskLevel.HIGH,
        displayOrder: 4,
      }),
      new InsuranceProduct({
        id: 'insurance-delay-coverage',
        type: InsuranceProductType.DELAY_COVERAGE,
        name: 'Страхование задержки рейса',
        description: 'Компенсация расходов при задержке рейса более 3 часов: питание, проживание, трансфер',
        basePrice: 60000, // 600₽ в копейках
        minPrice: 40000, // 400₽
        maxPrice: 150000, // 1500₽
        riskMultiplier: 0.2,
        minRiskLevel: RiskLevel.HIGH,
        displayOrder: 5,
      }),
    ];

    defaultProducts.forEach((product) => {
      this.products.set(product.id, product);
    });
  }

  async findAllActive(): Promise<IInsuranceProduct[]> {
    return Array.from(this.products.values())
      .filter((product) => product.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findByType(type: InsuranceProductType): Promise<IInsuranceProduct | null> {
    const product = Array.from(this.products.values()).find(
      (p) => p.type === type && p.isActive
    );
    return product || null;
  }

  async findById(id: string): Promise<IInsuranceProduct | null> {
    const product = this.products.get(id);
    return product && product.isActive ? product : null;
  }

  async findRecommendedForRiskLevel(riskLevel: RiskLevel): Promise<IInsuranceProduct[]> {
    return Array.from(this.products.values())
      .filter((product) => {
        if (!product.isActive) {
          return false;
        }
        
        const riskLevels = [
          RiskLevel.VERY_LOW,
          RiskLevel.LOW,
          RiskLevel.MEDIUM,
          RiskLevel.HIGH,
          RiskLevel.VERY_HIGH,
        ];
        
        const minRiskIndex = riskLevels.indexOf(product.minRiskLevel);
        const currentRiskIndex = riskLevels.indexOf(riskLevel);
        
        if (currentRiskIndex < minRiskIndex) {
          return false;
        }
        
        if (product.maxRiskLevel) {
          const maxRiskIndex = riskLevels.indexOf(product.maxRiskLevel);
          if (currentRiskIndex > maxRiskIndex) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
}

