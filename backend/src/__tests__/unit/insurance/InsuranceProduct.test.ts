/**
 * Unit Tests: InsuranceProduct
 * 
 * Tests for insurance product price calculation and recommendation logic.
 */

import { InsuranceProduct } from '../../../domain/entities/InsuranceProduct';
import { InsuranceProductType } from '../../../domain/entities/InsuranceProduct';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import type { IRiskScore } from '../../../domain/entities/RiskAssessment';

describe('InsuranceProduct', () => {
  let product: InsuranceProduct;
  const baseProductData = {
    id: 'test-insurance',
    type: InsuranceProductType.TRAVEL,
    name: 'Test Insurance',
    description: 'Test insurance product',
    basePrice: 100000, // 1000₽ в копейках
    minPrice: 50000, // 500₽
    maxPrice: 200000, // 2000₽
    riskMultiplier: 0.1,
    minRiskLevel: RiskLevel.LOW,
    isActive: true,
    displayOrder: 1,
  };

  beforeEach(() => {
    product = new InsuranceProduct(baseProductData);
  });

  describe('calculatePrice', () => {
    it('should calculate price based on risk score', () => {
      const riskScore: IRiskScore = {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const price = product.calculatePrice(riskScore);

      expect(price).toBeGreaterThanOrEqual(product.minPrice);
      expect(price).toBeLessThanOrEqual(product.maxPrice);
      expect(price).toBeGreaterThan(product.basePrice);
    });

    it('should return base price for minimum risk (value = 1)', () => {
      const riskScore: IRiskScore = {
        value: 1,
        level: RiskLevel.VERY_LOW,
        description: 'Очень низкий риск',
      };

      const price = product.calculatePrice(riskScore);

      expect(price).toBe(product.basePrice);
    });

    it('should return max price for maximum risk (value = 10)', () => {
      const riskScore: IRiskScore = {
        value: 10,
        level: RiskLevel.VERY_HIGH,
        description: 'Очень высокий риск',
      };

      const price = product.calculatePrice(riskScore);

      expect(price).toBeLessThanOrEqual(product.maxPrice);
    });

    it('should clamp price to min-max range', () => {
      const highRiskScore: IRiskScore = {
        value: 10,
        level: RiskLevel.VERY_HIGH,
        description: 'Очень высокий риск',
      };

      const price = product.calculatePrice(highRiskScore);

      expect(price).toBe(product.maxPrice);
    });

    it('should handle risk value outside 1-10 range', () => {
      const invalidRiskScore: IRiskScore = {
        value: 15,
        level: RiskLevel.VERY_HIGH,
        description: 'Invalid risk',
      };

      const price = product.calculatePrice(invalidRiskScore);

      expect(price).toBeLessThanOrEqual(product.maxPrice);
    });
  });

  describe('shouldBeRecommended', () => {
    it('should recommend product for risk level >= minRiskLevel', () => {
      const riskScore: IRiskScore = {
        value: 4,
        level: RiskLevel.LOW,
        description: 'Низкий риск',
      };

      const shouldRecommend = product.shouldBeRecommended(riskScore);

      expect(shouldRecommend).toBe(true);
    });

    it('should not recommend product for risk level < minRiskLevel', () => {
      const riskScore: IRiskScore = {
        value: 1,
        level: RiskLevel.VERY_LOW,
        description: 'Очень низкий риск',
      };

      const shouldRecommend = product.shouldBeRecommended(riskScore);

      expect(shouldRecommend).toBe(false);
    });

    it('should not recommend inactive product', () => {
      const inactiveProduct = new InsuranceProduct({
        ...baseProductData,
        isActive: false,
      });

      const riskScore: IRiskScore = {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const shouldRecommend = inactiveProduct.shouldBeRecommended(riskScore);

      expect(shouldRecommend).toBe(false);
    });

    it('should respect maxRiskLevel if specified', () => {
      const productWithMax = new InsuranceProduct({
        ...baseProductData,
        minRiskLevel: RiskLevel.LOW,
        maxRiskLevel: RiskLevel.MEDIUM,
      });

      const lowRisk: IRiskScore = {
        value: 3,
        level: RiskLevel.LOW,
        description: 'Низкий риск',
      };

      const highRisk: IRiskScore = {
        value: 8,
        level: RiskLevel.HIGH,
        description: 'Высокий риск',
      };

      expect(productWithMax.shouldBeRecommended(lowRisk)).toBe(true);
      expect(productWithMax.shouldBeRecommended(highRisk)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize product to JSON', () => {
      const json = product.toJSON();

      expect(json).toHaveProperty('id', product.id);
      expect(json).toHaveProperty('type', product.type);
      expect(json).toHaveProperty('name', product.name);
      expect(json).toHaveProperty('basePrice', product.basePrice);
      expect(json).toHaveProperty('minPrice', product.minPrice);
      expect(json).toHaveProperty('maxPrice', product.maxPrice);
    });
  });
});

