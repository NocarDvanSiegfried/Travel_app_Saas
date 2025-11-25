/**
 * Утилита для построения полилиний маршрутов на карте
 * 
 * Обеспечивает генерацию координат для отображения маршрутов:
 * - Great Circle (дуга большого круга) для авиамаршрутов
 * - Straight Line (прямая линия) для наземного и водного транспорта
 * - Расчёт расстояний по формуле Haversine
 * 
 * @module shared/utils
 */

/**
 * Тип координаты [широта, долгота]
 */
export type Coordinate = [number, number];

/**
 * Параметры для построения Great Circle полилинии
 */
export interface GreatCircleOptions {
  /**
   * Количество шагов для интерполяции дуги
   * По умолчанию: 50
   * Для длинных маршрутов (> 1000 км): 100
   * Для коротких маршрутов (< 10 км): 10
   */
  steps?: number;
}

/**
 * Константы для расчётов
 */
const EARTH_RADIUS_KM = 6371; // Радиус Земли в километрах
const MIN_STEPS = 5; // Минимальное количество шагов
const DEFAULT_STEPS = 50; // Стандартное количество шагов
const MAX_STEPS = 200; // Максимальное количество шагов
const LONG_DISTANCE_THRESHOLD_KM = 1000; // Порог для длинных маршрутов
const SHORT_DISTANCE_THRESHOLD_KM = 10; // Порог для коротких маршрутов

/**
 * Преобразование градусов в радианы
 * 
 * @param degrees - Угол в градусах
 * @returns Угол в радианах
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Преобразование радианов в градусы
 * 
 * @param radians - Угол в радианах
 * @returns Угол в градусах
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Нормализация долготы в диапазон [-180, 180]
 * 
 * @param lng - Долгота в градусах
 * @returns Нормализованная долгота
 */
function normalizeLongitude(lng: number): number {
  while (lng > 180) {
    lng -= 360;
  }
  while (lng < -180) {
    lng += 360;
  }
  return lng;
}

/**
 * Валидация координат
 * 
 * @param coord - Координата [lat, lng]
 * @throws Error если координаты некорректны
 */
function validateCoordinate(coord: Coordinate): void {
  const [lat, lng] = coord;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error(`Invalid coordinate: expected numbers, got [${typeof lat}, ${typeof lng}]`);
  }

  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    throw new Error(`Invalid coordinate: NaN or Infinity values in [${lat}, ${lng}]`);
  }

  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat} (must be between -90 and 90)`);
  }

  // Долгота может быть любая, но нормализуем для корректной работы
  if (Math.abs(lng) > 360) {
    throw new Error(`Invalid longitude: ${lng} (must be between -360 and 360)`);
  }
}

/**
 * Расчёт расстояния между двумя точками по формуле Haversine
 * 
 * @param from - Начальная точка [lat, lng]
 * @param to - Конечная точка [lat, lng]
 * @returns Расстояние в километрах
 * 
 * @example
 * calculateDistance([62.0, 129.0], [64.0, 130.0]) // ~222 км
 */
export function calculateDistance(from: Coordinate, to: Coordinate): number {
  validateCoordinate(from);
  validateCoordinate(to);

  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  // Если точки совпадают, возвращаем 0
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
 * Определение оптимального количества шагов для Great Circle
 * на основе расстояния между точками
 * 
 * @param distance - Расстояние в километрах
 * @param requestedSteps - Запрошенное количество шагов (опционально)
 * @returns Оптимальное количество шагов
 */
function calculateOptimalSteps(distance: number, requestedSteps?: number): number {
  if (requestedSteps !== undefined) {
    return Math.max(MIN_STEPS, Math.min(MAX_STEPS, requestedSteps));
  }

  if (distance > LONG_DISTANCE_THRESHOLD_KM) {
    return 100;
  }

  if (distance < SHORT_DISTANCE_THRESHOLD_KM) {
    return 10;
  }

  return DEFAULT_STEPS;
}

/**
 * Построение дуги большого круга (Great Circle) для авиамаршрутов
 * 
 * Использует сферическую интерполяцию для создания плавной дуги
 * между двумя точками на поверхности Земли.
 * 
 * @param from - Начальная точка [lat, lng]
 * @param to - Конечная точка [lat, lng]
 * @param options - Опции построения (количество шагов)
 * @returns Массив координат, образующих дугу большого круга
 * 
 * @example
 * buildGreatCirclePolyline([62.0, 129.0], [64.0, 130.0], { steps: 50 })
 * // Возвращает массив из 50+ координат
 */
export function buildGreatCirclePolyline(
  from: Coordinate,
  to: Coordinate,
  options?: GreatCircleOptions
): Coordinate[] {
  validateCoordinate(from);
  validateCoordinate(to);

  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  // Если точки совпадают, возвращаем массив с одной точкой
  if (lat1 === lat2 && lng1 === lng2) {
    return [[lat1, lng1]];
  }

  // Вычисляем расстояние для определения оптимального количества шагов
  const distance = calculateDistance(from, to);
  const steps = calculateOptimalSteps(distance, options?.steps);

  // Преобразуем координаты в радианы
  const lat1Rad = toRadians(lat1);
  const lng1Rad = toRadians(normalizeLongitude(lng1));
  const lat2Rad = toRadians(lat2);
  const lng2Rad = toRadians(normalizeLongitude(lng2));

  // Вычисляем центральный угол между точками
  const dLng = lng2Rad - lng1Rad;
  const dLat = lat2Rad - lat1Rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Генерируем промежуточные точки
  const coordinates: Coordinate[] = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;

    // Сферическая интерполяция (spherical linear interpolation - slerp)
    const sinCentralAngle = Math.sin(centralAngle);
    const a = Math.sin((1 - fraction) * centralAngle) / sinCentralAngle;
    const b = Math.sin(fraction * centralAngle) / sinCentralAngle;

    // Вычисляем промежуточную точку на дуге
    const x =
      a * Math.cos(lat1Rad) * Math.cos(lng1Rad) +
      b * Math.cos(lat2Rad) * Math.cos(lng2Rad);
    const y =
      a * Math.cos(lat1Rad) * Math.sin(lng1Rad) +
      b * Math.cos(lat2Rad) * Math.sin(lng2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

    // Преобразуем обратно в сферические координаты
    const lat = Math.asin(z);
    const lng = Math.atan2(y, x);

    // Преобразуем в градусы и нормализуем
    const latDeg = toDegrees(lat);
    const lngDeg = normalizeLongitude(toDegrees(lng));

    coordinates.push([latDeg, lngDeg]);
  }

  return coordinates;
}

/**
 * Построение прямой линии между двумя точками
 * 
 * Используется для наземного транспорта (автобус, поезд, такси)
 * и водного транспорта (паром, водный транспорт).
 * 
 * @param from - Начальная точка [lat, lng]
 * @param to - Конечная точка [lat, lng]
 * @returns Массив из двух координат [from, to]
 * 
 * @example
 * buildStraightPolyline([62.0, 129.0], [64.0, 130.0])
 * // Возвращает [[62.0, 129.0], [64.0, 130.0]]
 */
export function buildStraightPolyline(from: Coordinate, to: Coordinate): Coordinate[] {
  validateCoordinate(from);
  validateCoordinate(to);

  return [from, to];
}

/**
 * Кодирование полилинии в формат Google/Yandex Polyline Encoding
 * 
 * Опциональная функция для уменьшения размера данных при передаче.
 * 
 * @param coordinates - Массив координат [lat, lng][]
 * @returns Закодированная строка в формате Polyline Encoding
 * 
 * @example
 * encodePolyline([[62.0, 129.0], [64.0, 130.0]])
 * // Возвращает закодированную строку
 * 
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function encodePolyline(coordinates: Coordinate[]): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    // Округляем до 5 знаков после запятой (примерно 1 метр точности)
    const latRounded = Math.round(lat * 1e5);
    const lngRounded = Math.round(lng * 1e5);

    // Вычисляем разницу (delta encoding)
    const dLat = latRounded - prevLat;
    const dLng = lngRounded - prevLng;

    // Кодируем разницу
    encoded += encodeValue(dLat);
    encoded += encodeValue(dLng);

    prevLat = latRounded;
    prevLng = lngRounded;
  }

  return encoded;
}

/**
 * Вспомогательная функция для кодирования одного значения
 * 
 * @param value - Значение для кодирования
 * @returns Закодированная строка
 */
function encodeValue(value: number): string {
  // Преобразуем в целое число
  let num = Math.round(value);

  // Обрабатываем отрицательные числа
  num = num << 1;
  if (num < 0) {
    num = ~num;
  }

  // Разбиваем на 5-битные части
  let encoded = '';
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  encoded += String.fromCharCode(num + 63);

  return encoded;
}



