import { safeLocalStorage } from '@/shared/utils/storage'

describe('safeLocalStorage', () => {
  // Сохраняем оригинальный localStorage
  const originalLocalStorage = global.localStorage
  const originalWindow = global.window

  beforeEach(() => {
    // Очищаем localStorage перед каждым тестом
    if (typeof Storage !== 'undefined') {
      localStorage.clear()
    }
  })

  afterEach(() => {
    // Восстанавливаем оригинальный localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
  })

  describe('getItem', () => {
    it('should return null when window is undefined (SSR)', () => {
      // Мокируем отсутствие window (SSR окружение)
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const result = safeLocalStorage.getItem('test-key')
      expect(result).toBeNull()
    })

    it('should get item correctly when localStorage is available', () => {
      const testKey = 'test-key'
      const testValue = 'test-value'

      safeLocalStorage.setItem(testKey, testValue)
      const result = safeLocalStorage.getItem(testKey)

      expect(result).toBe(testValue)
    })

    it('should return null when key does not exist', () => {
      const result = safeLocalStorage.getItem('non-existent-key')
      expect(result).toBeNull()
    })

    it('should handle SecurityError (private mode)', () => {
      // Мокируем localStorage.getItem чтобы выбрасывать SecurityError
      const mockGetItem = jest.fn(() => {
        const error = new Error('SecurityError')
        error.name = 'SecurityError'
        throw error
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
        configurable: true,
      })

      const result = safeLocalStorage.getItem('test-key')
      expect(result).toBeNull()
    })

    it('should handle other errors gracefully', () => {
      // Мокируем localStorage.getItem чтобы выбрасывать любую ошибку
      const mockGetItem = jest.fn(() => {
        throw new Error('Unexpected error')
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
        configurable: true,
      })

      const result = safeLocalStorage.getItem('test-key')
      expect(result).toBeNull()
    })
  })

  describe('setItem', () => {
    it('should do nothing when window is undefined (SSR)', () => {
      // Мокируем отсутствие window (SSR окружение)
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.setItem('test-key', 'test-value')
      }).not.toThrow()
    })

    it('should set item correctly when localStorage is available', () => {
      const testKey = 'test-key'
      const testValue = 'test-value'

      safeLocalStorage.setItem(testKey, testValue)
      const result = safeLocalStorage.getItem(testKey)

      expect(result).toBe(testValue)
    })

    it('should handle QuotaExceededError gracefully', () => {
      // Мокируем localStorage.setItem чтобы выбрасывать QuotaExceededError
      const mockSetItem = jest.fn(() => {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: mockSetItem,
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.setItem('test-key', 'test-value')
      }).not.toThrow()
    })

    it('should handle SecurityError (private mode) gracefully', () => {
      // Мокируем localStorage.setItem чтобы выбрасывать SecurityError
      const mockSetItem = jest.fn(() => {
        const error = new Error('SecurityError')
        error.name = 'SecurityError'
        throw error
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: mockSetItem,
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.setItem('test-key', 'test-value')
      }).not.toThrow()
    })

    it('should handle other errors gracefully', () => {
      // Мокируем localStorage.setItem чтобы выбрасывать любую ошибку
      const mockSetItem = jest.fn(() => {
        throw new Error('Unexpected error')
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: mockSetItem,
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.setItem('test-key', 'test-value')
      }).not.toThrow()
    })
  })

  describe('removeItem', () => {
    it('should do nothing when window is undefined (SSR)', () => {
      // Мокируем отсутствие window (SSR окружение)
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.removeItem('test-key')
      }).not.toThrow()
    })

    it('should remove item correctly when localStorage is available', () => {
      const testKey = 'test-key'
      const testValue = 'test-value'

      safeLocalStorage.setItem(testKey, testValue)
      expect(safeLocalStorage.getItem(testKey)).toBe(testValue)

      safeLocalStorage.removeItem(testKey)
      expect(safeLocalStorage.getItem(testKey)).toBeNull()
    })

    it('should handle errors gracefully', () => {
      // Мокируем localStorage.removeItem чтобы выбрасывать ошибку
      const mockRemoveItem = jest.fn(() => {
        throw new Error('SecurityError')
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: mockRemoveItem,
          clear: jest.fn(),
        },
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.removeItem('test-key')
      }).not.toThrow()
    })
  })

  describe('clear', () => {
    it('should do nothing when window is undefined (SSR)', () => {
      // Мокируем отсутствие window (SSR окружение)
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.clear()
      }).not.toThrow()
    })

    it('should clear all items when localStorage is available', () => {
      safeLocalStorage.setItem('key1', 'value1')
      safeLocalStorage.setItem('key2', 'value2')

      expect(safeLocalStorage.getItem('key1')).toBe('value1')
      expect(safeLocalStorage.getItem('key2')).toBe('value2')

      safeLocalStorage.clear()

      expect(safeLocalStorage.getItem('key1')).toBeNull()
      expect(safeLocalStorage.getItem('key2')).toBeNull()
    })

    it('should handle errors gracefully', () => {
      // Мокируем localStorage.clear чтобы выбрасывать ошибку
      const mockClear = jest.fn(() => {
        throw new Error('SecurityError')
      })

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: mockClear,
        },
        writable: true,
        configurable: true,
      })

      // Не должно быть ошибки
      expect(() => {
        safeLocalStorage.clear()
      }).not.toThrow()
    })
  })
})

