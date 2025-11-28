/**
 * Сервис для работы со страховыми продуктами
 * 
 * Предоставляет функциональность для расчета страховых премий
 * и получения рекомендаций по страховым продуктам
 */

import type { IInsuranceProduct, IInsuranceOffer } from '../../domain/entities/InsuranceProduct';
import { InsuranceOffer } from '../../domain/entities/InsuranceProduct';
import type { IRiskScore } from '../../domain/entities/RiskAssessment';
import { RiskLevel } from '../../domain/entities/RiskAssessment';
import type { IInsuranceProductRepository } from './InsuranceProductRepository';

/**
 * Интерфейс сервиса страховых продуктов
 */
export interface IInsuranceService {
  /**
   * Получить все доступные страховые продукты
   */
  getAvailableProducts(): Promise<IInsuranceProduct[]>;
  
  /**
   * Получить предложения страховых продуктов для маршрута
   * 
   * @param riskScore - Оценка риска маршрута
   * @param autoRecommend - Автоматически рекомендовать продукты при высоком риске
   */
  getOffersForRoute(
    riskScore: IRiskScore,
    autoRecommend?: boolean
  ): Promise<IInsuranceOffer[]>;
  
  /**
   * Получить предложения страховых продуктов для сегмента
   * 
   * @param riskScore - Оценка риска сегмента
   * @param autoRecommend - Автоматически рекомендовать продукты при высоком риске
   */
  getOffersForSegment(
    riskScore: IRiskScore,
    autoRecommend?: boolean
  ): Promise<IInsuranceOffer[]>;
  
  /**
   * Рассчитать цену страхового продукта на основе риска
   */
  calculatePrice(
    productId: string,
    riskScore: IRiskScore
  ): Promise<number | null>;
}

/**
 * Реализация сервиса страховых продуктов
 */
export class InsuranceService implements IInsuranceService {
  constructor(
    private readonly productRepository: IInsuranceProductRepository
  ) {}

  async getAvailableProducts(): Promise<IInsuranceProduct[]> {
    return this.productRepository.findAllActive();
  }

  async getOffersForRoute(
    riskScore: IRiskScore,
    autoRecommend: boolean = true
  ): Promise<IInsuranceOffer[]> {
    // Если autoRecommend = true, получаем только рекомендуемые продукты
    // Если autoRecommend = false, получаем все активные продукты
    const products = autoRecommend
      ? await this.productRepository.findRecommendedForRiskLevel(riskScore.level)
      : await this.productRepository.findAllActive();

    const offers = products.map((product) => {
      const isRecommended = autoRecommend && this.shouldAutoRecommend(
        product,
        riskScore
      );
      
      return new InsuranceOffer({
        product,
        riskScore,
        isRecommended,
        priority: product.displayOrder,
      });
    });

    // Сортируем по приоритету и рекомендации
    return offers.sort((a, b) => {
      // Сначала рекомендуемые
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      // Затем по приоритету
      return a.priority - b.priority;
    });
  }

  async getOffersForSegment(
    riskScore: IRiskScore,
    autoRecommend: boolean = true
  ): Promise<IInsuranceOffer[]> {
    // Для сегментов используем ту же логику, что и для маршрутов
    return this.getOffersForRoute(riskScore, autoRecommend);
  }

  async calculatePrice(
    productId: string,
    riskScore: IRiskScore
  ): Promise<number | null> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return null;
    }

    return product.calculatePrice(riskScore);
  }

  /**
   * Определяет, должен ли продукт быть автоматически рекомендован
   * 
   * Логика:
   * - Риск 7-10: автоматически предлагать все продукты
   * - Риск 5-6: предлагать базовые (Travel Insurance, Delay Coverage)
   * - Риск 1-4: не предлагать автоматически
   */
  private shouldAutoRecommend(
    product: IInsuranceProduct,
    riskScore: IRiskScore
  ): boolean {
    const riskValue = riskScore.value;
    const riskLevel = riskScore.level;

    // Очень высокий риск (7-10): предлагаем все
    if (riskValue >= 7 || riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      return true;
    }

    // Средний риск (5-6): предлагаем только базовые продукты
    if (riskValue >= 5 || riskLevel === RiskLevel.MEDIUM) {
      return (
        product.type === 'travel' ||
        product.type === 'delay_coverage'
      );
    }

    // Низкий риск (1-4): не предлагаем автоматически
    return false;
  }
}

