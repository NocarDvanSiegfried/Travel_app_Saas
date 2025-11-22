import { z } from 'zod';

/**
 * Validation schemas for risk assessment endpoints
 */

/**
 * Schema for route segment
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

