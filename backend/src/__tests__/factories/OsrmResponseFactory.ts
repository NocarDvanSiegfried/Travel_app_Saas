/**
 * OSRM Response Factory
 * 
 * Фабрика для создания тестовых ответов OSRM.
 * Детерминированные, реалистичные данные без случайности.
 */

import type { OsrmRouteResponse } from '../../infrastructure/api/osrm/OsrmClient';
import { Coordinates } from '../../domain/smart-routing/value-objects/Coordinates';

/**
 * Параметры для создания ответа OSRM
 */
export interface OsrmResponseFactoryParams {
  from: Coordinates;
  to: Coordinates;
  distance?: number;
  duration?: number;
  geometry?: [number, number][];
  code?: string;
  message?: string;
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
    
    // Отклонение для реалистичности (синусоидальная функция)
    const offset = Math.sin(t * Math.PI * 2) * 0.01; // ~1% отклонения
    const lng = baseLng + offset;
    const lat = baseLat + offset * 0.5;
    
    coordinates.push([lng, lat]);
  }
  
  coordinates.push([to.longitude, to.latitude]);
  return coordinates;
}

/**
 * Создаёт mock успешный ответ OSRM
 */
export function generateMockOsrmResponse(
  params: OsrmResponseFactoryParams
): OsrmRouteResponse {
  const { from, to, distance, duration, geometry, code, message } = params;
  
  // Если код ошибки, возвращаем ответ с ошибкой
  if (code && code !== 'Ok') {
    return {
      code,
      message: message || 'No route found',
    };
  }
  
  // Вычисляем расстояние по умолчанию
  const straightDistance = calculateHaversineDistance(from, to);
  const actualDistance = distance || straightDistance * 1.2; // +20% для реалистичности
  
  // Вычисляем время в пути по умолчанию (~60 км/ч средняя скорость)
  const actualDuration = duration || Math.round(actualDistance / 1000 * 60);
  
  // Создаём геометрию
  const actualGeometry = geometry || createRealisticGeometry(from, to, actualDistance);
  
  return {
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
  };
}

/**
 * Создаёт ответ OSRM с ошибкой
 */
export function generateMockOsrmErrorResponse(
  from: Coordinates,
  to: Coordinates,
  message: string = 'No route found'
): OsrmRouteResponse {
  return generateMockOsrmResponse({
    from,
    to,
    code: 'NoRoute',
    message,
  });
}

/**
 * Создаёт ответ OSRM с таймаутом
 */
export function generateMockOsrmTimeoutResponse(
  from: Coordinates,
  to: Coordinates
): OsrmRouteResponse {
  return generateMockOsrmResponse({
    from,
    to,
    code: 'InvalidQuery',
    message: 'Request timeout',
  });
}






