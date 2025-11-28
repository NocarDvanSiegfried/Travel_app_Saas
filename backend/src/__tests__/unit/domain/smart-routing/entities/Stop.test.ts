/**
 * Unit Tests: Stop
 * 
 * Тесты для Entity остановки.
 * Цель: 95-100% покрытие кода.
 * 
 * Проверяет:
 * - Создание остановки
 * - Типы остановок (airport, train_station, bus_station, ferry_pier)
 * - Связь с городом
 * - Методы остановки (isAirport, isTrainStation, isBusStation, isFerryPier, distanceTo)
 * - Граничные условия
 * - Негативные сценарии
 */

import { Stop } from '../../../../../domain/smart-routing/entities/Stop';
import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../../../domain/smart-routing/enums/HubLevel';
import { YAKUTSK, MIRNY } from '../../../../fixtures/cities';

describe('Stop', () => {
  describe('constructor', () => {
    it('should create stop with valid parameters', () => {
      const stop = new Stop(
        'test-stop',
        'Тестовая остановка',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.id).toBe('test-stop');
      expect(stop.name).toBe('Тестовая остановка');
      expect(stop.type).toBe('airport');
      expect(stop.coordinates).toBeDefined();
      expect(stop.cityId).toBe('yakutsk');
    });

    it('should create stop with all optional parameters', () => {
      const stop = new Stop(
        'test-stop',
        'Тестовая остановка',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        true, // isHub
        HubLevel.REGIONAL, // hubLevel
        'YAK', // airportCode
        undefined, // trainStationCode
        undefined, // pierName
        { custom: 'data' } // metadata
      );

      expect(stop.isHub).toBe(true);
      expect(stop.hubLevel).toBe(HubLevel.REGIONAL);
      expect(stop.airportCode).toBe('YAK');
      expect(stop.metadata).toEqual({ custom: 'data' });
    });

    it('should throw error for empty id', () => {
      expect(() => {
        new Stop(
          '',
          'Остановка',
          'airport',
          new Coordinates(62.0278, 129.7042),
          'yakutsk'
        );
      }).toThrow('Stop: id is required');
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new Stop(
          'test-stop',
          '',
          'airport',
          new Coordinates(62.0278, 129.7042),
          'yakutsk'
        );
      }).toThrow('Stop: name is required');
    });

    it('should throw error for empty cityId', () => {
      expect(() => {
        new Stop(
          'test-stop',
          'Остановка',
          'airport',
          new Coordinates(62.0278, 129.7042),
          ''
        );
      }).toThrow('Stop: cityId is required');
    });

    it('should throw error if isHub is true but hubLevel is undefined', () => {
      expect(() => {
        new Stop(
          'test-stop',
          'Остановка',
          'airport',
          new Coordinates(62.0278, 129.7042),
          'yakutsk',
          true, // isHub
          undefined // hubLevel missing
        );
      }).toThrow('Stop: hubLevel is required when isHub is true');
    });

    it('should warn if airport type without airportCode', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      new Stop(
        'test-stop',
        'Остановка',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('airportCode is recommended for airport stops')
      );

      consoleSpy.mockRestore();
    });

    it('should warn if train_station type without trainStationCode', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      new Stop(
        'test-stop',
        'Остановка',
        'train_station',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('trainStationCode is recommended for train stations')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isAirport', () => {
    it('should return true for airport type', () => {
      const stop = new Stop(
        'airport',
        'Аэропорт',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.isAirport()).toBe(true);
    });

    it('should return false for non-airport type', () => {
      const stop = new Stop(
        'bus-station',
        'Автовокзал',
        'bus_station',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.isAirport()).toBe(false);
    });
  });

  describe('isTrainStation', () => {
    it('should return true for train_station type', () => {
      const stop = new Stop(
        'train-station',
        'Вокзал',
        'train_station',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        false,
        undefined,
        undefined,
        'TEST'
      );

      expect(stop.isTrainStation()).toBe(true);
    });

    it('should return false for non-train_station type', () => {
      const stop = new Stop(
        'airport',
        'Аэропорт',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.isTrainStation()).toBe(false);
    });
  });

  describe('isBusStation', () => {
    it('should return true for bus_station type', () => {
      const stop = new Stop(
        'bus-station',
        'Автовокзал',
        'bus_station',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.isBusStation()).toBe(true);
    });

    it('should return false for non-bus_station type', () => {
      const stop = new Stop(
        'airport',
        'Аэропорт',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.isBusStation()).toBe(false);
    });
  });

  describe('isFerryPier', () => {
    it('should return true for ferry_pier type', () => {
      const stop = new Stop(
        'ferry-pier',
        'Пристань',
        'ferry_pier',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        false,
        undefined,
        undefined,
        undefined,
        'Пристань'
      );

      expect(stop.isFerryPier()).toBe(true);
    });

    it('should return false for non-ferry_pier type', () => {
      const stop = new Stop(
        'airport',
        'Аэропорт',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.isFerryPier()).toBe(false);
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance to another stop', () => {
      const stop1 = YAKUTSK.getAirports()[0];
      const stop2 = MIRNY.getAirports()[0];

      const distance = stop1.distanceTo(stop2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000);
    });

    it('should return 0 for same stop', () => {
      const stop = YAKUTSK.getAirports()[0];
      const distance = stop.distanceTo(stop);
      expect(distance).toBe(0);
    });

    it('should be symmetric', () => {
      const stop1 = YAKUTSK.getAirports()[0];
      const stop2 = MIRNY.getAirports()[0];

      const distance1 = stop1.distanceTo(stop2);
      const distance2 = stop2.distanceTo(stop1);
      expect(distance1).toBe(distance2);
    });
  });

  describe('toJSON', () => {
    it('should serialize stop to JSON', () => {
      const stop = new Stop(
        'test-stop',
        'Тестовая остановка',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        true,
        HubLevel.REGIONAL,
        'YAK'
      );

      const json = stop.toJSON();

      expect(json).toHaveProperty('id', 'test-stop');
      expect(json).toHaveProperty('name', 'Тестовая остановка');
      expect(json).toHaveProperty('type', 'airport');
      expect(json).toHaveProperty('coordinates');
      expect(json).toHaveProperty('cityId', 'yakutsk');
      expect(json).toHaveProperty('isHub', true);
      expect(json).toHaveProperty('hubLevel', HubLevel.REGIONAL);
      expect(json).toHaveProperty('airportCode', 'YAK');
    });
  });

  describe('all stop types', () => {
    it('should create airport stop', () => {
      const stop = new Stop(
        'airport',
        'Аэропорт',
        'airport',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        false,
        undefined,
        'YAK'
      );

      expect(stop.type).toBe('airport');
      expect(stop.airportCode).toBe('YAK');
    });

    it('should create train_station stop', () => {
      const stop = new Stop(
        'train-station',
        'Вокзал',
        'train_station',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        false,
        undefined,
        undefined,
        'TEST'
      );

      expect(stop.type).toBe('train_station');
      expect(stop.trainStationCode).toBe('TEST');
    });

    it('should create bus_station stop', () => {
      const stop = new Stop(
        'bus-station',
        'Автовокзал',
        'bus_station',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.type).toBe('bus_station');
    });

    it('should create ferry_pier stop', () => {
      const stop = new Stop(
        'ferry-pier',
        'Пристань',
        'ferry_pier',
        new Coordinates(62.0278, 129.7042),
        'yakutsk',
        false,
        undefined,
        undefined,
        undefined,
        'Пристань'
      );

      expect(stop.type).toBe('ferry_pier');
      expect(stop.pierName).toBe('Пристань');
    });

    it('should create winter_road_point stop', () => {
      const stop = new Stop(
        'winter-road',
        'Зимник',
        'winter_road_point',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.type).toBe('winter_road_point');
    });

    it('should create taxi_stand stop', () => {
      const stop = new Stop(
        'taxi-stand',
        'Стоянка такси',
        'taxi_stand',
        new Coordinates(62.0278, 129.7042),
        'yakutsk'
      );

      expect(stop.type).toBe('taxi_stand');
    });
  });
});






