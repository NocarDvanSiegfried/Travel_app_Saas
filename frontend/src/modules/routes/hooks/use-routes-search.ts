import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/shared/utils/api'
import { IRouteBuilderResult, IBuiltRoute, IRiskAssessment } from '../domain/types'
import { adaptBackendRoutesToFrontend } from '../utils/route-adapter'
import { adaptSmartRouteToIBuiltRoute, type SmartRoute } from '../utils/smart-route-to-built-route-adapter'
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
    queryKey: ['smart-route', 'build', normalizedFrom, normalizedTo, date, passengers],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: normalizedFrom,
        to: normalizedTo,
      })

      // Нормализация и валидация date перед добавлением в URL
      // Создаём normalizedDate в правильном скоупе
      let normalizedDate: string
      if (date) {
        const trimmedDate = date.trim()
        // Проверяем, что после trim строка не пустая и соответствует формату YYYY-MM-DD
        if (trimmedDate && /^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
          normalizedDate = trimmedDate
          params.set('date', normalizedDate)
        } else {
          // Если дата невалидна, используем сегодняшнюю дату
          const today = new Date()
          normalizedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        }
      } else {
        // Если дата не указана, используем сегодняшнюю дату
        const today = new Date()
        normalizedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      }

      if (passengers && passengers !== '1') {
        params.set('passengers', passengers)
      }

      try {
        // Используем новый SmartRoute API endpoint
        const response = await fetchApi<unknown>(`/smart-route/build`, {
          method: 'POST',
          body: JSON.stringify({
            from: normalizedFrom,
            to: normalizedTo,
            date: normalizedDate,
            passengers: passengers && passengers !== '1' ? parseInt(passengers, 10) : undefined,
          }),
        })
        
        // Преобразуем ответ SmartRoute API в формат RouteSearchResponse для обратной совместимости
        const smartRouteResponse = response as {
          success: boolean
          route?: SmartRoute
          alternatives?: SmartRoute[]
          executionTimeMs?: number
          error?: {
            code: string
            message: string
          }
        }
        
        if (smartRouteResponse.success && smartRouteResponse.route) {
          // Преобразуем SmartRoute в IBuiltRoute через адаптер, сохраняя все новые поля
          const route = smartRouteResponse.route
          let adaptedRoute: IBuiltRoute
          try {
            adaptedRoute = adaptSmartRouteToIBuiltRoute(route, normalizedDate, Number(passengers) || 1)
          } catch (err) {
            // КРИТИЧЕСКИЙ ФИКС: Если адаптация основного маршрута не удалась, пробрасываем ошибку
            const errorMessage = err instanceof Error ? err.message : String(err)
            console.error('[useRoutesSearch] Error adapting main route:', errorMessage, err)
            throw new Error(`Ошибка при обработке маршрута: ${errorMessage}`)
          }
          
          const adaptedAlternatives = (smartRouteResponse.alternatives || []).map((altRoute) => {
            try {
              return adaptSmartRouteToIBuiltRoute(altRoute, normalizedDate, Number(passengers) || 1)
            } catch (err) {
              console.error('[useRoutesSearch] Error adapting alternative route:', err)
              return null
            }
          }).filter((route): route is IBuiltRoute => route !== null)
          
          // Создаём BackendRouteResult из адаптированного IBuiltRoute (не из SmartRoute напрямую)
          // Это обеспечивает единообразие и избегает ручного парсинга SmartRoute
          const backendRouteResult: BackendRouteResult = {
            segments: adaptedRoute.segments.map((segment) => ({
              fromStopId: segment.segment.fromStopId,
              toStopId: segment.segment.toStopId,
              distance: segment.segment.distance,
              duration: segment.duration,
              transportType: segment.segment.transportType,
              price: segment.price,
              departureTime: segment.departureTime,
              arrivalTime: segment.arrivalTime,
            })),
            totalDistance: (adaptedRoute as any).totalDistance || 0,
            totalDuration: adaptedRoute.totalDuration,
            totalPrice: adaptedRoute.totalPrice,
            fromCity: adaptedRoute.fromCity,
            toCity: adaptedRoute.toCity,
            departureDate: normalizedDate,
          }
          
          const backendAlternatives = adaptedAlternatives.map((altRoute) => ({
            segments: altRoute.segments.map((segment) => ({
              fromStopId: segment.segment.fromStopId,
              toStopId: segment.segment.toStopId,
              distance: segment.segment.distance,
              duration: segment.duration,
              transportType: segment.segment.transportType,
              price: segment.price,
              departureTime: segment.departureTime,
              arrivalTime: segment.arrivalTime,
            })),
            totalDistance: (altRoute as any).totalDistance || 0,
            totalDuration: altRoute.totalDuration,
            totalPrice: altRoute.totalPrice,
            fromCity: altRoute.fromCity,
            toCity: altRoute.toCity,
            departureDate: normalizedDate,
          }))
          
          // КРИТИЧЕСКИЙ ФИКС: Убеждаемся, что executionTimeMs и graphAvailable присутствуют
          const adaptedResponse: RouteSearchResponse & { 
            validation?: any
            smartRoutes?: SmartRoute[]
          } = {
            success: true,
            routes: [backendRouteResult],
            alternatives: backendAlternatives,
            executionTimeMs: smartRouteResponse.executionTimeMs ?? 0,
            graphAvailable: true, // SmartRoute API всегда доступен, если вернул маршрут
            // Сохраняем validation из SmartRoute API для использования в компонентах
            validation: smartRouteResponse.route.validation,
            // Сохраняем полные данные SmartRoute для использования в компонентах
            smartRoutes: [route, ...(smartRouteResponse.alternatives || [])],
          }
          
          // КРИТИЧЕСКИЙ ФИКС: Валидация ответа через Zod (пропускаем smartRoutes, так как это расширенное поле)
          // Используем safeParse вместо parse, чтобы не выбрасывать исключение
          const { smartRoutes, ...responseForValidation } = adaptedResponse
          const validationResult = RouteSearchResponseSchema.safeParse(responseForValidation)
          
          if (!validationResult.success) {
            // КРИТИЧЕСКИЙ ФИКС: Логируем ошибку валидации, но не выбрасываем исключение
            // Вместо этого возвращаем ответ с предупреждением
            console.warn('[useRoutesSearch] Zod validation failed, but continuing:', {
              errors: validationResult.error.errors,
              response: responseForValidation,
              hasRoutes: !!responseForValidation.routes,
              routesLength: responseForValidation.routes?.length,
            })
            // НЕ выбрасываем исключение - продолжаем с данными, даже если валидация не прошла
            // Это позволяет отобразить маршрут, даже если схема не полностью соответствует
          }
          
          return adaptedResponse as RouteSearchResponse & { 
            validation?: any
            smartRoutes?: SmartRoute[]
          }
        }
        
        // Если ответ не успешный, пробрасываем ошибку
        throw new Error(smartRouteResponse.error?.message || 'Ошибка при построении маршрута')
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
  // КРИТИЧЕСКИЙ ФИКС: Проверяем success и наличие либо routes, либо smartRoutes
  // SmartRoute API возвращает routes: [backendRouteResult], но также может быть smartRoutes
  const hasValidData = data?.success && !data?.error && (data?.routes || (data as any)?.smartRoutes)
  
  // Проверка структуры перед адаптацией
  let adaptedRoutes: IBuiltRoute[] = []
  let adaptedAlternatives: IBuiltRoute[] = []
  let processingError: Error | null = null

  if (hasValidData) {
    // КРИТИЧЕСКИЙ ФИКС: Проверяем, есть ли полные данные SmartRoute в ответе
    // Приоритет: smartRoutes > routes (старый формат)
    const smartRoutesData = (data as RouteSearchResponse & { smartRoutes?: SmartRoute[] })?.smartRoutes
    
    if (smartRoutesData && smartRoutesData.length > 0) {
      // Используем полные данные SmartRoute для адаптации
      try {
        // Используем normalizedDate из queryFn, если date не указан
        const routeDate = date || new Date().toISOString().split('T')[0]
        adaptedRoutes = smartRoutesData
          .filter((_, index) => index === 0) // Первый маршрут - основной
          .map((route) => adaptSmartRouteToIBuiltRoute(route, routeDate, Number(passengers) || 1))
        
        adaptedAlternatives = smartRoutesData
          .filter((_, index) => index > 0) // Остальные - альтернативы
          .map((route) => adaptSmartRouteToIBuiltRoute(route, routeDate, Number(passengers) || 1))
      } catch (err) {
        // КРИТИЧЕСКИЙ ФИКС: Сохраняем оригинальное сообщение об ошибке для отладки
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('[useRoutesSearch] Error adapting SmartRoute:', errorMessage, err, {
          smartRoutesCount: smartRoutesData.length,
          dataSuccess: data?.success,
          dataError: data?.error,
        })
        processingError = new Error(`Ошибка при обработке SmartRoute данных: ${errorMessage}`)
        ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
      }
    } else if (data?.routes && Array.isArray(data.routes) && data.routes.length > 0) {
      // Fallback на старый формат, если SmartRoute данные отсутствуют
      // КРИТИЧЕСКИЙ ФИКС: Проверяем, что routes существует и является массивом
      try {
        // Проверяем структуру каждого маршрута через Zod
        for (const route of data.routes) {
          const routeValidation = RouteResultSchema.safeParse(route)
          if (!routeValidation.success) {
            console.warn('[useRoutesSearch] Route validation failed:', routeValidation.error)
            throw new Error('Неверная структура маршрута')
          }
        }
        
        // Если все проверки прошли, адаптируем маршруты
        adaptedRoutes = adaptBackendRoutesToFrontend(data.routes, date, Number(passengers) || 1)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('[useRoutesSearch] Error processing routes:', errorMessage, err)
        processingError = new Error(`Ошибка при обработке маршрутов: ${errorMessage}`)
        ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
      }

      // Проверяем альтернативные маршруты
      if (data.alternatives && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
        try {
          for (const altRoute of data.alternatives) {
            const altValidation = RouteResultSchema.safeParse(altRoute)
            if (!altValidation.success) {
              console.warn('[useRoutesSearch] Alternative route validation failed:', altValidation.error)
              throw new Error('Неверная структура альтернативного маршрута')
            }
          }
          adaptedAlternatives = adaptBackendRoutesToFrontend(data.alternatives, date, Number(passengers) || 1)
        } catch (err) {
          // Ошибка в альтернативах не критична, просто не используем их
          console.warn('[useRoutesSearch] Error processing alternatives, skipping:', err)
          adaptedAlternatives = []
        }
      }
    } else {
      // КРИТИЧЕСКИЙ ФИКС: Если нет ни smartRoutes, ни routes, логируем и устанавливаем ошибку
      console.error('[useRoutesSearch] No routes found in response:', {
        hasSuccess: !!data?.success,
        hasError: !!data?.error,
        hasRoutes: !!data?.routes,
        routesLength: data?.routes?.length,
        hasSmartRoutes: !!(data as any)?.smartRoutes,
        smartRoutesLength: (data as any)?.smartRoutes?.length,
        dataKeys: data ? Object.keys(data) : [],
      })
      processingError = new Error('Ответ сервера не содержит маршрутов')
      ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
    }
  } else {
    // КРИТИЧЕСКИЙ ФИКС: Если hasValidData = false, логируем причину
    console.error('[useRoutesSearch] Invalid data:', {
      hasData: !!data,
      success: data?.success,
      hasError: !!data?.error,
      error: data?.error,
      hasRoutes: !!data?.routes,
      routesLength: data?.routes?.length,
      hasSmartRoutes: !!(data as any)?.smartRoutes,
      smartRoutesLength: (data as any)?.smartRoutes?.length,
    })
  }

  // Добавляем riskAssessment и validation к каждому маршруту
  const routes: Route[] = adaptedRoutes.map((route) => ({
    ...route,
    riskAssessment: data?.riskAssessment,
    // Добавляем validation из SmartRoute API (если доступна)
    validation: (data as RouteSearchResponse & { validation?: any })?.validation,
  } as Route & { validation?: any }))

  const alternatives: Route[] = adaptedAlternatives.map((route) => ({
    ...route,
    riskAssessment: data?.riskAssessment,
    // Добавляем validation из SmartRoute API (если доступна)
    validation: (data as RouteSearchResponse & { validation?: any })?.validation,
  } as Route & { validation?: any }))

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

  // КРИТИЧЕСКИЙ ФИКС: Если есть ошибка обработки (INVALID_ROUTE_RESPONSE), но маршруты были адаптированы,
  // всё равно возвращаем их, чтобы пользователь видел маршрут (даже если есть предупреждения)
  // Только для критических ошибок (не INVALID_ROUTE_RESPONSE) возвращаем пустые массивы
  const isCriticalError = apiError && (apiError as ApiError).code !== 'INVALID_ROUTE_RESPONSE'
  const finalRoutes = isCriticalError ? [] : routes
  const finalAlternatives = isCriticalError ? [] : alternatives
  
  // Логируем результат для отладки
  if (routes.length > 0 || alternatives.length > 0) {
    console.log('[useRoutesSearch] Routes adapted successfully:', {
      routesCount: routes.length,
      alternativesCount: alternatives.length,
      hasError: !!apiError,
      errorCode: (apiError as ApiError)?.code,
      isCriticalError,
    })
  } else if (apiError) {
    console.error('[useRoutesSearch] No routes adapted, error:', {
      error: apiError.message,
      errorCode: (apiError as ApiError)?.code,
      hasData: !!data,
      dataSuccess: data?.success,
      dataError: data?.error,
      hasRoutes: !!data?.routes,
      routesLength: data?.routes?.length,
      hasSmartRoutes: !!(data as any)?.smartRoutes,
      smartRoutesLength: (data as any)?.smartRoutes?.length,
    })
  }

  return {
    routes: finalRoutes,
    alternatives: finalAlternatives,
    isLoading,
    error: apiError,
    errorCode,
    refetch,
  }
}

