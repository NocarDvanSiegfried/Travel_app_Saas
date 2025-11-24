import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/shared/utils/api'
import { IRouteBuilderResult, IBuiltRoute, IRiskAssessment } from '../domain/types'
import { adaptBackendRoutesToFrontend } from '../utils/route-adapter'
import { RouteSearchResponseSchema, RouteResultSchema, type RouteSearchResponse } from '../schemas/route.schema'

/**
 * Структура ответа от бэкенда
 * Бэкенд возвращает RouteResult[], а не IBuiltRoute[]
 */
interface BackendRouteResult {
  segments: Array<{
    fromStopId: string
    toStopId: string
    distance: number
    duration: number
    transportType: string
    routeId?: string
    price?: number
    departureTime?: string
    arrivalTime?: string
  }>
  totalDistance: number
  totalDuration: number
  totalPrice: number
  fromCity: string
  toCity: string
  departureDate: string | Date
}

interface BackendRouteSearchResponse {
  success: boolean
  routes: BackendRouteResult[]
  alternatives?: BackendRouteResult[]
  executionTimeMs?: number
  graphVersion?: string
  graphAvailable?: boolean
  error?: {
    code: string
    message: string
  }
  riskAssessment?: IRiskAssessment
}

interface RouteSearchResult extends IRouteBuilderResult {
  fallback?: boolean
  error?: {
    code: string
    message: string
  }
}

interface Route extends IBuiltRoute {
  riskAssessment?: IRiskAssessment
}

interface ApiError extends Error {
  code?: string
  status?: number
}

interface UseRoutesSearchParams {
  from: string
  to: string
  date?: string
  passengers?: string
}

interface UseRoutesSearchResult {
  routes: Route[]
  alternatives: Route[]
  isLoading: boolean
  error: Error | null
  errorCode?: string
  refetch: () => Promise<unknown>
}

/**
 * Hook для поиска маршрутов с использованием React Query
 * 
 * @param from - Город отправления
 * @param to - Город назначения
 * @param date - Дата поездки (опционально)
 * @param passengers - Количество пассажиров (опционально)
 * @returns Объект с маршрутами, состоянием загрузки и ошибками
 */
export function useRoutesSearch({
  from,
  to,
  date,
  passengers = '1',
}: UseRoutesSearchParams): UseRoutesSearchResult {
  const normalizedFrom = from.trim()
  const normalizedTo = to.trim()

  const { data, isLoading, error, refetch } = useQuery<BackendRouteSearchResponse>({
    queryKey: ['routes', 'search', normalizedFrom, normalizedTo, date, passengers],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: normalizedFrom,
        to: normalizedTo,
      })

      // Нормализация и валидация date перед добавлением в URL
      if (date) {
        const normalizedDate = date.trim()
        // Проверяем, что после trim строка не пустая и соответствует формату YYYY-MM-DD
        if (normalizedDate && /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
          params.set('date', normalizedDate)
        }
      }

      if (passengers && passengers !== '1') {
        params.set('passengers', passengers)
      }

      try {
        const response = await fetchApi<unknown>(`/routes/search?${params.toString()}`)
        
        // Валидация ответа через Zod
        const validationResult = RouteSearchResponseSchema.safeParse(response)
        
        if (!validationResult.success) {
          const validationError: Error & { code?: string } = new Error('Неверный формат ответа от сервера')
          validationError.code = 'INVALID_ROUTE_RESPONSE'
          throw validationError
        }
        
        return validationResult.data as RouteSearchResponse
      } catch (err) {
        // Для ROUTES_NOT_FOUND (404) возвращаем успешный ответ с пустым массивом
        // Это нормальный случай, когда маршруты не найдены
        const apiError = err as ApiError
        if (apiError.status === 404 && apiError.code === 'ROUTES_NOT_FOUND') {
          return {
            success: true,
            routes: [],
            alternatives: [],
            executionTimeMs: 0,
            graphAvailable: false,
          } as RouteSearchResponse
        }
        // Для других ошибок пробрасываем дальше
        throw err
      }
    },
    enabled: Boolean(normalizedFrom && normalizedTo),
    staleTime: 2 * 60 * 1000, // 2 минуты - данные актуальны
    retry: (failureCount, error) => {
      const apiError = error as ApiError
      
      // Не повторяем запрос для ошибок 404 (STOPS_NOT_FOUND, ROUTES_NOT_FOUND)
      if (apiError?.status === 404) {
        return false
      }
      
      // Не повторяем для ошибок валидации ответа
      if (apiError?.code === 'INVALID_ROUTE_RESPONSE') {
        return false
      }
      
      // Для ошибок графа (503, GRAPH_NOT_AVAILABLE, GRAPH_OUT_OF_SYNC) - повторяем с задержкой
      // Это позволяет дождаться готовности графа после старта backend в LIMITED MODE
      if (apiError?.status === 503 || 
          apiError?.code === 'GRAPH_NOT_AVAILABLE' || 
          apiError?.code === 'GRAPH_OUT_OF_SYNC') {
        // Повторяем до 5 раз с экспоненциальной задержкой (максимум ~30 секунд)
        return failureCount < 5
      }
      
      // Повторяем для других ошибок (сеть, 500 и т.д.) - максимум 2 попытки
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => {
      // Экспоненциальная задержка: 1s, 2s, 4s, 8s, 16s
      // Максимальная задержка ограничена 10 секундами
      const delay = Math.min(1000 * Math.pow(2, attemptIndex), 10000)
      return delay
    },
  })

  // Преобразование данных из формата бэкенда в формат фронтенда
  // Проверяем, что ответ успешный и нет ошибки
  const hasValidData = data?.success && !data?.error && data?.routes
  
  // Проверка структуры перед адаптацией
  let adaptedRoutes: IBuiltRoute[] = []
  let adaptedAlternatives: IBuiltRoute[] = []
  let processingError: Error | null = null

  if (hasValidData) {
    // Проверяем, что data.routes существует, это массив и имеет корректную структуру
    if (!data.routes) {
      processingError = new Error('Ответ сервера не содержит маршрутов')
      ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
    } else if (!Array.isArray(data.routes)) {
      processingError = new Error('Маршруты должны быть массивом')
      ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
    } else {
      // Проверяем структуру каждого маршрута через Zod
      try {
        for (const route of data.routes) {
          const routeValidation = RouteResultSchema.safeParse(route)
          if (!routeValidation.success) {
            throw new Error('Неверная структура маршрута')
          }
        }
        
        // Если все проверки прошли, адаптируем маршруты
        if (data.routes.length > 0) {
          adaptedRoutes = adaptBackendRoutesToFrontend(data.routes, date, Number(passengers) || 1)
        }
      } catch (err) {
        processingError = new Error('Ошибка при обработке маршрутов')
        ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
      }
    }

    // Проверяем альтернативные маршруты
    if (data.alternatives && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
      try {
        for (const altRoute of data.alternatives) {
          const altValidation = RouteResultSchema.safeParse(altRoute)
          if (!altValidation.success) {
            throw new Error('Неверная структура альтернативного маршрута')
          }
        }
        adaptedAlternatives = adaptBackendRoutesToFrontend(data.alternatives, date, Number(passengers) || 1)
      } catch (err) {
        // Ошибка в альтернативах не критична, просто не используем их
        adaptedAlternatives = []
      }
    }
  }

  // Добавляем riskAssessment к каждому маршруту
  const routes: Route[] = adaptedRoutes.map((route) => ({
    ...route,
    riskAssessment: data?.riskAssessment,
  }))

  const alternatives: Route[] = adaptedAlternatives.map((route) => ({
    ...route,
    riskAssessment: data?.riskAssessment,
  }))

  // Обработка ошибки из API ответа
  // Если есть ошибка в ответе, React Query вернул ошибку, или ошибка обработки
  const apiError = processingError || (data?.error
    ? new Error(data.error.message || 'Ошибка при поиске маршрутов')
    : (error as Error | null))

  // Для ошибок валидации создаем понятное сообщение
  if (apiError && (apiError as ApiError).code === 'INVALID_ROUTE_RESPONSE') {
    apiError.message = 'Неверный формат данных от сервера. Попробуйте обновить страницу.'
  }

  // Определяем код ошибки из перехваченной ошибки, из данных или из ошибки обработки
  const errorCode = (processingError as Error & { code?: string })?.code || (error as ApiError)?.code || data?.error?.code

  // Если есть ошибка, возвращаем пустые массивы
  const finalRoutes = apiError ? [] : routes
  const finalAlternatives = apiError ? [] : alternatives

  return {
    routes: finalRoutes,
    alternatives: finalAlternatives,
    isLoading,
    error: apiError,
    errorCode,
    refetch,
  }
}

