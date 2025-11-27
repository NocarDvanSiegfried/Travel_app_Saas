/**
 * Hook для обработки сегментов маршрута для отображения на карте
 * 
 * Группирует сегменты по типу транспорта, определяет видимость,
 * и предоставляет метаданные для легенды и переключения.
 * 
 * @module routes/features/route-map/hooks
 */

import { useMemo } from 'react';
import type { IRouteSegmentMapData } from '../../../domain/map-types';
import { TransportType } from '../../../domain/types';

interface SegmentGroup {
  /**
   * Тип транспорта
   */
  transportType: TransportType;
  
  /**
   * Сегменты этого типа транспорта
   */
  segments: IRouteSegmentMapData[];
  
  /**
   * Количество сегментов
   */
  count: number;
  
  /**
   * Общая длина всех сегментов (км)
   */
  totalDistance: number;
  
  /**
   * Общая длительность всех сегментов (минуты)
   */
  totalDuration: number;
}

interface UseRouteMapSegmentsParams {
  /**
   * Данные карты маршрута
   */
  mapData: {
    segments: IRouteSegmentMapData[];
  } | null | undefined;
  
  /**
   * Видимость сегментов по типу транспорта (по умолчанию все видимы)
   */
  visibility?: Partial<Record<TransportType, boolean>>;
}

interface UseRouteMapSegmentsResult {
  /**
   * Все сегменты маршрута
   */
  segments: IRouteSegmentMapData[];
  
  /**
   * Группы сегментов по типу транспорта
   */
  groups: SegmentGroup[];
  
  /**
   * Видимые сегменты (с учётом visibility)
   */
  visibleSegments: IRouteSegmentMapData[];
  
  /**
   * Метаданные для легенды
   */
  legend: Array<{
    transportType: TransportType;
    label: string;
    color: string;
    count: number;
    visible: boolean;
  }>;
  
  /**
   * Функция для переключения видимости типа транспорта
   */
  toggleVisibility: (transportType: TransportType) => Record<TransportType, boolean>;
}

/**
 * Получает цвет для типа транспорта
 */
function getTransportColor(transportType: TransportType): string {
  switch (transportType) {
    case TransportType.AIRPLANE:
      return '#FF6B6B';
    case TransportType.BUS:
      return '#4ECDC4';
    case TransportType.TRAIN:
      return '#45B7D1';
    case TransportType.FERRY:
      return '#96CEB4';
    case TransportType.TAXI:
      return '#FFEAA7';
    default:
      return '#95A5A6';
  }
}

/**
 * Получает метку для типа транспорта
 */
function getTransportLabel(transportType: TransportType): string {
  switch (transportType) {
    case TransportType.AIRPLANE:
      return 'Самолёт';
    case TransportType.BUS:
      return 'Автобус';
    case TransportType.TRAIN:
      return 'Поезд';
    case TransportType.FERRY:
      return 'Паром';
    case TransportType.TAXI:
      return 'Такси';
    default:
      return 'Неизвестно';
  }
}

/**
 * Hook для обработки сегментов маршрута для отображения на карте
 * 
 * @param params - Параметры обработки (mapData, visibility)
 * @returns Объект с обработанными сегментами, группами, видимостью и легендой
 * 
 * @example
 * ```tsx
 * const { segments, groups, visibleSegments, legend, toggleVisibility } = useRouteMapSegments({
 *   mapData: routeMapData,
 *   visibility: { [TransportType.AIRPLANE]: true, [TransportType.BUS]: false }
 * });
 * 
 * // Переключение видимости
 * const newVisibility = toggleVisibility(TransportType.BUS);
 * ```
 */
export function useRouteMapSegments({
  mapData,
  visibility = {},
}: UseRouteMapSegmentsParams): UseRouteMapSegmentsResult {
  const segments = useMemo(() => {
    return mapData?.segments || [];
  }, [mapData]);

  // Группировка сегментов по типу транспорта
  const groups = useMemo(() => {
    const groupsMap = new Map<TransportType, IRouteSegmentMapData[]>();

    for (const segment of segments) {
      const transportType = segment.transportType;
      if (!groupsMap.has(transportType)) {
        groupsMap.set(transportType, []);
      }
      groupsMap.get(transportType)!.push(segment);
    }

    const result: SegmentGroup[] = [];

    for (const [transportType, segmentList] of groupsMap.entries()) {
      // КРИТИЧЕСКИЙ ФИКС: Используем новые поля SmartRoute (distanceData.value, durationData.value)
      // Приоритет: distanceData.value > distance, durationData.value > duration
      // Используем ?? вместо || для безопасной обработки 0
      const totalDistance = segmentList.reduce((sum, seg) => {
        const distanceValue = seg.distanceData?.value ?? seg.distance ?? 0;
        return sum + distanceValue;
      }, 0);
      
      const totalDuration = segmentList.reduce((sum, seg) => {
        const durationValue = seg.durationData?.value ?? seg.duration ?? 0;
        return sum + durationValue;
      }, 0);

      result.push({
        transportType,
        segments: segmentList,
        count: segmentList.length,
        totalDistance: Math.round(totalDistance),
        totalDuration: Math.round(totalDuration),
      });
    }

    // Сортируем по порядку типов транспорта
    const transportOrder: TransportType[] = [
      TransportType.AIRPLANE,
      TransportType.TRAIN,
      TransportType.BUS,
      TransportType.FERRY,
      TransportType.TAXI,
      TransportType.UNKNOWN,
    ];

    return result.sort((a, b) => {
      const indexA = transportOrder.indexOf(a.transportType);
      const indexB = transportOrder.indexOf(b.transportType);
      return indexA - indexB;
    });
  }, [segments]);

  // Видимые сегменты (с учётом visibility)
  const visibleSegments = useMemo(() => {
    return segments.filter((segment) => {
      const transportType = segment.transportType;
      // Если visibility не указан для типа, считаем видимым (по умолчанию true)
      return visibility[transportType] !== false;
    });
  }, [segments, visibility]);

  // Легенда
  const legend = useMemo(() => {
    return groups.map((group) => ({
      transportType: group.transportType,
      label: getTransportLabel(group.transportType),
      color: getTransportColor(group.transportType),
      count: group.count,
      visible: visibility[group.transportType] !== false,
    }));
  }, [groups, visibility]);

  // Функция для переключения видимости
  const toggleVisibility = useMemo(() => {
    return (transportType: TransportType): Record<TransportType, boolean> => {
      const currentVisibility = visibility[transportType] !== false;
      const newVisibility: Record<TransportType, boolean> = {
        [TransportType.AIRPLANE]: true,
        [TransportType.BUS]: true,
        [TransportType.TRAIN]: true,
        [TransportType.FERRY]: true,
        [TransportType.TAXI]: true,
        [TransportType.UNKNOWN]: true,
      };

      // Применяем текущие настройки видимости
      for (const [type, isVisible] of Object.entries(visibility)) {
        newVisibility[type as TransportType] = isVisible !== false;
      }

      // Переключаем указанный тип
      newVisibility[transportType] = !currentVisibility;

      return newVisibility;
    };
  }, [visibility]);

  return {
    segments,
    groups,
    visibleSegments,
    legend,
    toggleVisibility,
  };
}




