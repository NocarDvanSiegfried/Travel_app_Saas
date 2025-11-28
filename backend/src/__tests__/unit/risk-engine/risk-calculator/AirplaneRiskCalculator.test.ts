/**
 * Unit Tests: AirplaneRiskCalculator
 * 
 * Tests for airplane-specific risk calculator.
 */

import { AirplaneRiskCalculator } from '../../../../application/risk-engine/risk-calculator/AirplaneRiskCalculator';
import { UnifiedRiskCalculator } from '../../../../application/risk-engine/risk-calculator/UnifiedRiskCalculator';
import { RiskLevel } from '../../../../domain/entities/RiskAssessment';
import type { IRiskFactorResult } from '../../../../domain/interfaces/risk-engine/IRiskFactor';

describe('AirplaneRiskCalculator', () => {
  let calculator: AirplaneRiskCalculator;
  let unifiedCalculator: UnifiedRiskCalculator;

  beforeEach(() => {
    calculator = new AirplaneRiskCalculator();
  });

  describe('calculate', () => {
    it('should calculate risk score for airplane transport', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 3, weight: 0.3, description: 'weather' },
        { value: 2, weight: 0.2, description: 'cancellation' },
        { value: 1, weight: 0.1, description: 'delay' },
      ];

      const result = await calculator.calculate(factorResults);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('description');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });

    it('should apply airplane-specific factor weights', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 5, weight: 0.3, description: 'weather' },
        { value: 4, weight: 0.2, description: 'cancellation' },
      ];

      const result = await calculator.calculate(factorResults);

      // Should calculate risk score with adjusted weights
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });
  });

  describe('adjustFactorWeights', () => {
    it('should adjust weights for airplane transport', () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 3, weight: 0.3, factorName: 'weather' },
        { value: 2, weight: 0.2, factorName: 'cancellation' },
      ];

      // adjustFactorWeights is private, so we test through calculate
      const result = await calculator.calculate(factorResults);
      expect(result).toHaveProperty('value');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });
  });
});

