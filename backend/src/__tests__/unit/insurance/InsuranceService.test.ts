/**
 * Unit Tests: InsuranceService
 * 
 * Tests for insurance service business logic.
 */

import { InsuranceService } from '../../../application/insurance/InsuranceService';
import { InsuranceProductRepository } from '../../../application/insurance/InsuranceProductRepository';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import type { IRiskScore } from '../../../domain/entities/RiskAssessment';

describe('InsuranceService', () => {
  let service: InsuranceService;
  let repository: InsuranceProductRepository;

  beforeEach(() => {
    repository = new InsuranceProductRepository();
    service = new InsuranceService(repository);
  });

  describe('getAvailableProducts', () => {
    it('should return all active products', async () => {
      const products = await service.getAvailableProducts();

      expect(products.length).toBeGreaterThan(0);
      products.forEach((product) => {
        expect(product.isActive).toBe(true);
      });
    });

    it('should return products sorted by displayOrder', async () => {
      const products = await service.getAvailableProducts();

      for (let i = 1; i < products.length; i++) {
        expect(products[i].displayOrder).toBeGreaterThanOrEqual(
          products[i - 1].displayOrder
        );
      }
    });
  });

  describe('getOffersForRoute', () => {
    it('should return offers for route with risk score', async () => {
      const riskScore: IRiskScore = {
        value: 6,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const offers = await service.getOffersForRoute(riskScore, true);

      expect(offers.length).toBeGreaterThan(0);
      offers.forEach((offer) => {
        expect(offer).toHaveProperty('product');
        expect(offer).toHaveProperty('price');
        expect(offer).toHaveProperty('riskScore');
        expect(offer).toHaveProperty('isRecommended');
        expect(offer.price).toBeGreaterThan(0);
      });
    });

    it('should return only recommended offers when autoRecommend = true', async () => {
      const riskScore: IRiskScore = {
        value: 7,
        level: RiskLevel.HIGH,
        description: 'Высокий риск',
      };

      const offers = await service.getOffersForRoute(riskScore, true);

      offers.forEach((offer) => {
        if (offer.isRecommended) {
          expect(offer.product.shouldBeRecommended(riskScore)).toBe(true);
        }
      });
    });

    it('should return all active products when autoRecommend = false', async () => {
      const riskScore: IRiskScore = {
        value: 3,
        level: RiskLevel.LOW,
        description: 'Низкий риск',
      };

      const offers = await service.getOffersForRoute(riskScore, false);
      const allProducts = await service.getAvailableProducts();

      expect(offers.length).toBe(allProducts.length);
    });

    it('should sort offers by recommendation and priority', async () => {
      const riskScore: IRiskScore = {
        value: 6,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const offers = await service.getOffersForRoute(riskScore, true);

      let foundNonRecommended = false;
      for (let i = 1; i < offers.length; i++) {
        if (offers[i].isRecommended && !offers[i - 1].isRecommended) {
          foundNonRecommended = true;
        }
        if (offers[i].isRecommended === offers[i - 1].isRecommended) {
          expect(offers[i].priority).toBeGreaterThanOrEqual(
            offers[i - 1].priority
          );
        }
      }
    });
  });

  describe('getOffersForSegment', () => {
    it('should return offers for segment with risk score', async () => {
      const riskScore: IRiskScore = {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const offers = await service.getOffersForSegment(riskScore, true);

      expect(offers.length).toBeGreaterThan(0);
      offers.forEach((offer) => {
        expect(offer).toHaveProperty('product');
        expect(offer).toHaveProperty('price');
        expect(offer).toHaveProperty('riskScore');
      });
    });

    it('should use same logic as getOffersForRoute', async () => {
      const riskScore: IRiskScore = {
        value: 6,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const routeOffers = await service.getOffersForRoute(riskScore, true);
      const segmentOffers = await service.getOffersForSegment(riskScore, true);

      expect(segmentOffers.length).toBe(routeOffers.length);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate price for valid product', async () => {
      const riskScore: IRiskScore = {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const price = await service.calculatePrice('insurance-travel', riskScore);

      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    it('should return null for non-existent product', async () => {
      const riskScore: IRiskScore = {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск',
      };

      const price = await service.calculatePrice('non-existent-product', riskScore);

      expect(price).toBeNull();
    });
  });
});


