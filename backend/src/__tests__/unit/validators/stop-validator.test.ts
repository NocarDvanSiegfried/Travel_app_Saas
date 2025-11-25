/**
 * Unit Tests: Stop Validator
 * 
 * Tests for stop data validation.
 */

import { validateStopData } from '../../../shared/validators/stop-validator';

describe('Stop Validator', () => {
  describe('validateStopData', () => {
    it('should validate valid stop data', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 62.0933,
        longitude: 129.7706,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate stop data with coordinates object', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        coordinates: {
          latitude: 62.0933,
          longitude: 129.7706,
        },
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject stop data without name', () => {
      const stopData = {
        latitude: 62.0933,
        longitude: 129.7706,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject stop data with name shorter than 3 characters', () => {
      const stopData = {
        name: 'AB',
        latitude: 62.0933,
        longitude: 129.7706,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject stop data with invalid latitude (NaN)', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: NaN,
        longitude: 129.7706,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('latitude'))).toBe(true);
    });

    it('should reject stop data with latitude out of range (too high)', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 91,
        longitude: 129.7706,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('latitude'))).toBe(true);
    });

    it('should reject stop data with latitude out of range (too low)', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: -91,
        longitude: 129.7706,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('latitude'))).toBe(true);
    });

    it('should reject stop data with invalid longitude (NaN)', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 62.0933,
        longitude: NaN,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('longitude'))).toBe(true);
    });

    it('should reject stop data with longitude out of range (too high)', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 62.0933,
        longitude: 181,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('longitude'))).toBe(true);
    });

    it('should reject stop data with longitude out of range (too low)', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 62.0933,
        longitude: -181,
        cityId: 'якутск',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('longitude'))).toBe(true);
    });

    it('should reject stop data with service word as cityId', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 62.0933,
        longitude: 129.7706,
        cityId: 'туймаада',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('service word'))).toBe(true);
    });

    it('should reject stop data with "центральная" as cityId', () => {
      const stopData = {
        name: 'Автостанция Центральная',
        latitude: 62.0933,
        longitude: 129.7706,
        cityId: 'центральная',
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('service word'))).toBe(true);
    });

    it('should reject stop data without cityId', () => {
      const stopData = {
        name: 'Аэропорт Якутск',
        latitude: 62.0933,
        longitude: 129.7706,
      };

      const result = validateStopData(stopData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('cityId is required'))).toBe(true);
    });

    it('should reject null stop data', () => {
      const result = validateStopData(null);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('required'))).toBe(true);
    });

    it('should reject undefined stop data', () => {
      const result = validateStopData(undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('required'))).toBe(true);
    });

    it('should accept valid boundary values for latitude', () => {
      const stopData1 = {
        name: 'Stop 1',
        latitude: -90,
        longitude: 0,
        cityId: 'якутск',
      };
      const stopData2 = {
        name: 'Stop 2',
        latitude: 90,
        longitude: 0,
        cityId: 'якутск',
      };

      const result1 = validateStopData(stopData1);
      const result2 = validateStopData(stopData2);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should accept valid boundary values for longitude', () => {
      const stopData1 = {
        name: 'Stop 1',
        latitude: 0,
        longitude: -180,
        cityId: 'якутск',
      };
      const stopData2 = {
        name: 'Stop 2',
        latitude: 0,
        longitude: 180,
        cityId: 'якутск',
      };

      const result1 = validateStopData(stopData1);
      const result2 = validateStopData(stopData2);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });
});







