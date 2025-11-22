/**
 * Security Headers Middleware
 * 
 * Adds security headers to all HTTP responses to protect against common attacks.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * 
 * Sets HTTP security headers to protect against:
 * - XSS attacks
 * - Clickjacking
 * - MIME type sniffing
 * - Protocol downgrade attacks
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS protection (legacy, but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    const maxAge = parseInt(process.env.HSTS_MAX_AGE || '31536000', 10); // 1 year default
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${maxAge}; includeSubDomains${process.env.HSTS_PRELOAD === 'true' ? '; preload' : ''}`
    );
  }

  // Content Security Policy (basic)
  const csp = process.env.CSP_POLICY || "default-src 'self'";
  res.setHeader('Content-Security-Policy', csp);

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
}

