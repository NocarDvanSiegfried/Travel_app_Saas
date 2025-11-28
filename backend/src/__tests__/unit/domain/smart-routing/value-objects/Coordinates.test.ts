/**
 * Unit Tests: Coordinates
 * 
 * Тесты для Value Object координат.
 * Цель: 100% покрытие кода.
 * 
 * Проверяет:
 * - Создание координат
 * - Валидацию (широта -90..90, долгота -180..180)
 * - Вычисление расстояния Haversine
 * - Преобразование в GeoJSON
 * - Преобразование в JSON
 * - Граничные условия
 * - Негативные сценарии
 */

import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { YAKUTSK, MIRNY, MOSCOW } from '../../../../fixtures/cities';

describe('Coordinates', () => {
  describe('constructor', () => {
    it('should create coordinates with valid values', () => {
      const coords = new Coordinates(62.0278, 129.7042);
      expect(coords.latitude).toBe(62.0278);
      expect(coords.longitude).toBe(129.7042);
    });

    it('should create coordinates at equator', () => {
      const coords = new Coordinates(0, 0);
      expect(coords.latitude).toBe(0);
      expect(coords.longitude).toBe(0);
    });

    it('should create coordinates at north pole', () => {
      const coords = new Coordinates(90, 0);
      expect(coords.latitude).toBe(90);
      expect(coords.longitude).toBe(0);
    });

    it('should create coordinates at south pole', () => {
      const coords = new Coordinates(-90, 0);
      expect(coords.latitude).toBe(-90);
      expect(coords.longitude).toBe(0);
    });

    it('should create coordinates at international date line', () => {
      const coords = new Coordinates(0, 180);
      expect(coords.latitude).toBe(0);
      expect(coords.longitude).toBe(180);
    });

    it('should create coordinates at negative longitude', () => {
      const coords = new Coordinates(0, -180);
      expect(coords.latitude).toBe(0);
      expect(coords.longitude).toBe(-180);
    });

    it('should throw error for invalid latitude (> 90)', () => {
      expect(() => {
        new Coordinates(91, 0);
      }).toThrow('Coordinates: invalid latitude 91. Must be between -90 and 90.');
    });

    it('should throw error for invalid latitude (< -90)', () => {
      expect(() => {
        new Coordinates(-91, 0);
      }).toThrow('Coordinates: invalid latitude -91. Must be between -90 and 90.');
    });

    it('should throw error for invalid longitude (> 180)', () => {
      expect(() => {
        new Coordinates(0, 181);
      }).toThrow('Coordinates: invalid longitude 181. Must be between -180 and 180.');
    });

    it('should throw error for invalid longitude (< -180)', () => {
      expect(() => {
        new Coordinates(0, -181);
      }).toThrow('Coordinates: invalid longitude -181. Must be between -180 and 180.');
    });

    it('should throw error for both invalid latitude and longitude', () => {
      expect(() => {
        new Coordinates(91, 181);
      }).toThrow('Coordinates: invalid latitude 91. Must be between -90 and 90.');
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance between Yakutsk and Mirny correctly', () => {
      const yakutsk = YAKUTSK.coordinates;
      const mirny = MIRNY.coordinates;

      const distance = yakutsk.distanceTo(mirny);

      // Расстояние Якутск-Мирный примерно 1000-1100 км
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1200);
      expect(typeof distance).toBe('number');
    });

    it('should calculate distance between Yakutsk and Moscow correctly', () => {
      const yakutsk = YAKUTSK.coordinates;
      const moscow = MOSCOW.coordinates;

      const distance = yakutsk.distanceTo(moscow);

      // Расстояние Якутск-Москва примерно 4900-5000 км
      expect(distance).toBeGreaterThan(4800);
      expect(distance).toBeLessThan(5200);
    });

    it('should return 0 for same coordinates', () => {
      const coords = new Coordinates(62.0278, 129.7042);
      const distance = coords.distanceTo(coords);
      expect(distance).toBe(0);
    });

    it('should calculate distance correctly for nearby points', () => {
      const point1 = new Coordinates(62.0278, 129.7042);
      const point2 = new Coordinates(62.0280, 129.7044);

      const distance = point1.distanceTo(point2);

      // Расстояние должно быть очень маленьким (несколько сотен метров)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // Меньше 1 км
    });

    it('should calculate distance correctly for opposite points', () => {
      const point1 = new Coordinates(0, 0);
      const point2 = new Coordinates(0, 180);

      const distance = point1.distanceTo(point2);

      // Расстояние между противоположными точками на экваторе примерно половина окружности Земли
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(20000);
    });

    it('should calculate distance correctly for points at poles', () => {
      const northPole = new Coordinates(90, 0);
      const southPole = new Coordinates(-90, 0);

      const distance = northPole.distanceTo(southPole);

      // Расстояние между полюсами примерно 20000 км
      expect(distance).toBeGreaterThan(19500);
      expect(distance).toBeLessThan(20050);
    });

    it('should be symmetric (distance A->B equals B->A)', () => {
      const point1 = new Coordinates(62.0278, 129.7042);
      const point2 = new Coordinates(55.7558, 37.6173);

      const distance1 = point1.distanceTo(point2);
      const distance2 = point2.distanceTo(point1);

      expect(distance1).toBe(distance2);
    });

    it('should handle coordinates crossing international date line', () => {
      const point1 = new Coordinates(0, 179);
      const point2 = new Coordinates(0, -179);

      const distance = point1.distanceTo(point2);

      // Расстояние должно быть маленьким (пересечение линии перемены дат)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(500);
    });
  });

  describe('toGeoJSON', () => {
    it('should convert coordinates to GeoJSON format', () => {
      const coords = new Coordinates(62.0278, 129.7042);
      const geoJSON = coords.toGeoJSON();

      expect(geoJSON).toEqual([129.7042, 62.0278]);
      expect(geoJSON[0]).toBe(129.7042); // longitude first
      expect(geoJSON[1]).toBe(62.0278); // latitude second
    });

    it('should return array with correct order [longitude, latitude]', () => {
      const coords = new Coordinates(-45.5, 120.3);
      const geoJSON = coords.toGeoJSON();

      expect(geoJSON).toEqual([120.3, -45.5]);
    });
  });

  describe('toJSON', () => {
    it('should convert coordinates to JSON object', () => {
      const coords = new Coordinates(62.0278, 129.7042);
      const json = coords.toJSON();

      expect(json).toEqual({
        latitude: 62.0278,
        longitude: 129.7042,
      });
    });

    it('should return object with latitude and longitude properties', () => {
      const coords = new Coordinates(-30.5, 150.7);
      const json = coords.toJSON();

      expect(json).toHaveProperty('latitude', -30.5);
      expect(json).toHaveProperty('longitude', 150.7);
    });
  });

  describe('edge cases', () => {
    it('should handle floating point precision', () => {
      const coords = new Coordinates(62.0278123456789, 129.7042123456789);
      expect(coords.latitude).toBe(62.0278123456789);
      expect(coords.longitude).toBe(129.7042123456789);
    });

    it('should handle very small differences in coordinates', () => {
      const point1 = new Coordinates(62.0278, 129.7042);
      const point2 = new Coordinates(62.0278001, 129.7042001);

      const distance = point1.distanceTo(point2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1); // Очень маленькое расстояние
    });
  });
});






