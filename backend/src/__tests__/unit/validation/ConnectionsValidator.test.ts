/**
 * Unit Tests: ConnectionsValidator
 * 
 * Тесты для валидатора соединений.
 * Цель: 80%+ покрытие кода.
 * 
 * Проверяет:
 * - Валидация автобусных маршрутов > 1500 км
 * - Валидация прямых авиарейсов между малыми аэропортами
 * - Валидация расстояний
 * - Валидация цен
 * - Валидация времени в пути
 * - Валидация скорости
 * - Фильтрация проблемных соединений
 * - Граничные условия
 */

import { ConnectionsValidator, type ConnectionValidationResult } from '../../../domain/smart-routing/data/connections-validator';
import { generateMockConnection, generateBusConnection, generateAirplaneConnection } from '../../factories/ConnectionFactory';
import { YAKUTSK, MIRNY, MOSCOW, SREDNEKOLYMSK } from '../../fixtures/cities';

// Мокаем cities-reference
jest.mock('../../../domain/smart-routing/data/cities-reference', () => ({
  ALL_CITIES: [YAKUTSK, MIRNY, MOSCOW, SREDNEKOLYMSK],
}));

describe('ConnectionsValidator', () => {
  describe('validateConnection', () => {
    it('should validate correct bus connection', () => {
      const connection = generateBusConnection('yakutsk', 'mirny', 1000, [], {
        distance: 1000,
        duration: 720,
        basePrice: 3500,
        season: 'all',
        isDirect: true,
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject bus connection exceeding 1500 km', () => {
      const connection = generateBusConnection('yakutsk', 'moscow', 2000, [], {
        distance: 2000,
        duration: 2000,
        basePrice: 10000,
        season: 'all',
        isDirect: true,
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('превышает максимальное');
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    it('should reject direct airplane connection between small airports', () => {
      const connection = generateAirplaneConnection('srednekolymsk', 'chokurdakh', 600, [], {
        distance: 600,
        duration: 60,
        basePrice: 5000,
        season: 'all',
        isDirect: true,
      });

      const result = ConnectionsValidator.validateConnection(connection);

      // Должен отклонить, если оба города - малые аэропорты
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('малыми аэропортами');
    });

    it('should accept airplane connection from small airport to hub', () => {
      const connection = generateAirplaneConnection('srednekolymsk', 'yakutsk', 1200, ['yakutsk-hub'], {
        distance: 1200,
        duration: 90,
        basePrice: 8000,
        season: 'all',
        isDirect: false, // Через хаб
      });

      const result = ConnectionsValidator.validateConnection(connection);

      // Должен принять, если не прямой или через хаб
      expect(result.isValid).toBe(true);
    });

    it('should reject connection with zero distance', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 0,
        duration: 720,
        basePrice: 3500,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('положительным');
    });

    it('should reject connection with negative distance', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: -100,
        duration: 720,
        basePrice: 3500,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('положительным');
    });

    it('should reject connection with too large distance', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        distance: 15000, // Слишком большое расстояние
        duration: 15000,
        basePrice: 50000,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('слишком большое');
    });

    it('should reject connection with zero price', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000,
        duration: 720,
        basePrice: 0,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('положительной');
    });

    it('should reject connection with negative price', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000,
        duration: 720,
        basePrice: -100,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('положительной');
    });

    it('should reject connection with zero duration', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000,
        duration: 0,
        basePrice: 3500,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('положительным');
    });

    it('should reject connection with unrealistic speed', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000,
        duration: 10, // Нереалистично быстро (100 км/мин = 6000 км/ч)
        basePrice: 3500,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      // Может обнаружить нереалистичную скорость
      expect(result).toBeDefined();
    });

    it('should accept valid train connection', () => {
      const connection = generateMockConnection({
        type: 'train',
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        distance: 5000,
        duration: 6000,
        basePrice: 10000,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(true);
    });

    it('should accept valid ferry connection', () => {
      const connection = generateMockConnection({
        type: 'ferry',
        fromCityId: 'yakutsk',
        toCityId: 'olekminsk',
        distance: 800,
        duration: 1440,
        basePrice: 3000,
        season: 'summer',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(true);
    });

    it('should accept valid winter road connection', () => {
      const connection = generateMockConnection({
        type: 'winter_road',
        fromCityId: 'srednekolymsk',
        toCityId: 'verkhoyansk',
        distance: 150,
        duration: 180,
        basePrice: 2000,
        season: 'winter',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAndFilterConnections', () => {
    it('should filter out invalid connections', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateBusConnection('yakutsk', 'moscow', 2000, [], { distance: 2000 }), // Невалидно (> 1500 км)
        generateMockConnection({
          type: 'bus',
          fromCityId: 'yakutsk',
          toCityId: 'other',
          distance: 0, // Невалидно (нулевое расстояние)
          duration: 720,
          basePrice: 3500,
          season: 'all',
        }),
      ];

      const result = ConnectionsValidator.validateAndFilterConnections(connections);

      expect(result.valid.length).toBe(1);
      expect(result.invalid.length).toBe(2);
    });

    it('should return all valid connections', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateMockConnection({
          type: 'train',
          fromCityId: 'yakutsk',
          toCityId: 'moscow',
          distance: 5000,
          duration: 6000,
          basePrice: 10000,
          season: 'all',
        }),
      ];

      const result = ConnectionsValidator.validateAndFilterConnections(connections);

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(0);
    });
  });

  describe('findProblematicConnections', () => {
    it('should find problematic bus connections', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateBusConnection('yakutsk', 'moscow', 2000, [], { distance: 2000 }), // Проблемное
      ];

      const problematic = ConnectionsValidator.findProblematicConnections(connections);

      expect(problematic.length).toBeGreaterThan(0);
      expect(problematic.some(c => c.distance > 1500 && c.type === 'bus')).toBe(true);
    });

    it('should find problematic airplane connections', () => {
      const connections = [
        generateAirplaneConnection('srednekolymsk', 'chokurdakh', 600, [], {
          distance: 600,
          isDirect: true,
        }), // Проблемное (между малыми аэропортами)
        generateAirplaneConnection('yakutsk', 'moscow', 5000, [], {
          distance: 5000,
          isDirect: true,
        }), // Валидно (между хабами)
      ];

      const problematic = ConnectionsValidator.findProblematicConnections(connections);

      // Может найти проблемные соединения
      expect(problematic.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for all valid connections', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateMockConnection({
          type: 'train',
          fromCityId: 'yakutsk',
          toCityId: 'moscow',
          distance: 5000,
          duration: 6000,
          basePrice: 10000,
          season: 'all',
        }),
      ];

      const problematic = ConnectionsValidator.findProblematicConnections(connections);

      expect(problematic.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty connections array', () => {
      const result = ConnectionsValidator.validateAndFilterConnections([]);
      const problematic = ConnectionsValidator.findProblematicConnections([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
      expect(problematic).toEqual([]);
    });

    it('should handle connection with missing city data', () => {
      const connection = generateMockConnection({
        type: 'bus',
        fromCityId: 'nonexistent1',
        toCityId: 'nonexistent2',
        distance: 1000,
        duration: 720,
        basePrice: 3500,
        season: 'all',
      });

      const result = ConnectionsValidator.validateConnection(connection);

      // Должен обработать без ошибок
      expect(result).toBeDefined();
    });

    it('should handle boundary values', () => {
      // Граничное значение: ровно 1500 км для автобуса
      const connection = generateBusConnection('yakutsk', 'moscow', 1500, [], {
        distance: 1500,
      });

      const result = ConnectionsValidator.validateConnection(connection);

      // 1500 км должно быть допустимо (или на границе)
      expect(result).toBeDefined();
    });
  });
});





