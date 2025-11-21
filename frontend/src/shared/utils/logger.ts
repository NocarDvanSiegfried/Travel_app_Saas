/**
 * Утилита для централизованного логирования
 * В development логирует в консоль, в production отправляет в сервис логирования
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  url?: string
  userAgent?: string
  timestamp?: string
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  error?: Error
  context?: LogContext
  timestamp: string
}

/**
 * Создает контекст для лога с информацией о текущем окружении
 */
function createLogContext(): LogContext {
  const context: LogContext = {
    timestamp: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    context.url = window.location.href
    context.userAgent = window.navigator.userAgent
  }

  return context
}

/**
 * Форматирует ошибку для логирования
 */
function formatError(error: unknown): Error | undefined {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string') {
    return new Error(error)
  }
  return new Error(String(error))
}

/**
 * Отправляет лог в сервис логирования (production)
 * TODO: Интегрировать с сервисом логирования (Sentry, LogRocket и т.д.)
 */
function sendToLoggingService(_entry: LogEntry): void {
  // В production здесь будет отправка в сервис логирования
  // Например: Sentry.captureException(_entry.error)
  // Или: LogRocket.captureException(_entry.error)
  
  // Пока оставляем пустую реализацию
  // Можно добавить отправку через fetch на endpoint логирования
}

/**
 * Логирует сообщение в консоль (development)
 */
function logToConsole(entry: LogEntry): void {
  const { level, message, error, context } = entry

  const logMessage = `[${level.toUpperCase()}] ${message}`
  const logData = error ? { error, context } : { context }

  switch (level) {
    case 'error':
      console.error(logMessage, logData)
      break
    case 'warn':
      console.warn(logMessage, logData)
      break
    case 'info':
      console.info(logMessage, logData)
      break
    case 'debug':
      console.debug(logMessage, logData)
      break
  }
}

/**
 * Централизованная утилита для логирования
 */
export const logger = {
  /**
   * Логирует ошибку
   * 
   * @param message - Сообщение об ошибке
   * @param error - Объект ошибки (опционально)
   * @param context - Дополнительный контекст (опционально)
   */
  error: (message: string, error?: unknown, context?: LogContext): void => {
    const entry: LogEntry = {
      level: 'error',
      message,
      error: error ? formatError(error) : undefined,
      context: { ...createLogContext(), ...context },
      timestamp: new Date().toISOString(),
    }

    if (process.env.NODE_ENV === 'development') {
      logToConsole(entry)
    } else {
      sendToLoggingService(entry)
    }
  },

  /**
   * Логирует предупреждение
   * 
   * @param message - Сообщение предупреждения
   * @param context - Дополнительный контекст (опционально)
   */
  warn: (message: string, context?: LogContext): void => {
    const entry: LogEntry = {
      level: 'warn',
      message,
      context: { ...createLogContext(), ...context },
      timestamp: new Date().toISOString(),
    }

    if (process.env.NODE_ENV === 'development') {
      logToConsole(entry)
    } else {
      sendToLoggingService(entry)
    }
  },

  /**
   * Логирует информационное сообщение
   * 
   * @param message - Информационное сообщение
   * @param context - Дополнительный контекст (опционально)
   */
  info: (message: string, context?: LogContext): void => {
    const entry: LogEntry = {
      level: 'info',
      message,
      context: { ...createLogContext(), ...context },
      timestamp: new Date().toISOString(),
    }

    if (process.env.NODE_ENV === 'development') {
      logToConsole(entry)
    } else {
      sendToLoggingService(entry)
    }
  },

  /**
   * Логирует отладочное сообщение
   * 
   * @param message - Отладочное сообщение
   * @param context - Дополнительный контекст (опционально)
   */
  debug: (message: string, context?: LogContext): void => {
    const entry: LogEntry = {
      level: 'debug',
      message,
      context: { ...createLogContext(), ...context },
      timestamp: new Date().toISOString(),
    }

    if (process.env.NODE_ENV === 'development') {
      logToConsole(entry)
    }
    // В production debug логи не отправляются
  },
}

