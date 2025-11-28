import { Coordinates } from './Coordinates';

/**
 * Метаданные для визуализации маршрута на карте
 * 
 * Содержит полилинии для отрисовки и маркеры для остановок
 * 
 * @example
 * ```typescript
 * const visualization = new VisualizationMetadata({
 *   polylines: [
 *     {
 *       geometry: [[129.7042, 62.0278], [37.6173, 55.7558]],
 *       color: '#0066CC',
 *       weight: 3,
 *       style: 'solid'
 *     }
 *   ],
 *   markers: [
 *     {
 *       coordinates: new Coordinates(62.0278, 129.7042),
 *       icon: 'airport',
 *       label: 'Якутск',
 *       type: 'start'
 *     }
 *   ],
 *   bounds: {
 *     north: 62.0278,
 *     south: 55.7558,
 *     east: 129.7042,
 *     west: 37.6173
 *   }
 * });
 * ```
 */
export interface VisualizationMetadata {
  /**
   * Полилинии для отрисовки маршрута
   */
  polylines: Array<{
    /**
     * Геометрия линии (массив координат [longitude, latitude])
     */
    geometry: [number, number][];

    /**
     * Цвет линии (HEX)
     */
    color: string;

    /**
     * Толщина линии (в пикселях)
     */
    weight: number;

    /**
     * Стиль линии
     */
    style: 'solid' | 'dashed' | 'dotted' | 'wavy';

    /**
     * Пунктирная линия (для зимников)
     */
    dashArray?: string;
  }>;

  /**
   * Маркеры для остановок
   */
  markers: Array<{
    /**
     * Координаты маркера
     */
    coordinates: Coordinates;

    /**
     * Тип иконки
     */
    icon: 'airport' | 'train_station' | 'bus_station' | 'ferry_pier' | 'hub' | 'transfer';

    /**
     * Подпись маркера (опционально)
     */
    label?: string;

    /**
     * Тип маркера
     */
    type: 'start' | 'end' | 'transfer' | 'hub' | 'intermediate';
  }>;

  /**
   * Границы карты для автоматического масштабирования
   */
  bounds: {
    /**
     * Северная граница (максимальная широта)
     */
    north: number;

    /**
     * Южная граница (минимальная широта)
     */
    south: number;

    /**
     * Восточная граница (максимальная долгота)
     */
    east: number;

    /**
     * Западная граница (минимальная долгота)
     */
    west: number;
  };
}

/**
 * Создаёт метаданные визуализации из координат
 */
export function createVisualizationMetadata(
  polylines: VisualizationMetadata['polylines'],
  markers: VisualizationMetadata['markers']
): VisualizationMetadata {
  // Вычисляем границы из всех координат
  const allCoordinates: Coordinates[] = [];
  polylines.forEach((polyline) => {
    polyline.geometry.forEach(([lng, lat]) => {
      allCoordinates.push(new Coordinates(lat, lng));
    });
  });
  markers.forEach((marker) => {
    allCoordinates.push(marker.coordinates);
  });

  if (allCoordinates.length === 0) {
    throw new Error('VisualizationMetadata: at least one coordinate is required');
  }

  const latitudes = allCoordinates.map((c) => c.latitude);
  const longitudes = allCoordinates.map((c) => c.longitude);

  const bounds = {
    north: Math.max(...latitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    west: Math.min(...longitudes),
  };

  return {
    polylines,
    markers,
    bounds,
  };
}






