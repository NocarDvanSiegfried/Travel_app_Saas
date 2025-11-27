/**
 * Unit Tests: DistanceModel
 * 
 * Тесты для модели расстояния.
 * Цель: 100% покрытие кода.
 * 
 * Проверяет:
 * - Создание модели расстояния
 * - Разбивку по типам транспорта
 * - Форматирование для отображения
 * - Граничные условия
 * - Негативные сценарии
 */

import { createDistanceModel } from '../../../../../domain/smart-routing/value-objects/DistanceModel';
import { DistanceCalculationMethod } from '../../../../../domain/smart-routing/enums/DistanceCalculationMethod';
import type { DistanceModel } from '../../../../../domain/smart-routing/value-objects/DistanceModel';

describe('DistanceModel', () => {
  describe('createDistanceModel', () => {
    it('should create distance model with minimal parameters', () => {
      const model = createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE);

      expect(model.value).toBe(1000);
      expect(model.unit).toBe('km');
      expect(model.calculationMethod).toBe(DistanceCalculationMethod.HAVERSINE);
      expect(model.breakdown).toEqual({
        airplane: 0,
        train: 0,
        bus: 0,
        ferry: 0,
        winter_road: 0,
        taxi: 0,
      });
      expect(model.display).toBe('1000 км');
    });

    it('should create distance model with breakdown', () => {
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.HAVERSINE,
        {
          airplane: 800,
          bus: 200,
        }
      );

      expect(model.value).toBe(1000);
      expect(model.breakdown.airplane).toBe(800);
      expect(model.breakdown.bus).toBe(200);
      expect(model.breakdown.train).toBe(0);
      expect(model.display).toContain('1000 км');
      expect(model.display).toContain('800 км самолёт');
      expect(model.display).toContain('200 км автобус');
    });

    it('should create distance model with all transport types', () => {
      const model = createDistanceModel(
        5000,
        DistanceCalculationMethod.MANUAL,
        {
          airplane: 2000,
          train: 1500,
          bus: 800,
          ferry: 500,
          winter_road: 150,
          taxi: 50,
        }
      );

      expect(model.value).toBe(5000);
      expect(model.breakdown.airplane).toBe(2000);
      expect(model.breakdown.train).toBe(1500);
      expect(model.breakdown.bus).toBe(800);
      expect(model.breakdown.ferry).toBe(500);
      expect(model.breakdown.winter_road).toBe(150);
      expect(model.breakdown.taxi).toBe(50);
      expect(model.display).toContain('5000 км');
      expect(model.display).toContain('2000 км самолёт');
      expect(model.display).toContain('1500 км поезд');
      expect(model.display).toContain('800 км автобус');
      expect(model.display).toContain('500 км паром');
      expect(model.display).toContain('150 км зимник');
      expect(model.display).toContain('50 км такси');
    });

    it('should create distance model with custom display', () => {
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.HAVERSINE,
        {},
        '1000 км (по прямой)'
      );

      expect(model.display).toBe('1000 км (по прямой)');
    });

    it('should handle zero distance', () => {
      const model = createDistanceModel(0, DistanceCalculationMethod.MANUAL);

      expect(model.value).toBe(0);
      expect(model.display).toBe('0 км');
    });

    it('should handle very large distance', () => {
      const model = createDistanceModel(10000, DistanceCalculationMethod.HAVERSINE);

      expect(model.value).toBe(10000);
      expect(model.display).toBe('10000 км');
    });

    it('should handle partial breakdown (only airplane)', () => {
      const model = createDistanceModel(
        4900,
        DistanceCalculationMethod.HAVERSINE,
        { airplane: 4900 }
      );

      expect(model.breakdown.airplane).toBe(4900);
      expect(model.breakdown.train).toBe(0);
      expect(model.display).toContain('4900 км');
      expect(model.display).toContain('4900 км самолёт');
    });

    it('should handle partial breakdown (only bus)', () => {
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.OSRM,
        { bus: 1000 }
      );

      expect(model.breakdown.bus).toBe(1000);
      expect(model.breakdown.airplane).toBe(0);
      expect(model.display).toContain('1000 км');
      expect(model.display).toContain('1000 км автобус');
    });

    it('should handle partial breakdown (only ferry)', () => {
      const model = createDistanceModel(
        500,
        DistanceCalculationMethod.RIVER_PATH,
        { ferry: 500 }
      );

      expect(model.breakdown.ferry).toBe(500);
      expect(model.display).toContain('500 км');
      expect(model.display).toContain('500 км паром');
    });

    it('should handle partial breakdown (only train)', () => {
      const model = createDistanceModel(
        2000,
        DistanceCalculationMethod.RAIL_PATH,
        { train: 2000 }
      );

      expect(model.breakdown.train).toBe(2000);
      expect(model.display).toContain('2000 км');
      expect(model.display).toContain('2000 км поезд');
    });

    it('should handle multimodal route (airplane + bus)', () => {
      const model = createDistanceModel(
        1200,
        DistanceCalculationMethod.MANUAL,
        {
          airplane: 1000,
          bus: 200,
        }
      );

      expect(model.value).toBe(1200);
      expect(model.breakdown.airplane).toBe(1000);
      expect(model.breakdown.bus).toBe(200);
      expect(model.display).toContain('1200 км');
      expect(model.display).toContain('1000 км самолёт');
      expect(model.display).toContain('200 км автобус');
      expect(model.display).toContain('+');
    });

    it('should handle multimodal route (train + bus + taxi)', () => {
      const model = createDistanceModel(
        517,
        DistanceCalculationMethod.MANUAL,
        {
          train: 400,
          bus: 100,
          taxi: 17,
        }
      );

      expect(model.value).toBe(517);
      expect(model.breakdown.train).toBe(400);
      expect(model.breakdown.bus).toBe(100);
      expect(model.breakdown.taxi).toBe(17);
      expect(model.display).toContain('517 км');
      expect(model.display).toContain('400 км поезд');
      expect(model.display).toContain('100 км автобус');
      expect(model.display).toContain('17 км такси');
    });

    it('should handle all calculation methods', () => {
      const methods = [
        DistanceCalculationMethod.HAVERSINE,
        DistanceCalculationMethod.OSRM,
        DistanceCalculationMethod.RIVER_PATH,
        DistanceCalculationMethod.RAIL_PATH,
        DistanceCalculationMethod.MANUAL,
      ];

      methods.forEach((method) => {
        const model = createDistanceModel(1000, method);
        expect(model.calculationMethod).toBe(method);
      });
    });

    it('should handle decimal values in breakdown', () => {
      const model = createDistanceModel(
        1000.5,
        DistanceCalculationMethod.HAVERSINE,
        {
          airplane: 800.3,
          bus: 200.2,
        }
      );

      expect(model.value).toBe(1000.5);
      expect(model.breakdown.airplane).toBe(800.3);
      expect(model.breakdown.bus).toBe(200.2);
    });

    it('should generate display with correct format for single transport', () => {
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.HAVERSINE,
        { airplane: 1000 }
      );

      expect(model.display).toBe('1000 км (1000 км самолёт)');
    });

    it('should generate display with correct format for multiple transports', () => {
      const model = createDistanceModel(
        1500,
        DistanceCalculationMethod.MANUAL,
        {
          airplane: 1000,
          bus: 500,
        }
      );

      expect(model.display).toBe('1500 км (1000 км самолёт + 500 км автобус)');
    });

    it('should handle breakdown that sums to less than total', () => {
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.HAVERSINE,
        {
          airplane: 800,
          bus: 100,
        }
      );

      // Breakdown может быть меньше total (например, из-за округления)
      expect(model.value).toBe(1000);
      expect(model.breakdown.airplane).toBe(800);
      expect(model.breakdown.bus).toBe(100);
    });

    it('should handle breakdown that sums to more than total', () => {
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.HAVERSINE,
        {
          airplane: 800,
          bus: 300,
        }
      );

      // Breakdown может быть больше total (например, из-за разных методов расчета)
      expect(model.value).toBe(1000);
      expect(model.breakdown.airplane).toBe(800);
      expect(model.breakdown.bus).toBe(300);
    });
  });

  describe('edge cases', () => {
    it('should handle very small distance', () => {
      const model = createDistanceModel(0.1, DistanceCalculationMethod.MANUAL);
      expect(model.value).toBe(0.1);
      expect(model.display).toBe('0.1 км');
    });

    it('should handle very large distance', () => {
      const model = createDistanceModel(20000, DistanceCalculationMethod.HAVERSINE);
      expect(model.value).toBe(20000);
      expect(model.display).toBe('20000 км');
    });

    it('should handle negative breakdown values gracefully', () => {
      // В реальности это не должно происходить, но тестируем граничный случай
      const model = createDistanceModel(
        1000,
        DistanceCalculationMethod.HAVERSINE,
        {
          airplane: -100,
          bus: 1100,
        }
      );

      expect(model.breakdown.airplane).toBe(-100);
      expect(model.breakdown.bus).toBe(1100);
    });
  });
});




