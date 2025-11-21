'use client'

import { ErrorBoundary } from '@/shared/ui'

/**
 * Провайдер Error Boundary для использования в Server Components
 * Обертка над ErrorBoundary для использования в layout.tsx
 */
export function ErrorBoundaryProvider({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

