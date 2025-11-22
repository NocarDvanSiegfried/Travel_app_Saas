import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getLogger } from '../../shared/logger/Logger';

const logger = getLogger('ErrorHandler');

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Custom application errors
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database error handler
 */
function handleDatabaseError(error: Error): ErrorResponse {
  const message = error.message.toLowerCase();
  
  if (message.includes('connection') || message.includes('timeout')) {
    return {
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Ошибка подключения к базе данных',
      },
    };
  }
  
  if (message.includes('duplicate') || message.includes('unique')) {
    return {
      error: {
        code: 'DATABASE_CONSTRAINT_ERROR',
        message: 'Нарушение ограничений базы данных',
      },
    };
  }
  
  return {
    error: {
      code: 'DATABASE_ERROR',
      message: 'Ошибка базы данных',
    },
  };
}

/**
 * Redis error handler
 */
function handleRedisError(error: Error): ErrorResponse {
  const message = error.message.toLowerCase();
  
  if (message.includes('connection') || message.includes('timeout')) {
    return {
      error: {
        code: 'REDIS_CONNECTION_ERROR',
        message: 'Ошибка подключения к Redis',
      },
    };
  }
  
  return {
    error: {
      code: 'REDIS_ERROR',
      message: 'Ошибка Redis',
    },
  };
}

/**
 * External API error handler
 */
function handleExternalApiError(error: Error): ErrorResponse {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout')) {
    return {
      error: {
        code: 'EXTERNAL_API_TIMEOUT',
        message: 'Таймаут при обращении к внешнему API',
      },
    };
  }
  
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return {
      error: {
        code: 'EXTERNAL_API_AUTH_ERROR',
        message: 'Ошибка аутентификации во внешнем API',
      },
    };
  }
  
  return {
    error: {
      code: 'EXTERNAL_API_ERROR',
      message: 'Ошибка при обращении к внешнему API',
    },
  };
}

/**
 * Centralized error handling middleware
 * 
 * Handles all errors in a consistent way:
 * - Logs errors with context
 * - Returns standardized error responses
 * - Handles different error types (validation, database, external API, etc.)
 */
export function errorHandler(
  error: Error | AppError | ZodError | unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  const errorContext = {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Handle Zod validation errors (should be caught by validation middleware, but just in case)
  if (error instanceof ZodError) {
    logger.warn('Validation error', { ...errorContext, errors: error.issues });
    
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

  // Handle custom AppError
  if (error instanceof AppError) {
    logger.error(`Application error: ${error.code}`, error, errorContext);
    
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  // Handle standard Error
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    // Database errors
    if (errorMessage.includes('postgres') || errorMessage.includes('database') || errorMessage.includes('sql')) {
      logger.error('Database error', error, errorContext);
      const response = handleDatabaseError(error);
      res.status(500).json(response);
      return;
    }
    
    // Redis errors
    if (errorMessage.includes('redis') || errorMessage.includes('ioredis')) {
      logger.error('Redis error', error, errorContext);
      const response = handleRedisError(error);
      res.status(500).json(response);
      return;
    }
    
    // External API errors (OData, etc.)
    if (errorMessage.includes('odata') || errorMessage.includes('external') || errorMessage.includes('api')) {
      logger.error('External API error', error, errorContext);
      const response = handleExternalApiError(error);
      res.status(502).json(response);
      return;
    }
    
    // Generic error
    logger.error('Unhandled error', error, errorContext);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Внутренняя ошибка сервера' 
          : error.message,
      },
    });
    return;
  }

  // Handle unknown error types
  logger.error('Unknown error type', new Error(String(error)), errorContext);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Внутренняя ошибка сервера',
    },
  });
}

/**
 * Async error wrapper for route handlers
 * 
 * Wraps async route handlers to catch errors and pass them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(error);
    });
  };
}

