'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/shared/hooks/use-online-status'

/**
 * Компонент для отображения уведомления об offline состоянии
 * 
 * Показывает уведомление, когда пользователь теряет подключение к интернету,
 * и скрывает его при восстановлении соединения.
 * 
 * @returns JSX элемент с уведомлением или null
 */
export function OfflineNotification() {
  const { isOnline } = useOnlineStatus()
  const [wasOffline, setWasOffline] = useState(false)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
      setShowNotification(true)
    } else if (wasOffline && isOnline) {
      // Показываем уведомление о восстановлении соединения
      setShowNotification(true)
      const timer = setTimeout(() => {
        setShowNotification(false)
        setWasOffline(false)
      }, 3000) // Скрываем через 3 секунды

      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (!showNotification) {
    return null
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-yakutia-lg shadow-lg yakutia-transition ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {isOnline ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold">Соединение восстановлено</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-semibold">Нет подключения к интернету</span>
          </>
        )}
        <button
          onClick={() => setShowNotification(false)}
          className="ml-4 text-white hover:text-white/80 yakutia-transition"
          aria-label="Закрыть уведомление"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

