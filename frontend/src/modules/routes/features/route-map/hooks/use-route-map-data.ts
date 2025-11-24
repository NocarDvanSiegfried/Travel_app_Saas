/**
 * Hook для загрузки данных карты маршрута
 * 
 * Использует React Query для кэширования и управления состоянием загрузки.
 * Поддерживает загрузку данных по routeId или по полному объекту маршрута.
 * 
 * @module routes/features/route-map/hooks
 */

import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/shared/utils/api';
import type { IBuiltRoute } from '../../../domain/types';
import type { RouteMapData, RouteMapDataResponse } from '../../../schemas/route-map.schema';
import { RouteMapDataResponseSchema } from '../../../schemas/route-map.schema';

interface UseRouteMapDataParams {
  /**
   * ID маршрута (если указан, будет использован GET запрос)
   */
  routeId?: string;
  
  /**
   * Полный объект маршрута (если указан, будет использован POST запрос)
   */
  route?: IBuiltRoute;
  
  /**
   * Предзагруженные данные карты (если указаны, запрос не выполняется)
   */
  mapData?: RouteMapData;
  
  /**
   * Включить запрос (по умолчанию true, если есть routeId или route)
   */
  enabled?: boolean;
}

interface UseRouteMapDataResult {
  /**
   * Данные карты маршрута
   */
  data: RouteMapData | undefined;
  
  /**
   * Флаг загрузки
   */
  isLoading: boolean;
  
  /**
   * Флаг ошибки
   */
  isError: boolean;
  
  /**
   * Объект ошибки
   */
  error: Error | null;
  
  /**
   * Код ошибки (если есть)
   */
  errorCode?: string;
  
  /**
   * Функция для повторного запроса
   */
  refetch: () => Promise<unknown>;
  
  /**
   * Флаг попадания в кэш
   */
  cacheHit?: boolean;
}

/**
 * Hook для загрузки данных карты маршрута
 * 
 * @param params - Параметры загрузки (routeId, route, mapData, enabled)
 * @returns Объект с данными карты, состоянием загрузки и ошибками
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useRouteMapData({
 *   routeId: 'route-123'
 * });
 * 
 * // Или с полным объектом маршрута
 * const { data } = useRouteMapData({
 *   route: builtRoute
 * });
 * 
 * // Или с предзагруженными данными
 * const { data } = useRouteMapData({
 *   mapData: preloadedMapData
 * });
 * ```
 */
export function useRouteMapData({
  routeId,
  route,
  mapData,
  enabled = true,
}: UseRouteMapDataParams): UseRouteMapDataResult {
  // Определяем, какой запрос делать
  const shouldUseGet = Boolean(routeId && !route);
  const shouldUsePost = Boolean(route && !routeId);
  const isEnabled = enabled && (shouldUseGet || shouldUsePost) && !mapData;

  const { data, isLoading, error, refetch } = useQuery<RouteMapDataResponse>({
    queryKey: ['route-map', routeId || route?.routeId || 'unknown'],
    queryFn: async () => {
      let response: RouteMapDataResponse;

      if (shouldUseGet && routeId) {
        // GET запрос по routeId
        response = await fetchApi<RouteMapDataResponse>(
          `/routes/map?routeId=${encodeURIComponent(routeId)}`
        );
      } else if (shouldUsePost && route) {
        // POST запрос с полным объектом маршрута
        response = await fetchApi<RouteMapDataResponse>('/routes/map', {
          method: 'POST',
          body: JSON.stringify({ route }),
        });
      } else {
        throw new Error('Необходимо указать routeId или route');
      }

      // Валидация ответа через Zod
      const validationResult = RouteMapDataResponseSchema.safeParse(response);

      if (!validationResult.success) {
        const validationError = new Error('Неверный формат ответа от сервера') as Error & {
          code?: string;
        };
        validationError.code = 'INVALID_MAP_DATA_RESPONSE';
        throw validationError;
      }

      return validationResult.data;
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 минут - данные карты актуальны
    gcTime: 10 * 60 * 1000, // 10 минут - долгое кэширование
    retry: (failureCount, error) => {
      const apiError = error as Error & { code?: string; status?: number };

      // Не повторяем для ошибок валидации
      if (apiError?.code === 'INVALID_MAP_DATA_RESPONSE') {
        return false;
      }

      // Не повторяем для 404 (маршрут не найден)
      if (apiError?.status === 404) {
        return false;
      }

      // Повторяем для других ошибок (сеть, 500 и т.д.) - максимум 2 попытки
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Экспоненциальная задержка: 1s, 2s
      return Math.min(1000 * Math.pow(2, attemptIndex), 2000);
    },
  });

  // Если данные уже предзагружены, возвращаем их без запроса
  if (mapData) {
    return {
      data: mapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: async () => mapData,
    };
  }

  // Обработка ошибки
  const apiError = error as Error & { code?: string; status?: number } | null;
  const errorCode = apiError?.code || (data?.success === false ? 'MAP_DATA_ERROR' : undefined);

  return {
    data: data?.data,
    isLoading,
    isError: Boolean(error || (data && !data.success)),
    error: apiError || null,
    errorCode,
    refetch,
    cacheHit: data?.cacheHit,
  };
}

