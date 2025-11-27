/**
 * OSRM Client Mock
 * 
 * Mock для OsrmClient для использования в тестах.
 * Стабильный, повторяемый, изолированный от продакшена.
 * Использует osrm-environment.mock для управления ответами.
 */

import type { OsrmRouteResponse, OsrmRouteResult, OsrmRouteParams } from '../../../infrastructure/api/osrm/OsrmClient';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import {
  mockOsrmFetch,
  setOsrmSuccessResponse,
  setOsrmErrorResponse,
  setShouldFail,
  setShouldTimeout,
  clearOsrmResponses,
} from './osrm-environment.mock';

/**
 * Создаёт mock успешного ответа OSRM
 */
export function createMockOsrmSuccessResponse(
  from: Coordinates,
  to: Coordinates,
  distance?: number,
  duration?: number,
  geometry?: [number, number][]
): OsrmRouteResponse {
  const straightDistance = calculateHaversineDistance(from, to) * 1000; // в метрах
  const actualDistance = distance || straightDistance * 1.2; // +20% для реалистичности
  const actualDuration = duration || Math.round(actualDistance / 1000 * 60); // ~60 км/ч средняя скорость

  // Если геометрия не предоставлена, создаём реалистичную геометрию (не прямую линию)
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
 * Создаёт mock ответа OSRM с ошибкой
 */
export function createMockOsrmErrorResponse(message?: string): OsrmRouteResponse {
  return {
    code: 'NoRoute',
    message: message || 'No route found',
  };
}

/**
 * Создаёт mock ответа OSRM с таймаутом
 */
export function createMockOsrmTimeoutResponse(): OsrmRouteResponse {
  return {
    code: 'InvalidQuery',
    message: 'Request timeout',
  };
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
  const numPoints = Math.max(3, Math.ceil(distance / 50000)); // Точка каждые ~50 км, минимум 3

  // Начальная точка
  coordinates.push([from.longitude, from.latitude]);

  // Промежуточные точки с отклонением от прямой линии
  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1);
    const baseLng = from.longitude + (to.longitude - from.longitude) * t;
    const baseLat = from.latitude + (to.latitude - from.latitude) * t;

    // Добавляем отклонение для реалистичности (синусоидальная функция)
    const offset = Math.sin(t * Math.PI * 2) * 0.01; // ~1% отклонения
    const lng = baseLng + offset;
    const lat = baseLat + offset * 0.5;

    coordinates.push([lng, lat]);
  }

  // Конечная точка
  coordinates.push([to.longitude, to.latitude]);

  return coordinates;
}

/**
 * Вычисляет расстояние Haversine между двумя точками (в метрах)
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
 * Mock OsrmClient для использования в тестах
 */
export class MockOsrmClient {
  private responses: Map<string, OsrmRouteResponse> = new Map();
  private shouldFail = false;
  private shouldTimeout = false;

  /**
   * Устанавливает ответ для конкретного запроса
   */
  public setResponse(
    from: Coordinates,
    to: Coordinates,
    response: OsrmRouteResponse
  ): void {
    const key = this.getCacheKey(from, to);
    this.responses.set(key, response);
  }

  /**
   * Устанавливает успешный ответ для запроса
   */
  public setSuccessResponse(
    from: Coordinates,
    to: Coordinates,
    distance?: number,
    duration?: number,
    geometry?: [number, number][]
  ): void {
    const response = createMockOsrmSuccessResponse(from, to, distance, duration, geometry);
    this.setResponse(from, to, response);
  }

  /**
   * Устанавливает ответ с ошибкой для всех запросов
   */
  public setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * Устанавливает таймаут для всех запросов
   */
  public setShouldTimeout(shouldTimeout: boolean): void {
    this.shouldTimeout = shouldTimeout;
  }

  /**
   * Очищает все установленные ответы
   */
  public clear(): void {
    this.responses.clear();
    this.shouldFail = false;
    this.shouldTimeout = false;
  }

  /**
   * Имитирует вызов fetchRoute
   */
  public async fetchRoute(
    from: Coordinates,
    to: Coordinates
  ): Promise<OsrmRouteResult | null> {
    if (this.shouldTimeout) {
      throw new Error('OSRM request timeout');
    }

    if (this.shouldFail) {
      return null;
    }

    const key = this.getCacheKey(from, to);
    const response = this.responses.get(key);

    if (!response) {
      // Если ответ не установлен, возвращаем успешный ответ по умолчанию
      return {
        geometry: {
          type: 'LineString',
          coordinates: createRealisticGeometry(from, to, calculateHaversineDistance(from, to) * 1000 * 1.2),
        },
        distance: calculateHaversineDistance(from, to) * 1000 * 1.2,
        duration: Math.round(calculateHaversineDistance(from, to) * 1000 * 1.2 / 1000 * 60),
        fromCache: false,
      };
    }

    if (response.code !== 'Ok' || !response.routes || response.routes.length === 0) {
      return null;
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
      fromCache: false,
    };
  }

  /**
   * Генерирует ключ кэша для запроса
   */
  private getCacheKey(from: Coordinates, to: Coordinates): string {
    return `${from.latitude},${from.longitude};${to.latitude},${to.longitude}`;
  }
}

/**
 * Упрощённая декодировка polyline (для тестов)
 */
function decodePolyline(encoded: string): [number, number][] {
  // Упрощённая реализация для тестов
  // В реальности используется более сложный алгоритм
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

