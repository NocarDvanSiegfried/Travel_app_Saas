/**
 * Unit Tests: PriceModel
 * 
 * Тесты для модели цены.
 * Цель: 100% покрытие кода.
 * 
 * Проверяет:
 * - Создание модели цены
 * - Дополнительные расходы
 * - Форматирование для отображения
 * - Вычисление total
 * - Граничные условия
 * - Негативные сценарии
 */

import { createPriceModel } from '../../../../../domain/smart-routing/value-objects/PriceModel';
import type { PriceModel } from '../../../../../domain/smart-routing/value-objects/PriceModel';

describe('PriceModel', () => {
  describe('createPriceModel', () => {
    it('should create price model with minimal parameters', () => {
      const model = createPriceModel(10000);

      expect(model.base).toBe(10000);
      expect(model.total).toBe(10000);
      expect(model.currency).toBe('RUB');
      expect(model.additional).toEqual({
        taxi: 0,
        transfer: 0,
        baggage: 0,
        fees: 0,
      });
      expect(model.display).toBe('10000₽');
    });

    it('should create price model with additional expenses', () => {
      const model = createPriceModel(10000, {
        taxi: 500,
        baggage: 1000,
      });

      expect(model.base).toBe(10000);
      expect(model.additional.taxi).toBe(500);
      expect(model.additional.baggage).toBe(1000);
      expect(model.additional.transfer).toBe(0);
      expect(model.additional.fees).toBe(0);
      expect(model.total).toBe(11500); // 10000 + 500 + 1000
      expect(model.display).toContain('11500₽');
      expect(model.display).toContain('+500₽ такси');
      expect(model.display).toContain('+1000₽ багаж');
    });

    it('should create price model with all additional expenses', () => {
      const model = createPriceModel(12000, {
        taxi: 600,
        transfer: 200,
        baggage: 2000,
        fees: 1000,
      });

      expect(model.base).toBe(12000);
      expect(model.additional.taxi).toBe(600);
      expect(model.additional.transfer).toBe(200);
      expect(model.additional.baggage).toBe(2000);
      expect(model.additional.fees).toBe(1000);
      expect(model.total).toBe(15800); // 12000 + 600 + 200 + 2000 + 1000
      expect(model.display).toContain('15800₽');
      expect(model.display).toContain('+600₽ такси');
      expect(model.display).toContain('+200₽ пересадки');
      expect(model.display).toContain('+2000₽ багаж');
      expect(model.display).toContain('+1000₽ сборы');
    });

    it('should create price model with custom display', () => {
      const model = createPriceModel(
        10000,
        { taxi: 500 },
        '10000₽ + 500₽ такси'
      );

      expect(model.display).toBe('10000₽ + 500₽ такси');
    });

    it('should calculate total correctly', () => {
      const model = createPriceModel(5000, {
        taxi: 300,
        transfer: 100,
        baggage: 500,
        fees: 200,
      });

      expect(model.total).toBe(6100); // 5000 + 300 + 100 + 500 + 200
    });

    it('should handle zero base price', () => {
      const model = createPriceModel(0);

      expect(model.base).toBe(0);
      expect(model.total).toBe(0);
      expect(model.display).toBe('0₽');
    });

    it('should handle zero base price with additional expenses', () => {
      const model = createPriceModel(0, {
        taxi: 500,
        baggage: 1000,
      });

      expect(model.base).toBe(0);
      expect(model.total).toBe(1500);
      expect(model.display).toContain('1500₽');
    });

    it('should handle very large prices', () => {
      const model = createPriceModel(100000);

      expect(model.base).toBe(100000);
      expect(model.total).toBe(100000);
      expect(model.display).toBe('100000₽');
    });

    it('should handle only taxi additional expense', () => {
      const model = createPriceModel(10000, { taxi: 600 });

      expect(model.additional.taxi).toBe(600);
      expect(model.additional.transfer).toBe(0);
      expect(model.additional.baggage).toBe(0);
      expect(model.additional.fees).toBe(0);
      expect(model.total).toBe(10600);
      expect(model.display).toContain('10600₽');
      expect(model.display).toContain('+600₽ такси');
    });

    it('should handle only transfer additional expense', () => {
      const model = createPriceModel(10000, { transfer: 500 });

      expect(model.additional.transfer).toBe(500);
      expect(model.total).toBe(10500);
      expect(model.display).toContain('10500₽');
      expect(model.display).toContain('+500₽ пересадки');
    });

    it('should handle only baggage additional expense', () => {
      const model = createPriceModel(10000, { baggage: 2000 });

      expect(model.additional.baggage).toBe(2000);
      expect(model.total).toBe(12000);
      expect(model.display).toContain('12000₽');
      expect(model.display).toContain('+2000₽ багаж');
    });

    it('should handle only fees additional expense', () => {
      const model = createPriceModel(10000, { fees: 1000 });

      expect(model.additional.fees).toBe(1000);
      expect(model.total).toBe(11000);
      expect(model.display).toContain('11000₽');
      expect(model.display).toContain('+1000₽ сборы');
    });

    it('should generate display with correct format for single additional expense', () => {
      const model = createPriceModel(10000, { taxi: 500 });

      expect(model.display).toBe('10500₽ (+500₽ такси)');
    });

    it('should generate display with correct format for multiple additional expenses', () => {
      const model = createPriceModel(10000, {
        taxi: 500,
        baggage: 1000,
        fees: 200,
      });

      expect(model.display).toContain('11700₽');
      expect(model.display).toContain('+500₽ такси');
      expect(model.display).toContain('+1000₽ багаж');
      expect(model.display).toContain('+200₽ сборы');
    });

    it('should handle decimal prices', () => {
      const model = createPriceModel(10000.5, {
        taxi: 500.25,
        baggage: 1000.75,
      });

      expect(model.base).toBe(10000.5);
      expect(model.additional.taxi).toBe(500.25);
      expect(model.additional.baggage).toBe(1000.75);
      expect(model.total).toBe(11501.5);
    });

    it('should handle realistic Yakutia route prices', () => {
      // Реалистичная цена для маршрута Якутск → Москва
      const model = createPriceModel(25000, {
        taxi: 600, // Такси до аэропорта
        baggage: 2000, // Багаж
        fees: 1000, // Аэропортовые сборы
      });

      expect(model.total).toBe(28600);
      expect(model.display).toContain('28600₽');
    });

    it('should handle realistic multimodal route prices', () => {
      // Реалистичная цена для мультимодального маршрута
      const model = createPriceModel(15000, {
        taxi: 800, // Такси до аэропорта и от вокзала
        transfer: 500, // Пересадка
        baggage: 1500, // Багаж
        fees: 1200, // Сборы
      });

      expect(model.total).toBe(19000);
      expect(model.display).toContain('19000₽');
    });
  });

  describe('edge cases', () => {
    it('should handle very small prices', () => {
      const model = createPriceModel(1);
      expect(model.base).toBe(1);
      expect(model.total).toBe(1);
      expect(model.display).toBe('1₽');
    });

    it('should handle very large prices', () => {
      const model = createPriceModel(1000000);
      expect(model.base).toBe(1000000);
      expect(model.total).toBe(1000000);
      expect(model.display).toBe('1000000₽');
    });

    it('should handle negative additional expenses gracefully', () => {
      // В реальности это не должно происходить, но тестируем граничный случай
      const model = createPriceModel(10000, {
        taxi: -500,
        baggage: 1000,
      });

      expect(model.additional.taxi).toBe(-500);
      expect(model.additional.baggage).toBe(1000);
      expect(model.total).toBe(10500); // 10000 - 500 + 1000
    });

    it('should always use RUB currency', () => {
      const model = createPriceModel(10000);
      expect(model.currency).toBe('RUB');
    });
  });
});






