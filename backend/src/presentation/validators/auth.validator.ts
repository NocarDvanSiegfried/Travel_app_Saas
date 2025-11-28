import { z } from 'zod';

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

/**
 * Register request schema
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  phone: z.string().optional()
});

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

/**
 * Request validation schemas type exports
 */
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;