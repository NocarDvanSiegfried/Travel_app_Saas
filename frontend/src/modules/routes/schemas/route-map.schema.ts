/**
 * Схемы валидации для данных карты маршрутов
 * 
 * @module routes/schemas
 */

import { z } from 'zod';
import { TransportType } from '../domain/types';

/**
 * Схема валидации координаты [широта, долгота]
 */
import type { Coordinate } from '../domain/map-types';

export const CoordinateSchema = z.tuple([z.number(), z.number()]);

/**
 * Схема валидации данных остановки для карты
 */
export const StopMapDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number(),
  cityName: z.string(),
  isTransfer: z.boolean(),
});

/**
 * Схема валидации данных полилинии
 */
export const PolylineDataSchema = z.object({
  coordinates: z.array(CoordinateSchema),
});

/**
 * Схема валидации данных сегмента маршрута для карты
 */
export const RouteSegmentMapDataSchema = z.object({
  segmentId: z.string(),
  transportType: z.nativeEnum(TransportType),
  fromStop: StopMapDataSchema,
  toStop: StopMapDataSchema,
  polyline: PolylineDataSchema,
  distance: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  price: z.number().nonnegative(),
  departureTime: z.string(),
  arrivalTime: z.string(),
});

/**
 * Схема валидации границ карты
 */
export const MapBoundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number(),
  west: z.number(),
});

/**
 * Схема валидации данных маршрута для карты (ответ от backend)
 */
export const RouteMapDataSchema = z.object({
  routeId: z.string(),
  fromCity: z.string(),
  toCity: z.string(),
  segments: z.array(RouteSegmentMapDataSchema),
  bounds: MapBoundsSchema,
  totalDistance: z.number().nonnegative(),
  totalDuration: z.number().nonnegative(),
});

/**
 * Схема валидации ответа API для данных карты
 */
export const RouteMapDataResponseSchema = z.object({
  success: z.boolean(),
  data: RouteMapDataSchema,
  cacheHit: z.boolean().optional(),
});

/**
 * Типы, выведенные из схем
 */
// Coordinate type imported from domain/map-types
export type StopMapData = z.infer<typeof StopMapDataSchema>;
export type PolylineData = z.infer<typeof PolylineDataSchema>;
export type RouteSegmentMapData = z.infer<typeof RouteSegmentMapDataSchema>;
export type MapBounds = z.infer<typeof MapBoundsSchema>;
export type RouteMapData = z.infer<typeof RouteMapDataSchema>;
export type RouteMapDataResponse = z.infer<typeof RouteMapDataResponseSchema>;

