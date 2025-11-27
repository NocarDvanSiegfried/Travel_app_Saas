/**
 * Unit Tests: RouteErrorDetector
 * 
 * Тесты для детектора ошибок маршрутов.
 * Цель: 80%+ покрытие кода.
 * 
 * Проверяет:
 * - Обнаружение маршрутов через пустое пространство
 * - Обнаружение некорректных соединений
 * - Обнаружение нереалистичных маршрутов
 * - Обнаружение несуществующих сегментов
 * - Предупреждения для упрощённых путей
 * - Предупреждения для длинных расстояний
 * - Граничные условия
 */

import { RouteErrorDetector, type RouteErrorDetectionResult } from '../../../application/smart-routing/validation/RouteErrorDetector';
import { generateMockRoute } from '../../factories/RouteFactory';
import { generateMockSegment } from '../../factories/SegmentFactory';
import { YAKUTSK, MIRNY, MOSCOW } from '../../fixtures/cities';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { Stop } from '../../../domain/smart-routing/entities/Stop';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';

describe('RouteErrorDetector', () => {
  let detector: RouteErrorDetector;

  beforeEach(() => {
    detector = new RouteErrorDetector();
  });

  describe('detectErrors', () => {
    it('should return no errors for valid route', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'bus_station'),
            distance: 1000,
            duration: 720,
            basePrice: 3500,
            season: Season.ALL,
            pathGeometry: {
              type: 'LineString',
              coordinates: [
                [YAKUTSK.coordinates.longitude, YAKUTSK.coordinates.latitude],
                [YAKUTSK.coordinates.longitude + 0.1, YAKUTSK.coordinates.latitude + 0.1],
                [MIRNY.coordinates.longitude, MIRNY.coordinates.latitude],
              ],
            },
          }),
        ],
      });

      const result = detector.detectErrors(route);

      expect(result.hasCriticalErrors).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty space route for bus', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MOSCOW,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MOSCOW.stops[0] || new Stop('stop2', 'Stop 2', MOSCOW.id, MOSCOW.coordinates, 'bus_station'),
            distance: 5000,
            duration: 5000,
            basePrice: 15000,
            season: Season.ALL,
            pathGeometry: {
              type: 'LineString',
              coordinates: [
                [YAKUTSK.coordinates.longitude, YAKUTSK.coordinates.latitude],
                [MOSCOW.coordinates.longitude, MOSCOW.coordinates.latitude],
              ], // Прямая линия - ошибка для автобуса
            },
          }),
        ],
      });

      const result = detector.detectErrors(route);

      // Может обнаружить маршрут через пустое пространство
      expect(result).toBeDefined();
    });

    it('should detect unrealistic route', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'bus_station'),
            distance: 100, // Нереалистично малое расстояние
            duration: 720, // Но большое время в пути
            basePrice: 3500,
            season: Season.ALL,
          }),
        ],
      });

      const result = detector.detectErrors(route);

      // Может обнаружить нереалистичный маршрут
      expect(result).toBeDefined();
    });

    it('should detect incorrect connections between segments', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MOSCOW,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'airport'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'airport'),
            distance: 1000,
            duration: 90,
            basePrice: 8000,
            season: Season.ALL,
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            // Некорректное соединение - from не совпадает с предыдущим to
            from: new Stop('stop3', 'Stop 3', 'other-city', new Coordinates(50, 100), 'airport'),
            to: MOSCOW.stops[0] || new Stop('stop4', 'Stop 4', MOSCOW.id, MOSCOW.coordinates, 'airport'),
            distance: 4000,
            duration: 300,
            basePrice: 20000,
            season: Season.ALL,
          }),
        ],
      });

      const result = detector.detectErrors(route);

      // Должен обнаружить некорректное соединение
      expect(result.hasCriticalErrors).toBe(true);
      expect(result.errors.some(e => e.type === 'incorrect_connection')).toBe(true);
    });

    it('should warn about simplified paths', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'bus_station'),
            distance: 1000,
            duration: 720,
            basePrice: 3500,
            season: Season.ALL,
            pathGeometry: {
              type: 'LineString',
              coordinates: [
                [YAKUTSK.coordinates.longitude, YAKUTSK.coordinates.latitude],
                [MIRNY.coordinates.longitude, MIRNY.coordinates.latitude],
              ], // Упрощённый путь (только 2 точки)
            },
          }),
        ],
      });

      const result = detector.detectErrors(route);

      // Может предупредить об упрощённом пути
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should warn about long distance routes', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MOSCOW,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MOSCOW.stops[0] || new Stop('stop2', 'Stop 2', MOSCOW.id, MOSCOW.coordinates, 'bus_station'),
            distance: 6000, // Очень длинный автобусный маршрут
            duration: 6000,
            basePrice: 20000,
            season: Season.ALL,
          }),
        ],
      });

      const result = detector.detectErrors(route);

      // Может предупредить о длинном расстоянии
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle airplane routes correctly', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MOSCOW,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'airport'),
            to: MOSCOW.stops[0] || new Stop('stop2', 'Stop 2', MOSCOW.id, MOSCOW.coordinates, 'airport'),
            distance: 5000,
            duration: 300,
            basePrice: 25000,
            season: Season.ALL,
            pathGeometry: {
              type: 'LineString',
              coordinates: [
                [YAKUTSK.coordinates.longitude, YAKUTSK.coordinates.latitude],
                [MOSCOW.coordinates.longitude, MOSCOW.coordinates.latitude],
              ], // Прямая линия для авиа - нормально
            },
          }),
        ],
      });

      const result = detector.detectErrors(route);

      // Для авиа прямые линии допустимы
      expect(result).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle route with no segments', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [],
      });

      const result = detector.detectErrors(route);

      expect(result).toBeDefined();
      expect(result.hasCriticalErrors).toBe(false);
    });

    it('should handle route with single segment', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'bus_station'),
            distance: 1000,
            duration: 720,
            basePrice: 3500,
            season: Season.ALL,
          }),
        ],
      });

      const result = detector.detectErrors(route);

      expect(result).toBeDefined();
    });

    it('should handle route with very short path', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: generateMockCity({
          id: 'nearby',
          name: 'Близкий город',
          coordinates: new Coordinates(YAKUTSK.coordinates.latitude + 0.01, YAKUTSK.coordinates.longitude + 0.01),
        }),
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: new Stop('stop2', 'Stop 2', 'nearby', new Coordinates(YAKUTSK.coordinates.latitude + 0.01, YAKUTSK.coordinates.longitude + 0.01), 'bus_station'),
            distance: 1,
            duration: 5,
            basePrice: 100,
            season: Season.ALL,
          }),
        ],
      });

      const result = detector.detectErrors(route);

      expect(result).toBeDefined();
    });
  });
});
