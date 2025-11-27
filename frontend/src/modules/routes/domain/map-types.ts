/**
 * Типы для работы с картами маршрутов
 * 
 * Определяет структуру данных для отображения маршрутов на карте,
 * включая сегменты, полилинии, маркеры и границы карты.
 * 
 * @module routes/domain
 */

import { TransportType } from './types';

/**
 * Координата [широта, долгота]
 */
export type Coordinate = [number, number];

/**
 * Данные остановки для карты
 * 
 * Поддерживает новые поля SmartRoute: isHub, hubLevel
 */
export interface IStopMapData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cityName: string;
  isTransfer: boolean;
  
  // Новые поля SmartRoute
  isHub?: boolean; // Является ли остановка хабом
  hubLevel?: 'federal' | 'regional'; // Уровень хаба
}

/**
 * Данные полилинии сегмента
 */
export interface IPolylineData {
  coordinates: Coordinate[];
}

/**
 * Данные сегмента маршрута для карты
 * 
 * Поддерживает как старый формат (polyline, distance, duration, price),
 * так и новый формат SmartRoute (pathGeometry, distance.value, duration.value, price.total)
 */
export interface IRouteSegmentMapData {
  segmentId: string;
  transportType: TransportType;
  fromStop: IStopMapData;
  toStop: IStopMapData;
  
  // Старый формат (для обратной совместимости)
  polyline?: IPolylineData;
  distance?: number; // км
  duration?: number; // минуты
  price?: number;
  
  // Новый формат SmartRoute
  pathGeometry?: Coordinate[]; // Реалистичный путь вместо прямой линии
  viaHubs?: Array<{ level: 'federal' | 'regional' }>; // Хабы через которые проходит маршрут
  isDirect?: boolean; // Прямой рейс (для авиа)
  
  // Новые структурированные поля
  distanceData?: {
    value: number;
    unit: string;
  };
  durationData?: {
    value: number; // минуты
    unit: string;
    display: string;
  };
  priceData?: {
    base: number;
    total: number;
    currency: string;
  };
  
  // Расписание
  schedule?: {
    departureTime?: string;
    arrivalTime?: string;
  };
  
  // Сезонность
  seasonality?: {
    available: boolean;
    season: string;
    period?: {
      start: string;
      end: string;
    };
  };
  
  // Валидация
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  
  // Старые поля для обратной совместимости
  departureTime?: string;
  arrivalTime?: string;
}

/**
 * Границы карты
 */
export interface IMapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Данные маршрута для карты (ответ от backend)
 * 
 * Поддерживает как старый формат, так и новый формат SmartRoute
 */
export interface IRouteMapData {
  routeId: string;
  fromCity: string;
  toCity: string;
  segments: IRouteSegmentMapData[];
  bounds: IMapBounds;
  
  // Старый формат (для обратной совместимости)
  totalDistance?: number; // км
  totalDuration?: number; // минуты
  
  // Новый формат SmartRoute
  totalDistanceData?: {
    value: number;
    unit: string;
  };
  totalDurationData?: {
    value: number; // минуты
    unit: string;
    display: string;
  };
  totalPriceData?: {
    base: number;
    total: number;
    currency: string;
    display: string;
  };
  
  // Валидация маршрута
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    segmentValidations?: Array<{
      segmentId: string;
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>;
  };
}

/**
 * Опции для отображения маркера
 */
export interface IMarkerOptions {
  /**
   * Текст для popup/tooltip
   */
  popupContent?: string;
  
  /**
   * Иконка маркера (URL или путь к иконке)
   */
  iconUrl?: string;
  
  /**
   * Размер иконки [ширина, высота]
   */
  iconSize?: [number, number];
  
  /**
   * Якорь иконки [x, y]
   */
  iconAnchor?: [number, number];
  
  /**
   * Является ли маркер transfer точкой
   */
  isTransfer?: boolean;
  
  /**
   * Дополнительные данные для маркера
   */
  metadata?: Record<string, unknown>;
}

/**
 * Опции для отображения полилинии
 */
export interface IPolylineOptions {
  /**
   * Цвет линии (hex или CSS color)
   */
  color?: string;
  
  /**
   * Ширина линии (в пикселях)
   */
  weight?: number;
  
  /**
   * Прозрачность (0-1)
   */
  opacity?: number;
  
  /**
   * Тип транспорта (для определения цвета по умолчанию)
   */
  transportType?: TransportType;
  
  /**
   * Дополнительные данные для полилинии
   */
  metadata?: Record<string, unknown>;
}

/**
 * Опции для инициализации карты
 */
export interface IMapInitOptions {
  /**
   * ID контейнера для карты
   */
  containerId: string;
  
  /**
   * Центр карты [широта, долгота]
   */
  center?: Coordinate;
  
  /**
   * Уровень масштабирования
   */
  zoom?: number;
  
  /**
   * Границы карты (если указаны, center и zoom игнорируются)
   */
  bounds?: IMapBounds;
  
  /**
   * Минимальный уровень масштабирования
   */
  minZoom?: number;
  
  /**
   * Максимальный уровень масштабирования
   */
  maxZoom?: number;
  
  /**
   * Включить контролы масштабирования
   */
  zoomControl?: boolean;
  
  /**
   * Включить контролы навигации
   */
  navigationControl?: boolean;
  
  /**
   * Дополнительные опции для конкретного провайдера
   */
  providerOptions?: Record<string, unknown>;
}

/**
 * События карты
 */
export interface IMapEvents {
  /**
   * Клик по карте
   */
  onClick?: (coordinate: Coordinate) => void;
  
  /**
   * Клик по маркеру
   */
  onMarkerClick?: (markerId: string, coordinate: Coordinate) => void;
  
  /**
   * Клик по полилинии
   */
  onPolylineClick?: (segmentId: string) => void;
  
  /**
   * Изменение границ карты (при перемещении/зуме)
   */
  onBoundsChange?: (bounds: IMapBounds) => void;
  
  /**
   * Изменение центра карты
   */
  onCenterChange?: (center: Coordinate) => void;
  
  /**
   * Изменение уровня масштабирования
   */
  onZoomChange?: (zoom: number) => void;
}




