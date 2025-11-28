/**
 * Unit Tests: UnifiedRiskCalculator
 * 
 * Tests for unified risk calculator that normalizes risk scores to 1-10 scale.
 */

import { UnifiedRiskCalculator } from '../../../application/risk-engine/risk-calculator/UnifiedRiskCalculator';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import type { IRiskFactorResult } from '../../../domain/interfaces/risk-engine/IRiskFactor';

describe('UnifiedRiskCalculator', () => {
  let calculator: UnifiedRiskCalculator;

  beforeEach(() => {
    calculator = new UnifiedRiskCalculator();
  });

  describe('calculate', () => {
    it('should calculate risk score from factor results', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 2, weight: 0.3, description: 'delay' },
        { value: 3, weight: 0.2, description: 'weather' },
        { value: 1, weight: 0.1, description: 'transfer' },
      ];

      const result = await calculator.calculate(factorResults);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('description');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });

    it('should normalize risk score to 1-10 range', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 100, weight: 1.0, description: 'high-risk' },
      ];

      const result = await calculator.calculate(factorResults);

      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });

    it('should return minimum risk for empty factors', async () => {
      const factorResults: IRiskFactorResult[] = [];

      const result = await calculator.calculate(factorResults);

      expect(result.value).toBe(1);
      expect(result.level).toBe(RiskLevel.VERY_LOW);
    });

    it('should apply custom config when provided', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 5, weight: 0.5, description: 'test' },
      ];

      const result = await calculator.calculate(factorResults, {
        baseValue: 2,
        minValue: 1,
        maxValue: 10,
      });

      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });
  });

  describe('normalize', () => {
    it('should clamp values to min-max range', () => {
      expect(calculator.normalize(0)).toBe(1);
      expect(calculator.normalize(15)).toBe(10);
      expect(calculator.normalize(5)).toBe(5);
    });

    it('should round values to integers', () => {
      const result = calculator.normalize(5.7);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should respect custom config', () => {
      const result = calculator.normalize(15, { minValue: 1, maxValue: 5 });
      expect(result).toBe(5);
    });
  });

  describe('risk level mapping', () => {
    it('should map score 1-2 to VERY_LOW', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 0.5, weight: 0.1, description: 'low' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.level).toBe(RiskLevel.VERY_LOW);
    });

    it('should map score 3-4 to LOW', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 3, weight: 0.5, description: 'low-medium' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.level).toBe(RiskLevel.LOW);
    });

    it('should map score 5-6 to MEDIUM', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 5, weight: 0.5, description: 'medium' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.level).toBe(RiskLevel.MEDIUM);
    });

    it('should map score 7-8 to HIGH', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 7, weight: 0.5, description: 'high' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.level).toBe(RiskLevel.HIGH);
    });

    it('should map score 9-10 to VERY_HIGH', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 10, weight: 0.5, description: 'very-high' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.level).toBe(RiskLevel.VERY_HIGH);
    });
  });

  describe('risk description', () => {
    it('should provide description for very low risk', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 1, weight: 0.1, description: 'low' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.description).toContain('низкий');
    });

    it('should provide description for very high risk', async () => {
      const factorResults: IRiskFactorResult[] = [
        { value: 10, weight: 0.5, description: 'high' },
      ];

      const result = await calculator.calculate(factorResults);
      expect(result.description).toContain('высокий');
    });
  });
});

