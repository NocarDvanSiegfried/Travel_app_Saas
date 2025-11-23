/**
 * Unit Tests: Airports Loader
 * 
 * Tests for airports reference loading and city lookup.
 */

import { loadAirportsReference, getCityByAirportName } from '../../../shared/utils/airports-loader';

describe('Airports Loader', () => {
  describe('loadAirportsReference', () => {
    it('should load airports reference from JSON file', () => {
      const airportsMap = loadAirportsReference();

      expect(airportsMap).toBeInstanceOf(Map);
      expect(airportsMap.size).toBeGreaterThan(0);
    });

    it('should cache the loaded reference', () => {
      const map1 = loadAirportsReference();
      const map2 = loadAirportsReference();

      expect(map1).toBe(map2);
    });

    it('should include airport names in the map', () => {
      const airportsMap = loadAirportsReference();

      expect(airportsMap.has('туймаада')).toBe(true);
      expect(airportsMap.get('туймаада')).toBe('Якутск');
    });

    it('should include aliases in the map', () => {
      const airportsMap = loadAirportsReference();

      expect(airportsMap.has('yks')).toBe(true);
      expect(airportsMap.get('yks')).toBe('Якутск');
      expect(airportsMap.has('svo')).toBe(true);
      expect(airportsMap.get('svo')).toBe('Москва');
    });

    it('should normalize airport names (case insensitive)', () => {
      const airportsMap = loadAirportsReference();

      // Keys in map are normalized to lowercase
      expect(airportsMap.has('туймаада')).toBe(true);
      expect(airportsMap.has('шереметьево')).toBe(true);
    });
  });

  describe('getCityByAirportName', () => {
    it('should return city name for known airport', () => {
      const city = getCityByAirportName('Туймаада');

      expect(city).toBe('Якутск');
    });

    it('should return city name for airport alias', () => {
      const city = getCityByAirportName('YKS');

      expect(city).toBe('Якутск');
    });

    it('should return city name for airport alias (lowercase)', () => {
      const city = getCityByAirportName('svo');

      expect(city).toBe('Москва');
    });

    it('should return undefined for unknown airport', () => {
      const city = getCityByAirportName('Unknown Airport');

      expect(city).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const city = getCityByAirportName('');

      expect(city).toBeUndefined();
    });

    it('should handle airport names with spaces', () => {
      const city = getCityByAirportName('  Туймаада  ');

      expect(city).toBe('Якутск');
    });

    it('should return city for Шереметьево', () => {
      const city = getCityByAirportName('Шереметьево');

      expect(city).toBe('Москва');
    });

    it('should return city for Пулково', () => {
      const city = getCityByAirportName('Пулково');

      expect(city).toBe('Санкт-Петербург');
    });

    it('should return city for Толмачёво', () => {
      const city = getCityByAirportName('Толмачёво');

      expect(city).toBe('Новосибирск');
    });
  });
});

