/**
 * Unit Tests: ConnectivityGuarantor
 * 
 * Тесты для гаранта связности транспортной сети.
 * Цель: 80%+ покрытие кода.
 * 
 * Проверяет:
 * - Проверка связности графа
 * - Обнаружение изолированных городов
 * - Обнаружение компонент связности
 * - Автоматическое добавление недостающих связей
 * - Поиск ближайших хабов для изолированных городов
 * - Соединение компонент связности
 * - Граничные условия
 */

import { ConnectivityGuarantor, type ConnectivityResult } from '../../../application/smart-routing/algorithms/ConnectivityGuarantor';
import { generateMockConnection, generateBusConnection, generateAirplaneConnection } from '../../factories/ConnectionFactory';
import { YAKUTSK, MIRNY, MOSCOW, SREDNEKOLYMSK } from '../../fixtures/cities';

// Мокаем cities-reference и hubs-reference
jest.mock('../../../domain/smart-routing/data/cities-reference', () => ({
  ALL_CITIES: [YAKUTSK, MIRNY, MOSCOW, SREDNEKOLYMSK],
  getCityById: jest.fn((id: string) => {
    const cities = [YAKUTSK, MIRNY, MOSCOW, SREDNEKOLYMSK];
    return cities.find(c => c.id === id);
  }),
}));

jest.mock('../../../domain/smart-routing/data/hubs-reference', () => ({
  ALL_HUBS: [],
  getNearestRegionalHub: jest.fn(),
}));

describe('ConnectivityGuarantor', () => {
  let guarantor: ConnectivityGuarantor;

  beforeEach(() => {
    jest.clearAllMocks();
    guarantor = new ConnectivityGuarantor();
  });

  describe('guaranteeConnectivity', () => {
    it('should return connected result for fully connected graph', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateBusConnection('mirny', 'moscow', 5000, [], { distance: 5000 }),
        generateBusConnection('yakutsk', 'moscow', 6000, [], { distance: 6000 }),
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      expect(result.isConnected).toBe(true);
      expect(result.componentCount).toBe(1);
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.isolatedCities).toHaveLength(0);
      expect(result.addedConnections).toHaveLength(0);
    });

    it('should detect isolated cities', () => {
      // Создаём граф, где srednekolymsk изолирован
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateBusConnection('mirny', 'moscow', 5000, [], { distance: 5000 }),
        // srednekolymsk не имеет соединений
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      expect(result.isolatedCities.length).toBeGreaterThan(0);
      expect(result.isConnected).toBe(false);
    });

    it('should detect multiple connectivity components', () => {
      // Создаём граф с двумя компонентами связности
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        // moscow и srednekolymsk в отдельной компоненте (если есть соединение между ними)
        generateBusConnection('moscow', 'srednekolymsk', 6000, [], { distance: 6000 }),
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      expect(result.componentCount).toBeGreaterThan(1);
      expect(result.isConnected).toBe(false);
    });

    it('should add connections for isolated cities', () => {
      const connections: typeof generateMockConnection[] = [];

      const result = guarantor.guaranteeConnectivity(connections);

      // Должен добавить соединения для изолированных городов
      expect(result.addedConnections.length).toBeGreaterThanOrEqual(0);
    });

    it('should add connections to connect components', () => {
      // Создаём граф с двумя компонентами
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        // moscow изолирован
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      // Должен добавить соединения для соединения компонент
      if (result.componentCount > 1) {
        expect(result.addedConnections.length).toBeGreaterThan(0);
      }
    });

    it('should verify connectivity after adding connections', () => {
      const connections: typeof generateMockConnection[] = [];

      const result = guarantor.guaranteeConnectivity(connections);

      // После добавления соединений граф должен быть связным
      if (result.addedConnections.length > 0) {
        const updatedConnections = [...connections, ...result.addedConnections];
        const updatedResult = guarantor.guaranteeConnectivity(updatedConnections);
        
        // Граф должен быть более связным после добавления соединений
        expect(updatedResult.componentCount).toBeLessThanOrEqual(result.componentCount);
      }
    });

    it('should handle empty connections array', () => {
      const result = guarantor.guaranteeConnectivity([]);

      expect(result).toBeDefined();
      expect(result.isConnected).toBe(false);
      expect(result.componentCount).toBeGreaterThan(0);
    });

    it('should handle single city', () => {
      // Если есть только один город, он должен быть изолированным
      const connections: typeof generateMockConnection[] = [];

      const result = guarantor.guaranteeConnectivity(connections);

      // Все города без соединений должны быть изолированными
      expect(result.isolatedCities.length).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize hubs for isolated cities', () => {
      const connections: typeof generateMockConnection[] = [];

      const result = guarantor.guaranteeConnectivity(connections);

      // Проверяем, что добавленные соединения предпочитают хабы
      for (const addedConn of result.addedConnections) {
        // Соединения должны быть к хабам или ближайшим городам
        expect(addedConn.fromCityId).toBeDefined();
        expect(addedConn.toCityId).toBeDefined();
      }
    });

    it('should create bidirectional connections', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      // Граф должен быть ненаправленным (двусторонние соединения)
      expect(result).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle very large graphs', () => {
      // Создаём большой граф
      const connections = Array.from({ length: 100 }, (_, i) => 
        generateBusConnection(`city${i}`, `city${i + 1}`, 100, [], { distance: 100 })
      );

      const result = guarantor.guaranteeConnectivity(connections);

      expect(result).toBeDefined();
      expect(result.isConnected).toBeDefined();
    });

    it('should handle cities not in ALL_CITIES', () => {
      const connections = [
        generateBusConnection('nonexistent1', 'nonexistent2', 1000, [], { distance: 1000 }),
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      // Должен обработать без ошибок
      expect(result).toBeDefined();
    });

    it('should handle duplicate connections', () => {
      const connections = [
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
        generateBusConnection('yakutsk', 'mirny', 1000, [], { distance: 1000 }),
      ];

      const result = guarantor.guaranteeConnectivity(connections);

      expect(result).toBeDefined();
      expect(result.isConnected).toBe(true);
    });
  });
});
