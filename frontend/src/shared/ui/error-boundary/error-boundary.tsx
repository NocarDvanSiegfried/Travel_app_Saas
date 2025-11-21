'use client'

import React from 'react'
import { ErrorFallback } from './error-fallback'
import { logger } from '@/shared/utils/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export interface ErrorFallbackProps {
  error: Error
  errorInfo: React.ErrorInfo | null
  resetError: () => void
}

/**
 * Error Boundary компонент для перехвата и обработки ошибок React компонентов
 * Использует классовый компонент, так как Error Boundary API требует класс
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  /**
   * Обновляет состояние при возникновении ошибки
   * Вызывается автоматически при ошибке в дочерних компонентах
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Обрабатывает ошибку и логирует информацию
   * Вызывается после getDerivedStateFromError
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Сохраняем информацию об ошибке в state
    this.setState({
      errorInfo,
    })

    // Вызываем callback для логирования (если передан)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Логируем ошибку через централизованный logger
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    })
  }

  /**
   * Сброс состояния ошибки для повторной попытки рендеринга
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // Используем кастомный fallback, если передан, иначе стандартный
      const FallbackComponent = this.props.fallback || ErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

