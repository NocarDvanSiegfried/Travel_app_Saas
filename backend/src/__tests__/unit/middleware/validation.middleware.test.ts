/**
 * Unit Tests: Validation Middleware
 * 
 * Tests for request validation middleware using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../../presentation/middleware/validation.middleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      query: {},
      params: {},
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validateRequest', () => {
    it('should pass validation for valid query parameters', async () => {
      const schema = z.object({
        page: z.coerce.number().int().positive(),
        limit: z.coerce.number().int().positive().max(100),
      });

      mockRequest.query = { page: '1', limit: '10' };

      const middleware = validateRequest({ query: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid query parameters', async () => {
      const schema = z.object({
        page: z.coerce.number().int().positive(),
      });

      mockRequest.query = { page: '-1' };

      const middleware = validateRequest({ query: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ошибка валидации входных данных',
          details: expect.any(Array),
        },
      });
    });

    it('should pass validation for valid body parameters', async () => {
      const schema = z.object({
        from: z.string().min(1),
        to: z.string().min(1),
      });

      mockRequest.body = { from: 'Москва', to: 'Санкт-Петербург' };

      const middleware = validateRequest({ body: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid body parameters', async () => {
      const schema = z.object({
        from: z.string().min(1),
        to: z.string().min(1),
      });

      mockRequest.body = { from: '' };

      const middleware = validateRequest({ body: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should pass validation for valid params', async () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validateRequest({ params: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle multiple validation schemas', async () => {
      const querySchema = z.object({ page: z.coerce.number().int().positive() });
      const bodySchema = z.object({ name: z.string().min(1) });

      mockRequest.query = { page: '1' };
      mockRequest.body = { name: 'Test' };

      const middleware = validateRequest({ query: querySchema, body: bodySchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const schema = z.object({});
      
      // Mock parseAsync to throw non-ZodError
      jest.spyOn(schema, 'parseAsync').mockRejectedValue(new Error('Unexpected error'));

      const middleware = validateRequest({ query: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Внутренняя ошибка при валидации',
        },
      });
    });
  });
});

