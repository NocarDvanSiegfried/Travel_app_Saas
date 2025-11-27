/**
 * Генератор маркеров для карты маршрутов
 * 
 * Создаёт маркеры для остановок маршрута (start, end, transfer).
 * 
 * @module routes/features/route-map/lib
 */

import type { IRouteSegmentMapData } from '../../../domain/map-types';
import { getMarkerColor, getMarkerIcon } from './map-styles';

/**
 * Тип маркера
 */
export type MarkerType = 'start' | 'end' | 'transfer';

/**
 * Данные маркера для карты
 */
export interface IMapMarker {
  /**
   * ID маркера (обычно stopId)
   */
  id: string;
  
  /**
   * Координаты [широта, долгота]
   */
  coordinate: [number, number];
  
  /**
   * Тип маркера
   */
  type: MarkerType;
  
  /**
   * Название остановки
   */
  name: string;
  
  /**
   * Название города
   */
  cityName: string;
  
  /**
   * Время отправления/прибытия (опционально)
   */
  time?: string;
  
  /**
   * Цвет маркера
   */
  color: string;
  
  /**
   * Иконка маркера (emoji)
   */
  icon: string;
  
  /**
   * Содержимое popup/tooltip
   */
  popupContent: string;
  
  /**
   * Дополнительные метаданные
   */
  metadata?: Record<string, unknown>;
}

/**
 * Генерирует маркеры для маршрута
 * 
 * @param segments - Массив сегментов маршрута
 * @returns Массив маркеров
 * 
 * @example
 * ```ts
 * const markers = generateMapMarkers(mapData.segments);
 * // markers = [
 * //   { type: 'start', coordinate: [62.0, 129.0], ... },
 * //   { type: 'transfer', coordinate: [63.0, 130.0], ... },
 * //   { type: 'end', coordinate: [64.0, 131.0], ... }
 * // ]
 * ```
 */
export function generateMapMarkers(segments: IRouteSegmentMapData[]): IMapMarker[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const markers: IMapMarker[] = [];
  const processedStopIds = new Set<string>();

  // Обработка первого сегмента - Start Marker
  const firstSegment = segments[0];
  if (firstSegment.fromStop) {
    // TODO: Добавить отображение хабов (isHub, hubLevel) в маркеры
    const hubInfo = firstSegment.fromStop.isHub && firstSegment.fromStop.hubLevel
      ? `\n⭐ ${firstSegment.fromStop.hubLevel === 'federal' ? 'Федеральный' : 'Региональный'} хаб`
      : '';
    
    const startMarker: IMapMarker = {
      id: firstSegment.fromStop.id,
      coordinate: [firstSegment.fromStop.latitude, firstSegment.fromStop.longitude],
      type: 'start',
      name: firstSegment.fromStop.name,
      cityName: firstSegment.fromStop.cityName,
      time: firstSegment.schedule?.departureTime || firstSegment.departureTime,
      color: getMarkerColor('start'),
      icon: getMarkerIcon('start'),
      popupContent: `Отправление: ${firstSegment.fromStop.name}${hubInfo}\n${firstSegment.schedule?.departureTime || firstSegment.departureTime || ''}`,
      metadata: {
        segmentId: firstSegment.segmentId,
        isTransfer: false,
        isHub: firstSegment.fromStop.isHub,
        hubLevel: firstSegment.fromStop.hubLevel,
      },
    };
    markers.push(startMarker);
    processedStopIds.add(firstSegment.fromStop.id);
  }

  // Обработка промежуточных сегментов - Transfer Markers
  for (let i = 1; i < segments.length; i++) {
    const currentSegment = segments[i];
    const previousSegment = segments[i - 1];

    // Проверяем, является ли fromStop текущего сегмента transfer точкой
    if (
      currentSegment.fromStop &&
      previousSegment.toStop &&
      currentSegment.fromStop.id === previousSegment.toStop.id
    ) {
      // Это transfer точка
      if (!processedStopIds.has(currentSegment.fromStop.id)) {
        // TODO: Добавить отображение хабов (isHub, hubLevel) в маркеры пересадок
        const hubInfo = currentSegment.fromStop.isHub && currentSegment.fromStop.hubLevel
          ? `\n⭐ ${currentSegment.fromStop.hubLevel === 'federal' ? 'Федеральный' : 'Региональный'} хаб`
          : '';
        
        const transferMarker: IMapMarker = {
          id: currentSegment.fromStop.id,
          coordinate: [
            currentSegment.fromStop.latitude,
            currentSegment.fromStop.longitude,
          ],
          type: 'transfer',
          name: currentSegment.fromStop.name,
          cityName: currentSegment.fromStop.cityName,
          time: currentSegment.schedule?.departureTime || currentSegment.departureTime,
          color: getMarkerColor('transfer'),
          icon: getMarkerIcon('transfer'),
          popupContent: `Пересадка: ${currentSegment.fromStop.name}${hubInfo}\n${currentSegment.schedule?.departureTime || currentSegment.departureTime || ''}`,
          metadata: {
            segmentId: currentSegment.segmentId,
            isTransfer: true,
            previousSegmentId: previousSegment.segmentId,
            isHub: currentSegment.fromStop.isHub,
            hubLevel: currentSegment.fromStop.hubLevel,
          },
        };
        markers.push(transferMarker);
        processedStopIds.add(currentSegment.fromStop.id);
      }
    } else if (currentSegment.fromStop && !processedStopIds.has(currentSegment.fromStop.id)) {
      // Это не transfer, но остановка ещё не обработана (возможно, ошибка в данных)
      const warningMarker: IMapMarker = {
        id: currentSegment.fromStop.id,
        coordinate: [
          currentSegment.fromStop.latitude,
          currentSegment.fromStop.longitude,
        ],
        type: 'transfer', // Используем transfer тип для визуализации
        name: currentSegment.fromStop.name,
        cityName: currentSegment.fromStop.cityName,
        time: currentSegment.departureTime,
        color: getMarkerColor('transfer'),
        icon: getMarkerIcon('transfer'),
        popupContent: `${currentSegment.fromStop.name}\n${currentSegment.departureTime || ''}`,
        metadata: {
          segmentId: currentSegment.segmentId,
          isTransfer: false,
          warning: 'Неожиданная остановка (возможно, ошибка в данных)',
        },
      };
      markers.push(warningMarker);
      processedStopIds.add(currentSegment.fromStop.id);
    }
  }

  // Обработка последнего сегмента - End Marker
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.toStop && !processedStopIds.has(lastSegment.toStop.id)) {
    // TODO: Добавить отображение хабов (isHub, hubLevel) в маркеры прибытия
    const hubInfo = lastSegment.toStop.isHub && lastSegment.toStop.hubLevel
      ? `\n⭐ ${lastSegment.toStop.hubLevel === 'federal' ? 'Федеральный' : 'Региональный'} хаб`
      : '';
    
    const endMarker: IMapMarker = {
      id: lastSegment.toStop.id,
      coordinate: [lastSegment.toStop.latitude, lastSegment.toStop.longitude],
      type: 'end',
      name: lastSegment.toStop.name,
      cityName: lastSegment.toStop.cityName,
      time: lastSegment.schedule?.arrivalTime || lastSegment.arrivalTime,
      color: getMarkerColor('end'),
      icon: getMarkerIcon('end'),
      popupContent: `Прибытие: ${lastSegment.toStop.name}${hubInfo}\n${lastSegment.schedule?.arrivalTime || lastSegment.arrivalTime || ''}`,
      metadata: {
        segmentId: lastSegment.segmentId,
        isTransfer: false,
        isHub: lastSegment.toStop.isHub,
        hubLevel: lastSegment.toStop.hubLevel,
      },
    };
    markers.push(endMarker);
    processedStopIds.add(lastSegment.toStop.id);
  }

  return markers;
}




