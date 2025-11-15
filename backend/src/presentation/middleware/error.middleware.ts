import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { ApiResponse } from '@shared/types';

/**
 * Middleware для обработки ошибок
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Request error', error, {
    path: req.path,
    method: req.method,
  });

  if (error instanceof AppError) {
    const response: ApiResponse<never> = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Неизвестная ошибка
  const response: ApiResponse<never> = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
}

