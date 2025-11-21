import { useQuery } from '@tanstack/react-query'
import { fetchCities } from '../utils/cities-api'

interface UseCitiesResult {
  cities: string[]
  isLoading: boolean
  error: Error | null
}

/**
 * Hook для загрузки списка городов с использованием React Query
 * Использует кеширование для уменьшения нагрузки на backend
 * 
 * @returns Объект с городами, состоянием загрузки и ошибками
 */
export function useCities(): UseCitiesResult {
  const { data, isLoading, error } = useQuery<string[]>({
    queryKey: ['cities'],
    queryFn: () => fetchCities(),
    staleTime: 5 * 60 * 1000, // 5 минут - города меняются редко
    gcTime: 10 * 60 * 1000, // 10 минут - долгое кеширование
  })

  return {
    cities: data || [],
    isLoading,
    error: error as Error | null,
  }
}

