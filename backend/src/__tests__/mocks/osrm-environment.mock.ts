/**
 * OSRM Environment Mock
 * 
 * Изолированное тестовое окружение для OSRM.
 * Стабильные, повторяемые ответы без реальных HTTP-запросов.
 */

import type { OsrmRouteResponse, OsrmRouteResult, OsrmRouteParams } from '../../../infrastructure/api/osrm/OsrmClient';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';

/**
 * Хранилище предустановленных ответов OSRM
 */
const osrmResponses = new Map<string, OsrmRouteResponse>();

/**
 * Флаг для принудительной ошибки
 */
let shouldFail = false;

/**
 * Флаг для принудительного таймаута
 */
let shouldTimeout = false;

/**
 * Генерирует ключ кэша для запроса
 */
function getCacheKey(from: Coordinates, to: Coordinates): string {
  return `osrm:${from.latitude},${from.longitude}:${to.latitude},${to.longitude}`;
}

/**
 * Вычисляет расстояние Haversine (в метрах)
 */
function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371000; // Радиус Земли в метрах
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Создаёт реалистичную геометрию маршрута (не прямую линию)
 */
function createRealisticGeometry(
  from: Coordinates,
  to: Coordinates,
  distance: number
): [number, number][] {
  const coordinates: [number, number][] = [];
  const numPoints = Math.max(3, Math.ceil(distance / 50000)); // Точка каждые ~50 км
  
  coordinates.push([from.longitude, from.latitude]);
  
  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1);
    const baseLng = from.longitude + (to.longitude - from.longitude) * t;
    const baseLat = from.latitude + (to.latitude - from.latitude) * t;
    
    // Отклонение для реалистичности
    const offset = Math.sin(t * Math.PI * 2) * 0.01;
    coordinates.push([baseLng + offset, baseLat + offset * 0.5]);
  }
  
  coordinates.push([to.longitude, to.latitude]);
  return coordinates;
}

/**
 * Устанавливает успешный ответ для запроса
 */
export function setOsrmSuccessResponse(
  from: Coordinates,
  to: Coordinates,
  distance?: number,
  duration?: number,
  geometry?: [number, number][]
): void {
  const key = getCacheKey(from, to);
  const straightDistance = calculateHaversineDistance(from, to);
  const actualDistance = distance || straightDistance * 1.2;
  const actualDuration = duration || Math.round(actualDistance / 1000 * 60);
  const actualGeometry = geometry || createRealisticGeometry(from, to, actualDistance);
  
  osrmResponses.set(key, {
    code: 'Ok',
    routes: [
      {
        distance: actualDistance,
        duration: actualDuration,
        geometry: {
          type: 'LineString',
          coordinates: actualGeometry,
        },
        legs: [
          {
            distance: actualDistance,
            duration: actualDuration,
            steps: [],
          },
        ],
      },
    ],
    waypoints: [
      {
        location: [from.longitude, from.latitude],
        name: 'Start',
      },
      {
        location: [to.longitude, to.latitude],
        name: 'End',
      },
    ],
  });
}

/**
 * Устанавливает ответ с ошибкой
 */
export function setOsrmErrorResponse(
  from: Coordinates,
  to: Coordinates,
  message?: string
): void {
  const key = getCacheKey(from, to);
  osrmResponses.set(key, {
    code: 'NoRoute',
    message: message || 'No route found',
  });
}

/**
 * Устанавливает принудительную ошибку для всех запросов
 */
export function setShouldFail(value: boolean): void {
  shouldFail = value;
}

/**
 * Устанавливает принудительный таймаут для всех запросов
 */
export function setShouldTimeout(value: boolean): void {
  shouldTimeout = value;
}

/**
 * Имитирует запрос к OSRM API
 */
export async function mockOsrmFetch(
  params: OsrmRouteParams
): Promise<Omit<OsrmRouteResult, 'fromCache'>> {
  if (shouldTimeout) {
    throw new Error('OSRM request timeout');
  }
  
  if (shouldFail) {
    throw new Error('OSRM service unavailable');
  }
  
  const key = getCacheKey(params.from, params.to);
  const response = osrmResponses.get(key);
  
  if (!response) {
    // Автоматически создаём успешный ответ
    const distance = calculateHaversineDistance(params.from, params.to) * 1.2;
    const geometry = createRealisticGeometry(params.from, params.to, distance);
    
    return {
      geometry: {
        type: 'LineString',
        coordinates: geometry,
      },
      distance,
      duration: Math.round(distance / 1000 * 60),
    };
  }
  
  if (response.code !== 'Ok' || !response.routes || response.routes.length === 0) {
    throw new Error(response.message || 'No route found');
  }
  
  const route = response.routes[0];
  const geometry = typeof route.geometry === 'string'
    ? decodePolyline(route.geometry)
    : route.geometry?.coordinates || [];
  
  return {
    geometry: {
      type: 'LineString',
      coordinates: geometry as [number, number][],
    },
    distance: route.distance,
    duration: route.duration,
  };
}

/**
 * Упрощённая декодировка polyline
 */
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  const pairs = encoded.split(';');
  for (const pair of pairs) {
    const [lng, lat] = pair.split(',').map(Number);
    if (!isNaN(lng) && !isNaN(lat)) {
      coordinates.push([lng, lat]);
    }
  }
  return coordinates;
}

/**
 * Очищает все установленные ответы
 */
export function clearOsrmResponses(): void {
  osrmResponses.clear();
  shouldFail = false;
  shouldTimeout = false;
}

/**
 * Получить количество установленных ответов
 */
export function getOsrmResponsesCount(): number {
  return osrmResponses.size;
}




