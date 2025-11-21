/**
 * Тип для деталей ошибки API
 * Поддерживает вложенные структуры для сложных ошибок валидации
 */
export type ApiErrorDetails =
  | string
  | number
  | boolean
  | null
  | ApiErrorDetails[]
  | { [key: string]: ApiErrorDetails }

/**
 * Универсальный интерфейс для ответов API
 * 
 * @template T - Тип данных в успешном ответе
 */
export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    /**
     * Дополнительные детали ошибки (например, ошибки валидации полей)
     * Поддерживает вложенные структуры для сложных ошибок
     */
    details?: Record<string, ApiErrorDetails>
  }
}

export * from './route-adapter'

