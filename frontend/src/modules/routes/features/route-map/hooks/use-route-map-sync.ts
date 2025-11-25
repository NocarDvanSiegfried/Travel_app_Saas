/**
 * Хук для синхронизации карты с сегментами маршрута
 * 
 * Обеспечивает синхронизацию между картой и списком сегментов:
 * - Выделение сегмента на карте при клике в списке
 * - Прокрутка к сегменту в списке при клике на карте
 * 
 * @module routes/features/route-map/hooks
 */

'use client';

import { useState, useCallback, useMemo } from 'react';

interface UseRouteMapSyncOptions {
  /**
   * Количество сегментов в маршруте
   */
  segmentCount: number;
  
  /**
   * Callback при выделении сегмента на карте
   */
  onSegmentHighlight?: (segmentIndex: number) => void;
  
  /**
   * Callback при прокрутке к сегменту в списке
   */
  onSegmentScroll?: (segmentIndex: number) => void;
}

interface UseRouteMapSyncReturn {
  /**
   * Индекс выделенного сегмента
   */
  highlightedSegmentIndex: number | null;
  
  /**
   * Функция для выделения сегмента на карте
   */
  highlightSegment: (segmentIndex: number) => void;
  
  /**
   * Функция для снятия выделения
   */
  clearHighlight: () => void;
  
  /**
   * Функция для обработки клика на сегмент карты
   */
  handleMapSegmentClick: (segmentId: string, segmentIndex: number) => void;
}

/**
 * Хук для синхронизации карты с сегментами маршрута
 * 
 * @param options - Опции хука
 * @returns Объект с функциями и состоянием синхронизации
 */
export function useRouteMapSync({
  segmentCount,
  onSegmentHighlight,
  onSegmentScroll,
}: UseRouteMapSyncOptions): UseRouteMapSyncReturn {
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);

  const highlightSegment = useCallback(
    (segmentIndex: number) => {
      if (segmentIndex >= 0 && segmentIndex < segmentCount) {
        setHighlightedSegmentIndex(segmentIndex);
        onSegmentHighlight?.(segmentIndex);
      }
    },
    [segmentCount, onSegmentHighlight]
  );

  const clearHighlight = useCallback(() => {
    setHighlightedSegmentIndex(null);
  }, []);

  const handleMapSegmentClick = useCallback(
    (segmentId: string, segmentIndex: number) => {
      highlightSegment(segmentIndex);
      onSegmentScroll?.(segmentIndex);
    },
    [highlightSegment, onSegmentScroll]
  );

  return useMemo(
    () => ({
      highlightedSegmentIndex,
      highlightSegment,
      clearHighlight,
      handleMapSegmentClick,
    }),
    [highlightedSegmentIndex, highlightSegment, clearHighlight, handleMapSegmentClick]
  );
}



