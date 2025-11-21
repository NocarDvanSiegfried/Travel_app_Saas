'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { safeLocalStorage } from '@/shared/utils/storage'

/**
 * Типы тем
 */
export type Theme = 'light' | 'dark' | 'system'

/**
 * Интерфейс для состояния темы
 */
interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
}

/**
 * Интерфейс для методов контекста темы
 */
interface ThemeContextValue extends ThemeState {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * Контекст темы
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * Получить системную тему
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Получить разрешенную тему (light или dark) на основе выбранной темы
 */
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

/**
 * Провайдер контекста темы
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Загрузка темы из localStorage при монтировании
  useEffect(() => {
    const storedTheme = safeLocalStorage.getItem('theme') as Theme | null
    if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
      setThemeState(storedTheme)
      setResolvedTheme(getResolvedTheme(storedTheme))
    } else {
      setResolvedTheme(getResolvedTheme('system'))
    }
  }, [])

  // Применение темы к документу
  useEffect(() => {
    if (typeof window === 'undefined') return

    const resolved = getResolvedTheme(theme)
    setResolvedTheme(resolved)

    // Применяем тему к document.documentElement
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Слушаем изменения системной темы
  useEffect(() => {
    if (typeof window === 'undefined' || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setResolvedTheme(getSystemTheme())
    }

    // Современный API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme])

  /**
   * Установка темы
   */
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    safeLocalStorage.setItem('theme', newTheme)
  }, [])

  /**
   * Переключение между light и dark (пропускает system)
   */
  const toggleTheme = useCallback(() => {
    const currentResolved = getResolvedTheme(theme)
    const newTheme = currentResolved === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [theme, setTheme])

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Хук для использования контекста темы
 * 
 * @throws {Error} Если используется вне ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

