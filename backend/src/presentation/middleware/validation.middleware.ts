import { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

/**
 * Validation middleware for Express
 * 
 * Validates request data (query, params, body) against Zod schemas
 */

/**
 * Options for validation middleware
 */
interface ValidationOptions {
  query?: ZodSchema;
  params?: ZodSchema;
  body?: ZodSchema;
}

/**
 * Creates validation middleware for Express
 * 
 * @param options - Validation schemas for query, params, and body
 * @returns Express middleware function
 */
export function validateRequest(options: ValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters
      if (options.query) {
        const validatedQuery = await options.query.parseAsync(req.query);
        req.query = validatedQuery as typeof req.query;
      }

      // Validate route parameters
      if (options.params) {
        const validatedParams = await options.params.parseAsync(req.params);
        req.params = validatedParams as typeof req.params;
      }

      // Validate request body
      if (options.body) {
        const validatedBody = await options.body.parseAsync(req.body);
        req.body = validatedBody;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации входных данных',
            details: error.issues.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
        });
        return;
      }

      // Unexpected error
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Внутренняя ошибка при валидации',
        },
      });
    }
  };
}

