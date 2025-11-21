'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Создает новый экземпляр QueryClient с настройками по умолчанию
 * Используется для создания клиента в компоненте провайдера
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 минут - данные считаются актуальными
        gcTime: 10 * 60 * 1000, // 10 минут - время хранения в кеше (было cacheTime в v4)
        retry: (failureCount, _error) => {
          // Не повторяем запросы, если нет подключения к интернету
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return false
          }
          // Максимум 2 попытки при других ошибках
          return failureCount < 2
        },
        refetchOnWindowFocus: false, // не обновлять при фокусе окна
        refetchOnReconnect: true, // обновлять при восстановлении соединения
        networkMode: 'online', // выполнять запросы только когда есть подключение
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

/**
 * Получает или создает QueryClient для браузера
 * Использует singleton паттерн для предотвращения создания множественных клиентов
 */
function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: всегда создаем новый клиент
    return makeQueryClient()
  } else {
    // Browser: используем singleton паттерн
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

/**
 * Провайдер React Query для управления server state
 * Оборачивает приложение и предоставляет QueryClient всем дочерним компонентам
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

