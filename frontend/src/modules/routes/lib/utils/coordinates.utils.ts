/**
 * Утилиты для работы с координатами
 * 
 * Функции для преобразования, валидации и работы с координатами маршрутов.
 * 
 * @module routes/lib/utils
 */

import type { Coordinate, IMapBounds } from '../../domain/map-types';

/**
 * Радиус Земли в километрах
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Преобразует градусы в радианы
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Преобразует радианы в градусы
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Валидирует координату
 * 
 * @param coordinate - Координата [широта, долгота]
 * @throws Error если координата невалидна
 */
export function validateCoordinate(coordinate: Coordinate): void {
  const [lat, lng] = coordinate;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error(`Invalid coordinate: expected numbers, got [${typeof lat}, ${typeof lng}]`);
  }

  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    throw new Error(`Invalid coordinate: NaN or Infinity values in [${lat}, ${lng}]`);
  }

  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat} (must be between -90 and 90)`);
  }

  if (Math.abs(lng) > 360) {
    throw new Error(`Invalid longitude: ${lng} (must be between -360 and 360)`);
  }
}

/**
 * Вычисляет расстояние между двумя точками по формуле Haversine
 * 
 * @param coord1 - Первая точка [широта, долгота]
 * @param coord2 - Вторая точка [широта, долгота]
 * @returns Расстояние в километрах
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  validateCoordinate(coord1);
  validateCoordinate(coord2);

  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;

  // Если точки совпадают
  if (lat1 === lat2 && lng1 === lng2) {
    return 0;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(normalizeLongitude(lng2 - lng1));

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Нормализует долготу в диапазон [-180, 180]
 * 
 * @param lng - Долгота
 * @returns Нормализованная долгота
 */
export function normalizeLongitude(lng: number): number {
  while (lng > 180) {
    lng -= 360;
  }
  while (lng < -180) {
    lng += 360;
  }
  return lng;
}

/**
 * Вычисляет центр между двумя координатами
 * 
 * @param coord1 - Первая точка [широта, долгота]
 * @param coord2 - Вторая точка [широта, долгота]
 * @returns Центр [широта, долгота]
 */
export function calculateCenter(coord1: Coordinate, coord2: Coordinate): Coordinate {
  validateCoordinate(coord1);
  validateCoordinate(coord2);

  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;

  return [(lat1 + lat2) / 2, normalizeLongitude((lng1 + lng2) / 2)];
}

/**
 * Вычисляет границы карты из массива координат
 * 
 * @param coordinates - Массив координат [широта, долгота][]
 * @param padding - Отступ в процентах (0-1, по умолчанию 0.15 = 15%)
 * @returns Границы карты или null, если координаты пусты
 */
export function calculateBoundsFromCoordinates(
  coordinates: Coordinate[],
  padding = 0.15
): IMapBounds | null {
  if (coordinates.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of coordinates) {
    validateCoordinate([lat, lng]);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  // Добавляем padding
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;

  // Если все точки совпадают, добавляем минимальный отступ
  const minPadding = 0.1; // 0.1 градуса
  const actualLatDiff = latDiff < 0.001 ? minPadding : latDiff;
  const actualLngDiff = lngDiff < 0.001 ? minPadding : lngDiff;

  minLat -= actualLatDiff * padding;
  maxLat += actualLatDiff * padding;
  minLng -= actualLngDiff * padding;
  maxLng += actualLngDiff * padding;

  // Ограничиваем широту
  minLat = Math.max(minLat, -90);
  maxLat = Math.min(maxLat, 90);

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng,
  };
}

/**
 * Проверяет, находится ли координата в пределах границ
 * 
 * @param coordinate - Координата [широта, долгота]
 * @param bounds - Границы карты
 * @returns true, если координата в пределах границ
 */
export function isCoordinateInBounds(coordinate: Coordinate, bounds: IMapBounds): boolean {
  validateCoordinate(coordinate);
  const [lat, lng] = coordinate;

  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Вычисляет центр границ карты
 * 
 * @param bounds - Границы карты
 * @returns Центр [широта, долгота]
 */
export function calculateBoundsCenter(bounds: IMapBounds): Coordinate {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;

  return [centerLat, normalizeLongitude(centerLng)];
}

/**
 * Форматирует координату для отображения
 * 
 * @param coordinate - Координата [широта, долгота]
 * @param precision - Количество знаков после запятой (по умолчанию 6)
 * @returns Отформатированная строка
 */
export function formatCoordinate(coordinate: Coordinate, precision = 6): string {
  validateCoordinate(coordinate);
  const [lat, lng] = coordinate;

  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Парсит строку координат в массив
 * 
 * @param coordinateString - Строка координат (формат: "lat, lng" или "lat,lng")
 * @returns Координата [широта, долгота]
 * @throws Error если строка невалидна
 */
export function parseCoordinate(coordinateString: string): Coordinate {
  const parts = coordinateString.split(',').map((part) => part.trim());

  if (parts.length !== 2) {
    throw new Error(`Invalid coordinate string format: ${coordinateString}`);
  }

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error(`Invalid coordinate values: ${coordinateString}`);
  }

  const coordinate: Coordinate = [lat, lng];
  validateCoordinate(coordinate);

  return coordinate;
}


