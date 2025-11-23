/**
 * Unit Tests: Suburbs Loader
 * 
 * Tests for suburbs reference loading and main city lookup.
 */

import { loadSuburbsReference, getMainCityBySuburb } from '../../../shared/utils/suburbs-loader';

describe('Suburbs Loader', () => {
  describe('loadSuburbsReference', () => {
    it('should load suburbs reference from JSON file', () => {
      const suburbsMap = loadSuburbsReference();

      expect(suburbsMap).toBeInstanceOf(Map);
      expect(suburbsMap.size).toBeGreaterThan(0);
    });

    it('should cache the loaded reference', () => {
      const map1 = loadSuburbsReference();
      const map2 = loadSuburbsReference();

      expect(map1).toBe(map2);
    });

    it('should include suburb names in the map', () => {
      const suburbsMap = loadSuburbsReference();

      expect(suburbsMap.has('нижний бестях')).toBe(true);
      expect(suburbsMap.get('нижний бестях')).toBe('Якутск');
    });

    it('should include aliases in the map', () => {
      const suburbsMap = loadSuburbsReference();

      expect(suburbsMap.has('н. бестях')).toBe(true);
      expect(suburbsMap.get('н. бестях')).toBe('Якутск');
    });

    it('should normalize suburb names (case insensitive)', () => {
      const suburbsMap = loadSuburbsReference();

      // Keys in map are normalized to lowercase
      expect(suburbsMap.has('нижний бестях')).toBe(true);
      expect(suburbsMap.has('беркакит')).toBe(true);
    });
  });

  describe('getMainCityBySuburb', () => {
    it('should return main city for known suburb', () => {
      const city = getMainCityBySuburb('Нижний Бестях');

      expect(city).toBe('Якутск');
    });

    it('should return main city for suburb alias', () => {
      const city = getMainCityBySuburb('Н. Бестях');

      expect(city).toBe('Якутск');
    });

    it('should return main city for Беркакит', () => {
      const city = getMainCityBySuburb('Беркакит');

      expect(city).toBe('Нерюнгри');
    });

    it('should return undefined for unknown suburb', () => {
      const city = getMainCityBySuburb('Unknown Suburb');

      expect(city).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const city = getMainCityBySuburb('');

      expect(city).toBeUndefined();
    });

    it('should handle suburb names with spaces', () => {
      const city = getMainCityBySuburb('  Нижний Бестях  ');

      expect(city).toBe('Якутск');
    });

    it('should be case insensitive', () => {
      const city1 = getMainCityBySuburb('нижний бестях');
      const city2 = getMainCityBySuburb('НИЖНИЙ БЕСТЯХ');
      const city3 = getMainCityBySuburb('Нижний Бестях');

      expect(city1).toBe('Якутск');
      expect(city2).toBe('Якутск');
      expect(city3).toBe('Якутск');
    });
  });
});

