/**
 * SSR-безопасная обертка над localStorage
 * Обрабатывает случаи, когда localStorage недоступен (SSR, приватный режим, отключенное хранилище)
 */

interface StorageAPI {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

/**
 * Безопасная работа с localStorage
 * Проверяет доступность window и обрабатывает ошибки
 */
export const safeLocalStorage: StorageAPI = {
  /**
   * Получить значение из localStorage
   * 
   * @param key - Ключ для получения значения
   * @returns Значение или null, если недоступно или произошла ошибка
   */
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return localStorage.getItem(key)
    } catch (error) {
      // Обработка ошибок (SecurityError в приватном режиме, и т.д.)
      if (error instanceof Error) {
        // Можно логировать через logger, но не критично
        // logger.warn('Failed to get item from localStorage', error)
      }
      return null
    }
  },

  /**
   * Установить значение в localStorage
   * 
   * @param key - Ключ для сохранения
   * @param value - Значение для сохранения
   */
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(key, value)
    } catch (error) {
      // Обработка ошибок (QuotaExceededError, SecurityError и т.д.)
      if (error instanceof Error) {
        // Можно логировать через logger, но не критично
        // logger.warn('Failed to set item in localStorage', error)
      }
      // Игнорируем ошибку, чтобы не прерывать выполнение
    }
  },

  /**
   * Удалить значение из localStorage
   * 
   * @param key - Ключ для удаления
   */
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch (error) {
      // Обработка ошибок (SecurityError и т.д.)
      if (error instanceof Error) {
        // Можно логировать через logger, но не критично
        // logger.warn('Failed to remove item from localStorage', error)
      }
      // Игнорируем ошибку
    }
  },

  /**
   * Очистить весь localStorage
   */
  clear: (): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.clear()
    } catch (error) {
      // Обработка ошибок (SecurityError и т.д.)
      if (error instanceof Error) {
        // Можно логировать через logger, но не критично
        // logger.warn('Failed to clear localStorage', error)
      }
      // Игнорируем ошибку
    }
  },
}

