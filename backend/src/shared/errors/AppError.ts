/**
 * Базовый класс для всех ошибок приложения
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка валидации (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

/**
 * Ошибка аутентификации (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

/**
 * Ошибка авторизации (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

/**
 * Ошибка "не найдено" (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id ${identifier} not found`
      : `${resource} not found`;
    super('NOT_FOUND_ERROR', message, 404);
  }
}

/**
 * Ошибка конфликта (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT_ERROR', message, 409, details);
  }
}

/**
 * Ошибка базы данных (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('DATABASE_ERROR', message, 500, details);
  }
}

/**
 * Ошибка внешнего сервиса (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, details);
  }
}

