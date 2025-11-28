/**
 * Стили для карты маршрутов
 * 
 * Определяет цвета, иконки и метки для различных типов транспорта.
 * 
 * @module routes/features/route-map/lib
 */

import { TransportType } from '../../../domain/types';

/**
 * Цвета для типов транспорта
 */
export const TRANSPORT_COLORS: Record<TransportType, string> = {
  [TransportType.AIRPLANE]: '#FF6B6B', // Красный
  [TransportType.BUS]: '#4ECDC4', // Бирюзовый
  [TransportType.TRAIN]: '#45B7D1', // Синий
  [TransportType.FERRY]: '#96CEB4', // Зелёный
  [TransportType.TAXI]: '#FFEAA7', // Жёлтый
  [TransportType.UNKNOWN]: '#95A5A6', // Серый
};

/**
 * Иконки для типов транспорта (emoji)
 */
export const TRANSPORT_ICONS: Record<TransportType, string> = {
  [TransportType.AIRPLANE]: '✈️',
  [TransportType.BUS]: '🚌',
  [TransportType.TRAIN]: '🚂',
  [TransportType.FERRY]: '⛴️',
  [TransportType.TAXI]: '🚕',
  [TransportType.UNKNOWN]: '🚌',
};

/**
 * Метки для типов транспорта (на русском)
 */
export const TRANSPORT_LABELS: Record<TransportType, string> = {
  [TransportType.AIRPLANE]: 'Самолёт',
  [TransportType.BUS]: 'Автобус',
  [TransportType.TRAIN]: 'Поезд',
  [TransportType.FERRY]: 'Паром',
  [TransportType.TAXI]: 'Такси',
  [TransportType.UNKNOWN]: 'Неизвестно',
};

/**
 * Цвета для маркеров
 */
export const MARKER_COLORS = {
  start: '#00CC66', // Зелёный
  end: '#FF0000', // Красный
  transfer: '#999999', // Серый
  segment: '#0066CC', // Синий
} as const;

/**
 * Иконки для маркеров (emoji)
 */
export const MARKER_ICONS = {
  start: '📍',
  end: '🏁',
  transfer: '🔄',
  segment: '📍',
} as const;

/**
 * Получает цвет для типа транспорта
 * 
 * @param transportType - Тип транспорта
 * @returns Цвет в формате hex
 */
export function getTransportColor(transportType: TransportType): string {
  return TRANSPORT_COLORS[transportType] || TRANSPORT_COLORS[TransportType.UNKNOWN];
}

/**
 * Получает иконку для типа транспорта
 * 
 * @param transportType - Тип транспорта
 * @returns Emoji иконка
 */
export function getTransportIcon(transportType: TransportType): string {
  return TRANSPORT_ICONS[transportType] || TRANSPORT_ICONS[TransportType.UNKNOWN];
}

/**
 * Получает метку для типа транспорта
 * 
 * @param transportType - Тип транспорта
 * @returns Название на русском
 */
export function getTransportLabel(transportType: TransportType): string {
  return TRANSPORT_LABELS[transportType] || TRANSPORT_LABELS[TransportType.UNKNOWN];
}

/**
 * Получает цвет для маркера
 * 
 * @param markerType - Тип маркера
 * @returns Цвет в формате hex
 */
export function getMarkerColor(markerType: keyof typeof MARKER_COLORS): string {
  return MARKER_COLORS[markerType];
}

/**
 * Получает иконку для маркера
 * 
 * @param markerType - Тип маркера
 * @returns Emoji иконка
 */
export function getMarkerIcon(markerType: keyof typeof MARKER_ICONS): string {
  return MARKER_ICONS[markerType];
}

/**
 * Получает опции стиля для полилинии
 * 
 * @param transportType - Тип транспорта
 * @param isHighlighted - Подсвечен ли сегмент (опционально)
 * @returns Опции стиля
 */
export function getPolylineStyle(
  transportType: TransportType,
  isHighlighted = false
): {
  color: string;
  weight: number;
  opacity: number;
} {
  return {
    color: getTransportColor(transportType),
    weight: isHighlighted ? 5 : 3,
    opacity: isHighlighted ? 1.0 : 0.8,
  };
}








