/**
 * Unit Tests: Polyline Builder Utilities
 * 
 * Tests for polyline building functions:
 * - calculateDistance (Haversine formula)
 * - buildGreatCirclePolyline (Great Circle algorithm)
 * - buildStraightPolyline (Straight line)
 * - encodePolyline (Polyline encoding)
 * 
 * Coverage:
 * - Valid coordinate handling
 * - Edge cases (same points, invalid coordinates)
 * - Great Circle interpolation
 * - Distance calculations
 * - Polyline encoding
 */

import {
  calculateDistance,
  buildGreatCirclePolyline,
  buildStraightPolyline,
  encodePolyline,
  type Coordinate,
} from '../../../shared/utils/polyline-builder';

describe('Polyline Builder Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Якутск -> Москва (примерно 4900 км)
      const yakutsk: Coordinate = [62.0, 129.7];
      const moscow: Coordinate = [55.75, 37.6];
      
      const distance = calculateDistance(yakutsk, moscow);
      
      // Проверка с допуском ±100 км
      expect(distance).toBeGreaterThan(4800);
      expect(distance).toBeLessThan(5000);
    });

    it('should return 0 for identical points', () => {
      const point: Coordinate = [62.0, 129.7];
      const distance = calculateDistance(point, point);
      
      expect(distance).toBe(0);
    });

    it('should calculate short distance correctly', () => {
      // Две точки в Якутске (примерно 5 км)
      const point1: Coordinate = [62.0, 129.7];
      const point2: Coordinate = [62.05, 129.7];
      
      const distance = calculateDistance(point1, point2);
      
      // Проверка с допуском ±1 км
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(6);
    });

    it('should throw error for invalid latitude', () => {
      const invalidPoint: Coordinate = [91, 129.7]; // Широта > 90
      const validPoint: Coordinate = [62.0, 129.7];
      
      expect(() => calculateDistance(invalidPoint, validPoint)).toThrow(/Invalid latitude/);
    });

    it('should throw error for invalid longitude', () => {
      const invalidPoint: Coordinate = [62.0, 361]; // Долгота > 360
      const validPoint: Coordinate = [62.0, 129.7];
      
      expect(() => calculateDistance(invalidPoint, validPoint)).toThrow(/Invalid longitude/);
    });

    it('should throw error for NaN coordinates', () => {
      const invalidPoint: Coordinate = [NaN, 129.7];
      const validPoint: Coordinate = [62.0, 129.7];
      
      expect(() => calculateDistance(invalidPoint, validPoint)).toThrow(/NaN or Infinity/);
    });

    it('should handle coordinates near 180 meridian', () => {
      // Точки по разные стороны от 180-го меридиана
      const point1: Coordinate = [62.0, 179.9];
      const point2: Coordinate = [62.0, -179.9];
      
      const distance = calculateDistance(point1, point2);
      
      // Расстояние должно быть небольшим (около 0.2 градуса)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(50);
    });
  });

  describe('buildGreatCirclePolyline', () => {
    it('should build polyline with default steps', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [55.75, 37.6];
      
      const polyline = buildGreatCirclePolyline(from, to);
      
      // Должно быть примерно 50 точек (default steps)
      expect(polyline.length).toBeGreaterThan(45);
      expect(polyline.length).toBeLessThan(55);
      
      // Первая точка должна совпадать с началом
      expect(polyline[0][0]).toBeCloseTo(from[0], 5);
      expect(polyline[0][1]).toBeCloseTo(from[1], 5);
      
      // Последняя точка должна совпадать с концом
      const lastIndex = polyline.length - 1;
      expect(polyline[lastIndex][0]).toBeCloseTo(to[0], 5);
      expect(polyline[lastIndex][1]).toBeCloseTo(to[1], 5);
    });

    it('should build polyline with custom steps', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [55.75, 37.6];
      
      const polyline = buildGreatCirclePolyline(from, to, { steps: 100 });
      
      expect(polyline.length).toBe(101); // steps + 1
    });

    it('should return single point for identical coordinates', () => {
      const point: Coordinate = [62.0, 129.7];
      const polyline = buildGreatCirclePolyline(point, point);
      
      expect(polyline.length).toBe(1);
      expect(polyline[0]).toEqual(point);
    });

    it('should create smooth arc (not straight line)', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [55.75, 37.6];
      
      const polyline = buildGreatCirclePolyline(from, to, { steps: 10 });
      
      // Средняя точка должна быть выше прямой линии (Great Circle дуга)
      const midIndex = Math.floor(polyline.length / 2);
      const midPoint = polyline[midIndex];
      
      // Проверяем, что это не просто средняя точка прямой линии
      const straightMidLat = (from[0] + to[0]) / 2;
      const straightMidLng = (from[1] + to[1]) / 2;
      
      // Great Circle дуга должна отличаться от прямой линии
      expect(midPoint[0]).not.toBeCloseTo(straightMidLat, 1);
      expect(midPoint[1]).not.toBeCloseTo(straightMidLng, 1);
    });

    it('should use more steps for long distances', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [55.75, 37.6]; // Длинный маршрут
      
      const polyline = buildGreatCirclePolyline(from, to);
      
      // Для длинных маршрутов должно быть больше шагов
      const distance = calculateDistance(from, to);
      if (distance > 1000) {
        expect(polyline.length).toBeGreaterThan(90);
      }
    });

    it('should use fewer steps for short distances', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [62.01, 129.71]; // Короткий маршрут
      
      const polyline = buildGreatCirclePolyline(from, to);
      
      // Для коротких маршрутов должно быть меньше шагов
      const distance = calculateDistance(from, to);
      if (distance < 10) {
        expect(polyline.length).toBeLessThan(15);
      }
    });

    it('should throw error for invalid coordinates', () => {
      const invalidPoint: Coordinate = [91, 129.7];
      const validPoint: Coordinate = [62.0, 129.7];
      
      expect(() => buildGreatCirclePolyline(invalidPoint, validPoint)).toThrow(/Invalid latitude/);
    });
  });

  describe('buildStraightPolyline', () => {
    it('should build polyline with two points', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [55.75, 37.6];
      
      const polyline = buildStraightPolyline(from, to);
      
      expect(polyline.length).toBe(2);
      expect(polyline[0]).toEqual(from);
      expect(polyline[1]).toEqual(to);
    });

    it('should return same point twice for identical coordinates', () => {
      const point: Coordinate = [62.0, 129.7];
      const polyline = buildStraightPolyline(point, point);
      
      expect(polyline.length).toBe(2);
      expect(polyline[0]).toEqual(point);
      expect(polyline[1]).toEqual(point);
    });

    it('should throw error for invalid coordinates', () => {
      const invalidPoint: Coordinate = [91, 129.7];
      const validPoint: Coordinate = [62.0, 129.7];
      
      expect(() => buildStraightPolyline(invalidPoint, validPoint)).toThrow(/Invalid latitude/);
    });
  });

  describe('encodePolyline', () => {
    it('should encode simple polyline', () => {
      const coordinates: Coordinate[] = [
        [62.0, 129.7],
        [55.75, 37.6],
      ];
      
      const encoded = encodePolyline(coordinates);
      
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should encode empty array as empty string', () => {
      const coordinates: Coordinate[] = [];
      
      const encoded = encodePolyline(coordinates);
      
      expect(encoded).toBe('');
    });

    it('should encode single point', () => {
      const coordinates: Coordinate[] = [[62.0, 129.7]];
      
      const encoded = encodePolyline(coordinates);
      
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });

    it('should encode multiple points', () => {
      const coordinates: Coordinate[] = [
        [62.0, 129.7],
        [62.1, 129.8],
        [62.2, 129.9],
      ];
      
      const encoded = encodePolyline(coordinates);
      
      expect(encoded).toBeTruthy();
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should produce different encoding for different coordinates', () => {
      const coords1: Coordinate[] = [[62.0, 129.7]];
      const coords2: Coordinate[] = [[62.1, 129.8]];
      
      const encoded1 = encodePolyline(coords1);
      const encoded2 = encodePolyline(coords2);
      
      expect(encoded1).not.toBe(encoded2);
    });

    it('should handle negative coordinates', () => {
      const coordinates: Coordinate[] = [
        [-62.0, -129.7],
        [-55.75, -37.6],
      ];
      
      const encoded = encodePolyline(coordinates);
      
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });
  });

  describe('Integration: Great Circle vs Straight Line', () => {
    it('should produce different paths for long distances', () => {
      const from: Coordinate = [62.0, 129.7];
      const to: Coordinate = [55.75, 37.6];
      
      const greatCircle = buildGreatCirclePolyline(from, to, { steps: 10 });
      const straightLine = buildStraightPolyline(from, to);
      
      // Great Circle должен иметь больше точек
      expect(greatCircle.length).toBeGreaterThan(straightLine.length);
      
      // Расстояние по Great Circle должно быть меньше или равно прямой
      const greatCircleDistance = greatCircle.reduce((sum, point, index) => {
        if (index === 0) return 0;
        return sum + calculateDistance(greatCircle[index - 1], point);
      }, 0);
      
      const straightDistance = calculateDistance(from, to);
      
      // Great Circle путь должен быть примерно равен прямому расстоянию
      expect(greatCircleDistance).toBeCloseTo(straightDistance, 0);
    });
  });
});

