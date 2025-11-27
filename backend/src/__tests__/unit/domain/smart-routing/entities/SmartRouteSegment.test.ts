/**
 * Unit Tests: SmartRouteSegment
 * 
 * Тесты для Entity сегмента маршрута.
 * Цель: 95-100% покрытие кода.
 * 
 * Проверяет:
 * - Создание сегмента
 * - Валидацию данных сегмента
 * - Вычисление расстояния, длительности, цены
 * - Проверку доступности по дате
 * - Методы сегмента (getTotalStopsCount, getAllStopsInOrder)
 * - Граничные условия
 * - Негативные сценарии
 */

import { SmartRouteSegment, formatDuration } from '../../../../../domain/smart-routing/entities/SmartRouteSegment';
import { generateMockSegment } from '../../../../factories/SegmentFactory';
import { generateMockCity } from '../../../../factories/CityFactory';
import { YAKUTSK, MIRNY } from '../../../../fixtures/cities';
import { TransportType } from '../../../../../domain/entities/RouteSegment';
import { Stop } from '../../../../../domain/smart-routing/entities/Stop';
import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { createDistanceModel } from '../../../../../domain/smart-routing/value-objects/DistanceModel';
import { createPriceModel } from '../../../../../domain/smart-routing/value-objects/PriceModel';
import { createSeasonality } from '../../../../../domain/smart-routing/value-objects/Seasonality';
import { DistanceCalculationMethod } from '../../../../../domain/smart-routing/enums/DistanceCalculationMethod';
import { Season } from '../../../../../domain/smart-routing/enums/Season';

describe('SmartRouteSegment', () => {
  describe('constructor', () => {
    it('should create segment with valid parameters', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
      });

      expect(segment.id).toBeDefined();
      expect(segment.type).toBe(TransportType.AIRPLANE);
      expect(segment.from).toBeDefined();
      expect(segment.to).toBeDefined();
      expect(segment.distance).toBeDefined();
      expect(segment.duration).toBeDefined();
      expect(segment.price).toBeDefined();
      expect(segment.seasonality).toBeDefined();
      expect(segment.pathGeometry).toBeDefined();
    });

    it('should throw error for empty id', () => {
      expect(() => {
        new SmartRouteSegment(
          '',
          TransportType.AIRPLANE,
          YAKUTSK.getAirports()[0],
          MIRNY.getAirports()[0],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [113.9606, 62.5381]] },
          true
        );
      }).toThrow('SmartRouteSegment: id is required');
    });

    it('should throw error if from and to are the same', () => {
      const stop = YAKUTSK.getAirports()[0];
      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.AIRPLANE,
          stop,
          stop,
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [129.7042, 62.0278]] },
          true
        );
      }).toThrow('SmartRouteSegment: from and to stops must be different');
    });

    it('should throw error for zero or negative distance', () => {
      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.AIRPLANE,
          YAKUTSK.getAirports()[0],
          MIRNY.getAirports()[0],
          createDistanceModel(0, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [113.9606, 62.5381]] },
          true
        );
      }).toThrow('SmartRouteSegment: distance must be greater than 0');
    });

    it('should throw error for zero or negative duration', () => {
      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.AIRPLANE,
          YAKUTSK.getAirports()[0],
          MIRNY.getAirports()[0],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 0, unit: 'minutes', display: '0 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [113.9606, 62.5381]] },
          true
        );
      }).toThrow('SmartRouteSegment: duration must be greater than 0');
    });

    it('should throw error for zero or negative price', () => {
      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.AIRPLANE,
          YAKUTSK.getAirports()[0],
          MIRNY.getAirports()[0],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(0),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [113.9606, 62.5381]] },
          true
        );
      }).toThrow('SmartRouteSegment: price must be greater than 0');
    });

    it('should throw error for pathGeometry with less than 2 coordinates', () => {
      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.AIRPLANE,
          YAKUTSK.getAirports()[0],
          MIRNY.getAirports()[0],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278]] },
          true
        );
      }).toThrow('SmartRouteSegment: pathGeometry must have at least 2 coordinates');
    });

    it('should throw error for airplane with hubs but insufficient coordinates', () => {
      const hub = generateMockCity({ id: 'hub', isHub: true });
      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.AIRPLANE,
          YAKUTSK.getAirports()[0],
          MIRNY.getAirports()[0],
          createDistanceModel(1000, DistanceCalculationMethod.HAVERSINE),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [113.9606, 62.5381]] },
          false,
          undefined,
          [hub]
        );
      }).toThrow(/pathGeometry must have at least 3 coordinates/);
    });

    it('should throw error for direct segment with intermediate stops', () => {
      const intermediateStop = new Stop(
        'intermediate',
        'Промежуточная',
        'bus_station',
        new Coordinates(60.0, 120.0),
        'city'
      );

      expect(() => {
        new SmartRouteSegment(
          'segment-1',
          TransportType.BUS,
          YAKUTSK.getBusStations()[0],
          MIRNY.getBusStations()[0],
          createDistanceModel(1000, DistanceCalculationMethod.OSRM),
          { value: 100, unit: 'minutes', display: '100 минут' },
          createPriceModel(10000),
          createSeasonality(Season.ALL),
          { type: 'LineString', coordinates: [[129.7042, 62.0278], [113.9606, 62.5381]] },
          true, // isDirect
          [intermediateStop] // intermediateStops
        );
      }).toThrow('SmartRouteSegment: direct segment cannot have intermediate stops');
    });
  });

  describe('isAvailableOnDate', () => {
    it('should return true for available seasonality', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
        season: Season.ALL,
      });

      expect(segment.isAvailableOnDate(new Date())).toBe(true);
    });

    it('should return false for unavailable seasonality', () => {
      const segment = generateMockSegment({
        type: TransportType.FERRY,
        from: YAKUTSK.getFerryPiers()[0],
        to: MIRNY.getFerryPiers()[0],
        season: Season.WINTER, // Паром недоступен зимой
      });

      const winterDate = new Date('2024-01-15');
      expect(segment.isAvailableOnDate(winterDate)).toBe(false);
    });
  });

  describe('getTotalStopsCount', () => {
    it('should return 2 for segment without intermediate stops', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
      });

      expect(segment.getTotalStopsCount()).toBe(2);
    });

    it('should return correct count with intermediate stops', () => {
      const intermediateStop = new Stop(
        'intermediate',
        'Промежуточная',
        'bus_station',
        new Coordinates(60.0, 120.0),
        'city'
      );

      const segment = generateMockSegment({
        type: TransportType.BUS,
        from: YAKUTSK.getBusStations()[0],
        to: MIRNY.getBusStations()[0],
        intermediateStops: [intermediateStop],
      });

      expect(segment.getTotalStopsCount()).toBe(3);
    });

    it('should return correct count with multiple intermediate stops', () => {
      const stop1 = new Stop('stop1', 'Остановка 1', 'bus_station', new Coordinates(60.0, 120.0), 'city');
      const stop2 = new Stop('stop2', 'Остановка 2', 'bus_station', new Coordinates(61.0, 121.0), 'city');

      const segment = generateMockSegment({
        type: TransportType.BUS,
        from: YAKUTSK.getBusStations()[0],
        to: MIRNY.getBusStations()[0],
        intermediateStops: [stop1, stop2],
      });

      expect(segment.getTotalStopsCount()).toBe(4);
    });
  });

  describe('getAllStopsInOrder', () => {
    it('should return from and to stops for segment without intermediate stops', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
      });

      const stops = segment.getAllStopsInOrder();
      expect(stops).toHaveLength(2);
      expect(stops[0].id).toBe(YAKUTSK.getAirports()[0].id);
      expect(stops[1].id).toBe(MIRNY.getAirports()[0].id);
    });

    it('should return all stops in order including intermediate stops', () => {
      const stop1 = new Stop('stop1', 'Остановка 1', 'bus_station', new Coordinates(60.0, 120.0), 'city');
      const stop2 = new Stop('stop2', 'Остановка 2', 'bus_station', new Coordinates(61.0, 121.0), 'city');

      const segment = generateMockSegment({
        type: TransportType.BUS,
        from: YAKUTSK.getBusStations()[0],
        to: MIRNY.getBusStations()[0],
        intermediateStops: [stop1, stop2],
      });

      const stops = segment.getAllStopsInOrder();
      expect(stops).toHaveLength(4);
      expect(stops[0].id).toBe(YAKUTSK.getBusStations()[0].id);
      expect(stops[1].id).toBe('stop1');
      expect(stops[2].id).toBe('stop2');
      expect(stops[3].id).toBe(MIRNY.getBusStations()[0].id);
    });
  });

  describe('toJSON', () => {
    it('should serialize segment to JSON', () => {
      const segment = generateMockSegment({
        type: TransportType.AIRPLANE,
        from: YAKUTSK.getAirports()[0],
        to: MIRNY.getAirports()[0],
      });

      const json = segment.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('from');
      expect(json).toHaveProperty('to');
      expect(json).toHaveProperty('distance');
      expect(json).toHaveProperty('duration');
      expect(json).toHaveProperty('price');
      expect(json).toHaveProperty('seasonality');
      expect(json).toHaveProperty('pathGeometry');
      expect(json).toHaveProperty('isDirect');
    });
  });
});

describe('formatDuration', () => {
  it('should format minutes correctly', () => {
    expect(formatDuration(30)).toBe('30 минут');
  });

  it('should format hours correctly', () => {
    expect(formatDuration(120)).toBe('2 часа');
  });

  it('should format hours and minutes correctly', () => {
    expect(formatDuration(150)).toBe('2 часа 30 минут');
  });

  it('should handle singular forms correctly', () => {
    expect(formatDuration(60)).toBe('1 час');
    expect(formatDuration(61)).toBe('1 час 1 минута');
  });

  it('should handle plural forms correctly', () => {
    expect(formatDuration(120)).toBe('2 часа');
    expect(formatDuration(125)).toBe('2 часа 5 минут');
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0 минут');
  });
});




