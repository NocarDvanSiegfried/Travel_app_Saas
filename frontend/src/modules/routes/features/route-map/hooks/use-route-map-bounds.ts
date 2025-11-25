/**
 * Hook для расчёта границ карты из сегментов маршрута
 * 
 * Использует useMemo для оптимизации расчётов.
 * Автоматически вычисляет границы карты на основе всех координат сегментов.
 * 
 * @module routes/features/route-map/hooks
 */

import { useMemo } from 'react';
import type { IRouteSegmentMapData } from '../../../domain/map-types';
import type { IMapBounds } from '../../../domain/map-types';
import { calculateBoundsFromCoordinates } from '../../../lib/utils/coordinates.utils';

interface UseRouteMapBoundsParams {
  /**
   * Массив сегментов маршрута с полилиниями
   */
  segments: IRouteSegmentMapData[];
  
  /**
   * Отступ в процентах (0-1, по умолчанию 0.15 = 15%)
   */
  padding?: number;
}

interface UseRouteMapBoundsResult {
  /**
   * Границы карты или null, если сегменты пусты
   */
  bounds: IMapBounds | null;
  
  /**
   * Флаг, что границы были успешно рассчитаны
   */
  isValid: boolean;
}

/**
 * Hook для расчёта границ карты из сегментов маршрута
 * 
 * @param params - Параметры расчёта (segments, padding)
 * @returns Объект с границами карты и флагом валидности
 * 
 * @example
 * ```tsx
 * const { bounds, isValid } = useRouteMapBounds({
 *   segments: mapData.segments,
 *   padding: 0.15
 * });
 * 
 * if (isValid && bounds) {
 *   mapProvider.setBounds(bounds);
 * }
 * ```
 */
export function useRouteMapBounds({
  segments,
  padding = 0.15,
}: UseRouteMapBoundsParams): UseRouteMapBoundsResult {
  const bounds = useMemo(() => {
    if (!segments || segments.length === 0) {
      return null;
    }

    // Собираем все координаты из всех сегментов
    const allCoordinates: Array<[number, number]> = [];

    for (const segment of segments) {
      if (segment.polyline?.coordinates) {
        for (const coord of segment.polyline.coordinates) {
          allCoordinates.push(coord);
        }
      }

      // Также добавляем координаты остановок (на случай, если полилиния пуста)
      allCoordinates.push([segment.fromStop.latitude, segment.fromStop.longitude]);
      allCoordinates.push([segment.toStop.latitude, segment.toStop.longitude]);
    }

    if (allCoordinates.length === 0) {
      return null;
    }

    // Вычисляем границы
    return calculateBoundsFromCoordinates(allCoordinates, padding);
  }, [segments, padding]);

  return {
    bounds,
    isValid: bounds !== null,
  };
}



