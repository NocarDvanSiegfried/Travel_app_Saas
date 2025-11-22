/**
 * Request logging middleware
 * 
 * Logs all HTTP requests with:
 * - Method, path, status code
 * - Request execution time
 * - Client IP address
 * - User-Agent (optional)
 * - Request/response size (optional)
 * 
 * Also records Prometheus metrics for monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../../shared/logger/Logger';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
} from '../../shared/metrics/prometheus';

const logger = getLogger('RequestLogger');

/**
 * Sensitive fields that should be filtered from logs
 */
const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'apiKey', 'secret', 'accessToken', 'refreshToken'];

/**
 * Filters sensitive data from object
 * 
 * @param obj - Object to filter
 * @returns Filtered object
 */
function filterSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive field name
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      filtered[key] = '[FILTERED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively filter nested objects
      filtered[key] = filterSensitiveData(value as Record<string, unknown>);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Gets client IP address from request
 * 
 * @param req - Express request object
 * @returns Client IP address
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Request logging middleware
 * 
 * Logs request details and execution time
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const method = req.method;
  const path = req.path;
  const query = req.query;
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Filter sensitive data from query and body
  const filteredQuery = filterSensitiveData(query as Record<string, unknown>);
  const filteredBody = req.body ? filterSensitiveData(req.body as Record<string, unknown>) : undefined;

  // Log request start (only in development or if explicitly enabled)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logRequests = process.env.LOG_REQUESTS !== 'false';

  if (isDevelopment || logRequests) {
    logger.info('Incoming request', {
      method,
      path,
      query: Object.keys(filteredQuery).length > 0 ? filteredQuery : undefined,
      body: filteredBody,
      ip: clientIp,
      userAgent: isDevelopment ? userAgent : undefined, // User-Agent only in development
    });
  }

  // Log response when request finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;
    const statusCode = res.statusCode;

    // Record Prometheus metrics
    const labels = {
      method,
      route: path,
      status_code: String(statusCode),
    };

    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestTotal.inc(labels);

    // Record errors
    if (statusCode >= 400) {
      httpRequestErrors.inc({
        method,
        route: path,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }

    // Determine log level based on status code
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }

    // Log response
    if (isDevelopment || logRequests) {
      const logContext: Record<string, unknown> = {
        method,
        path,
        statusCode,
        duration: `${duration}ms`,
        ip: clientIp,
      };

      // Add response size if available
      const contentLength = res.getHeader('content-length');
      if (contentLength) {
        logContext.responseSize = contentLength;
      }

      if (logLevel === 'error') {
        logger.error('Request completed with error', undefined, logContext);
      } else if (logLevel === 'warn') {
        logger.warn('Request completed with warning', logContext);
      } else {
        logger.info('Request completed', logContext);
      }
    }
  });

  next();
}

