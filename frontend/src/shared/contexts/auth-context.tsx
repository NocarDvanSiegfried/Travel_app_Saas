'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { safeLocalStorage } from '@/shared/utils/storage'

/**
 * Интерфейс для данных пользователя
 */
interface User {
  id: string
  email?: string
  name?: string
  [key: string]: unknown
}

/**
 * Интерфейс для состояния авторизации
 */
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

/**
 * Интерфейс для методов контекста авторизации
 */
interface AuthContextValue extends AuthState {
  login: (user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

/**
 * Контекст авторизации
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Провайдер контекста авторизации
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Загрузка состояния авторизации из localStorage при монтировании
  useEffect(() => {
    const storedUser = safeLocalStorage.getItem('auth_user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User
        setAuthState({
          user: parsedUser,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch (error: unknown) {
        // Ошибка при парсинге JSON
        if (error instanceof Error) {
          console.error('Failed to parse stored user:', error.message)
        }
        setAuthState((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  /**
   * Вход пользователя
   */
  const login = useCallback((user: User) => {
    safeLocalStorage.setItem('auth_user', JSON.stringify(user))
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
    })
  }, [])

  /**
   * Выход пользователя
   */
  const logout = useCallback(() => {
    safeLocalStorage.removeItem('auth_user')
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }, [])

  /**
   * Обновление данных пользователя
   */
  const updateUser = useCallback((updates: Partial<User>) => {
    setAuthState((prev) => {
      if (!prev.user) return prev

      const updatedUser = { ...prev.user, ...updates }
      safeLocalStorage.setItem('auth_user', JSON.stringify(updatedUser))
      return {
        ...prev,
        user: updatedUser,
      }
    })
  }, [])

  const value: AuthContextValue = {
    ...authState,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Хук для использования контекста авторизации
 * 
 * @throws {Error} Если используется вне AuthProvider
 */
export function useAuth(): AuthContextValue {
  const authContext = useContext(AuthContext)
  if (authContext === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return authContext
}

