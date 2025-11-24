/**
 * Unit тесты для use-route-map-segments.ts
 * 
 * Тестирует обработку сегментов маршрута для отображения на карте.
 * 
 * @module routes/features/route-map/__tests__/hooks
 */

import { renderHook } from '@testing-library/react';
import { useRouteMapSegments } from '../../hooks/use-route-map-segments';
import type { IRouteSegmentMapData } from '../../../../domain/map-types';
import { TransportType } from '../../../../domain/types';

describe('useRouteMapSegments', () => {
  const createMockSegment = (
    segmentId: string,
    transportType: TransportType
  ): IRouteSegmentMapData => ({
    segmentId,
    transportType,
    fromStop: {
      id: `stop-from-${segmentId}`,
      name: `From ${segmentId}`,
      latitude: 62.0,
      longitude: 129.0,
      cityName: 'City 1',
      isTransfer: false,
    },
    toStop: {
      id: `stop-to-${segmentId}`,
      name: `To ${segmentId}`,
      latitude: 63.0,
      longitude: 130.0,
      cityName: 'City 2',
      isTransfer: false,
    },
    polyline: {
      coordinates: [
        [62.0, 129.0],
        [63.0, 130.0],
      ],
    },
    distance: 100,
    duration: 120,
    price: 5000,
    departureTime: '08:00',
    arrivalTime: '10:00',
  });

  it('should return empty arrays for null mapData', () => {
    const { result } = renderHook(() => useRouteMapSegments({ mapData: null }));

    expect(result.current.segments).toEqual([]);
    expect(result.current.groups).toEqual([]);
    expect(result.current.visibleSegments).toEqual([]);
    expect(result.current.legend).toEqual([]);
  });

  it('should return empty arrays for undefined mapData', () => {
    const { result } = renderHook(() => useRouteMapSegments({ mapData: undefined }));

    expect(result.current.segments).toEqual([]);
    expect(result.current.groups).toEqual([]);
    expect(result.current.visibleSegments).toEqual([]);
    expect(result.current.legend).toEqual([]);
  });

  it('should return empty arrays for empty segments', () => {
    const { result } = renderHook(() =>
      useRouteMapSegments({ mapData: { segments: [] } })
    );

    expect(result.current.segments).toEqual([]);
    expect(result.current.groups).toEqual([]);
    expect(result.current.visibleSegments).toEqual([]);
    expect(result.current.legend).toEqual([]);
  });

  it('should group segments by transport type', () => {
    const segments = [
      createMockSegment('seg-1', TransportType.BUS),
      createMockSegment('seg-2', TransportType.BUS),
      createMockSegment('seg-3', TransportType.AIRPLANE),
    ];

    const { result } = renderHook(() =>
      useRouteMapSegments({ mapData: { segments } })
    );

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups[0].transportType).toBe(TransportType.AIRPLANE);
    expect(result.current.groups[0].count).toBe(1);
    expect(result.current.groups[1].transportType).toBe(TransportType.BUS);
    expect(result.current.groups[1].count).toBe(2);
  });

  it('should calculate total distance and duration for groups', () => {
    const segments = [
      createMockSegment('seg-1', TransportType.BUS),
      createMockSegment('seg-2', TransportType.BUS),
    ];

    const { result } = renderHook(() =>
      useRouteMapSegments({ mapData: { segments } })
    );

    const busGroup = result.current.groups.find((g) => g.transportType === TransportType.BUS);
    expect(busGroup).toBeDefined();
    expect(busGroup!.totalDistance).toBe(200); // 100 + 100
    expect(busGroup!.totalDuration).toBe(240); // 120 + 120
  });

  it('should filter visible segments based on visibility', () => {
    const segments = [
      createMockSegment('seg-1', TransportType.BUS),
      createMockSegment('seg-2', TransportType.AIRPLANE),
    ];

    const { result } = renderHook(() =>
      useRouteMapSegments({
        mapData: { segments },
        visibility: { [TransportType.BUS]: false },
      })
    );

    expect(result.current.visibleSegments).toHaveLength(1);
    expect(result.current.visibleSegments[0].transportType).toBe(TransportType.AIRPLANE);
  });

  it('should show all segments by default (visibility not specified)', () => {
    const segments = [
      createMockSegment('seg-1', TransportType.BUS),
      createMockSegment('seg-2', TransportType.AIRPLANE),
    ];

    const { result } = renderHook(() => useRouteMapSegments({ mapData: { segments } }));

    expect(result.current.visibleSegments).toHaveLength(2);
  });

  it('should generate legend with correct data', () => {
    const segments = [
      createMockSegment('seg-1', TransportType.BUS),
      createMockSegment('seg-2', TransportType.AIRPLANE),
    ];

    const { result } = renderHook(() => useRouteMapSegments({ mapData: { segments } }));

    expect(result.current.legend).toHaveLength(2);
    expect(result.current.legend[0].transportType).toBe(TransportType.AIRPLANE);
    expect(result.current.legend[0].count).toBe(1);
    expect(result.current.legend[0].visible).toBe(true);
    expect(result.current.legend[1].transportType).toBe(TransportType.BUS);
    expect(result.current.legend[1].count).toBe(1);
    expect(result.current.legend[1].visible).toBe(true);
  });

  it('should toggle visibility correctly', () => {
    const segments = [createMockSegment('seg-1', TransportType.BUS)];

    const { result } = renderHook(() => useRouteMapSegments({ mapData: { segments } }));

    const newVisibility = result.current.toggleVisibility(TransportType.BUS);

    expect(newVisibility[TransportType.BUS]).toBe(false);
    expect(newVisibility[TransportType.AIRPLANE]).toBe(true);
  });

  it('should sort groups by transport type order', () => {
    const segments = [
      createMockSegment('seg-1', TransportType.TAXI),
      createMockSegment('seg-2', TransportType.AIRPLANE),
      createMockSegment('seg-3', TransportType.BUS),
    ];

    const { result } = renderHook(() => useRouteMapSegments({ mapData: { segments } }));

    const transportTypes = result.current.groups.map((g) => g.transportType);
    expect(transportTypes).toEqual([
      TransportType.AIRPLANE,
      TransportType.BUS,
      TransportType.TAXI,
    ]);
  });

  it('should memoize results', () => {
    const segments = [createMockSegment('seg-1', TransportType.BUS)];
    const { result, rerender } = renderHook(() => useRouteMapSegments({ mapData: { segments } }));

    const firstGroups = result.current.groups;
    const firstLegend = result.current.legend;

    rerender();

    // Groups должны быть мемоизированы (тот же объект)
    expect(result.current.groups).toBe(firstGroups);
    // Legend может быть новым объектом, но с теми же данными
    expect(result.current.legend).toStrictEqual(firstLegend);
  });
});

