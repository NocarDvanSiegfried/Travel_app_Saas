/**
 * Unit Tests: SmartRoute
 * 
 * Тесты для Entity умного маршрута.
 * Цель: 95-100% покрытие кода.
 * 
 * Проверяет:
 * - Создание маршрута
 * - Валидацию структуры
 * - Вычисление totalDistance, totalDuration, totalPrice
 * - Форматирование данных
 * - Методы маршрута (getTransferCount, getTransportTypes, isDirect, getAllStopsInOrder)
 * - Граничные условия
 * - Негативные сценарии
 */

import { SmartRoute, formatTotalDuration } from '../../../../../domain/smart-routing/entities/SmartRoute';
import { generateMockRoute } from '../../../../factories/RouteFactory';
import { generateMockSegment } from '../../../../factories/SegmentFactory';
import { generateMockCity } from '../../../../factories/CityFactory';
import { YAKUTSK, MIRNY, MOSCOW } from '../../../../fixtures/cities';
import { TransportType } from '../../../../../domain/entities/RouteSegment';
import { Stop } from '../../../../../domain/smart-routing/entities/Stop';
import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { createDistanceModel } from '../../../../../domain/smart-routing/value-objects/DistanceModel';
import { createPriceModel } from '../../../../../domain/smart-routing/value-objects/PriceModel';
import { createSeasonality } from '../../../../../domain/smart-routing/value-objects/Seasonality';
import { createVisualizationMetadata } from '../../../../../domain/smart-routing/value-objects/VisualizationMetadata';
import { DistanceCalculationMethod } from '../../../../../domain/smart-routing/enums/DistanceCalculationMethod';
import { Season } from '../../../../../domain/smart-routing/enums/Season';

describe('SmartRoute', () => {
  describe('constructor', () => {
    it('should create route with valid parameters', () => {
      const fromCity = YAKUTSK;
      const toCity = MIRNY;
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: fromCity.getAirports()[0],
        to: toCity.getAirports()[0],
      });

      const route = generateMockRoute({
        fromCity,
        toCity,
        segments: [segment],
      });

      expect(route.id).toBeDefined();
      expect(route.fromCity).toBe(fromCity);
      expect(route.toCity).toBe(toCity);
      expect(route.segments).toHaveLength(1);
      expect(route.totalDistance).toBeDefined();
      expect(route.totalDuration).toBeDefined();
      expect(route.totalPrice).toBeDefined();
      expect(route.validation.isValid).toBe(true);
    });

    it('should throw error for empty id', () => {
      const fromCity = YAKUTSK;
      const toCity = MIRNY;
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: fromCity.getAirports()[0],
        to: toCity.getAirports()[0],
      });

      expect(() => {
        new SmartRoute(
          '',
          fromCity,
          toCity,
          [segment],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', breakdown: { travel: 100, transfers: 0 }, display: '100 минут' },
          createPriceModel(10000),
          { isValid: true, errors: [], warnings: [] },
          createVisualizationMetadata([], [])
        );
      }).toThrow('SmartRoute: id is required');
    });

    it('should throw error for empty segments array', () => {
      const fromCity = YAKUTSK;
      const toCity = MIRNY;

      expect(() => {
        new SmartRoute(
          'route-1',
          fromCity,
          toCity,
          [],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', breakdown: { travel: 100, transfers: 0 }, display: '100 минут' },
          createPriceModel(10000),
          { isValid: true, errors: [], warnings: [] },
          createVisualizationMetadata([], [])
        );
      }).toThrow('SmartRoute: segments array cannot be empty');
    });

    it('should throw error for disconnected segments', () => {
      const fromCity = YAKUTSK;
      const toCity = MIRNY;
      const intermediateCity = generateMockCity({ id: 'intermediate' });

      const segment1 = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: fromCity.getAirports()[0],
        to: intermediateCity.getAirports()[0],
      });

      const segment2 = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: toCity.getAirports()[0], // Не совпадает с segment1.to
        to: toCity.getAirports()[0],
      });

      expect(() => {
        generateMockRoute({
          fromCity,
          toCity,
          segments: [segment1, segment2],
        });
      }).toThrow(/segments are not connected/);
    });

    it('should throw error if first segment does not start in fromCity', () => {
      const fromCity = YAKUTSK;
      const toCity = MIRNY;
      const wrongCity = generateMockCity({ id: 'wrong' });

      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: wrongCity.getAirports()[0], // Неправильный город
        to: toCity.getAirports()[0],
      });

      expect(() => {
        generateMockRoute({
          fromCity,
          toCity,
          segments: [segment],
        });
      }).toThrow(/first segment must start in fromCity/);
    });

    it('should throw error if last segment does not end in toCity', () => {
      const fromCity = YAKUTSK;
      const toCity = MIRNY;
      const wrongCity = generateMockCity({ id: 'wrong' });

      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: fromCity.getAirports()[0],
        to: wrongCity.getAirports()[0], // Неправильный город
      });

      expect(() => {
        generateMockRoute({
          fromCity,
          toCity,
          segments: [segment],
        });
      }).toThrow(/last segment must end in toCity/);
    });
  });

  describe('getTransferCount', () => {
    it('should return 0 for direct route (single segment)', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.getTransferCount()).toBe(0);
    });

    it('should return 1 for route with 2 segments', () => {
      const intermediateCity = generateMockCity({ id: 'intermediate' });
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: intermediateCity.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: intermediateCity.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.getTransferCount()).toBe(1);
    });

    it('should return correct count for multiple segments', () => {
      const city1 = generateMockCity({ id: 'city1' });
      const city2 = generateMockCity({ id: 'city2' });

      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: city1.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: city1.getAirports()[0],
            to: city2.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: city2.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.getTransferCount()).toBe(2);
    });
  });

  describe('getTransportTypes', () => {
    it('should return single transport type for direct route', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      const types = route.getTransportTypes();
      expect(types.size).toBe(1);
      expect(types.has(TransportType.AIRPLANE)).toBe(true);
    });

    it('should return multiple transport types for multimodal route', () => {
      const intermediateCity = generateMockCity({ id: 'intermediate' });
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: intermediateCity.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.BUS,
            from: intermediateCity.getBusStations()[0],
            to: MIRNY.getBusStations()[0],
          }),
        ],
      });

      const types = route.getTransportTypes();
      expect(types.size).toBe(2);
      expect(types.has(TransportType.AIRPLANE)).toBe(true);
      expect(types.has(TransportType.BUS)).toBe(true);
    });
  });

  describe('isDirect', () => {
    it('should return true for direct route', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
        isDirect: true,
      });

      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [segment],
      });

      expect(route.isDirect()).toBe(true);
    });

    it('should return false for route with transfer', () => {
      const intermediateCity = generateMockCity({ id: 'intermediate' });
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: intermediateCity.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: intermediateCity.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.isDirect()).toBe(false);
    });

    it('should return false for route with non-direct segment', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
        isDirect: false,
      });

      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [segment],
      });

      expect(route.isDirect()).toBe(false);
    });
  });

  describe('getAllStopsInOrder', () => {
    it('should return all stops in order for direct route', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      const stops = route.getAllStopsInOrder();
      expect(stops).toHaveLength(2);
      expect(stops[0].stop.id).toBe(YAKUTSK.getAirports()[0].id);
      expect(stops[1].stop.id).toBe(MIRNY.getAirports()[0].id);
    });

    it('should return all stops including intermediate stops', () => {
      const intermediateCity = generateMockCity({ id: 'intermediate' });
      const intermediateStop = new Stop(
        'intermediate-stop',
        'Промежуточная остановка',
        'bus_station',
        new Coordinates(60.0, 120.0),
        'intermediate'
      );

      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.BUS,
            from: YAKUTSK.getBusStations()[0],
            to: intermediateCity.getBusStations()[0],
            intermediateStops: [intermediateStop],
          }),
          generateMockSegment({
            type: TransportType.BUS,
            from: intermediateCity.getBusStations()[0],
            to: MIRNY.getBusStations()[0],
          }),
        ],
      });

      const stops = route.getAllStopsInOrder();
      expect(stops.length).toBeGreaterThanOrEqual(3);
      expect(stops[0].stop.id).toBe(YAKUTSK.getBusStations()[0].id);
      expect(stops[stops.length - 1].stop.id).toBe(MIRNY.getBusStations()[0].id);
    });
  });

  describe('getTravelTime', () => {
    it('should return sum of segment durations', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: MIRNY.getAirports()[0],
            duration: 100,
          }),
        ],
      });

      expect(route.getTravelTime()).toBe(100);
    });

    it('should return sum for multiple segments', () => {
      const intermediateCity = generateMockCity({ id: 'intermediate' });
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: intermediateCity.getAirports()[0],
            duration: 100,
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: intermediateCity.getAirports()[0],
            to: MIRNY.getAirports()[0],
            duration: 150,
          }),
        ],
      });

      expect(route.getTravelTime()).toBe(250);
    });
  });

  describe('getTransferTime', () => {
    it('should return 0 for direct route', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.getTransferTime()).toBe(0);
    });

    it('should return 30 minutes for one transfer', () => {
      const intermediateCity = generateMockCity({ id: 'intermediate' });
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: intermediateCity.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: intermediateCity.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.getTransferTime()).toBe(30);
    });

    it('should return 60 minutes for two transfers', () => {
      const city1 = generateMockCity({ id: 'city1' });
      const city2 = generateMockCity({ id: 'city2' });

      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: city1.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: city1.getAirports()[0],
            to: city2.getAirports()[0],
          }),
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: city2.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      expect(route.getTransferTime()).toBe(60);
    });
  });

  describe('toJSON', () => {
    it('should serialize route to JSON', () => {
      const route = generateMockRoute({
        fromCity: YAKUTSK,
        toCity: MIRNY,
        segments: [
          generateMockSegment({
            type: TransportType.AIRPLANE,
            from: YAKUTSK.getAirports()[0],
            to: MIRNY.getAirports()[0],
          }),
        ],
      });

      const json = route.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('fromCity');
      expect(json).toHaveProperty('toCity');
      expect(json).toHaveProperty('segments');
      expect(json).toHaveProperty('totalDistance');
      expect(json).toHaveProperty('totalDuration');
      expect(json).toHaveProperty('totalPrice');
      expect(json).toHaveProperty('validation');
      expect(json).toHaveProperty('visualization');
    });
  });
});

describe('formatTotalDuration', () => {
  it('should format minutes correctly', () => {
    expect(formatTotalDuration(30, 0)).toContain('30 минут');
  });

  it('should format hours correctly', () => {
    expect(formatTotalDuration(120, 0)).toContain('2 часа');
  });

  it('should format hours and minutes correctly', () => {
    expect(formatTotalDuration(150, 0)).toContain('2 часа');
    expect(formatTotalDuration(150, 0)).toContain('30 минут');
  });

  it('should include breakdown for travel time', () => {
    const result = formatTotalDuration(180, 0);
    expect(result).toContain('3 часа');
    expect(result).toContain('в пути');
  });

  it('should include breakdown for transfer time', () => {
    const result = formatTotalDuration(180, 30);
    expect(result).toContain('3 часа 30 минут');
    expect(result).toContain('в пути');
    expect(result).toContain('пересадки');
  });

  it('should handle zero duration', () => {
    expect(formatTotalDuration(0, 0)).toBe('0 минут');
  });
});





