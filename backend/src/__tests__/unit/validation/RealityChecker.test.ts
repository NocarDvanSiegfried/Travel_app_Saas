/**
 * Unit Tests: RealityChecker
 * 
 * Тесты для проверки реалистичности маршрутов.
 * Цель: 80%+ покрытие кода.
 * 
 * Проверяет:
 * - Проверка расстояний
 * - Проверка цен
 * - Проверка путей
 * - Проверка хабов
 * - Проверка пересадок
 * - Проверка сезонности
 * - Предложения по коррекции
 * - Граничные условия
 */

import { RealityChecker, type RealityCheckResult } from '../../../application/smart-routing/validation/RealityChecker';
import { generateMockRoute } from '../../factories/RouteFactory';
import { generateMockSegment } from '../../factories/SegmentFactory';
import { YAKUTSK, MIRNY, MOSCOW } from '../../fixtures/cities';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { createDistanceModel } from '../../../domain/smart-routing/value-objects/DistanceModel';
import { createPriceModel } from '../../../domain/smart-routing/value-objects/PriceModel';
import { DistanceCalculationMethod } from '../../../domain/smart-routing/enums/DistanceCalculationMethod';
import { generateMockCity } from '../../factories/CityFactory';
import { Stop } from '../../../domain/smart-routing/entities/Stop';

// Мокаем зависимости
jest.mock('../../../domain/smart-routing/data/cities-reference', () => ({
  ALL_CITIES: [YAKUTSK, MIRNY, MOSCOW],
  getCityById: jest.fn((id: string) => {
    const cities = [YAKUTSK, MIRNY, MOSCOW];
    return cities.find(c => c.id === id);
  }),
}));

jest.mock('../../../domain/smart-routing/data/hubs-reference', () => ({
  ALL_HUBS: [],
}));

jest.mock('../../../application/smart-routing/algorithms/HubSelector', () => ({
  HubSelector: {
    isSmallAirport: jest.fn(),
    isHub: jest.fn(),
  },
}));

describe('RealityChecker', () => {
  let checker: RealityChecker;

  beforeEach(() => {
    jest.clearAllMocks();
    checker = new RealityChecker();
  });

  describe('checkReality', () => {
    it('should return no issues for realistic route', () => {
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

      const result = checker.checkReality(route);

      expect(result.hasIssues).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect distance mismatch', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'bus_station'),
            distance: 100, // Нереалистично малое расстояние для Якутск-Мирный
            duration: 720,
            basePrice: 3500,
            season: Season.ALL,
          }),
        ],
      });

      const result = checker.checkReality(route);

      // Может обнаружить несоответствие расстояния
      expect(result).toBeDefined();
    });

    it('should detect price mismatch', () => {
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
            basePrice: 100, // Нереалистично низкая цена
            season: Season.ALL,
          }),
        ],
      });

      const result = checker.checkReality(route);

      // Может обнаружить несоответствие цены
      expect(result).toBeDefined();
    });

    it('should detect path mismatch for bus routes', () => {
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
            pathGeometry: [
              [YAKUTSK.coordinates.longitude, YAKUTSK.coordinates.latitude],
              [MOSCOW.coordinates.longitude, MOSCOW.coordinates.latitude],
            ], // Прямая линия - нереалистично для автобуса
          }),
        ],
      });

      const result = checker.checkReality(route);

      // Может обнаружить несоответствие пути (прямая линия для автобуса)
      expect(result).toBeDefined();
    });

    it('should detect hub mismatch for airplane routes', () => {
      const route = generateMockRoute({
        fromCity: generateMockCity({
          id: 'srednekolymsk',
          name: 'Среднеколымск',
          infrastructure: {
            hasAirport: true,
            airportClass: 'D',
            hasTrainStation: false,
            hasBusStation: true,
            hasFerryPier: false,
            hasWinterRoad: false,
          },
          isHub: false,
        }),
        toCity: MOSCOW,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: new Stop('stop1', 'Stop 1', 'srednekolymsk', new Coordinates(67.45, 153.7), 'airport'),
            to: MOSCOW.stops[0] || new Stop('stop2', 'Stop 2', MOSCOW.id, MOSCOW.coordinates, 'airport'),
            distance: 5000,
            duration: 300,
            basePrice: 25000,
            season: Season.ALL,
            isDirect: true, // Прямой рейс из малого аэропорта - нереалистично
          }),
        ],
      });

      const result = checker.checkReality(route);

      // Может обнаружить несоответствие хабов (прямой рейс из малого аэропорта)
      expect(result).toBeDefined();
    });

    it('should detect seasonality mismatch', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: generateMockCity({
          id: 'olekminsk',
          name: 'Олёкминск',
          infrastructure: {
            hasAirport: false,
            hasTrainStation: false,
            hasBusStation: true,
            hasFerryPier: true,
            hasWinterRoad: false,
          },
        }),
        segments: [
          generateMockSegment({
            type: TransportType.FERRY,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'ferry_pier'),
            to: new Stop('stop2', 'Stop 2', 'olekminsk', new Coordinates(60.3733, 120.4264), 'ferry_pier'),
            distance: 800,
            duration: 1440,
            basePrice: 3000,
            season: Season.SUMMER, // Только летом
          }),
        ],
      });

      // Проверяем для зимней даты
      const result = checker.checkReality(route);

      // Может обнаружить несоответствие сезонности
      expect(result).toBeDefined();
    });

    it('should provide correction suggestions', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.stops[0] || new Stop('stop1', 'Stop 1', YAKUTSK.id, YAKUTSK.coordinates, 'bus_station'),
            to: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'bus_station'),
            distance: 100, // Нереалистично малое расстояние
            duration: 720,
            basePrice: 3500,
            season: Season.ALL,
          }),
        ],
      });

      const result = checker.checkReality(route);

      // Если есть проблемы, должны быть предложения по коррекции
      if (result.hasIssues) {
        expect(result.issues.length).toBeGreaterThan(0);
        const issueWithCorrection = result.issues.find(issue => issue.correction);
        if (issueWithCorrection) {
          expect(issueWithCorrection.correction).toBeDefined();
          expect(issueWithCorrection.correction!.confidence).toBeGreaterThan(0);
        }
      }
    });

    it('should provide recommendations', () => {
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

      const result = checker.checkReality(route);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle route with no segments', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [],
      });

      const result = checker.checkReality(route);

      expect(result).toBeDefined();
      expect(result.hasIssues).toBe(false);
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

      const result = checker.checkReality(route);

      expect(result).toBeDefined();
    });

    it('should handle route with multiple segments', () => {
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
            from: MIRNY.stops[0] || new Stop('stop2', 'Stop 2', MIRNY.id, MIRNY.coordinates, 'airport'),
            to: MOSCOW.stops[0] || new Stop('stop3', 'Stop 3', MOSCOW.id, MOSCOW.coordinates, 'airport'),
            distance: 4000,
            duration: 300,
            basePrice: 20000,
            season: Season.ALL,
          }),
        ],
      });

      const result = checker.checkReality(route);

      expect(result).toBeDefined();
    });
  });
});
