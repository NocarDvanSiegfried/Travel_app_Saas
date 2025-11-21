'use client'

import { useState, useEffect } from 'react'

/**
 * Hook для отслеживания онлайн/оффлайн состояния
 * 
 * @returns Объект с состоянием подключения и функцией для ручной проверки
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true // SSR: предполагаем, что онлайн
    }
    return navigator.onLine
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Устанавливаем начальное состояние
    setIsOnline(navigator.onLine)

    // Подписываемся на события
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
  }
}

