/**
 * Unit Tests: City
 * 
 * Тесты для Entity города.
 * Цель: 95-100% покрытие кода.
 * 
 * Проверяет:
 * - Создание города
 * - Административную структуру
 * - Инфраструктуру (аэропорты, вокзалы, автовокзалы)
 * - Координаты
 * - Методы города (getFullName, getNameWithContext, isFederalHub, isRegionalHub, getStopsByType, distanceTo)
 * - Граничные условия
 * - Негативные сценарии
 */

import { City } from '../../../../../domain/smart-routing/entities/City';
import { generateMockCity, generateFederalHub, generateRegionalHub } from '../../../../factories/CityFactory';
import { YAKUTSK, MIRNY, MOSCOW } from '../../../../fixtures/cities';
import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../../../domain/smart-routing/enums/HubLevel';
import { createAdministrativeStructure } from '../../../../../domain/smart-routing/entities/AdministrativeStructure';
import { Stop } from '../../../../../domain/smart-routing/entities/Stop';

describe('City', () => {
  describe('constructor', () => {
    it('should create city with valid parameters', () => {
      const city = generateMockCity({
        id: 'test-city',
        name: 'Тестовый город',
      });

      expect(city.id).toBe('test-city');
      expect(city.name).toBe('Тестовый город');
      expect(city.coordinates).toBeDefined();
      expect(city.administrative).toBeDefined();
      expect(city.infrastructure).toBeDefined();
    });

    it('should throw error for empty id', () => {
      expect(() => {
        new City(
          '',
          'Город',
          'город',
          createAdministrativeStructure(
            { type: 'republic', name: 'Республика', shortName: 'Р', code: 'R' },
            { type: 'city', name: 'Город', normalizedName: 'город' }
          ),
          new Coordinates(62.0278, 129.7042),
          'Asia/Yakutsk',
          false,
          false,
          undefined,
          { hasAirport: false, hasTrainStation: false, hasBusStation: true, hasFerryPier: false, hasWinterRoad: false },
          [],
          []
        );
      }).toThrow('City: id is required');
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new City(
          'test-city',
          '',
          'город',
          createAdministrativeStructure(
            { type: 'republic', name: 'Республика', shortName: 'Р', code: 'R' },
            { type: 'city', name: 'Город', normalizedName: 'город' }
          ),
          new Coordinates(62.0278, 129.7042),
          'Asia/Yakutsk',
          false,
          false,
          undefined,
          { hasAirport: false, hasTrainStation: false, hasBusStation: true, hasFerryPier: false, hasWinterRoad: false },
          [],
          []
        );
      }).toThrow('City: name is required');
    });

    it('should throw error for empty normalizedName', () => {
      expect(() => {
        new City(
          'test-city',
          'Город',
          '',
          createAdministrativeStructure(
            { type: 'republic', name: 'Республика', shortName: 'Р', code: 'R' },
            { type: 'city', name: 'Город', normalizedName: 'город' }
          ),
          new Coordinates(62.0278, 129.7042),
          'Asia/Yakutsk',
          false,
          false,
          undefined,
          { hasAirport: false, hasTrainStation: false, hasBusStation: true, hasFerryPier: false, hasWinterRoad: false },
          [],
          []
        );
      }).toThrow('City: normalizedName is required');
    });

    it('should throw error for empty timezone', () => {
      expect(() => {
        new City(
          'test-city',
          'Город',
          'город',
          createAdministrativeStructure(
            { type: 'republic', name: 'Республика', shortName: 'Р', code: 'R' },
            { type: 'city', name: 'Город', normalizedName: 'город' }
          ),
          new Coordinates(62.0278, 129.7042),
          '',
          false,
          false,
          undefined,
          { hasAirport: false, hasTrainStation: false, hasBusStation: true, hasFerryPier: false, hasWinterRoad: false },
          [],
          []
        );
      }).toThrow('City: timezone is required');
    });

    it('should throw error if isHub is true but hubLevel is undefined', () => {
      expect(() => {
        new City(
          'test-city',
          'Город',
          'город',
          createAdministrativeStructure(
            { type: 'republic', name: 'Республика', shortName: 'Р', code: 'R' },
            { type: 'city', name: 'Город', normalizedName: 'город' }
          ),
          new Coordinates(62.0278, 129.7042),
          'Asia/Yakutsk',
          false,
          true, // isHub
          undefined, // hubLevel missing
          { hasAirport: true, airportClass: 'B', hasTrainStation: false, hasBusStation: true, hasFerryPier: false, hasWinterRoad: false },
          [],
          []
        );
      }).toThrow('City: hubLevel is required when isHub is true');
    });

    it('should throw error if hasAirport is true but airportClass is undefined', () => {
      expect(() => {
        new City(
          'test-city',
          'Город',
          'город',
          createAdministrativeStructure(
            { type: 'republic', name: 'Республика', shortName: 'Р', code: 'R' },
            { type: 'city', name: 'Город', normalizedName: 'город' }
          ),
          new Coordinates(62.0278, 129.7042),
          'Asia/Yakutsk',
          false,
          false,
          undefined,
          { hasAirport: true, airportClass: undefined, hasTrainStation: false, hasBusStation: true, hasFerryPier: false, hasWinterRoad: false },
          [],
          []
        );
      }).toThrow('City: airportClass is required when hasAirport is true');
    });
  });

  describe('getFullName', () => {
    it('should return full administrative name', () => {
      const city = YAKUTSK;
      const fullName = city.getFullName();
      expect(fullName).toContain('Якутск');
      expect(fullName).toContain('Республика Саха');
    });
  });

  describe('getNameWithContext', () => {
    it('should return name with context', () => {
      const city = YAKUTSK;
      const nameWithContext = city.getNameWithContext();
      expect(nameWithContext).toContain('Якутск');
    });
  });

  describe('isFederalHub', () => {
    it('should return true for federal hub', () => {
      const city = generateFederalHub({ id: 'moscow', name: 'Москва' });
      expect(city.isFederalHub()).toBe(true);
    });

    it('should return false for regional hub', () => {
      const city = generateRegionalHub({ id: 'yakutsk', name: 'Якутск' });
      expect(city.isFederalHub()).toBe(false);
    });

    it('should return false for non-hub city', () => {
      const city = generateMockCity({ id: 'test', name: 'Тест', isHub: false });
      expect(city.isFederalHub()).toBe(false);
    });
  });

  describe('isRegionalHub', () => {
    it('should return true for regional hub', () => {
      const city = generateRegionalHub({ id: 'yakutsk', name: 'Якутск' });
      expect(city.isRegionalHub()).toBe(true);
    });

    it('should return false for federal hub', () => {
      const city = generateFederalHub({ id: 'moscow', name: 'Москва' });
      expect(city.isRegionalHub()).toBe(false);
    });

    it('should return false for non-hub city', () => {
      const city = generateMockCity({ id: 'test', name: 'Тест', isHub: false });
      expect(city.isRegionalHub()).toBe(false);
    });
  });

  describe('getStopsByType', () => {
    it('should return airports for airport type', () => {
      const city = YAKUTSK;
      const airports = city.getStopsByType('airport');
      expect(airports.length).toBeGreaterThan(0);
      airports.forEach((stop) => {
        expect(stop.type).toBe('airport');
      });
    });

    it('should return train stations for train_station type', () => {
      const city = generateMockCity({
        id: 'test',
        infrastructure: {
          hasAirport: false,
          hasTrainStation: true,
          hasBusStation: false,
          hasFerryPier: false,
          hasWinterRoad: false,
        },
      });

      const trainStations = city.getStopsByType('train_station');
      expect(trainStations.length).toBeGreaterThan(0);
      trainStations.forEach((stop) => {
        expect(stop.type).toBe('train_station');
      });
    });

    it('should return empty array for type that does not exist', () => {
      const city = generateMockCity({
        id: 'test',
        infrastructure: {
          hasAirport: false,
          hasTrainStation: false,
          hasBusStation: false,
          hasFerryPier: false,
          hasWinterRoad: false,
        },
      });

      const airports = city.getStopsByType('airport');
      expect(airports).toHaveLength(0);
    });
  });

  describe('getAirports', () => {
    it('should return all airports', () => {
      const city = YAKUTSK;
      const airports = city.getAirports();
      expect(airports.length).toBeGreaterThan(0);
      airports.forEach((stop) => {
        expect(stop.type).toBe('airport');
      });
    });
  });

  describe('getTrainStations', () => {
    it('should return all train stations', () => {
      const city = generateMockCity({
        id: 'test',
        infrastructure: {
          hasAirport: false,
          hasTrainStation: true,
          hasBusStation: false,
          hasFerryPier: false,
          hasWinterRoad: false,
        },
      });

      const trainStations = city.getTrainStations();
      expect(trainStations.length).toBeGreaterThan(0);
      trainStations.forEach((stop) => {
        expect(stop.type).toBe('train_station');
      });
    });
  });

  describe('getBusStations', () => {
    it('should return all bus stations', () => {
      const city = YAKUTSK;
      const busStations = city.getBusStations();
      expect(busStations.length).toBeGreaterThan(0);
      busStations.forEach((stop) => {
        expect(stop.type).toBe('bus_station');
      });
    });
  });

  describe('getFerryPiers', () => {
    it('should return all ferry piers', () => {
      const city = YAKUTSK;
      const ferryPiers = city.getFerryPiers();
      expect(ferryPiers.length).toBeGreaterThan(0);
      ferryPiers.forEach((stop) => {
        expect(stop.type).toBe('ferry_pier');
      });
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance to another city', () => {
      const distance = YAKUTSK.distanceTo(MIRNY);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // Реалистичное расстояние
    });

    it('should return 0 for same city', () => {
      const distance = YAKUTSK.distanceTo(YAKUTSK);
      expect(distance).toBe(0);
    });

    it('should be symmetric', () => {
      const distance1 = YAKUTSK.distanceTo(MIRNY);
      const distance2 = MIRNY.distanceTo(YAKUTSK);
      expect(distance1).toBe(distance2);
    });
  });

  describe('toJSON', () => {
    it('should serialize city to JSON', () => {
      const city = YAKUTSK;
      const json = city.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('normalizedName');
      expect(json).toHaveProperty('administrative');
      expect(json).toHaveProperty('coordinates');
      expect(json).toHaveProperty('timezone');
      expect(json).toHaveProperty('infrastructure');
      expect(json).toHaveProperty('stops');
      expect(json).toHaveProperty('synonyms');
    });
  });
});




