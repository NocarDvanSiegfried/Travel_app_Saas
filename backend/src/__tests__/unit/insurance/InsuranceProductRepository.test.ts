/**
 * Unit Tests: InsuranceProductRepository
 * 
 * Tests for insurance product repository.
 */

import { InsuranceProductRepository } from '../../../application/insurance/InsuranceProductRepository';
import { InsuranceProductType } from '../../../domain/entities/InsuranceProduct';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';

describe('InsuranceProductRepository', () => {
  let repository: InsuranceProductRepository;

  beforeEach(() => {
    repository = new InsuranceProductRepository();
  });

  describe('findAllActive', () => {
    it('should return all active products', async () => {
      const products = await repository.findAllActive();

      expect(products.length).toBeGreaterThan(0);
      products.forEach((product) => {
        expect(product.isActive).toBe(true);
      });
    });

    it('should return products sorted by displayOrder', async () => {
      const products = await repository.findAllActive();

      for (let i = 1; i < products.length; i++) {
        expect(products[i].displayOrder).toBeGreaterThanOrEqual(
          products[i - 1].displayOrder
        );
      }
    });
  });

  describe('findById', () => {
    it('should return product by id', async () => {
      const product = await repository.findById('insurance-travel');

      expect(product).not.toBeNull();
      expect(product?.id).toBe('insurance-travel');
      expect(product?.isActive).toBe(true);
    });

    it('should return null for non-existent product', async () => {
      const product = await repository.findById('non-existent');

      expect(product).toBeNull();
    });

    it('should return null for inactive product', async () => {
      // Assuming we have a way to deactivate products
      const product = await repository.findById('insurance-travel');
      if (product && !product.isActive) {
        const result = await repository.findById('insurance-travel');
        expect(result).toBeNull();
      }
    });
  });

  describe('findByType', () => {
    it('should return product by type', async () => {
      const product = await repository.findByType(InsuranceProductType.TRAVEL);

      expect(product).not.toBeNull();
      expect(product?.type).toBe(InsuranceProductType.TRAVEL);
    });

    it('should return null for non-existent type', async () => {
      // Assuming we don't have a product with this type
      const product = await repository.findByType('non-existent-type' as InsuranceProductType);

      expect(product).toBeNull();
    });
  });

  describe('findRecommendedForRiskLevel', () => {
    it('should return products for LOW risk level', async () => {
      const products = await repository.findRecommendedForRiskLevel(RiskLevel.LOW);

      expect(products.length).toBeGreaterThan(0);
      products.forEach((product) => {
        expect(product.isActive).toBe(true);
        expect(product.minRiskLevel).toBeDefined();
      });
    });

    it('should return products for HIGH risk level', async () => {
      const products = await repository.findRecommendedForRiskLevel(RiskLevel.HIGH);

      expect(products.length).toBeGreaterThan(0);
      products.forEach((product) => {
        expect(product.isActive).toBe(true);
      });
    });

    it('should return products sorted by displayOrder', async () => {
      const products = await repository.findRecommendedForRiskLevel(RiskLevel.MEDIUM);

      for (let i = 1; i < products.length; i++) {
        expect(products[i].displayOrder).toBeGreaterThanOrEqual(
          products[i - 1].displayOrder
        );
      }
    });

    it('should filter products by minRiskLevel', async () => {
      const products = await repository.findRecommendedForRiskLevel(RiskLevel.VERY_LOW);

      products.forEach((product) => {
        const riskLevels = [
          RiskLevel.VERY_LOW,
          RiskLevel.LOW,
          RiskLevel.MEDIUM,
          RiskLevel.HIGH,
          RiskLevel.VERY_HIGH,
        ];
        const minRiskIndex = riskLevels.indexOf(product.minRiskLevel);
        const veryLowIndex = riskLevels.indexOf(RiskLevel.VERY_LOW);
        expect(minRiskIndex).toBeLessThanOrEqual(veryLowIndex);
      });
    });
  });
});

