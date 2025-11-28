import { Request, Response } from 'express';
import { AuthService, LoginRequest, RegisterRequest } from '../../application/services/AuthService';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Request validation schemas
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  phone: z.string().optional()
});

/**
 * Authentication Controller
 *
 * Handles user registration, login, and token refresh
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   * POST /auth/register
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body) as RegisterRequest;

      // Register user
      const result = await this.authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: error.message,
            code: 'USER_EXISTS'
          });
          return;
        }
      }

      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Login user
   * POST /auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body) as LoginRequest;

      // Login user
      const result = await this.authService.login(validatedData);

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          res.status(401).json({
            success: false,
            error: error.message,
            code: 'INVALID_CREDENTIALS'
          });
          return;
        }
      }

      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Get current user profile
   * GET /auth/me
   */
  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: req.user
        },
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Refresh JWT token
   * POST /auth/refresh
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'TOKEN_REQUIRED'
        });
        return;
      }

      const result = await this.authService.refreshToken(token);

      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Invalid')) {
          res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'TOKEN_INVALID'
          });
          return;
        }
      }

      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}