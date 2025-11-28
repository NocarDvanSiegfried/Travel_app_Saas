import { z } from 'zod';

/**
 * Validation schemas for risk assessment endpoints
 */

/**
 * Schema for route segment (для оценки риска сегмента)
 */
export const routeSegmentForRiskSchema = z.object({
  segmentId: z.string().min(1, 'segmentId обязателен'),
  fromStopId: z.string().min(1, 'fromStopId обязателен'),
  toStopId: z.string().min(1, 'toStopId обязателен'),
  routeId: z.string().min(1, 'routeId обязателен'),
  transportType: z.enum(['airplane', 'train', 'bus', 'ferry', 'taxi', 'winter_road', 'unknown'], {
    errorMap: () => ({ message: 'Недопустимый тип транспорта' }),
  }),
  distance: z.number().positive().optional(),
  estimatedDuration: z.number().positive().optional(),
  basePrice: z.number().positive().optional(),
});

/**
 * Schema for route segment (для обратной совместимости)
 */
const routeSegmentSchema = z.object({
  segmentId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  transportType: z.string().min(1),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  duration: z.number().optional(),
  price: z.number().optional(),
  carrier: z.string().optional(),
  flightNumber: z.string().optional(),
});

/**
 * Schema for built route
 */
const builtRouteSchema = z.object({
  routeId: z.string().min(1, 'routeId обязателен'),
  segments: z.array(routeSegmentSchema).min(1, 'Маршрут должен содержать хотя бы один сегмент'),
  totalDuration: z.number().optional(),
  totalPrice: z.number().optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

/**
 * Schema for risk assessment request body
 * Supports both { route: { ... } } and { ... } formats
 */
export const riskAssessmentSchema = z.union([
  z.object({
    route: builtRouteSchema,
  }),
  builtRouteSchema,
]);

/**
 * Schema for segment risk assessment request body
 * Supports both { segment: { ... } } and { ... } formats
 */
export const segmentRiskAssessmentSchema = z.union([
  z.object({
    segment: routeSegmentForRiskSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD').optional(),
    passengers: z.number().int().positive().max(10).optional(),
  }),
  routeSegmentForRiskSchema.extend({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD').optional(),
    passengers: z.number().int().positive().max(10).optional(),
  }),
]);

