/**
 * CORS configuration utilities
 * 
 * Provides helpers for configuring CORS with multiple origins support
 */

/**
 * Parses CORS origins from environment variable
 * Supports comma-separated list of origins
 * 
 * @param envValue - Environment variable value (comma-separated origins or single origin)
 * @returns Array of allowed origins
 */
export function parseCorsOrigins(envValue?: string): string[] {
  if (!envValue) {
    return ['http://localhost:3000']; // Default for development
  }

  // Split by comma and trim whitespace
  const origins = envValue
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  return origins.length > 0 ? origins : ['http://localhost:3000'];
}

/**
 * Creates CORS origin validation function
 * 
 * @param allowedOrigins - Array of allowed origins
 * @param logBlocked - Whether to log blocked origins (for development)
 * @returns CORS origin validation function
 */
export function createCorsOriginValidator(
  allowedOrigins: string[],
  logBlocked: boolean = false
): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.includes(origin);

    if (logBlocked && !isAllowed) {
      console.warn(`⚠️  CORS: Blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
    }

    callback(null, isAllowed);
  };
}

/**
 * Gets CORS configuration from environment variables
 * 
 * @returns CORS configuration object
 */
export function getCorsConfig() {
  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logBlocked = isDevelopment && process.env.CORS_LOG_BLOCKED !== 'false';

  return {
    origin: createCorsOriginValidator(allowedOrigins, logBlocked),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // 24 hours default
  };
}

