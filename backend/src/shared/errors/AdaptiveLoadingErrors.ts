/**
 * Custom Error Classes for Adaptive Data Loading System
 * 
 * Provides:
 * - Clear error categorization
 * - Human-readable messages
 * - Proper soft-fail behavior indicators
 */

export enum ErrorSeverity {
  CRITICAL = 'critical',
  RECOVERABLE = 'recoverable',
  WARNING = 'warning'
}

/**
 * Base error for adaptive loading system
 */
export class AdaptiveLoadingError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly isRecoverable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.RECOVERABLE,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.severity = severity;
    this.isRecoverable = severity !== ErrorSeverity.CRITICAL;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * OData provider errors
 */
export class ODataProviderError extends AdaptiveLoadingError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      `OData Provider: ${message}`,
      ErrorSeverity.RECOVERABLE,
      context
    );
  }
}

export class ODataConnectionError extends ODataProviderError {
  constructor(url: string, originalError?: Error) {
    super(
      `Failed to connect to OData service at ${url}`,
      { url, originalError: originalError?.message }
    );
  }
}

export class ODataTimeoutError extends ODataProviderError {
  constructor(timeoutMs: number) {
    super(
      `OData request timed out after ${timeoutMs}ms`,
      { timeoutMs }
    );
  }
}

export class ODataInvalidResponseError extends ODataProviderError {
  constructor(details: string) {
    super(
      `Invalid OData response: ${details}`,
      { details }
    );
  }
}

/**
 * Cache errors
 */
export class CacheError extends AdaptiveLoadingError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      `Cache: ${message}`,
      ErrorSeverity.WARNING,
      context
    );
  }
}

export class CacheConnectionError extends CacheError {
  constructor(originalError?: Error) {
    super(
      `Failed to connect to cache service`,
      { originalError: originalError?.message }
    );
  }
}

export class CacheWriteError extends CacheError {
  constructor(key: string, originalError?: Error) {
    super(
      `Failed to write to cache for key: ${key}`,
      { key, originalError: originalError?.message }
    );
  }
}

export class CacheReadError extends CacheError {
  constructor(key: string, originalError?: Error) {
    super(
      `Failed to read from cache for key: ${key}`,
      { key, originalError: originalError?.message }
    );
  }
}

/**
 * Data recovery errors
 */
export class DataRecoveryError extends AdaptiveLoadingError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      `Data Recovery: ${message}`,
      ErrorSeverity.WARNING,
      context
    );
  }
}

export class CoordinateRecoveryError extends DataRecoveryError {
  constructor(stopId: string) {
    super(
      `Failed to recover coordinates for stop: ${stopId}`,
      { stopId }
    );
  }
}

export class ScheduleRecoveryError extends DataRecoveryError {
  constructor(routeId: string) {
    super(
      `Failed to recover schedule for route: ${routeId}`,
      { routeId }
    );
  }
}

/**
 * Mock provider errors
 */
export class MockProviderError extends AdaptiveLoadingError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      `Mock Provider: ${message}`,
      ErrorSeverity.CRITICAL, // Mock should always work, so failures are critical
      context
    );
  }
}

export class MockDataCorruptedError extends MockProviderError {
  constructor(details: string) {
    super(
      `Mock data is corrupted or invalid: ${details}`,
      { details }
    );
  }
}

/**
 * Data quality errors
 */
export class DataQualityError extends AdaptiveLoadingError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      `Data Quality: ${message}`,
      ErrorSeverity.WARNING,
      context
    );
  }
}

export class InsufficientDataQualityError extends DataQualityError {
  constructor(score: number, threshold: number) {
    super(
      `Data quality score (${score}) is below threshold (${threshold})`,
      { score, threshold }
    );
  }
}

/**
 * Helper function to determine if error should trigger MOCK fallback
 */
export function shouldFallbackToMock(error: Error): boolean {
  if (error instanceof AdaptiveLoadingError) {
    // Critical errors should not fallback (system is broken)
    if (error.severity === ErrorSeverity.CRITICAL) {
      return false;
    }
    
    // OData connection/timeout errors should fallback
    if (error instanceof ODataConnectionError || error instanceof ODataTimeoutError) {
      return true;
    }
    
    // Invalid OData responses should fallback
    if (error instanceof ODataInvalidResponseError) {
      return true;
    }
  }
  
  // Unknown errors should fallback to be safe
  return true;
}

/**
 * Helper function to get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof ODataConnectionError) {
    return 'Unable to connect to the transport data service. Using cached or demonstration data.';
  }
  
  if (error instanceof ODataTimeoutError) {
    return 'Transport data service is slow to respond. Using cached or demonstration data.';
  }
  
  if (error instanceof CacheError) {
    return 'Cache service is temporarily unavailable. Performance may be affected.';
  }
  
  if (error instanceof DataRecoveryError) {
    return 'Some transport data is incomplete and has been automatically recovered.';
  }
  
  if (error instanceof MockProviderError) {
    return 'Critical error: Demonstration data is unavailable. Please contact support.';
  }
  
  return 'An unexpected error occurred. Using fallback mechanisms to ensure service continuity.';
}




