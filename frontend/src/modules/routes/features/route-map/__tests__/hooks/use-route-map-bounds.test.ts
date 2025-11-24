/**
 * Unit тесты для use-route-map-bounds.ts
 * 
 * Тестирует расчёт границ карты из сегментов маршрута.
 * 
 * @module routes/features/route-map/__tests__/hooks
 */

import { renderHook } from '@testing-library/react';
import { useRouteMapBounds } from '../../hooks/use-route-map-bounds';
import type { IRouteSegmentMapData } from '../../../../domain/map-types';
import { TransportType } from '../../../../domain/types';

describe('useRouteMapBounds', () => {
  const createMockSegment = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): IRouteSegmentMapData => ({
    segmentId: 'seg-1',
    transportType: TransportType.BUS,
    fromStop: {
      id: 'stop-1',
      name: 'From Stop',
      latitude: fromLat,
      longitude: fromLng,
      cityName: 'City 1',
      isTransfer: false,
    },
    toStop: {
      id: 'stop-2',
      name: 'To Stop',
      latitude: toLat,
      longitude: toLng,
      cityName: 'City 2',
      isTransfer: false,
    },
    polyline: {
      coordinates: [
        [fromLat, fromLng],
        [toLat, toLng],
      ],
    },
    distance: 100,
    duration: 120,
    price: 5000,
    departureTime: '08:00',
    arrivalTime: '10:00',
  });

  it('should return null bounds for empty segments', () => {
    const { result } = renderHook(() => useRouteMapBounds({ segments: [] }));

    expect(result.current.bounds).toBeNull();
    expect(result.current.isValid).toBe(false);
  });

  it('should calculate bounds for single segment', () => {
    const segments = [createMockSegment(62.0, 129.0, 63.0, 130.0)];
    const { result } = renderHook(() => useRouteMapBounds({ segments }));

    expect(result.current.bounds).not.toBeNull();
    expect(result.current.isValid).toBe(true);

    const bounds = result.current.bounds!;
    expect(bounds.north).toBeGreaterThanOrEqual(63.0);
    expect(bounds.south).toBeLessThanOrEqual(62.0);
    expect(bounds.east).toBeGreaterThanOrEqual(130.0);
    expect(bounds.west).toBeLessThanOrEqual(129.0);
  });

  it('should calculate bounds for multiple segments', () => {
    const segments = [
      createMockSegment(62.0, 129.0, 63.0, 130.0),
      createMockSegment(63.0, 130.0, 64.0, 131.0),
    ];
    const { result } = renderHook(() => useRouteMapBounds({ segments }));

    expect(result.current.bounds).not.toBeNull();
    expect(result.current.isValid).toBe(true);

    const bounds = result.current.bounds!;
    expect(bounds.north).toBeGreaterThanOrEqual(64.0);
    expect(bounds.south).toBeLessThanOrEqual(62.0);
    expect(bounds.east).toBeGreaterThanOrEqual(131.0);
    expect(bounds.west).toBeLessThanOrEqual(129.0);
  });

  it('should apply padding to bounds', () => {
    const segments = [createMockSegment(62.0, 129.0, 63.0, 130.0)];
    const { result: resultWithPadding } = renderHook(() =>
      useRouteMapBounds({ segments, padding: 0.2 })
    );
    const { result: resultWithoutPadding } = renderHook(() =>
      useRouteMapBounds({ segments, padding: 0 })
    );

    const boundsWithPadding = resultWithPadding.current.bounds!;
    const boundsWithoutPadding = resultWithoutPadding.current.bounds!;

    expect(boundsWithPadding.north - boundsWithPadding.south).toBeGreaterThan(
      boundsWithoutPadding.north - boundsWithoutPadding.south
    );
    expect(boundsWithPadding.east - boundsWithPadding.west).toBeGreaterThan(
      boundsWithoutPadding.east - boundsWithoutPadding.west
    );
  });

  it('should use default padding when not specified', () => {
    const segments = [createMockSegment(62.0, 129.0, 63.0, 130.0)];
    const { result } = renderHook(() => useRouteMapBounds({ segments }));

    expect(result.current.bounds).not.toBeNull();
    expect(result.current.isValid).toBe(true);
  });

  it('should handle segments with polyline coordinates', () => {
    const segment: IRouteSegmentMapData = {
      segmentId: 'seg-1',
      transportType: TransportType.BUS,
      fromStop: {
        id: 'stop-1',
        name: 'From Stop',
        latitude: 62.0,
        longitude: 129.0,
        cityName: 'City 1',
        isTransfer: false,
      },
      toStop: {
        id: 'stop-2',
        name: 'To Stop',
        latitude: 64.0,
        longitude: 131.0,
        cityName: 'City 2',
        isTransfer: false,
      },
      polyline: {
        coordinates: [
          [62.0, 129.0],
          [63.0, 130.0],
          [64.0, 131.0],
        ],
      },
      distance: 200,
      duration: 240,
      price: 10000,
      departureTime: '08:00',
      arrivalTime: '12:00',
    };

    const { result } = renderHook(() => useRouteMapBounds({ segments: [segment] }));

    expect(result.current.bounds).not.toBeNull();
    expect(result.current.isValid).toBe(true);

    const bounds = result.current.bounds!;
    // Границы должны включать все координаты из полилинии
    expect(bounds.north).toBeGreaterThanOrEqual(64.0);
    expect(bounds.south).toBeLessThanOrEqual(62.0);
    expect(bounds.east).toBeGreaterThanOrEqual(131.0);
    expect(bounds.west).toBeLessThanOrEqual(129.0);
  });

  it('should handle segments without polyline coordinates', () => {
    const segment: IRouteSegmentMapData = {
      segmentId: 'seg-1',
      transportType: TransportType.BUS,
      fromStop: {
        id: 'stop-1',
        name: 'From Stop',
        latitude: 62.0,
        longitude: 129.0,
        cityName: 'City 1',
        isTransfer: false,
      },
      toStop: {
        id: 'stop-2',
        name: 'To Stop',
        latitude: 63.0,
        longitude: 130.0,
        cityName: 'City 2',
        isTransfer: false,
      },
      polyline: {
        coordinates: [],
      },
      distance: 100,
      duration: 120,
      price: 5000,
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const { result } = renderHook(() => useRouteMapBounds({ segments: [segment] }));

    // Должны использовать координаты остановок
    expect(result.current.bounds).not.toBeNull();
    expect(result.current.isValid).toBe(true);
  });

  it('should memoize bounds calculation', () => {
    const segments = [createMockSegment(62.0, 129.0, 63.0, 130.0)];
    const { result, rerender } = renderHook(() => useRouteMapBounds({ segments }));

    const firstBounds = result.current.bounds;

    // Перерендер с теми же сегментами
    rerender();

    // Объект должен быть тем же (мемоизация)
    expect(result.current.bounds).toBe(firstBounds);
  });
});

