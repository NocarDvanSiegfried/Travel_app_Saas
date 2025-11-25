/**
 * Секция карты маршрута
 * 
 * Компонент-обёртка для RouteMap, который загружает данные маршрута из localStorage
 * и отображает карту. Используется в RouteDetailsView.
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { useEffect, useState } from 'react';
import { RouteMap } from './route-map';
import type { IBuiltRoute } from '../../../domain/types';
import { safeLocalStorage } from '@/shared/utils/storage';

interface RouteMapSectionProps {
  /**
   * ID маршрута (для загрузки из localStorage)
   */
  routeId?: string;
  
  /**
   * Маршрут напрямую (если уже загружен)
   */
  route?: IBuiltRoute | null;
  
  /**
   * Высота карты (по умолчанию 600px)
   */
  height?: string;
  
  /**
   * Показывать ли легенду (по умолчанию true)
   */
  showLegend?: boolean;
  
  /**
   * Тип провайдера карты ('yandex' | 'leaflet', по умолчанию 'yandex')
   */
  providerType?: 'yandex' | 'leaflet';
}

/**
 * Секция карты маршрута
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с картой маршрута
 */
export function RouteMapSection({
  routeId,
  route: externalRoute,
  height = '600px',
  showLegend = true,
  providerType = 'yandex',
}: RouteMapSectionProps) {
  const [route, setRoute] = useState<IBuiltRoute | null>(externalRoute || null);
  const [loading, setLoading] = useState(!externalRoute);

  useEffect(() => {
    if (externalRoute) {
      setRoute(externalRoute);
      setLoading(false);
      return;
    }

    if (!routeId) {
      setLoading(false);
      return;
    }

    try {
      const storedData = safeLocalStorage.getItem(`route-${routeId}`);
      if (!storedData) {
        setLoading(false);
        return;
      }

      const parsedData: { route: IBuiltRoute } = JSON.parse(storedData);
      setRoute(parsedData.route);
    } catch (err) {
      console.error('Failed to load route for map:', err);
    } finally {
      setLoading(false);
    }
  }, [routeId, externalRoute]);

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

  if (!route) {
    return (
      <div className="card p-lg" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-secondary">Маршрут не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-md border-b border-divider">
        <h2 className="text-xl font-medium text-heading">Карта маршрута</h2>
      </div>
      <RouteMap
        route={route}
        height={height}
        showLegend={showLegend}
        providerType={providerType}
      />
    </div>
  );
}



