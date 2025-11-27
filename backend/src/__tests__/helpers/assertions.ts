/**
 * Custom Assertions
 * 
 * Дополнительные assertions для тестов SMART ROUTING.
 */

import type { SmartRoute } from '../../../domain/smart-routing/entities/SmartRoute';
import type { SmartRouteSegment } from '../../../domain/smart-routing/entities/SmartRouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';

/**
 * Проверяет, что маршрут валиден
 */
export function assertRouteIsValid(route: SmartRoute): void {
  expect(route).toBeDefined();
  expect(route.id).toBeDefined();
  expect(route.fromCity).toBeDefined();
  expect(route.toCity).toBeDefined();
  expect(route.segments).toBeDefined();
  expect(Array.isArray(route.segments)).toBe(true);
  expect(route.segments.length).toBeGreaterThan(0);
  expect(route.totalDistance).toBeDefined();
  expect(route.totalPrice).toBeDefined();
  expect(route.validation).toBeDefined();
  expect(route.validation.isValid).toBe(true);
}

/**
 * Проверяет, что сегмент валиден
 */
export function assertSegmentIsValid(segment: SmartRouteSegment): void {
  expect(segment).toBeDefined();
  expect(segment.id).toBeDefined();
  expect(segment.type).toBeDefined();
  expect(segment.from).toBeDefined();
  expect(segment.to).toBeDefined();
  expect(segment.distance).toBeDefined();
  expect(segment.duration).toBeDefined();
  expect(segment.price).toBeDefined();
}

/**
 * Проверяет, что путь не является прямой линией
 */
export function assertPathIsNotStraight(
  coordinates: [number, number][],
  tolerance: number = 0.05 // 5% допуск
): void {
  expect(coordinates.length).toBeGreaterThanOrEqual(3);

  if (coordinates.length < 3) {
    return;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  // Вычисляем расстояние по прямой
  const straightDistance = calculateHaversineDistance(
    new Coordinates(first[1], first[0]),
    new Coordinates(last[1], last[0])
  );

  // Вычисляем расстояние по пути
  let pathDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    pathDistance += calculateHaversineDistance(
      new Coordinates(coordinates[i][1], coordinates[i][0]),
      new Coordinates(coordinates[i + 1][1], coordinates[i + 1][0])
    );
  }

  // Путь должен быть длиннее прямой линии (с учётом допуска)
  const ratio = pathDistance / straightDistance;
  expect(ratio).toBeGreaterThan(1 + tolerance);
}

/**
 * Проверяет, что путь проходит через указанные точки
 */
export function assertPathPassesThrough(
  coordinates: [number, number][],
  points: Coordinates[],
  tolerance: number = 0.01 // 1% допуск (примерно 1 км)
): void {
  for (const point of points) {
    let found = false;
    for (const coord of coordinates) {
      const distance = calculateHaversineDistance(
        point,
        new Coordinates(coord[1], coord[0])
      );
      if (distance <= tolerance * 100) { // tolerance в процентах, преобразуем в км
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  }
}

/**
 * Проверяет, что маршрут использует правильные типы транспорта
 */
export function assertRouteUsesTransportTypes(
  route: SmartRoute,
  expectedTypes: TransportType[]
): void {
  const actualTypes = route.segments.map((s) => s.type);
  expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
}

/**
 * Проверяет, что маршрут проходит через указанные города
 */
export function assertRoutePassesThroughCities(
  route: SmartRoute,
  cityIds: string[]
): void {
  const allCityIds = [
    route.fromCity.id,
    ...route.segments.map((s) => s.to.city.id),
  ];

  for (const cityId of cityIds) {
    expect(allCityIds).toContain(cityId);
  }
}

/**
 * Проверяет, что цена находится в разумных пределах
 */
export function assertPriceIsReasonable(
  price: number,
  distance: number,
  transportType: TransportType,
  tolerance: number = 0.3 // 30% допуск
): void {
  // Базовые тарифы (руб/км)
  const baseRates: Record<TransportType, number> = {
    [TransportType.AIRPLANE]: 5.0,
    [TransportType.TRAIN]: 1.5,
    [TransportType.BUS]: 4.0,
    [TransportType.FERRY]: 6.0,
    [TransportType.WINTER_ROAD]: 7.5,
    [TransportType.TAXI]: 15.0,
    [TransportType.UNKNOWN]: 5.0,
  };

  const baseRate = baseRates[transportType] || 5.0;
  const expectedPrice = distance * baseRate;
  const minPrice = expectedPrice * (1 - tolerance);
  const maxPrice = expectedPrice * (1 + tolerance);

  expect(price).toBeGreaterThanOrEqual(minPrice);
  expect(price).toBeLessThanOrEqual(maxPrice);
}

/**
 * Вычисляет расстояние Haversine между двумя точками (в км)
 */
function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Радиус Земли в километрах
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


