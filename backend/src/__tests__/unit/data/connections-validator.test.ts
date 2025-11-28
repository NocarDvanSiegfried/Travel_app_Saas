/**
 * Тесты для валидатора соединений
 */

import { ConnectionsValidator } from '../../../domain/smart-routing/data/connections-validator';
import type { CityConnection } from '../../../domain/smart-routing/data/connections-model';

describe('ConnectionsValidator', () => {
  describe('validateConnection', () => {
    it('должен отклонять автобусные маршруты > 1500 км', () => {
      const connection: CityConnection = {
        id: 'bus-test',
        type: 'bus',
        fromCityId: 'moscow',
        toCityId: 'yakutsk',
        distance: 5000, // Превышает максимум
        duration: 60000,
        basePrice: 10000,
        season: 'all',
        isDirect: true,
      };

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('превышает максимальное');
      expect(result.recommendations).toBeDefined();
    });

    it('должен принимать автобусные маршруты <= 1500 км', () => {
      const connection: CityConnection = {
        id: 'bus-test',
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000, // В пределах нормы
        duration: 720,
        basePrice: 3500,
        season: 'all',
        isDirect: false,
      };

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(true);
    });

    it('должен отклонять прямые авиарейсы между малыми аэропортами на большие расстояния', () => {
      const connection: CityConnection = {
        id: 'air-test',
        type: 'airplane',
        fromCityId: 'srednekolymsk', // Малый аэропорт (класс D, не хаб)
        toCityId: 'chokurdakh', // Малый аэропорт (класс D, не хаб)
        distance: 1000, // Превышает максимум для малых аэропортов
        duration: 120,
        basePrice: 15000,
        season: 'all',
        isDirect: true,
      };

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('между малыми аэропортами');
      expect(result.recommendations).toBeDefined();
    });

    it('должен отклонять соединения с нулевым или отрицательным расстоянием', () => {
      const connection: CityConnection = {
        id: 'test',
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: -100,
        duration: 720,
        basePrice: 3500,
        season: 'all',
        isDirect: true,
      };

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('положительным');
    });

    it('должен отклонять соединения с нереалистичной скоростью', () => {
      const connection: CityConnection = {
        id: 'test',
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000,
        duration: 1, // Слишком быстро (1000 км за 1 минуту = 60000 км/ч)
        basePrice: 3500,
        season: 'all',
        isDirect: true,
      };

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('нереалистична');
    });

    it('должен принимать валидные соединения', () => {
      const connection: CityConnection = {
        id: 'test',
        type: 'bus',
        fromCityId: 'yakutsk',
        toCityId: 'mirny',
        distance: 1000,
        duration: 720, // 12 часов = 83 км/ч - реалистично
        basePrice: 3500,
        season: 'all',
        isDirect: false,
      };

      const result = ConnectionsValidator.validateConnection(connection);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAndFilterConnections', () => {
    it('должен фильтровать невалидные соединения', () => {
      const connections: CityConnection[] = [
        {
          id: 'valid',
          type: 'bus',
          fromCityId: 'yakutsk',
          toCityId: 'mirny',
          distance: 1000,
          duration: 720,
          basePrice: 3500,
          season: 'all',
          isDirect: false,
        },
        {
          id: 'invalid',
          type: 'bus',
          fromCityId: 'moscow',
          toCityId: 'yakutsk',
          distance: 5000, // Превышает максимум
          duration: 60000,
          basePrice: 10000,
          season: 'all',
          isDirect: true,
        },
      ];

      const result = ConnectionsValidator.validateAndFilterConnections(connections);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0].id).toBe('valid');
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].connection.id).toBe('invalid');
    });
  });

  describe('findProblematicConnections', () => {
    it('должен находить проблемные соединения', () => {
      const connections: CityConnection[] = [
        {
          id: 'valid',
          type: 'bus',
          fromCityId: 'yakutsk',
          toCityId: 'mirny',
          distance: 1000,
          duration: 720,
          basePrice: 3500,
          season: 'all',
          isDirect: false,
        },
        {
          id: 'problematic',
          type: 'bus',
          fromCityId: 'moscow',
          toCityId: 'yakutsk',
          distance: 5000,
          duration: 60000,
          basePrice: 10000,
          season: 'all',
          isDirect: true,
        },
      ];

      const problematic = ConnectionsValidator.findProblematicConnections(connections);

      expect(problematic).toHaveLength(1);
      expect(problematic[0].connection.id).toBe('problematic');
      expect(problematic[0].reason).toBeDefined();
      expect(problematic[0].recommendations).toBeDefined();
    });
  });
});






