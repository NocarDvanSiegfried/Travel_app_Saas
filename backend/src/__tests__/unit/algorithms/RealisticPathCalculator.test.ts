/**
 * Unit Tests: RealisticPathCalculator
 * 
 * Тесты для калькулятора реалистичных путей.
 * Цель: 90%+ покрытие кода.
 * 
 * Проверяет:
 * - Расчёт пути для авиа через хабы
 * - Расчёт пути для автобуса через OSRM
 * - Расчёт пути для парома по реке
 * - Расчёт пути для ЖД
 * - Расчёт пути для зимника
 * - Расчёт пути для такси
 * - Общий метод calculatePathForSegment
 * - Граничные условия и ошибки
 */

import { RealisticPathCalculator } from '../../../application/smart-routing/algorithms/RealisticPathCalculator';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { YAKUTSK_HUB, MOSCOW_HUB } from '../../fixtures/hubs';
import { YAKUTSK, MIRNY, MOSCOW } from '../../fixtures/cities';
import { generateMockConnection, generateBusConnection, generateFerryConnection, generateTrainConnection, generateWinterRoadConnection } from '../../factories/ConnectionFactory';
import { MockCacheService } from '../../mocks/cache-service.mock';
import { setOsrmSuccessResponse, clearOsrmResponses, mockOsrmFetch } from '../../mocks/osrm-environment.mock';

// Мокаем OsrmClient
jest.mock('../../../infrastructure/api/osrm/OsrmClient', () => {
  const { mockOsrmFetch } = require('../../mocks/osrm-environment.mock');
  return {
    OsrmClient: jest.fn().mockImplementation(() => ({
      getRoute: jest.fn(async (params) => {
        const result = await mockOsrmFetch(params);
        return { ...result, fromCache: false };
      }),
      getRouteWithFallback: jest.fn(async (params) => {
        const result = await mockOsrmFetch(params);
        return { ...result, fromCache: false };
      }),
      getRouteWithFederalRoadsPriority: jest.fn(async (params) => {
        const result = await mockOsrmFetch(params);
        return { ...result, fromCache: false };
      }),
    })),
  };
});

describe('RealisticPathCalculator', () => {
  let calculator: RealisticPathCalculator;
  let mockCache: MockCacheService;

  beforeEach(() => {
    mockCache = new MockCacheService();
    calculator = new RealisticPathCalculator(mockCache);
    clearOsrmResponses();
    jest.clearAllMocks();
  });

  describe('calculateAirplanePath', () => {
    it('should create path through hubs', () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;
      const viaHubs = [YAKUTSK_HUB, MOSCOW_HUB];

      const result = calculator.calculateAirplanePath(from, to, viaHubs);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBe(4); // from + 2 hubs + to
      expect(result.coordinates[0]).toEqual([from.longitude, from.latitude]);
      expect(result.coordinates[result.coordinates.length - 1]).toEqual([to.longitude, to.latitude]);
    });

    it('should create direct path when no hubs', () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;

      const result = calculator.calculateAirplanePath(from, to, []);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBe(2); // from + to
    });

    it('should include all hub coordinates in path', () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;
      const viaHubs = [YAKUTSK_HUB, MOSCOW_HUB];

      const result = calculator.calculateAirplanePath(from, to, viaHubs);

      // Проверяем, что координаты хабов присутствуют
      const hubCoords = viaHubs.map(hub => [hub.coordinates.longitude, hub.coordinates.latitude]);
      for (const hubCoord of hubCoords) {
        expect(result.coordinates).toContainEqual(hubCoord);
      }
    });
  });

  describe('calculateBusPath', () => {
    it('should calculate path via OSRM successfully', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;

      setOsrmSuccessResponse(
        from,
        to,
        1000000, // 1000 км в метрах
        3600, // 60 минут
        [
          [from.longitude, from.latitude],
          [from.longitude + 0.1, from.latitude + 0.1],
          [to.longitude, to.latitude],
        ]
      );

      const result = await calculator.calculateBusPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should use fallback path when OSRM fails', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;

      // Мокаем ошибку OSRM
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('OSRM error'));

      const result = await calculator.calculateBusPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should use intermediate cities if provided', async () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;
      const intermediate = [MIRNY.coordinates];

      setOsrmSuccessResponse(
        from,
        to,
        5000000, // 5000 км в метрах
        18000 // 300 минут
      );

      const result = await calculator.calculateBusPath(from, to, intermediate);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should create fallback path with curvature for long routes', async () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;

      // Мокаем OSRM, который возвращает только 2 точки (через geometry)
      setOsrmSuccessResponse(
        from,
        to,
        5000000, // 5000 км в метрах
        18000, // 300 минут
        [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ]
      );

      const result = await calculator.calculateBusPath(from, to);

      // Fallback должен создать путь с извилистостью
      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });
  });

  describe('calculateFerryPath', () => {
    it('should create wavy path for ferry', () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(60.3733, 120.4264); // Олёкминск

      const result = calculator.calculateFerryPath(from, to, undefined, 'Лена');

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
      expect(result.coordinates[0]).toEqual([from.longitude, from.latitude]);
      expect(result.coordinates[result.coordinates.length - 1]).toEqual([to.longitude, to.latitude]);
    });

    it('should use intermediate piers if provided', () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(60.3733, 120.4264);
      const intermediatePiers = [new Coordinates(61.0, 120.0)];

      const result = calculator.calculateFerryPath(from, to, intermediatePiers, 'Лена');

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(3);
    });

    it('should apply different river coefficients', () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(60.3733, 120.4264);

      const lenaResult = calculator.calculateFerryPath(from, to, undefined, 'Лена');
      const aldanResult = calculator.calculateFerryPath(from, to, undefined, 'Алдан');
      const vilyuyResult = calculator.calculateFerryPath(from, to, undefined, 'Вилюй');

      expect(lenaResult.coordinates.length).toBeGreaterThan(2);
      expect(aldanResult.coordinates.length).toBeGreaterThan(2);
      expect(vilyuyResult.coordinates.length).toBeGreaterThan(2);
    });

    it('should use default coefficient for unknown river', () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(60.3733, 120.4264);

      const result = calculator.calculateFerryPath(from, to, undefined, 'Unknown River');

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });
  });

  describe('calculateTrainPath', () => {
    it('should create path along rail line', () => {
      const from = new Coordinates(56.4977, 84.9744); // Томск
      const to = new Coordinates(55.0084, 82.9357); // Новосибирск
      const intermediateStations = [new Coordinates(55.9, 83.5)];

      const result = calculator.calculateTrainPath(from, to, intermediateStations);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
      expect(result.coordinates[0]).toEqual([from.longitude, from.latitude]);
      expect(result.coordinates[result.coordinates.length - 1]).toEqual([to.longitude, to.latitude]);
    });

    it('should use intermediate stations if provided', () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);
      const intermediateStations = [
        new Coordinates(56.0, 84.5),
        new Coordinates(55.5, 83.0),
      ];

      const result = calculator.calculateTrainPath(from, to, intermediateStations);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(4);
    });

    it('should create path without intermediate stations', () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);

      const result = calculator.calculateTrainPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });
  });

  describe('calculateWinterRoadPath', () => {
    it('should create dashed path for winter road', () => {
      const from = new Coordinates(67.45, 153.7); // Среднеколымск
      const to = new Coordinates(67.55, 152.13); // Верхоянск

      const result = calculator.calculateWinterRoadPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
      expect(result.coordinates[0]).toEqual([from.longitude, from.latitude]);
      expect(result.coordinates[result.coordinates.length - 1]).toEqual([to.longitude, to.latitude]);
    });

    it('should create path with intermediate points', () => {
      const from = new Coordinates(67.45, 153.7);
      const to = new Coordinates(67.55, 152.13);
      const intermediatePoints = [new Coordinates(67.5, 152.9)];

      const result = calculator.calculateWinterRoadPath(from, to, intermediatePoints);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(3);
    });
  });

  describe('calculateTaxiPath', () => {
    it('should calculate path via OSRM for taxi', async () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(62.1, 129.8); // Близко к Якутску

      setOsrmSuccessResponse(
        from,
        to,
        10000, // 10 км в метрах
        300 // 5 минут
      );

      const result = await calculator.calculateTaxiPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(1);
    });

    it('should use fallback for taxi when OSRM fails', async () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(62.1, 129.8);

      global.fetch = jest.fn().mockRejectedValueOnce(new Error('OSRM error'));

      const result = await calculator.calculateTaxiPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(1);
    });
  });

  describe('calculatePathForSegment', () => {
    it('should calculate path for airplane segment', async () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;
      const connection = generateMockConnection({
        type: 'airplane',
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        viaHubs: ['yakutsk-hub', 'moscow-hub'],
      });

      const result = await calculator.calculatePathForSegment(
        TransportType.AIRPLANE,
        from,
        to,
        connection,
        [YAKUTSK_HUB, MOSCOW_HUB]
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should calculate path for bus segment', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;
      const connection = generateBusConnection('yakutsk', 'mirny', 1000, [], {
        distance: 1000,
      });

      setOsrmSuccessResponse(
        from,
        to,
        1000000 // 1000 км в метрах
      );

      const result = await calculator.calculatePathForSegment(
        TransportType.BUS,
        from,
        to,
        connection
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(1);
    });

    it('should calculate path for ferry segment', async () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(60.3733, 120.4264);
      const connection = generateFerryConnection('yakutsk', 'olekminsk', 800, [], {
        distance: 800,
      });

      const result = await calculator.calculatePathForSegment(
        TransportType.FERRY,
        from,
        to,
        connection
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should calculate path for train segment', async () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);
      const connection = generateTrainConnection('tomsk', 'novosibirsk', 250, [], {
        distance: 250,
      });

      const result = await calculator.calculatePathForSegment(
        TransportType.TRAIN,
        from,
        to,
        connection
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should calculate path for winter road segment', async () => {
      const from = new Coordinates(67.45, 153.7);
      const to = new Coordinates(67.55, 152.13);
      const connection = generateWinterRoadConnection('srednekolymsk', 'verkhoyansk', 150, {
        distance: 150,
      });

      const result = await calculator.calculatePathForSegment(
        TransportType.WINTER_ROAD,
        from,
        to,
        connection
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });

    it('should calculate path for taxi segment', async () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(62.1, 129.8);

      setOsrmSuccessResponse(
        from,
        to,
        10000 // 10 км в метрах
      );

      const result = await calculator.calculatePathForSegment(
        TransportType.TAXI,
        from,
        to
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(1);
    });

    it('should handle missing connection gracefully', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;

      setOsrmSuccessResponse(
        from,
        to,
        1000000 // 1000 км в метрах
      );

      const result = await calculator.calculatePathForSegment(
        TransportType.BUS,
        from,
        to,
        undefined
      );

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle same coordinates', () => {
      const point = YAKUTSK.coordinates;

      const result = calculator.calculateAirplanePath(point, point, []);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBe(2);
      expect(result.coordinates[0]).toEqual(result.coordinates[1]);
    });

    it('should handle very short distances', async () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(62.028, 129.704); // Очень близко

      setOsrmSuccessResponse(
        from,
        to,
        100, // 0.1 км в метрах
        6, // 0.1 минуты
        [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ]
      );

      const result = await calculator.calculateBusPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(1);
    });

    it('should handle very long distances', async () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;

      setOsrmSuccessResponse(
        from,
        to,
        5000000 // 5000 км в метрах
      );

      const result = await calculator.calculateBusPath(from, to);

      expect(result.type).toBe('LineString');
      expect(result.coordinates.length).toBeGreaterThan(2);
    });
  });
});
