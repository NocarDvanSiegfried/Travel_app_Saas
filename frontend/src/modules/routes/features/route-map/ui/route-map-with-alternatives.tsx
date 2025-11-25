/**
 * Компонент карты с поддержкой альтернативных маршрутов
 * 
 * Расширенная версия RouteMap, которая поддерживает переключение между
 * альтернативными маршрутами с плавной анимацией и сохранением позиции карты.
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { RouteMapSwitcher } from './route-map-switcher';
import type { IBuiltRoute } from '../../../domain/types';
import { safeLocalStorage } from '@/shared/utils/storage';

interface RouteMapWithAlternativesProps {
  /**
   * ID основного маршрута
   */
  primaryRouteId: string;
  
  /**
   * Массив альтернативных маршрутов (опционально, загружается из localStorage если не указан)
   */
  routes?: IBuiltRoute[];
  
  /**
   * Высота карты (по умолчанию 600px)
   */
  height?: string;
  
  /**
   * Показывать ли легенду (по умолчанию true)
   */
  showLegend?: boolean;
  
  /**
   * Сохранять ли позицию карты при переключении (по умолчанию false)
   */
  preserveMapPosition?: boolean;
  
  /**
   * Тип провайдера карты ('yandex' | 'leaflet', по умолчанию 'yandex')
   */
  providerType?: 'yandex' | 'leaflet';
  
  /**
   * Callback при переключении маршрута
   */
  onRouteChange?: (routeIndex: number, route: IBuiltRoute) => void;
}

/**
 * Компонент карты с поддержкой альтернативных маршрутов
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с картой и переключателем маршрутов
 */
export function RouteMapWithAlternatives({
  primaryRouteId,
  routes: externalRoutes,
  height = '600px',
  showLegend = true,
  preserveMapPosition = false,
  providerType = 'yandex',
  onRouteChange,
}: RouteMapWithAlternativesProps) {
  const [routes, setRoutes] = useState<IBuiltRoute[]>(externalRoutes || []);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [loading, setLoading] = useState(!externalRoutes);

  // Загрузка маршрутов из localStorage
  useEffect(() => {
    if (externalRoutes && externalRoutes.length > 0) {
      setRoutes(externalRoutes);
      setLoading(false);
      return;
    }

    if (!primaryRouteId) {
      setLoading(false);
      return;
    }

    try {
      // Загружаем основной маршрут
      const primaryData = safeLocalStorage.getItem(`route-${primaryRouteId}`);
      if (!primaryData) {
        setLoading(false);
        return;
      }

      const parsedPrimary: { route: IBuiltRoute } = JSON.parse(primaryData);
      const loadedRoutes: IBuiltRoute[] = [parsedPrimary.route];

      // Пытаемся загрузить альтернативные маршруты
      // Альтернативы могут храниться в том же ключе или в отдельных ключах
      const alternativesKey = `route-${primaryRouteId}-alternatives`;
      const alternativesData = safeLocalStorage.getItem(alternativesKey);
      
      if (alternativesData) {
        try {
          const parsedAlternatives: { routes: IBuiltRoute[] } = JSON.parse(alternativesData);
          if (parsedAlternatives.routes && Array.isArray(parsedAlternatives.routes)) {
            loadedRoutes.push(...parsedAlternatives.routes);
          }
        } catch {
          // Игнорируем ошибки парсинга альтернатив
        }
      }

      setRoutes(loadedRoutes);
    } catch (err) {
      console.error('Failed to load routes for map:', err);
    } finally {
      setLoading(false);
    }
  }, [primaryRouteId, externalRoutes]);

  const handleRouteChange = useCallback(
    (routeIndex: number) => {
      setCurrentRouteIndex(routeIndex);
      if (routes[routeIndex] && onRouteChange) {
        onRouteChange(routeIndex, routes[routeIndex]);
      }
    },
    [routes, onRouteChange]
  );

  if (loading) {
    return (
      <div className="card p-lg" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-md"></div>
            <p className="text-secondary">Загрузка карты...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="card p-lg" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-secondary">Маршруты не найдены</p>
        </div>
      </div>
    );
  }

  return (
    <RouteMapSwitcher
      routes={routes}
      currentRouteIndex={currentRouteIndex}
      onRouteChange={handleRouteChange}
      height={height}
      showLegend={showLegend}
      preserveMapPosition={preserveMapPosition}
      providerType={providerType}
    />
  );
}



