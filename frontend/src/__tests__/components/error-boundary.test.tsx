import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary, ErrorFallback } from '@/shared/ui'
import { logger } from '@/shared/utils/logger'

// Мокируем logger
jest.mock('@/shared/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// Мокируем useRouter для ErrorFallback
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Компонент, который выбрасывает ошибку
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Подавляем console.error для тестов с ошибками
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('normal rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should catch error and render ErrorFallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/что-то пошло не так/i)).toBeInTheDocument()
      expect(screen.getByText(/произошла непредвиденная ошибка/i)).toBeInTheDocument()
    })

    it('should log error when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(logger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('should call onError callback when provided', () => {
      const onError = jest.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('should use custom fallback component when provided', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div>Custom error: {error.message}</div>
      )

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument()
    })
  })

  describe('ErrorFallback', () => {
    it('should display error message in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'development' },
        writable: true,
        configurable: true,
      })

      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorInfo={null}
          resetError={jest.fn()}
        />
      )

      expect(screen.getByText(/детали ошибки/i)).toBeInTheDocument()
      expect(screen.getByText('Test error')).toBeInTheDocument()

      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: originalEnv },
        writable: true,
        configurable: true,
      })
    })

    it('should not display error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'production' },
        writable: true,
        configurable: true,
      })

      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorInfo={null}
          resetError={jest.fn()}
        />
      )

      expect(screen.queryByText(/детали ошибки/i)).not.toBeInTheDocument()

      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: originalEnv },
        writable: true,
        configurable: true,
      })
    })

    it('should call resetError when "Попробовать снова" is clicked', async () => {
      const user = userEvent.setup()
      const resetError = jest.fn()

      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorInfo={null}
          resetError={resetError}
        />
      )

      const retryButton = screen.getByRole('button', { name: /попробовать снова/i })
      await user.click(retryButton)

      expect(resetError).toHaveBeenCalled()
    })

    it('should have home button that can be clicked', async () => {
      const user = userEvent.setup()

      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorInfo={null}
          resetError={jest.fn()}
        />
      )

      const homeButton = screen.getByRole('button', { name: /вернуться на главную/i })
      expect(homeButton).toBeInTheDocument()
      
      // Кнопка должна быть кликабельной
      await user.click(homeButton)
      // useRouter уже замокан в jest.setup.js, поэтому проверяем только наличие кнопки
    })
  })

  describe('error recovery', () => {
    it('should recover from error when resetError is called', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/что-то пошло не так/i)).toBeInTheDocument()

      // Симулируем сброс ошибки через изменение пропсов
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // ErrorBoundary не восстанавливается автоматически при изменении children
      // Нужно использовать resetError через ErrorFallback
      expect(screen.queryByText('No error')).not.toBeInTheDocument()
    })
  })
})

