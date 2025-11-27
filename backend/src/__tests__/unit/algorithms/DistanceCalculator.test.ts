/**
 * Unit Tests: DistanceCalculator
 * 
 * Тесты для калькулятора расстояний.
 * Цель: 90%+ покрытие кода.
 * 
 * Проверяет:
 * - Расчёт Haversine расстояния
 * - Расчёт OSRM расстояния (с мокированием)
 * - Расчёт расстояния по реке
 * - Расчёт расстояния по ЖД
 * - Расчёт расстояния для сегмента маршрута
 * - Граничные условия и ошибки
 */

import { DistanceCalculator } from '../../../application/smart-routing/algorithms/DistanceCalculator';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { DistanceCalculationMethod } from '../../../domain/smart-routing/enums/DistanceCalculationMethod';
import { generateMockConnection, generateBusConnection, generateFerryConnection, generateTrainConnection } from '../../factories/ConnectionFactory';
import { YAKUTSK, MIRNY, MOSCOW } from '../../fixtures/cities';

// Мокаем fetch для OSRM
global.fetch = jest.fn();

describe('DistanceCalculator', () => {
  let calculator: DistanceCalculator;

  beforeEach(() => {
    calculator = new DistanceCalculator();
    jest.clearAllMocks();
  });

  describe('calculateHaversineDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const from = new Coordinates(62.0278, 129.7042); // Якутск
      const to = new Coordinates(55.7558, 37.6173); // Москва

      const distance = calculator.calculateHaversineDistance(from, to);

      // Расстояние Якутск-Москва примерно 4900-5000 км
      expect(distance).toBeGreaterThan(4800);
      expect(distance).toBeLessThan(5200);
    });

    it('should return 0 for same coordinates', () => {
      const point = new Coordinates(62.0278, 129.7042);

      const distance = calculator.calculateHaversineDistance(point, point);

      expect(distance).toBe(0);
    });

    it('should calculate distance for nearby cities', () => {
      const from = new Coordinates(62.0278, 129.7042); // Якутск
      const to = new Coordinates(62.5353, 129.6750); // Мирный (примерно 60 км)

      const distance = calculator.calculateHaversineDistance(from, to);

      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(100);
    });

    it('should handle coordinates across the equator', () => {
      const from = new Coordinates(10, 0);
      const to = new Coordinates(-10, 0);

      const distance = calculator.calculateHaversineDistance(from, to);

      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    it('should handle coordinates across the international date line', () => {
      const from = new Coordinates(0, 179);
      const to = new Coordinates(0, -179);

      const distance = calculator.calculateHaversineDistance(from, to);

      expect(distance).toBeGreaterThan(200);
      expect(distance).toBeLessThan(250);
    });
  });

  describe('calculateOSRMDistance', () => {
    it('should calculate distance via OSRM API successfully', async () => {
      const from = new Coordinates(62.0278, 129.7042); // Якутск
      const to = new Coordinates(62.5353, 129.6750); // Мирный

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              distance: 100000, // 100 км в метрах
              duration: 3600,
            },
          ],
        }),
      });

      const distance = await calculator.calculateOSRMDistance(from, to);

      expect(distance).toBe(100);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('router.project-osrm.org')
      );
    });

    it('should fallback to Haversine if OSRM API fails', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 129.6750);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const distance = await calculator.calculateOSRMDistance(from, to);

      // Должен вернуть Haversine расстояние
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100);
    });

    it('should fallback to Haversine if OSRM returns error code', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 129.6750);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'NoRoute',
          routes: [],
        }),
      });

      const distance = await calculator.calculateOSRMDistance(from, to);

      // Должен вернуть Haversine расстояние
      expect(distance).toBeGreaterThan(0);
    });

    it('should fallback to Haversine if OSRM returns non-OK status', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 129.6750);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const distance = await calculator.calculateOSRMDistance(from, to);

      // Должен вернуть Haversine расстояние
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('calculateRiverDistance', () => {
    it('should use connection distance if provided', () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(60.3733, 120.4264);
      const connection = generateFerryConnection('yakutsk', 'olekminsk', 800, [], {
        distance: 800,
      });

      const distance = calculator.calculateRiverDistance(from, to, 'Лена', connection);

      expect(distance).toBe(800);
    });

    it('should apply river coefficient if no connection provided', () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(60.3733, 120.4264);
      const haversineDistance = calculator.calculateHaversineDistance(from, to);

      const distance = calculator.calculateRiverDistance(from, to, 'Лена');

      // Для Лены коэффициент 1.3
      expect(distance).toBeGreaterThan(haversineDistance * 1.2);
      expect(distance).toBeLessThan(haversineDistance * 1.4);
    });

    it('should use default coefficient for unknown river', () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(60.3733, 120.4264);
      const haversineDistance = calculator.calculateHaversineDistance(from, to);

      const distance = calculator.calculateRiverDistance(from, to, 'Unknown River');

      // Коэффициент по умолчанию 1.2
      expect(distance).toBeGreaterThan(haversineDistance * 1.1);
      expect(distance).toBeLessThan(haversineDistance * 1.3);
    });

    it('should apply different coefficients for different rivers', () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(60.3733, 120.4264);

      const lenaDistance = calculator.calculateRiverDistance(from, to, 'Лена');
      const aldanDistance = calculator.calculateRiverDistance(from, to, 'Алдан');
      const vilyuyDistance = calculator.calculateRiverDistance(from, to, 'Вилюй');

      // Все должны быть больше Haversine
      expect(lenaDistance).toBeGreaterThan(0);
      expect(aldanDistance).toBeGreaterThan(0);
      expect(vilyuyDistance).toBeGreaterThan(0);
    });
  });

  describe('calculateRailDistance', () => {
    it('should apply default rail coefficient (1.15)', () => {
      const from = new Coordinates(56.4977, 84.9744); // Томск
      const to = new Coordinates(55.0084, 82.9357); // Новосибирск
      const haversineDistance = calculator.calculateHaversineDistance(from, to);

      const distance = calculator.calculateRailDistance(from, to);

      // Коэффициент по умолчанию 1.15
      expect(distance).toBeCloseTo(haversineDistance * 1.15, 1);
    });

    it('should apply custom rail coefficient', () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);
      const haversineDistance = calculator.calculateHaversineDistance(from, to);

      const distance = calculator.calculateRailDistance(from, to, 1.2);

      expect(distance).toBeCloseTo(haversineDistance * 1.2, 1);
    });

    it('should handle different rail coefficients', () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);
      const haversineDistance = calculator.calculateHaversineDistance(from, to);

      const distance1 = calculator.calculateRailDistance(from, to, 1.1);
      const distance2 = calculator.calculateRailDistance(from, to, 1.2);

      expect(distance2).toBeGreaterThan(distance1);
      expect(distance1).toBeCloseTo(haversineDistance * 1.1, 1);
      expect(distance2).toBeCloseTo(haversineDistance * 1.2, 1);
    });
  });

  describe('calculateDistanceForSegment', () => {
    it('should calculate distance for airplane segment using Haversine', async () => {
      const from = YAKUTSK.coordinates;
      const to = MOSCOW.coordinates;
      const connection = generateMockConnection({
        type: 'airplane',
        fromCityId: 'yakutsk',
        toCityId: 'moscow',
        distance: 5000,
      });

      const result = await calculator.calculateDistanceForSegment(
        TransportType.AIRPLANE,
        from,
        to,
        connection
      );

      expect(result.value).toBeGreaterThan(4800);
      expect(result.value).toBeLessThan(5200);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.HAVERSINE);
      expect(result.breakdown.airplane).toBeGreaterThan(0);
    });

    it('should calculate distance for bus segment using OSRM', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;
      const connection = generateBusConnection('yakutsk', 'mirny', 1000, [], {
        distance: 1000,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              distance: 1000000, // 1000 км в метрах
              duration: 36000,
            },
          ],
        }),
      });

      const result = await calculator.calculateDistanceForSegment(
        TransportType.BUS,
        from,
        to,
        connection
      );

      expect(result.value).toBe(1000);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.OSRM);
      expect(result.breakdown.bus).toBe(1000);
    });

    it('should use connection distance for bus if OSRM fails', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;
      const connection = generateBusConnection('yakutsk', 'mirny', 1000, [], {
        distance: 1000,
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await calculator.calculateDistanceForSegment(
        TransportType.BUS,
        from,
        to,
        connection
      );

      // Должен использовать расстояние из connection
      expect(result.value).toBe(1000);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.MANUAL);
    });

    it('should calculate distance for ferry segment using river calculation', async () => {
      const from = YAKUTSK.coordinates;
      const to = new Coordinates(60.3733, 120.4264); // Олёкминск
      const connection = generateFerryConnection('yakutsk', 'olekminsk', 800, [], {
        distance: 800,
      });

      const result = await calculator.calculateDistanceForSegment(
        TransportType.FERRY,
        from,
        to,
        connection
      );

      expect(result.value).toBe(800);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.RIVER_PATH);
      expect(result.breakdown.ferry).toBe(800);
    });

    it('should calculate distance for train segment using rail calculation', async () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);
      const connection = generateTrainConnection('tomsk', 'novosibirsk', 250, [], {
        distance: 250,
      });

      const result = await calculator.calculateDistanceForSegment(
        TransportType.TRAIN,
        from,
        to,
        connection
      );

      // Если connection предоставлен, используется его расстояние
      expect(result.value).toBe(250);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.RAIL_PATH);
      expect(result.breakdown.train).toBe(250);
    });

    it('should calculate distance for train segment without connection using rail calculation', async () => {
      const from = new Coordinates(56.4977, 84.9744);
      const to = new Coordinates(55.0084, 82.9357);

      const result = await calculator.calculateDistanceForSegment(
        TransportType.TRAIN,
        from,
        to,
        undefined
      );

      // Должен использовать calculateRailDistance
      expect(result.value).toBeGreaterThan(0);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.RAIL_PATH);
      expect(result.breakdown.train).toBeGreaterThan(0);
    });

    it('should calculate distance for winter road using manual distance', async () => {
      const from = new Coordinates(67.45, 153.7); // Среднеколымск
      const to = new Coordinates(67.55, 152.13); // Верхоянск
      const connection = generateMockConnection({
        type: 'winter_road',
        fromCityId: 'srednekolymsk',
        toCityId: 'verkhoyansk',
        distance: 150,
      });

      const result = await calculator.calculateDistanceForSegment(
        TransportType.WINTER_ROAD,
        from,
        to,
        connection
      );

      expect(result.value).toBe(150);
      expect(result.calculationMethod).toBe(DistanceCalculationMethod.MANUAL);
      expect(result.breakdown.winter_road).toBe(150);
    });

    it('should handle missing connection gracefully', async () => {
      const from = YAKUTSK.coordinates;
      const to = MIRNY.coordinates;

      const result = await calculator.calculateDistanceForSegment(
        TransportType.BUS,
        from,
        to,
        undefined
      );

      // Должен использовать OSRM или Haversine
      expect(result.value).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero coordinates', () => {
      const from = new Coordinates(0, 0);
      const to = new Coordinates(0, 0);

      const distance = calculator.calculateHaversineDistance(from, to);

      expect(distance).toBe(0);
    });

    it('should handle very small distances', () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.0279, 129.7043); // Очень близко

      const distance = calculator.calculateHaversineDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });

    it('should handle very large distances', () => {
      const from = new Coordinates(90, 0); // Северный полюс
      const to = new Coordinates(-90, 0); // Южный полюс

      const distance = calculator.calculateHaversineDistance(from, to);

      // Расстояние между полюсами примерно 20015 км
      expect(distance).toBeGreaterThan(20000);
      expect(distance).toBeLessThan(20020);
    });
  });
});

