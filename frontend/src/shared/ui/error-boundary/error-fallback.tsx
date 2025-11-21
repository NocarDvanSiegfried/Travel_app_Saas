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
    <div className="min-h-screen yakutia-pattern relative flex flex-col">
      <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1 flex items-center justify-center">
        <div className="yakutia-card p-8 max-w-2xl w-full text-center">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
              Что-то пошло не так
            </h1>
            <p className="text-lg mb-2" style={{ color: 'var(--color-text-dark)' }}>
              Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
            </p>
          </div>

          {/* Детали ошибки только в development */}
          {isDevelopment && error && (
            <div className="mb-6 p-4 rounded-yakutia text-left" style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#ff6b6b' }}>
                Детали ошибки (только в development):
              </p>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--color-text-dark)' }}>
                {error.message}
              </p>
              {errorInfo && errorInfo.componentStack && (
                <details className="text-xs font-mono" style={{ color: 'var(--color-text-dark)' }}>
                  <summary className="cursor-pointer mb-2">Stack trace</summary>
                  <pre className="overflow-auto max-h-40 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Действия */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={resetError}
              aria-label="Попробовать снова"
              className="px-6 py-3 rounded-yakutia yakutia-transition font-semibold"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              }}
            >
              Попробовать снова
            </button>
            <button
              onClick={handleGoHome}
              aria-label="Вернуться на главную страницу"
              className="px-6 py-3 rounded-yakutia yakutia-transition font-semibold border"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text-dark)',
                borderColor: 'var(--color-card-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-card-bg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

