# Детальная реализация интеграции карты

**Дата:** 2025-01-27  
**Статус:** Детальные примеры кода и структура

---

## 1. Backend: Endpoint для данных карты

### 1.1 Контроллер

**Файл:** `backend/src/presentation/controllers/RouteMapController.ts`

```typescript
import type { Request, Response } from 'express';
import { getLogger } from '../../shared/logger/Logger';
import { BuildRouteMapDataUseCase } from '../../application/route-builder/use-cases/BuildRouteMapDataUseCase';
import { DatabaseConfig } from '../../infrastructure/config/database.config';
import { PostgresStopRepository } from '../../infrastructure/repositories/PostgresStopRepository';
import { PostgresRouteRepository } from '../../infrastructure/repositories/PostgresRouteRepository';
import { PostgresGraphRepository } from '../../infrastructure/repositories/PostgresGraphRepository';
import { RedisConfig } from '../../infrastructure/config/redis.config';
import { OptimizedBuildRouteUseCase } from '../../application/route-builder/use-cases/BuildRouteUseCase.optimized';
import { PostgresFlightRepository } from '../../infrastructure/repositories/PostgresFlightRepository';

const logger = getLogger('RouteMapController');

/**
 * Get route map data
 * 
 * GET /api/v1/routes/:routeId/map
 * 
 * Returns route data enriched with coordinates for map display.
 * 
 * Response:
 * - 200: Route map data
 * - 404: Route not found
 * - 500: Internal server error
 */
export async function getRouteMap(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const routeId = req.params.routeId;
    
    if (!routeId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Route ID is required',
        },
      });
      return;
    }

    // Initialize repositories
    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();
    const stopRepository = new PostgresStopRepository(pool);
    const routeRepository = new PostgresRouteRepository(pool);
    const graphRepository = new PostgresGraphRepository(pool, redis);
    const flightRepository = new PostgresFlightRepository(pool);

    // Get route data (we need to reconstruct route from routeId)
    // For MVP: routeId format is "route-{fromStopId}-{toStopId}-{timestamp}"
    // We'll need to extract cities from routeId or store route data differently
    
    // Alternative: Accept route data in request body or query params
    // For now, we'll require route data to be passed
    
    // Use BuildRouteMapDataUseCase
    const useCase = new BuildRouteMapDataUseCase(stopRepository);
    
    // We need IBuiltRoute - for MVP, we can reconstruct it
    // Or better: store route data in Redis/cache after search
    
    // For now, return error suggesting to use route search first
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Route map endpoint requires route data. Please use route search first, then request map data with route object.',
      },
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to get route map data', error as Error, {
      duration: `${duration}ms`,
      routeId: req.params.routeId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get route map data',
      },
    });
  }
}

/**
 * Get route map data from route object
 * 
 * POST /api/v1/routes/map
 * 
 * Accepts route object in request body and returns map data.
 * 
 * Request body:
 * {
 *   route: IBuiltRoute
 * }
 * 
 * Response:
 * - 200: Route map data
 * - 400: Invalid route data
 * - 500: Internal server error
 */
export async function getRouteMapFromRoute(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const { route } = req.body;
    
    if (!route || !route.segments || !Array.isArray(route.segments)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route data. Expected route object with segments array.',
        },
      });
      return;
    }

    // Initialize repositories
    const pool = DatabaseConfig.getPool();
    const stopRepository = new PostgresStopRepository(pool);

    // Use BuildRouteMapDataUseCase
    const useCase = new BuildRouteMapDataUseCase(stopRepository);
    const mapData = await useCase.execute(route);

    const duration = Date.now() - startTime;
    logger.info('Route map data generated', {
      routeId: route.routeId,
      segmentsCount: route.segments.length,
      duration: `${duration}ms`,
    });

    res.status(200).json({
      success: true,
      ...mapData,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to get route map data', error as Error, {
      duration: `${duration}ms`,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get route map data',
      },
    });
  }
}
```

### 1.2 Use Case

**Файл:** `backend/src/application/route-builder/use-cases/BuildRouteMapDataUseCase.ts`

```typescript
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import { getLogger } from '../../../shared/logger/Logger';
import { buildGreatCirclePolyline, buildStraightPolyline } from '../../../shared/utils/polyline-builder';
import { TransportType } from '../../../domain/entities/RouteSegment';

const logger = getLogger('BuildRouteMapDataUseCase');

export interface RouteMapDataResponse {
  routeId: string;
  fromCity: string;
  toCity: string;
  segments: RouteSegmentMapData[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalDistance: number;
  totalDuration: number;
}

export interface RouteSegmentMapData {
  segmentId: string;
  transportType: TransportType;
  fromStop: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    cityName: string;
    isTransfer: boolean;
  };
  toStop: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    cityName: string;
    isTransfer: boolean;
  };
  polyline: {
    coordinates: [number, number][]; // [[lat, lng], ...]
  };
  distance: number;
  duration: number;
  price: number;
  departureTime: string;
  arrivalTime: string;
}

/**
 * Build route map data use case
 * 
 * Transforms IBuiltRoute into RouteMapDataResponse with coordinates and polylines.
 */
export class BuildRouteMapDataUseCase {
  constructor(
    private readonly stopRepository: IStopRepository
  ) {}

  async execute(route: IBuiltRoute): Promise<RouteMapDataResponse> {
    const segments: RouteSegmentMapData[] = [];
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    // Process each segment
    for (let i = 0; i < route.segments.length; i++) {
      const segment = route.segments[i];
      
      // Load stop coordinates
      const fromStop = await this.stopRepository.findRealStopById(segment.segment.fromStopId) ||
                      await this.stopRepository.findVirtualStopById(segment.segment.fromStopId);
      
      const toStop = await this.stopRepository.findRealStopById(segment.segment.toStopId) ||
                     await this.stopRepository.findVirtualStopById(segment.segment.toStopId);

      if (!fromStop || !toStop) {
        logger.warn('Stop not found for segment', {
          segmentId: segment.segment.segmentId,
          fromStopId: segment.segment.fromStopId,
          toStopId: segment.segment.toStopId,
        });
        continue;
      }

      // Build polyline based on transport type
      let polylineCoordinates: [number, number][];
      
      if (segment.segment.transportType === 'PLANE') {
        // Great Circle for airplane
        polylineCoordinates = buildGreatCirclePolyline(
          [fromStop.latitude, fromStop.longitude],
          [toStop.latitude, toStop.longitude],
          50 // steps
        );
      } else {
        // Straight line for ground transport
        polylineCoordinates = buildStraightPolyline(
          [fromStop.latitude, fromStop.longitude],
          [toStop.latitude, toStop.longitude]
        );
      }

      // Update bounds
      for (const [lat, lng] of polylineCoordinates) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }

      // Extract city name from stop name or use route cities
      const fromCityName = this.extractCityName(fromStop.name, i === 0 ? route.fromCity : '');
      const toCityName = this.extractCityName(toStop.name, i === route.segments.length - 1 ? route.toCity : '');

      segments.push({
        segmentId: segment.segment.segmentId,
        transportType: segment.segment.transportType,
        fromStop: {
          id: fromStop.id,
          name: fromStop.name,
          latitude: fromStop.latitude,
          longitude: fromStop.longitude,
          cityName: fromCityName,
          isTransfer: i > 0, // Not the first segment
        },
        toStop: {
          id: toStop.id,
          name: toStop.name,
          latitude: toStop.latitude,
          longitude: toStop.longitude,
          cityName: toCityName,
          isTransfer: i < route.segments.length - 1, // Not the last segment
        },
        polyline: {
          coordinates: polylineCoordinates,
        },
        distance: segment.segment.distance || 0,
        duration: segment.duration,
        price: segment.price,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
      });
    }

    return {
      routeId: route.routeId,
      fromCity: route.fromCity,
      toCity: route.toCity,
      segments,
      bounds: {
        north: maxLat,
        south: minLat,
        east: maxLng,
        west: minLng,
      },
      totalDistance: route.segments.reduce((sum, seg) => sum + (seg.segment.distance || 0), 0),
      totalDuration: route.totalDuration,
    };
  }

  private extractCityName(stopName: string, fallback: string): string {
    // Try to extract city name from stop name
    // Format: "Якутск (Аэропорт)" -> "Якутск"
    const match = stopName.match(/^([^(]+)/);
    return match ? match[1].trim() : fallback;
  }
}
```

### 1.3 Утилита для построения полилиний

**Файл:** `backend/src/shared/utils/polyline-builder.ts`

```typescript
/**
 * Polyline builder utilities
 * 
 * Builds polylines for different transport types:
 * - Great Circle for airplanes (shortest path on sphere)
 * - Straight line for ground transport
 */

/**
 * Build Great Circle polyline (for airplanes)
 * 
 * @param from - [latitude, longitude] of start point
 * @param to - [latitude, longitude] of end point
 * @param steps - Number of intermediate points
 * @returns Array of [latitude, longitude] coordinates
 */
export function buildGreatCirclePolyline(
  from: [number, number],
  to: [number, number],
  steps: number = 50
): [number, number][] {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;

  const coordinates: [number, number][] = [[lat1, lon1]];

  // Convert to radians
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  // Great Circle formula
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + 
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    ));
    const b = Math.sin(f * Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + 
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    ));
    
    const A = Math.sin((1 - f) * Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + 
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    )) / Math.sin(Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + 
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    ));
    
    const B = Math.sin(f * Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + 
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    )) / Math.sin(Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + 
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    ));

    const x = A * Math.cos(φ1) * Math.cos(lon1 * Math.PI / 180) + 
              B * Math.cos(φ2) * Math.cos(lon2 * Math.PI / 180);
    const y = A * Math.cos(φ1) * Math.sin(lon1 * Math.PI / 180) + 
              B * Math.cos(φ2) * Math.sin(lon2 * Math.PI / 180);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;

    coordinates.push([lat, lon]);
  }

  coordinates.push([lat2, lon2]);
  return coordinates;
}

/**
 * Build straight polyline (for ground transport)
 * 
 * @param from - [latitude, longitude] of start point
 * @param to - [latitude, longitude] of end point
 * @returns Array of [latitude, longitude] coordinates (just start and end)
 */
export function buildStraightPolyline(
  from: [number, number],
  to: [number, number]
): [number, number][] {
  return [from, to];
}

/**
 * Encode polyline to Google/Yandex format
 * 
 * @param coordinates - Array of [latitude, longitude]
 * @returns Encoded polyline string
 */
export function encodePolyline(coordinates: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    const dLat = Math.round((lat - prevLat) * 1e5);
    const dLng = Math.round((lng - prevLng) * 1e5);

    encoded += encodeValue(dLat);
    encoded += encodeValue(dLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

function encodeValue(value: number): string {
  value = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';
  
  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  
  encoded += String.fromCharCode(value + 63);
  return encoded;
}
```

---

## 2. Frontend: Типы и адаптер

### 2.1 Типы для карты

**Файл:** `frontend/src/modules/routes/features/route-map/types.ts`

```typescript
import { TransportType } from '../../domain/types';

export interface RouteMapData {
  routeId: string;
  fromCity: string;
  toCity: string;
  segments: RouteSegmentMapData[];
  bounds: MapBounds;
  totalDistance: number;
  totalDuration: number;
}

export interface RouteSegmentMapData {
  segmentId: string;
  transportType: TransportType;
  fromStop: MapStop;
  toStop: MapStop;
  polyline: {
    coordinates: [number, number][]; // [[lat, lng], ...]
  };
  distance: number;
  duration: number;
  price: number;
  departureTime: string;
  arrivalTime: string;
}

export interface MapStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cityName: string;
  isTransfer: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarker {
  id: string;
  type: 'start' | 'end' | 'transfer' | 'segment-start' | 'segment-end';
  position: [number, number]; // [latitude, longitude]
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  zIndex?: number;
}
```

### 2.2 Адаптер данных

**Файл:** `frontend/src/modules/routes/features/route-map/lib/map-data-adapter.ts`

```typescript
import type { IBuiltRoute } from '../../../domain/types';
import type { RouteMapData, RouteSegmentMapData, MapMarker } from '../types';
import { TRANSPORT_COLORS, TRANSPORT_ICONS } from './map-styles';

/**
 * Adapts route data from API to map format
 */
export function adaptRouteToMapData(
  route: IBuiltRoute,
  mapDataResponse: any // RouteMapDataResponse from API
): RouteMapData {
  return {
    routeId: route.routeId,
    fromCity: route.fromCity,
    toCity: route.toCity,
    segments: mapDataResponse.segments.map((seg: any) => ({
      segmentId: seg.segmentId,
      transportType: seg.transportType,
      fromStop: seg.fromStop,
      toStop: seg.toStop,
      polyline: seg.polyline,
      distance: seg.distance,
      duration: seg.duration,
      price: seg.price,
      departureTime: seg.departureTime,
      arrivalTime: seg.arrivalTime,
    })),
    bounds: mapDataResponse.bounds,
    totalDistance: mapDataResponse.totalDistance,
    totalDuration: mapDataResponse.totalDuration,
  };
}

/**
 * Generates map markers from route map data
 */
export function generateMapMarkers(mapData: RouteMapData): MapMarker[] {
  const markers: MapMarker[] = [];
  const seenStops = new Set<string>();

  for (let i = 0; i < mapData.segments.length; i++) {
    const segment = mapData.segments[i];
    
    // Start marker (first segment only)
    if (i === 0 && !seenStops.has(segment.fromStop.id)) {
      markers.push({
        id: `start-${segment.fromStop.id}`,
        type: 'start',
        position: [segment.fromStop.latitude, segment.fromStop.longitude],
        title: segment.fromStop.name,
        description: `Отправление: ${segment.departureTime}`,
        icon: '📍',
        color: '#00CC66', // Green
        zIndex: 1000,
      });
      seenStops.add(segment.fromStop.id);
    }

    // Transfer marker (intermediate stops)
    if (segment.fromStop.isTransfer && !seenStops.has(segment.fromStop.id)) {
      markers.push({
        id: `transfer-${segment.fromStop.id}`,
        type: 'transfer',
        position: [segment.fromStop.latitude, segment.fromStop.longitude],
        title: segment.fromStop.name,
        description: `Пересадка: ${segment.departureTime}`,
        icon: '🔄',
        color: '#999999', // Gray
        zIndex: 500,
      });
      seenStops.add(segment.fromStop.id);
    }

    // End marker (last segment only)
    if (i === mapData.segments.length - 1 && !seenStops.has(segment.toStop.id)) {
      markers.push({
        id: `end-${segment.toStop.id}`,
        type: 'end',
        position: [segment.toStop.latitude, segment.toStop.longitude],
        title: segment.toStop.name,
        description: `Прибытие: ${segment.arrivalTime}`,
        icon: '🏁',
        color: '#FF0000', // Red
        zIndex: 1000,
      });
      seenStops.add(segment.toStop.id);
    }
  }

  return markers;
}
```

### 2.3 Стили для карты

**Файл:** `frontend/src/modules/routes/features/route-map/lib/map-styles.ts`

```typescript
import { TransportType } from '../../../domain/types';

export const TRANSPORT_COLORS: Record<TransportType, string> = {
  PLANE: '#0066CC',    // Синий — самолёт
  TRAIN: '#00CC66',    // Зелёный — поезд
  BUS: '#FF9900',      // Оранжевый — автобус
  FERRY: '#00CCFF',    // Голубой — паром
  WATER: '#0066FF',    // Синий — водный транспорт
  TAXI: '#FF6600',     // Оранжевый — такси
  UNKNOWN: '#999999',  // Серый — неизвестный
  // Frontend types
  airplane: '#0066CC',
  train: '#00CC66',
  bus: '#FF9900',
  ferry: '#00CCFF',
  water: '#0066FF',
  taxi: '#FF6600',
  unknown: '#999999',
};

export const TRANSPORT_ICONS: Record<TransportType, string> = {
  PLANE: '✈️',
  TRAIN: '🚂',
  BUS: '🚌',
  FERRY: '⛴️',
  WATER: '🚢',
  TAXI: '🚕',
  UNKNOWN: '📍',
  // Frontend types
  airplane: '✈️',
  train: '🚂',
  bus: '🚌',
  ferry: '⛴️',
  water: '🚢',
  taxi: '🚕',
  unknown: '📍',
};

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  PLANE: 'Самолёт',
  TRAIN: 'Поезд',
  BUS: 'Автобус',
  FERRY: 'Паром',
  WATER: 'Водный транспорт',
  TAXI: 'Такси',
  UNKNOWN: 'Неизвестно',
  // Frontend types
  airplane: 'Самолёт',
  train: 'Поезд',
  bus: 'Автобус',
  ferry: 'Паром',
  water: 'Водный транспорт',
  taxi: 'Такси',
  unknown: 'Неизвестно',
};

export function getTransportColor(transportType: TransportType): string {
  return TRANSPORT_COLORS[transportType] || TRANSPORT_COLORS.UNKNOWN;
}

export function getTransportIcon(transportType: TransportType): string {
  return TRANSPORT_ICONS[transportType] || TRANSPORT_ICONS.UNKNOWN;
}

export function getTransportLabel(transportType: TransportType): string {
  return TRANSPORT_LABELS[transportType] || TRANSPORT_LABELS.UNKNOWN;
}
```

---

## 3. Frontend: Хуки

### 3.1 Хук загрузки данных карты

**Файл:** `frontend/src/modules/routes/features/route-map/hooks/use-route-map-data.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import type { RouteMapData } from '../types';
import type { IBuiltRoute } from '../../../domain/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Fetch route map data from API
 */
async function fetchRouteMapData(route: IBuiltRoute): Promise<RouteMapData> {
  const response = await fetch(`${API_URL}/api/v1/routes/map`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ route }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch route map data: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch route map data');
  }

  return data;
}

/**
 * Hook for loading route map data
 * 
 * @param route - Route data (IBuiltRoute)
 * @returns Query result with map data
 */
export function useRouteMapData(route: IBuiltRoute | null) {
  return useQuery({
    queryKey: ['route-map', route?.routeId],
    queryFn: () => route ? fetchRouteMapData(route) : Promise.reject(new Error('Route is required')),
    enabled: !!route,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### 3.2 Хук расчёта границ карты

**Файл:** `frontend/src/modules/routes/features/route-map/hooks/use-route-map-bounds.ts`

```typescript
import { useMemo } from 'react';
import type { MapBounds } from '../types';

/**
 * Calculate optimal map bounds from route segments
 */
export function useRouteMapBounds(segments: Array<{ polyline: { coordinates: [number, number][] } }>): MapBounds | null {
  return useMemo(() => {
    if (!segments || segments.length === 0) {
      return null;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const segment of segments) {
      for (const [lat, lng] of segment.polyline.coordinates) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }

    // Add padding (10% on each side)
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    return {
      north: maxLat + latPadding,
      south: minLat - latPadding,
      east: maxLng + lngPadding,
      west: minLng - lngPadding,
    };
  }, [segments]);
}
```

---

## 4. Frontend: Компоненты (Yandex Maps)

### 4.1 Основной компонент карты

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { YMaps, Map, Polyline, Placemark } from '@pbe/react-yandex-maps';
import type { RouteMapData } from '../types';
import { useRouteMapBounds } from '../hooks/use-route-map-bounds';
import { generateMapMarkers } from '../lib/map-data-adapter';
import { getTransportColor } from '../lib/map-styles';
import { RouteMapLegend } from './route-map-legend';

interface RouteMapProps {
  mapData: RouteMapData | null;
  isLoading?: boolean;
  onSegmentClick?: (segmentId: string) => void;
  className?: string;
}

/**
 * Route map component using Yandex Maps
 * 
 * Displays multimodal route with different colors for each transport type.
 */
export function RouteMap({ 
  mapData, 
  isLoading = false,
  onSegmentClick,
  className = '',
}: RouteMapProps) {
  const mapRef = useRef<ymaps.Map | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const bounds = useRouteMapBounds(mapData?.segments || []);
  const markers = mapData ? generateMapMarkers(mapData) : [];

  // Set map bounds when data loads
  useEffect(() => {
    if (bounds && mapRef.current) {
      mapRef.current.setBounds([
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ]);
    }
  }, [bounds]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <div className="text-gray-500">Загрузка карты...</div>
      </div>
    );
  }

  if (!mapData || !bounds) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <div className="text-gray-500">Нет данных для отображения</div>
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <div className="text-red-500">Yandex Maps API key not configured</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <YMaps query={{ apikey: apiKey }}>
        <Map
          defaultState={{
            center: [
              (bounds.north + bounds.south) / 2,
              (bounds.east + bounds.west) / 2,
            ],
            zoom: 6,
          }}
          width="100%"
          height="600px"
          instanceRef={mapRef}
        >
          {/* Render route segments */}
          {mapData.segments.map((segment) => {
            const color = getTransportColor(segment.transportType);
            const isSelected = selectedSegmentId === segment.segmentId;

            return (
              <Polyline
                key={segment.segmentId}
                geometry={segment.polyline.coordinates.map(([lat, lng]) => [lat, lng])}
                options={{
                  strokeColor: color,
                  strokeWidth: isSelected ? 5 : 3,
                  strokeOpacity: isSelected ? 1 : 0.8,
                  strokeStyle: 'solid',
                }}
                onClick={() => {
                  setSelectedSegmentId(segment.segmentId);
                  onSegmentClick?.(segment.segmentId);
                }}
              />
            );
          })}

          {/* Render markers */}
          {markers.map((marker) => (
            <Placemark
              key={marker.id}
              geometry={marker.position}
              properties={{
                iconContent: marker.icon,
                hintContent: marker.title,
                balloonContent: marker.description,
              }}
              options={{
                preset: 'islands#circleIcon',
                iconColor: marker.color,
                zIndex: marker.zIndex,
              }}
            />
          ))}
        </Map>
      </YMaps>

      {/* Legend */}
      <RouteMapLegend className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg" />
    </div>
  );
}
```

### 4.2 Компонент легенды

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map-legend.tsx`

```typescript
'use client';

import { getTransportColor, getTransportIcon, getTransportLabel } from '../lib/map-styles';
import { TransportType } from '../../../domain/types';

interface RouteMapLegendProps {
  className?: string;
}

const TRANSPORT_TYPES: TransportType[] = ['PLANE', 'TRAIN', 'BUS', 'FERRY', 'TAXI'];

/**
 * Legend component showing transport types with colors
 */
export function RouteMapLegend({ className = '' }: RouteMapLegendProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold mb-2">Типы транспорта</h3>
      <ul className="space-y-1">
        {TRANSPORT_TYPES.map((type) => (
          <li key={type} className="flex items-center gap-2 text-xs">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getTransportColor(type) }}
            />
            <span>{getTransportIcon(type)} {getTransportLabel(type)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5. Интеграция в страницу деталей маршрута

### 5.1 Модификация RouteDetailsView

**Файл:** `frontend/src/modules/routes/features/route-details/ui/route-details-view.tsx`

Добавить импорт и секцию карты:

```typescript
import { RouteMap } from '../../route-map';
import { useRouteMapData } from '../../route-map/hooks/use-route-map-data';

// В компоненте:
const { data: mapData, isLoading: isMapLoading } = useRouteMapData(route);

// В JSX добавить:
<div className="mt-6">
  <h2 className="text-xl font-semibold mb-4">Маршрут на карте</h2>
  <RouteMap 
    mapData={mapData || null} 
    isLoading={isMapLoading}
    onSegmentClick={(segmentId) => {
      // Подсветить сегмент в списке
      console.log('Segment clicked:', segmentId);
    }}
  />
</div>
```

---

## 6. Альтернативная реализация с Leaflet

### 6.1 Компонент карты на Leaflet

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map-leaflet.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteMapData } from '../types';
import { useRouteMapBounds } from '../hooks/use-route-map-bounds';
import { generateMapMarkers } from '../lib/map-data-adapter';
import { getTransportColor } from '../lib/map-styles';

interface RouteMapLeafletProps {
  mapData: RouteMapData | null;
  isLoading?: boolean;
  onSegmentClick?: (segmentId: string) => void;
  className?: string;
}

/**
 * Route map component using Leaflet
 * 
 * Alternative implementation without external API key requirement.
 */
export function RouteMapLeaflet({ 
  mapData, 
  isLoading = false,
  onSegmentClick,
  className = '',
}: RouteMapLeafletProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const bounds = useRouteMapBounds(mapData?.segments || []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([62.0, 129.0], 6);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update map bounds
  useEffect(() => {
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds([
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ], { padding: [50, 50] });
    }
  }, [bounds]);

  // Render segments
  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add segments
    mapData.segments.forEach((segment) => {
      const color = getTransportColor(segment.transportType);
      const polyline = L.polyline(
        segment.polyline.coordinates.map(([lat, lng]) => [lat, lng] as [number, number]),
        {
          color,
          weight: 4,
          opacity: 0.8,
        }
      ).addTo(mapRef.current!);

      polyline.on('click', () => {
        onSegmentClick?.(segment.segmentId);
      });
    });

    // Add markers
    const markers = generateMapMarkers(mapData);
    markers.forEach((marker) => {
      L.marker([marker.position[0], marker.position[1]], {
        icon: L.divIcon({
          html: `<div style="
            background-color: ${marker.color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          ">${marker.icon}</div>`,
          className: 'custom-marker',
          iconSize: [24, 24],
        }),
      })
        .addTo(mapRef.current!)
        .bindPopup(marker.description || marker.title);
    });
  }, [mapData, onSegmentClick]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <div className="text-gray-500">Загрузка карты...</div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <div className="text-gray-500">Нет данных для отображения</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-96 rounded-lg" />
    </div>
  );
}
```

---

## 7. Итоговая структура файлов

### 7.1 Backend (новые файлы)

```
backend/src/
├── presentation/
│   └── controllers/
│       └── RouteMapController.ts          ✅ Создать
├── application/
│   └── route-builder/
│       └── use-cases/
│           └── BuildRouteMapDataUseCase.ts ✅ Создать
└── shared/
    └── utils/
        └── polyline-builder.ts            ✅ Создать
```

### 7.2 Frontend (новые файлы)

```
frontend/src/modules/routes/
├── features/
│   └── route-map/                         ✅ Создать модуль
│       ├── ui/
│       │   ├── route-map.tsx              ✅ Yandex Maps
│       │   ├── route-map-leaflet.tsx     ✅ Leaflet (альтернатива)
│       │   ├── route-map-legend.tsx      ✅ Легенда
│       │   └── index.ts
│       ├── hooks/
│       │   ├── use-route-map-data.ts      ✅ Загрузка данных
│       │   ├── use-route-map-bounds.ts   ✅ Расчёт границ
│       │   └── index.ts
│       ├── lib/
│       │   ├── map-data-adapter.ts        ✅ Адаптер данных
│       │   ├── map-styles.ts              ✅ Стили и цвета
│       │   └── index.ts
│       ├── types.ts                       ✅ Типы
│       └── index.ts
└── lib/
    └── route-map-api.ts                    ✅ API клиент
```

---

## 8. Порядок реализации

### Шаг 1: Backend (2-3 часа)
1. Создать `polyline-builder.ts`
2. Создать `BuildRouteMapDataUseCase.ts`
3. Создать `RouteMapController.ts`
4. Зарегистрировать роут
5. Добавить тесты

### Шаг 2: Frontend — Инфраструктура (1 час)
1. Установить зависимости (`@pbe/react-yandex-maps` или `leaflet`)
2. Создать типы
3. Создать адаптер данных
4. Создать стили

### Шаг 3: Frontend — Хуки (1-2 часа)
1. Создать `useRouteMapData`
2. Создать `useRouteMapBounds`
3. Создать API клиент

### Шаг 4: Frontend — Компоненты (3-4 часа)
1. Создать `RouteMap` (Yandex Maps)
2. Создать `RouteMapLegend`
3. Добавить обработку кликов

### Шаг 5: Интеграция (1-2 часа)
1. Интегрировать в `RouteDetailsView`
2. Добавить переключение альтернативных маршрутов
3. Тестирование

---

**Готово к реализации. Начинать с Backend?**



