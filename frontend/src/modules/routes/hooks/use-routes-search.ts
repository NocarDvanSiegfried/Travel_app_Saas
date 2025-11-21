import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/shared/utils/api'
import { IRouteBuilderResult, IBuiltRoute, IRiskAssessment } from '../domain/types'

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

interface UseRoutesSearchParams {
  from: string
  to: string
  date?: string
  passengers?: string
}

interface UseRoutesSearchResult {
  routes: Route[]
  alternatives: Route[]
  dataMode?: string
  dataQuality?: number
  isLoading: boolean
  error: Error | null
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

  const { data, isLoading, error, refetch } = useQuery<RouteSearchResult>({
    queryKey: ['routes', 'search', normalizedFrom, normalizedTo, date, passengers],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: normalizedFrom,
        to: normalizedTo,
      })

      if (date) {
        params.set('date', date)
      }

      if (passengers && passengers !== '1') {
        params.set('passengers', passengers)
      }

      return fetchApi<RouteSearchResult>(`/routes/search?${params.toString()}`)
    },
    enabled: Boolean(normalizedFrom && normalizedTo),
    staleTime: 2 * 60 * 1000, // 2 минуты - данные актуальны
  })

  // Преобразование данных с добавлением riskAssessment
  const routes: Route[] = (data?.routes || []).map((route) => ({
    ...route,
    riskAssessment: data?.riskAssessment,
  }))

  const alternatives: Route[] = (data?.alternatives || []).map((route) => ({
    ...route,
    riskAssessment: data?.riskAssessment,
  }))

  // Обработка ошибки из API ответа
  const apiError = data?.error
    ? new Error(data.error.message || 'Ошибка при поиске маршрутов')
    : null

  return {
    routes: apiError ? [] : routes,
    alternatives: apiError ? [] : alternatives,
    dataMode: apiError ? undefined : data?.dataMode,
    dataQuality: apiError ? undefined : data?.dataQuality,
    isLoading,
    error: apiError || (error as Error | null),
    refetch,
  }
}

