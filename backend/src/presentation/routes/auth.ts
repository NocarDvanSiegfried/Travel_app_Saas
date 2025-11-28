import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';
import { loginSchema, registerSchema } from '../validators';
import { z } from 'zod';

/**
 * Request validation schemas
 */
const refreshTokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

/**
 * Authentication Routes
 *
 * API endpoints for user authentication and authorization
 */
export function createAuthRoutes(
  authController: AuthController,
  userRepository: any
): Router {
  const router = Router();

  /**
   * Register a new user
   * POST /api/v1/auth/register
   *
   * Create a new user account with email and password.
   *
   * Request Body:
   * {
   *   email: string (valid email),
   *   password: string (min 6 chars),
   *   fullName: string (min 2 chars),
   *   phone?: string (optional)
   * }
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     user: { id, email, fullName, phone?, avatarUrl? },
   *     token: string,
   *     expiresIn: string
   *   },
   *   message: "User registered successfully"
   * }
   */
  router.post(
    '/register',
    validateRequest({ body: registerSchema }),
    authController.register
  );

  /**
   * Login user
   * POST /api/v1/auth/login
   *
   * Authenticate user with email and password.
   *
   * Request Body:
   * {
   *   email: string (valid email),
   *   password: string
   * }
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     user: { id, email, fullName, phone?, avatarUrl? },
   *     token: string,
   *     expiresIn: string
   *   },
   *   message: "Login successful"
   * }
   */
  router.post(
    '/login',
    validateRequest({ body: loginSchema }),
    authController.login
  );

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   *
   * Get the profile of the currently authenticated user.
   * Requires Bearer token in Authorization header.
   *
   * Headers:
   * Authorization: Bearer <jwt_token>
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     user: { id, email, fullName }
   *   },
   *   message: "Profile retrieved successfully"
   * }
   */
  router.get(
    '/me',
    authenticateToken(userRepository),
    authController.getProfile
  );

  /**
   * Refresh JWT token
   * POST /api/v1/auth/refresh
   *
   * Refresh an existing JWT token to get a new one.
   *
   * Request Body:
   * {
   *   token: string (existing JWT token)
   * }
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     user: { id, email, fullName, phone?, avatarUrl? },
   *     token: string,
   *     expiresIn: string
   *   },
   *   message: "Token refreshed successfully"
   * }
   */
  router.post(
    '/refresh',
    validateRequest({ body: refreshTokenSchema }),
    authController.refreshToken
  );

  return router;
}