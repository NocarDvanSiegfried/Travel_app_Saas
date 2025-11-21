'use client'

import React from 'react'
import { AuthProvider } from '@/shared/contexts/auth-context'
import { ThemeProvider } from '@/shared/contexts/theme-context'

/**
 * Компонент-обертка для всех провайдеров приложения
 * Объединяет AuthProvider и ThemeProvider
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

