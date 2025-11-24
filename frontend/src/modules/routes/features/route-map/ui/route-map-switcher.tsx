/**
 * Компонент переключения альтернативных маршрутов на карте
 * 
 * Позволяет переключаться между альтернативными маршрутами с плавной анимацией.
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { memo, useCallback, useMemo } from 'react';
import type { IBuiltRoute } from '../../../domain/types';
import { RouteMap } from './route-map';

interface RouteMapSwitcherProps {
  /**
   * Массив альтернативных маршрутов
   */
  routes: IBuiltRoute[];
  
  /**
   * Индекс текущего выбранного маршрута
   */
  currentRouteIndex: number;
  
  /**
   * Callback при переключении маршрута
   */
  onRouteChange?: (routeIndex: number) => void;
  
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
}

/**
 * Компонент переключения альтернативных маршрутов на карте
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с картой и переключателем маршрутов
 */
export const RouteMapSwitcher = memo(function RouteMapSwitcher({
  routes,
  currentRouteIndex,
  onRouteChange,
  height = '600px',
  showLegend = true,
  preserveMapPosition = false,
  providerType = 'yandex',
}: RouteMapSwitcherProps) {
  const currentRoute = useMemo(() => {
    if (!routes || routes.length === 0) {
      return null;
    }
    const index = Math.max(0, Math.min(currentRouteIndex, routes.length - 1));
    return routes[index];
  }, [routes, currentRouteIndex]);

  const hasAlternatives = useMemo(() => {
    return routes && routes.length > 1;
  }, [routes]);

  const handlePreviousRoute = useCallback(() => {
    if (currentRouteIndex > 0 && onRouteChange) {
      onRouteChange(currentRouteIndex - 1);
    }
  }, [currentRouteIndex, onRouteChange]);

  const handleNextRoute = useCallback(() => {
    if (currentRouteIndex < routes.length - 1 && onRouteChange) {
      onRouteChange(currentRouteIndex + 1);
    }
  }, [currentRouteIndex, routes.length, onRouteChange]);

  const handleRouteSelect = useCallback(
    (index: number) => {
      if (onRouteChange && index >= 0 && index < routes.length) {
        onRouteChange(index);
      }
    },
    [onRouteChange, routes.length]
  );

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
    <div className="card p-0 overflow-hidden" data-testid="route-map-switcher">
      {/* Заголовок с переключателем */}
      {hasAlternatives && (
        <div className="p-md border-b border-divider bg-background" data-testid="route-switcher-controls">
          <div className="flex items-center justify-between mb-sm">
            <h2 className="text-xl font-medium text-heading">Карта маршрута</h2>
            <div className="flex items-center gap-sm">
              <button
                onClick={handlePreviousRoute}
                disabled={currentRouteIndex === 0}
                className="px-sm py-xs rounded-sm border border-divider bg-background hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Предыдущий маршрут"
                data-testid="route-switcher-prev"
              >
                ←
              </button>
              <span className="text-sm text-secondary" data-testid="route-switcher-counter">
                {currentRouteIndex + 1} / {routes.length}
              </span>
              <button
                onClick={handleNextRoute}
                disabled={currentRouteIndex === routes.length - 1}
                className="px-sm py-xs rounded-sm border border-divider bg-background hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Следующий маршрут"
                data-testid="route-switcher-next"
              >
                →
              </button>
            </div>
          </div>

          {/* Индикаторы маршрутов */}
          <div className="flex items-center gap-xs flex-wrap" data-testid="route-switcher-indicators">
            {routes.map((route, index) => (
              <button
                key={route.routeId}
                onClick={() => handleRouteSelect(index)}
                className={`px-sm py-xs rounded-sm text-xs transition-all ${
                  index === currentRouteIndex
                    ? 'bg-primary text-inverse font-medium'
                    : 'bg-primary-light text-primary hover:bg-primary-light/80'
                }`}
                aria-label={`Маршрут ${index + 1}: ${route.fromCity} → ${route.toCity}`}
                data-testid={`route-switcher-indicator-${index}`}
                data-selected={index === currentRouteIndex}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Карта */}
      <div className="relative">
        {currentRoute ? (
          <RouteMap
            route={currentRoute}
            height={height}
            showLegend={showLegend}
            providerType={providerType}
            key={`route-map-${providerType}-${currentRoute.routeId}-${currentRouteIndex}`}
          />
        ) : (
          <div className="card p-lg" style={{ height }}>
            <div className="flex items-center justify-center h-full">
              <p className="text-secondary">Маршрут не найден</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

