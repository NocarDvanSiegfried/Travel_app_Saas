/**
 * Unit Tests: Unified Cities Loader
 * 
 * Tests for unified cities reference loading and city lookup.
 */

import {
  loadUnifiedCitiesReference,
  getUnifiedCity,
  isCityInUnifiedReference,
  getAllFederalCities,
  getAllYakutiaCitiesUnified,
  getAllUnifiedCities,
  getUnifiedCitiesDirectory,
} from '../../../shared/utils/unified-cities-loader';

describe('Unified Cities Loader', () => {
  describe('loadUnifiedCitiesReference', () => {
    it('should load unified cities reference from JSON files', () => {
      const citiesMap = loadUnifiedCitiesReference();

      expect(citiesMap).toBeInstanceOf(Map);
      expect(citiesMap.size).toBeGreaterThan(0);
    });

    it('should cache the loaded reference', () => {
      const map1 = loadUnifiedCitiesReference();
      const map2 = loadUnifiedCitiesReference();

      expect(map1).toBe(map2);
    });

    it('should include Yakutia cities in the map', () => {
      const citiesMap = loadUnifiedCitiesReference();

      expect(citiesMap.has('якутск')).toBe(true);
      const yakutsk = citiesMap.get('якутск');
      expect(yakutsk).toBeDefined();
      expect(yakutsk?.isFederalCity).toBe(false);
    });

    it('should include federal cities in the map', () => {
      const citiesMap = loadUnifiedCitiesReference();

      expect(citiesMap.has('москва')).toBe(true);
      const moscow = citiesMap.get('москва');
      expect(moscow).toBeDefined();
      expect(moscow?.isFederalCity).toBe(true);
    });

    it('should normalize city names (case insensitive)', () => {
      const citiesMap = loadUnifiedCitiesReference();

      // Keys in map are normalized to lowercase via normalizeCityName
      expect(citiesMap.has('якутск')).toBe(true);
      expect(citiesMap.has('москва')).toBe(true);
    });
  });

  describe('getUnifiedCity', () => {
    it('should return unified city for known Yakutia city', () => {
      const city = getUnifiedCity('Якутск');

      expect(city).toBeDefined();
      expect(city?.name).toBe('Якутск');
      expect(city?.isFederalCity).toBe(false);
    });

    it('should return unified city for known federal city', () => {
      const city = getUnifiedCity('Москва');

      expect(city).toBeDefined();
      expect(city?.name).toBe('Москва');
      expect(city?.isFederalCity).toBe(true);
    });

    it('should return undefined for unknown city', () => {
      const city = getUnifiedCity('Unknown City');

      expect(city).toBeUndefined();
    });

    it('should handle city names with spaces', () => {
      const city = getUnifiedCity('  Якутск  ');

      expect(city).toBeDefined();
      expect(city?.name).toBe('Якутск');
    });

    it('should be case insensitive', () => {
      const city1 = getUnifiedCity('якутск');
      const city2 = getUnifiedCity('ЯКУТСК');
      const city3 = getUnifiedCity('Якутск');

      expect(city1).toBeDefined();
      expect(city2).toBeDefined();
      expect(city3).toBeDefined();
      expect(city1?.name).toBe('Якутск');
      expect(city2?.name).toBe('Якутск');
      expect(city3?.name).toBe('Якутск');
    });
  });

  describe('isCityInUnifiedReference', () => {
    it('should return true for known Yakutia city', () => {
      const result = isCityInUnifiedReference('Якутск');

      expect(result).toBe(true);
    });

    it('should return true for known federal city', () => {
      const result = isCityInUnifiedReference('Москва');

      expect(result).toBe(true);
    });

    it('should return false for unknown city', () => {
      const result = isCityInUnifiedReference('Unknown City');

      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isCityInUnifiedReference('якутск')).toBe(true);
      expect(isCityInUnifiedReference('ЯКУТСК')).toBe(true);
      expect(isCityInUnifiedReference('Якутск')).toBe(true);
    });
  });

  describe('getAllFederalCities', () => {
    it('should return array of federal cities', () => {
      const federalCities = getAllFederalCities();

      expect(Array.isArray(federalCities)).toBe(true);
      expect(federalCities.length).toBeGreaterThan(0);
    });

    it('should return only federal cities', () => {
      const federalCities = getAllFederalCities();

      for (const city of federalCities) {
        expect(city.isFederalCity).toBe(true);
      }
    });

    it('should include Москва in federal cities', () => {
      const federalCities = getAllFederalCities();

      const moscow = federalCities.find((c) => c.name === 'Москва');
      expect(moscow).toBeDefined();
      expect(moscow?.isFederalCity).toBe(true);
    });

    it('should include Санкт-Петербург in federal cities', () => {
      const federalCities = getAllFederalCities();

      const spb = federalCities.find((c) => c.name === 'Санкт-Петербург');
      expect(spb).toBeDefined();
      expect(spb?.isFederalCity).toBe(true);
    });
  });

  describe('getAllYakutiaCitiesUnified', () => {
    it('should return array of Yakutia cities', () => {
      const yakutiaCities = getAllYakutiaCitiesUnified();

      expect(Array.isArray(yakutiaCities)).toBe(true);
      expect(yakutiaCities.length).toBeGreaterThan(0);
    });

    it('should return only Yakutia cities', () => {
      const yakutiaCities = getAllYakutiaCitiesUnified();

      for (const city of yakutiaCities) {
        expect(city.isFederalCity).toBe(false);
      }
    });

    it('should include Якутск in Yakutia cities', () => {
      const yakutiaCities = getAllYakutiaCitiesUnified();

      const yakutsk = yakutiaCities.find((c) => c.name === 'Якутск');
      expect(yakutsk).toBeDefined();
      expect(yakutsk?.isFederalCity).toBe(false);
    });
  });

  describe('getAllUnifiedCities', () => {
    it('should return array of all cities', () => {
      const allCities = getAllUnifiedCities();

      expect(Array.isArray(allCities)).toBe(true);
      expect(allCities.length).toBeGreaterThan(0);
    });

    it('should include both Yakutia and federal cities', () => {
      const allCities = getAllUnifiedCities();

      const hasYakutia = allCities.some((c) => c.name === 'Якутск' && !c.isFederalCity);
      const hasFederal = allCities.some((c) => c.name === 'Москва' && c.isFederalCity);

      expect(hasYakutia).toBe(true);
      expect(hasFederal).toBe(true);
    });

    it('should have more cities than just federal cities', () => {
      const allCities = getAllUnifiedCities();
      const federalCities = getAllFederalCities();

      expect(allCities.length).toBeGreaterThan(federalCities.length);
    });
  });

  describe('getUnifiedCitiesDirectory', () => {
    it('should return directory with city coordinates', () => {
      const directory = getUnifiedCitiesDirectory();

      expect(typeof directory).toBe('object');
      expect(Object.keys(directory).length).toBeGreaterThan(0);
    });

    it('should include Якутск in directory', () => {
      const directory = getUnifiedCitiesDirectory();

      expect(directory['Якутск']).toBeDefined();
      expect(directory['Якутск'].latitude).toBeDefined();
      expect(directory['Якутск'].longitude).toBeDefined();
    });

    it('should include Москва in directory', () => {
      const directory = getUnifiedCitiesDirectory();

      expect(directory['Москва']).toBeDefined();
      expect(directory['Москва'].latitude).toBeDefined();
      expect(directory['Москва'].longitude).toBeDefined();
    });

    it('should have valid coordinates for all cities', () => {
      const directory = getUnifiedCitiesDirectory();

      for (const [cityName, coords] of Object.entries(directory)) {
        expect(typeof coords.latitude).toBe('number');
        expect(typeof coords.longitude).toBe('number');
        expect(coords.latitude).toBeGreaterThanOrEqual(-90);
        expect(coords.latitude).toBeLessThanOrEqual(90);
        expect(coords.longitude).toBeGreaterThanOrEqual(-180);
        expect(coords.longitude).toBeLessThanOrEqual(180);
      }
    });
  });
});

