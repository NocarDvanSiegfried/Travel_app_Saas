import { z } from 'zod';

/**
 * Validation schemas for route-related endpoints
 */

/**
 * Schema for route search parameters
 */
export const routeSearchSchema = z.object({
  from: z.string().min(1, 'Параметр from обязателен'),
  to: z.string().min(1, 'Параметр to обязателен'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
  tripClass: z.enum(['economy', 'business', 'first']).optional(),
  passengers: z.coerce.number().int().positive().max(9).optional(),
});

/**
 * Schema for route details query parameters
 */
export const routeDetailsSchema = z.object({
  routeId: z.string().min(1, 'Параметр routeId обязателен'),
});

/**
 * Schema for route build parameters
 */
export const routeBuildSchema = z.object({
  from: z.string().min(1, 'Параметр from обязателен'),
  to: z.string().min(1, 'Параметр to обязателен'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
  tripClass: z.enum(['economy', 'business', 'first']).optional(),
  passengers: z.coerce.number().int().positive().max(9).optional(),
});

