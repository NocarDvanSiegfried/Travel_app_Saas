import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

/**
 * Rate Limiting Configuration
 * 
 * Provides rate limiting middleware for API endpoints to prevent abuse and DDoS attacks.
 */

/**
 * General API rate limiter
 * 100 requests per 15 minutes from a single IP
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов, попробуйте позже',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/v1/health';
  },
});

/**
 * Route search rate limiter
 * 20 requests per 15 minutes from a single IP
 */
export const routeSearchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_ROUTE_SEARCH_MAX || '20', 10), // 20 requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов на поиск маршрутов, попробуйте позже',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Route risk assessment rate limiter
 * 10 requests per 15 minutes from a single IP
 */
export const routeRiskLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_ROUTE_RISK_MAX || '10', 10), // 10 requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов на оценку риска, попробуйте позже',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

