/**
 * Unit тесты для marker-generator.ts
 * 
 * Тестирует генерацию маркеров для карты маршрутов.
 * 
 * @module routes/features/route-map/__tests__/lib
 */

import { generateMapMarkers } from '../../lib/marker-generator';
import type { IRouteSegmentMapData } from '../../../../domain/map-types';
import { TransportType } from '../../../../domain/types';

describe('marker-generator', () => {
  const createMockSegment = (
    segmentId: string,
    fromStopId: string,
    toStopId: string,
    transportType: TransportType = TransportType.BUS
  ): IRouteSegmentMapData => ({
    segmentId,
    transportType,
    fromStop: {
      id: fromStopId,
      name: `Stop ${fromStopId}`,
      latitude: 62.0,
      longitude: 129.0,
      cityName: 'Якутск',
      isTransfer: false,
    },
    toStop: {
      id: toStopId,
      name: `Stop ${toStopId}`,
      latitude: 63.0,
      longitude: 130.0,
      cityName: 'Нерюнгри',
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

  describe('generateMapMarkers', () => {
    it('should return empty array for empty segments', () => {
      const markers = generateMapMarkers([]);
      expect(markers).toEqual([]);
    });

    it('should return empty array for null/undefined segments', () => {
      expect(generateMapMarkers(null as any)).toEqual([]);
      expect(generateMapMarkers(undefined as any)).toEqual([]);
    });

    it('should generate start and end markers for single segment', () => {
      const segments = [createMockSegment('seg-1', 'stop-1', 'stop-2')];
      const markers = generateMapMarkers(segments);

      expect(markers).toHaveLength(2);
      expect(markers[0].type).toBe('start');
      expect(markers[0].id).toBe('stop-1');
      expect(markers[1].type).toBe('end');
      expect(markers[1].id).toBe('stop-2');
    });

    it('should generate transfer marker for connected segments', () => {
      const segments = [
        createMockSegment('seg-1', 'stop-1', 'stop-2'),
        createMockSegment('seg-2', 'stop-2', 'stop-3'), // stop-2 is transfer
      ];
      const markers = generateMapMarkers(segments);

      expect(markers).toHaveLength(3);
      expect(markers[0].type).toBe('start');
      expect(markers[0].id).toBe('stop-1');
      expect(markers[1].type).toBe('transfer');
      expect(markers[1].id).toBe('stop-2');
      expect(markers[2].type).toBe('end');
      expect(markers[2].id).toBe('stop-3');
    });

    it('should not duplicate markers for same stop', () => {
      const segments = [
        createMockSegment('seg-1', 'stop-1', 'stop-2'),
        createMockSegment('seg-2', 'stop-2', 'stop-3'),
        createMockSegment('seg-3', 'stop-3', 'stop-4'),
      ];
      const markers = generateMapMarkers(segments);

      const stopIds = markers.map((m) => m.id);
      const uniqueStopIds = new Set(stopIds);
      expect(stopIds.length).toBe(uniqueStopIds.size);
    });

    it('should handle segment with disconnected stops (warning marker)', () => {
      const segments = [
        createMockSegment('seg-1', 'stop-1', 'stop-2'),
        createMockSegment('seg-2', 'stop-3', 'stop-4'), // stop-3 is not connected to stop-2
      ];
      const markers = generateMapMarkers(segments);

      // Должен быть start, end, и warning marker для stop-3
      expect(markers.length).toBeGreaterThanOrEqual(3);
      const warningMarker = markers.find((m) => m.id === 'stop-3');
      expect(warningMarker).toBeDefined();
      expect(warningMarker?.metadata?.warning).toBeDefined();
    });

    it('should include correct coordinates in markers', () => {
      const segments = [createMockSegment('seg-1', 'stop-1', 'stop-2')];
      const markers = generateMapMarkers(segments);

      expect(markers[0].coordinate).toEqual([62.0, 129.0]);
      expect(markers[1].coordinate).toEqual([63.0, 130.0]);
    });

    it('should include correct popup content', () => {
      const segments = [createMockSegment('seg-1', 'stop-1', 'stop-2')];
      const markers = generateMapMarkers(segments);

      expect(markers[0].popupContent).toContain('Отправление');
      expect(markers[0].popupContent).toContain('Stop stop-1');
      expect(markers[0].popupContent).toContain('08:00');

      expect(markers[1].popupContent).toContain('Прибытие');
      expect(markers[1].popupContent).toContain('Stop stop-2');
      expect(markers[1].popupContent).toContain('10:00');
    });

    it('should include metadata in markers', () => {
      const segments = [createMockSegment('seg-1', 'stop-1', 'stop-2')];
      const markers = generateMapMarkers(segments);

      expect(markers[0].metadata).toBeDefined();
      expect(markers[0].metadata?.segmentId).toBe('seg-1');
      expect(markers[0].metadata?.isTransfer).toBe(false);

      expect(markers[1].metadata).toBeDefined();
      expect(markers[1].metadata?.segmentId).toBe('seg-1');
      expect(markers[1].metadata?.isTransfer).toBe(false);
    });

    it('should handle route with one segment (no transfer markers)', () => {
      const segments = [createMockSegment('seg-1', 'stop-1', 'stop-2')];
      const markers = generateMapMarkers(segments);

      const transferMarkers = markers.filter((m) => m.type === 'transfer');
      expect(transferMarkers).toHaveLength(0);
    });

    it('should handle complex route with multiple transfers', () => {
      const segments = [
        createMockSegment('seg-1', 'stop-1', 'stop-2', TransportType.BUS),
        createMockSegment('seg-2', 'stop-2', 'stop-3', TransportType.AIRPLANE),
        createMockSegment('seg-3', 'stop-3', 'stop-4', TransportType.TRAIN),
      ];
      const markers = generateMapMarkers(segments);

      expect(markers).toHaveLength(4);
      expect(markers[0].type).toBe('start');
      expect(markers[1].type).toBe('transfer');
      expect(markers[2].type).toBe('transfer');
      expect(markers[3].type).toBe('end');
    });
  });
});






