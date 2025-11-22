'use client'

import { useRouter } from 'next/navigation'
import { ErrorFallbackProps } from './error-boundary'

/**
 * Компонент для отображения ошибки при сбое в Error Boundary
 * Показывает понятное сообщение пользователю и предоставляет действия для восстановления
 */
export function ErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const router = useRouter()
  const isDevelopment = process.env.NODE_ENV === 'development'

  const handleGoHome = (): void => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <main className="container-main section-spacing-compact relative z-10 flex-1 flex items-center justify-center">
        <div className="card p-xl max-w-2xl w-full text-center">
          <div className="mb-xl">
            <h1 className="text-2xl md:text-3xl font-medium mb-md text-heading">
              Что-то пошло не так
            </h1>
            <p className="text-md mb-sm text-secondary">
              Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
            </p>
          </div>

          {/* Детали ошибки только в development */}
          {isDevelopment && error && (
            <div className="mb-xl p-md rounded-sm text-left bg-error-light">
              <p className="text-sm font-medium mb-sm text-error">
                Детали ошибки (только в development):
              </p>
              <p className="text-xs font-mono mb-sm text-primary">
                {error.message}
              </p>
              {errorInfo && errorInfo.componentStack && (
                <details className="text-xs font-mono text-primary">
                  <summary className="cursor-pointer mb-sm">Stack trace</summary>
                  <pre className="overflow-auto max-h-40 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Действия */}
          <div className="flex flex-col sm:flex-row gap-md justify-center">
            <button
              onClick={resetError}
              aria-label="Попробовать снова"
              className="btn-primary"
            >
              Попробовать снова
            </button>
            <button
              onClick={handleGoHome}
              aria-label="Вернуться на главную страницу"
              className="btn-secondary"
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

