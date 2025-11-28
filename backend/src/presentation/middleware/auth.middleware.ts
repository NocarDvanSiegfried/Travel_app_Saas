import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

// Extended Request interface with user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// JWT Payload interface
interface JWTPayload {
  id: string;
  email: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens and sets user info in request
 */
export const authenticateToken = (
  userRepository: IUserRepository
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          code: 'TOKEN_MISSING'
        });
        return;
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

      // Verify and decode token
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // Validate user exists in database
      const user = await userRepository.findById(decoded.id);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid token - user not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Set user info in request
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'TOKEN_INVALID'
        });
        return;
      }

      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Optional authentication middleware
 *
 * If token is provided, validates and sets user info, but doesn't fail if no token
 */
export const optionalAuth = (
  userRepository: IUserRepository
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        // No token provided, continue without auth
        next();
        return;
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

      try {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        const user = await userRepository.findById(decoded.id);

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            fullName: user.fullName
          };
        }
      } catch (tokenError) {
        // Token validation failed, but continue without auth
        console.warn('Optional auth token validation failed:', tokenError);
      }

      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      next();
    }
  };
};

// Simple auth middleware for compatibility
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder auth middleware
  (req as any).user = { id: 'user123', email: 'test@example.com', fullName: 'Test User' };
  next();
};