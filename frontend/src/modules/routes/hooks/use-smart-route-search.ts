import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/shared/utils/api'
import { IBuiltRoute, IRiskAssessment } from '../domain/types'
import { adaptSmartRouteToIBuiltRoute, type SmartRoute } from '../utils/smart-route-to-built-route-adapter'
import { useCities } from '@/shared/hooks/use-cities'

/**
 * Структура ответа от POST /api/smart-route/build
 */
interface SmartRouteBuildResponse {
  success: boolean
  route: SmartRoute
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    segmentValidations?: Array<{
      segmentId: string
      isValid: boolean
      errors: string[]
      warnings: string[]
    }>
  }
  alternatives?: SmartRoute[]
  executionTimeMs?: number
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

interface UseSmartRouteSearchParams {
  from: string
  to: string
  date?: string
  passengers?: string
  preferredTransport?: 'airplane' | 'train' | 'bus' | 'ferry' | 'winter_road' | 'taxi'
  maxTransfers?: number
  priority?: 'price' | 'time' | 'comfort'
}

interface UseSmartRouteSearchResult {
  route: Route | null
  alternatives: Route[]
  validation: SmartRouteBuildResponse['validation'] | null
  isLoading: boolean
  error: Error | null
  errorCode?: string
  refetch: () => Promise<unknown>
}

/**
 * Hook для поиска умных маршрутов через POST /api/smart-route/build
 * 
 * @param from - Город отправления (ID или название)
 * @param to - Город назначения (ID или название)
 * @param date - Дата поездки в формате YYYY-MM-DD
 * @param passengers - Количество пассажиров (опционально)
 * @param preferredTransport - Предпочтительный тип транспорта (опционально)
 * @param maxTransfers - Максимальное количество пересадок (опционально, по умолчанию 3)
 * @param priority - Приоритет оптимизации: price, time, comfort (опционально, по умолчанию price)
 * @returns Объект с маршрутом, альтернативами, валидацией, состоянием загрузки и ошибками
 */
export function useSmartRouteSearch({
  from,
  to,
  date,
  passengers = '1',
  preferredTransport,
  maxTransfers = 3,
  priority = 'price',
}: UseSmartRouteSearchParams): UseSmartRouteSearchResult {
  const normalizedFrom = from.trim()
  const normalizedTo = to.trim()
  const { cities } = useCities()

  const { data, isLoading, error, refetch } = useQuery<SmartRouteBuildResponse>({
    queryKey: ['smart-route', 'build', normalizedFrom, normalizedTo, date, passengers, preferredTransport, maxTransfers, priority],
    queryFn: async () => {
      // Валидация даты
      if (!date) {
        throw new Error('Дата поездки обязательна')
      }

      const normalizedDate = date.trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        throw new Error('Неверный формат даты. Используйте YYYY-MM-DD')
      }

      // КРИТИЧЕСКИЙ ФИКС: Конвертируем название города в cityId, если необходимо
      // Проверяем, является ли from/to cityId (формат: lowercase с дефисами, например 'moscow', 'saint-petersburg')
      // Если это название города, ищем соответствующий cityId
      let fromCityId = normalizedFrom
      let toCityId = normalizedTo

      // Проверяем, является ли from cityId (проверяем по списку городов)
      const fromCity = cities.find(c => c.id === normalizedFrom)
      if (!fromCity) {
        // Если не найден по id, ищем по названию
        const fromCityByName = cities.find(c => c.name.toLowerCase() === normalizedFrom.toLowerCase())
        if (fromCityByName) {
          fromCityId = fromCityByName.id
        }
        // Если не найден, оставляем как есть (backend попытается найти)
      }

      // Проверяем, является ли to cityId
      const toCity = cities.find(c => c.id === normalizedTo)
      if (!toCity) {
        // Если не найден по id, ищем по названию
        const toCityByName = cities.find(c => c.name.toLowerCase() === normalizedTo.toLowerCase())
        if (toCityByName) {
          toCityId = toCityByName.id
        }
        // Если не найден, оставляем как есть (backend попытается найти)
      }

      try {
        const response = await fetchApi<SmartRouteBuildResponse>('/smart-route/build', {
          method: 'POST',
          body: JSON.stringify({
            from: fromCityId,
            to: toCityId,
            date: normalizedDate,
            passengers: passengers && passengers !== '1' ? parseInt(passengers, 10) : undefined,
            preferredTransport,
            maxTransfers,
            priority,
          }),
        })
        
        return response
      } catch (err) {
        // Для ROUTES_NOT_FOUND (404) возвращаем успешный ответ с null маршрутом
        const apiError = err as ApiError
        if (apiError.status === 404 && apiError.code === 'ROUTE_NOT_FOUND') {
          return {
            success: true,
            route: null as any,
            alternatives: [],
            executionTimeMs: 0,
          } as SmartRouteBuildResponse
        }
        // Для других ошибок пробрасываем дальше
        throw err
      }
    },
    enabled: Boolean(normalizedFrom && normalizedTo && date),
    staleTime: 2 * 60 * 1000, // 2 минуты - данные актуальны
    retry: (failureCount, error) => {
      const apiError = error as ApiError
      
      // Не повторяем запрос для ошибок 404 (ROUTE_NOT_FOUND)
      if (apiError?.status === 404) {
        return false
      }
      
      // Повторяем для других ошибок (сеть, 500 и т.д.) - максимум 2 попытки
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => {
      // Экспоненциальная задержка: 1s, 2s
      const delay = Math.min(1000 * Math.pow(2, attemptIndex), 10000)
      return delay
    },
  })

  // ФАЗА 5 ФИКС: Преобразование данных из формата бэкенда в формат фронтенда
  // Добавлена валидация ответа перед адаптацией
  const hasValidData = data?.success && !data?.error && data?.route
  
  let adaptedRoute: Route | null = null
  let adaptedAlternatives: Route[] = []
  let processingError: Error | null = null
  let validationWarnings: string[] = []

  if (hasValidData && data.route) {
    // ФАЗА 5 ФИКС: Валидация структуры ответа перед адаптацией
    const route = data.route
    const validationIssues: string[] = []
    
    // Проверка обязательных полей
    if (!route.id) {
      validationIssues.push('Отсутствует route.id')
    }
    if (!route.fromCity) {
      validationIssues.push('Отсутствует route.fromCity')
    }
    if (!route.toCity) {
      validationIssues.push('Отсутствует route.toCity')
    }
    if (!route.segments) {
      validationIssues.push('Отсутствует route.segments')
    } else if (!Array.isArray(route.segments)) {
      validationIssues.push('route.segments не является массивом')
    } else if (route.segments.length === 0) {
      validationIssues.push('route.segments пуст')
    }
    
    // ФАЗА 5 ФИКС: Если есть некритичные проблемы, логируем их как предупреждения
    if (validationIssues.length > 0) {
      console.warn('[useSmartRouteSearch] Route validation issues:', {
        routeId: route.id,
        issues: validationIssues,
        route: {
          id: route.id,
          hasFromCity: !!route.fromCity,
          hasToCity: !!route.toCity,
          segmentsCount: route.segments?.length || 0,
          segmentsIsArray: Array.isArray(route.segments),
        },
      })
      validationWarnings.push(...validationIssues)
    }
    
    // ФАЗА 5 ФИКС: Пытаемся адаптировать маршрут даже при наличии некритичных проблем
    // Только критичные ошибки (отсутствие обязательных полей) блокируют адаптацию
    const hasCriticalIssues = !route.id || !route.fromCity || !route.toCity || !route.segments || !Array.isArray(route.segments)
    
    if (!hasCriticalIssues) {
      try {
        // Используем adaptSmartRouteToIBuiltRoute для преобразования SmartRoute в IBuiltRoute
        // Это сохраняет все новые поля: viaHubs, pathGeometry, isHub, hubLevel, seasonality, validation и т.д.
        adaptedRoute = adaptSmartRouteToIBuiltRoute(route, date, Number(passengers) || 1) as Route
        
        // Добавляем validation из ответа API
        if (data.validation) {
          (adaptedRoute as Route & { validation?: any }).validation = data.validation
        }
        
        // ФАЗА 5 ФИКС: Добавляем предупреждения в validation, если они есть
        if (validationWarnings.length > 0 && adaptedRoute.validation) {
          adaptedRoute.validation.warnings = [
            ...(adaptedRoute.validation.warnings || []),
            ...validationWarnings,
          ]
        }
      } catch (err) {
        // ФАЗА 5 ФИКС: Улучшенная обработка ошибок адаптации
        // Различаем критичные и некритичные ошибки
        const errorMessage = err instanceof Error ? err.message : String(err)
        const errorStack = err instanceof Error ? err.stack : undefined
        
        // ФАЗА 5 ФИКС: Определяем, является ли ошибка критичной
        const isCriticalError = errorMessage.includes('Cannot read property') || 
                               errorMessage.includes('undefined') ||
                               errorMessage.includes('null') ||
                               errorMessage.includes('TypeError')
        
        console.error('[useSmartRouteSearch] Error adapting route:', errorMessage, {
          error: err,
          errorStack,
          isCriticalError,
          route: route,
          routeId: route?.id,
          segmentsCount: route?.segments?.length,
          fromCity: route?.fromCity,
          toCity: route?.toCity,
          segments: route?.segments?.map((seg: any, idx: number) => ({
            index: idx,
            id: seg.id,
            segmentId: seg.segmentId,
            type: seg.type,
            from: seg.from ? { id: seg.from.id, name: seg.from.name, hasCoordinates: !!seg.from.coordinates } : null,
            to: seg.to ? { id: seg.to.id, name: seg.to.name, hasCoordinates: !!seg.to.coordinates } : null,
            pathGeometry: seg.pathGeometry ? (Array.isArray(seg.pathGeometry) ? 'array' : typeof seg.pathGeometry) : 'missing',
            hasViaHubs: !!seg.viaHubs,
            hasDuration: !!seg.duration,
            hasPrice: !!seg.price,
          })),
        })
        
        // ФАЗА 5 ФИКС: Для некритичных ошибок пытаемся создать минимальный маршрут
        if (!isCriticalError) {
          try {
            // Пытаемся создать минимальный маршрут с доступными данными
            console.warn('[useSmartRouteSearch] Attempting to create minimal route from available data')
            adaptedRoute = {
              routeId: route.id || `route-${Date.now()}`,
              fromCity: route.fromCity?.name || '',
              toCity: route.toCity?.name || '',
              fromCityId: route.fromCity?.id || '',
              toCityId: route.toCity?.id || '',
              date: date || new Date().toISOString().split('T')[0],
              passengers: Number(passengers) || 1,
              segments: [],
              totalDuration: 0,
              totalPrice: 0,
              transferCount: 0,
              transportTypes: [],
              departureTime: '',
              arrivalTime: '',
              validation: {
                isValid: false,
                errors: [`Ошибка адаптации: ${errorMessage}`],
                warnings: validationWarnings,
              },
            } as Route
            console.log('[useSmartRouteSearch] Created minimal route as fallback')
          } catch (fallbackErr) {
            // Если даже fallback не удался, это критичная ошибка
            processingError = new Error(`Критичная ошибка при обработке маршрута: ${errorMessage}`)
            ;(processingError as Error & { code?: string }).code = 'CRITICAL_ADAPTATION_ERROR'
          }
        } else {
          // Критичная ошибка - не можем адаптировать маршрут
          processingError = new Error(`Ошибка при обработке маршрута: ${errorMessage}`)
          ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_RESPONSE'
        }
      }
    } else {
      // ФАЗА 5 ФИКС: Критичные проблемы - маршрут не может быть адаптирован
      const criticalIssues = [
        !route.id && 'Отсутствует route.id',
        !route.fromCity && 'Отсутствует route.fromCity',
        !route.toCity && 'Отсутствует route.toCity',
        !route.segments && 'Отсутствует route.segments',
        route.segments && !Array.isArray(route.segments) && 'route.segments не является массивом',
      ].filter(Boolean) as string[]
      
      console.error('[useSmartRouteSearch] Critical validation issues, cannot adapt route:', {
        issues: criticalIssues,
        route: {
          id: route.id,
          hasFromCity: !!route.fromCity,
          hasToCity: !!route.toCity,
          segmentsCount: route.segments?.length,
          segmentsIsArray: Array.isArray(route.segments),
        },
      })
      
      processingError = new Error(`Критичные проблемы в структуре маршрута: ${criticalIssues.join(', ')}`)
      ;(processingError as Error & { code?: string }).code = 'INVALID_ROUTE_STRUCTURE'
    }

    // ФАЗА 5 ФИКС: Адаптируем альтернативные маршруты с улучшенной обработкой ошибок
    if (data.alternatives && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
      adaptedAlternatives = data.alternatives
        .map((altRoute, index) => {
          try {
            // ФАЗА 5 ФИКС: Валидация альтернативного маршрута перед адаптацией
            if (!altRoute.id || !altRoute.fromCity || !altRoute.toCity || !altRoute.segments || !Array.isArray(altRoute.segments)) {
              console.warn(`[useSmartRouteSearch] Alternative route ${index} has validation issues, skipping:`, {
                routeId: altRoute.id,
                hasFromCity: !!altRoute.fromCity,
                hasToCity: !!altRoute.toCity,
                segmentsCount: altRoute.segments?.length,
                segmentsIsArray: Array.isArray(altRoute.segments),
              })
              return null
            }
            
            const adapted = adaptSmartRouteToIBuiltRoute(altRoute, date, Number(passengers) || 1) as Route
            // Добавляем validation из ответа API (общая validation для всех альтернатив)
            if (data.validation) {
              (adapted as Route & { validation?: any }).validation = data.validation
            }
            return adapted
          } catch (err) {
            // ФАЗА 5 ФИКС: Логируем ошибку адаптации альтернативного маршрута, но не блокируем остальные
            const errorMessage = err instanceof Error ? err.message : String(err)
            console.warn(`[useSmartRouteSearch] Error adapting alternative route ${index}, skipping:`, {
              error: errorMessage,
              routeId: altRoute.id,
              segmentsCount: altRoute.segments?.length,
            })
            return null
          }
        })
        .filter((route): route is Route => route !== null) // Фильтруем null значения
    }
  }

  // ФАЗА 5 ФИКС: Обработка ошибки из API ответа с улучшенной логикой
  const apiError = processingError || (data?.error
    ? new Error(data.error.message || 'Ошибка при построении маршрута')
    : (error as Error | null))

  // ФАЗА 5 ФИКС: Для разных типов ошибок создаем понятные сообщения
  if (apiError) {
    const errorCode = (apiError as ApiError).code
    switch (errorCode) {
      case 'INVALID_ROUTE_RESPONSE':
        apiError.message = 'Неверный формат данных от сервера. Попробуйте обновить страницу.'
        break
      case 'INVALID_ROUTE_STRUCTURE':
        apiError.message = 'Структура данных маршрута некорректна. Попробуйте выбрать другие города.'
        break
      case 'CRITICAL_ADAPTATION_ERROR':
        apiError.message = 'Критичная ошибка при обработке маршрута. Попробуйте обновить страницу.'
        break
      default:
        // Сообщение уже установлено выше или из API
        break
    }
  }

  // Определяем код ошибки
  const errorCode = (processingError as Error & { code?: string })?.code || (error as ApiError)?.code || data?.error?.code

  // ФАЗА 5 ФИКС: Улучшенная логика определения критичности ошибки
  // Критичные ошибки: INVALID_ROUTE_STRUCTURE, CRITICAL_ADAPTATION_ERROR, сетевые ошибки
  // Некритичные ошибки: INVALID_ROUTE_RESPONSE (если маршрут был адаптирован)
  const isCriticalError = apiError && (
    (apiError as ApiError).code === 'INVALID_ROUTE_STRUCTURE' ||
    (apiError as ApiError).code === 'CRITICAL_ADAPTATION_ERROR' ||
    ((apiError as ApiError).code !== 'INVALID_ROUTE_RESPONSE' && !adaptedRoute)
  )
  
  // ФАЗА 5 ФИКС: Если маршрут был адаптирован, возвращаем его даже при некритичных ошибках
  // Пользователь увидит маршрут с предупреждениями вместо полной ошибки
  const finalRoute = isCriticalError ? null : adaptedRoute
  const finalAlternatives = isCriticalError ? [] : adaptedAlternatives
  
  // ФАЗА 5 ФИКС: Улучшенное логирование результата для отладки
  if (adaptedRoute) {
    console.log('[useSmartRouteSearch] Route adapted successfully:', {
      routeId: adaptedRoute.routeId,
      fromCity: adaptedRoute.fromCity,
      toCity: adaptedRoute.toCity,
      segmentsCount: adaptedRoute.segments.length,
      hasError: !!apiError,
      errorCode: (apiError as ApiError)?.code,
      isCriticalError,
      hasWarnings: validationWarnings.length > 0,
      warningsCount: validationWarnings.length,
      alternativesCount: adaptedAlternatives.length,
    })
    
    // ФАЗА 5 ФИКС: Логируем предупреждения, если они есть
    if (validationWarnings.length > 0) {
      console.warn('[useSmartRouteSearch] Route adapted with warnings:', {
        routeId: adaptedRoute.routeId,
        warnings: validationWarnings,
      })
    }
  } else if (apiError) {
    console.error('[useSmartRouteSearch] No route adapted, error:', {
      error: apiError.message,
      errorCode: (apiError as ApiError)?.code,
      isCriticalError,
      hasData: !!data,
      dataSuccess: data?.success,
      dataError: data?.error,
      hasRoute: !!data?.route,
      routeId: data?.route?.id,
      segmentsCount: data?.route?.segments?.length,
      validationIssues: validationWarnings,
    })
  } else if (hasValidData && !adaptedRoute) {
    // ФАЗА 5 ФИКС: Логируем случай, когда данные есть, но маршрут не адаптирован
    console.warn('[useSmartRouteSearch] Valid data but no route adapted:', {
      hasData: !!data,
      dataSuccess: data?.success,
      hasRoute: !!data?.route,
      routeId: data?.route?.id,
      segmentsCount: data?.route?.segments?.length,
      validationIssues: validationWarnings,
    })
  }

  return {
    route: finalRoute,
    alternatives: finalAlternatives,
    validation: data?.validation || null,
    isLoading,
    error: apiError,
    errorCode,
    refetch,
  }
}

