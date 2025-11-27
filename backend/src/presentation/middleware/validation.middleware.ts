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
        // КРИТИЧЕСКИЙ ФИКС: Добавляем логирование для отладки валидации
        if (process.env.NODE_ENV === 'development') {
          console.log('[validateRequest] Validating body:', {
            path: req.path,
            method: req.method,
            body: req.body,
            hasBody: !!req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
          });
        }
        const validatedBody = await options.body.parseAsync(req.body);
        req.body = validatedBody;
        if (process.env.NODE_ENV === 'development') {
          console.log('[validateRequest] Body validation passed:', {
            path: req.path,
            validatedBody: validatedBody,
          });
        }
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // КРИТИЧЕСКИЙ ФИКС: Добавляем логирование ошибок валидации
        console.error('[validateRequest] Validation error:', {
          path: req.path,
          method: req.method,
          body: req.body,
          errors: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
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
      console.error('[validateRequest] Unexpected validation error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Внутренняя ошибка при валидации',
        },
      });
    }
  };
}

