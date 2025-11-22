/**
 * Unit Tests: Error Handler Middleware
 * 
 * Tests for centralized error handling middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorHandler, AppError } from '../../../presentation/middleware/error-handler.middleware';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle AppError with status code', () => {
      const error = new AppError('TEST_ERROR', 'Test error', 404);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
      });
    });

    it('should handle ZodError with validation details', () => {
      const schema = z.object({ page: z.number().int().positive() });
      const result = schema.safeParse({ page: -1 });
      
      if (!result.success) {
        errorHandler(result.error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации входных данных',
            details: expect.any(Array),
          },
        });
      }
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Generic error',
        },
      });
    });

    it('should handle unknown error type', () => {
      const error = 'String error';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Внутренняя ошибка сервера',
        },
      });
    });
  });
});

