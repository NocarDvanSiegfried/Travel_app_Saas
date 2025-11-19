/**
 * Unified Structured Logger
 * 
 * Provides consistent logging across all layers with:
 * - Structured log format
 * - Multiple log levels (debug, info, warn, error)
 * - Performance timing support
 * - Contextual metadata
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogContext {
  module?: string;
  operation?: string;
  [key: string]: any;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  
  // Performance timing
  startTimer(operation: string): () => void;
}

export class StructuredLogger implements ILogger {
  private minLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName: string = 'TravelApp', minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...context
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(this.formatLog(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatLog(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.formatLog(LogLevel.ERROR, message, context, error));
  }

  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.debug(`Operation completed`, { operation, duration_ms: duration });
      return duration;
    };
  }
}

// Create singleton instance
let loggerInstance: StructuredLogger | null = null;

export function getLogger(serviceName?: string): StructuredLogger {
  if (!loggerInstance) {
    const level = process.env.LOG_LEVEL as LogLevel || LogLevel.INFO;
    loggerInstance = new StructuredLogger(serviceName || 'TravelApp', level);
  }
  return loggerInstance;
}




