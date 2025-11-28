/**
 * Интерфейс провайдера карты
 * 
 * Абстракция для работы с различными картографическими сервисами
 * (Yandex Maps, Leaflet, Google Maps и т.д.)
 * 
 * Обеспечивает единый API для:
 * - Инициализации карты
 * - Добавления маркеров
 * - Добавления полилиний
 * - Управления границами карты
 * - Обработки событий
 * 
 * @module routes/lib
 */

import type {
  Coordinate,
  IMapInitOptions,
  IMapBounds,
  IMarkerOptions,
  IPolylineOptions,
  IMapEvents,
} from '../domain/map-types';

/**
 * Идентификатор маркера (возвращается при добавлении)
 */
export type MarkerId = string;

/**
 * Идентификатор полилинии (возвращается при добавлении)
 */
export type PolylineId = string;

/**
 * Интерфейс провайдера карты
 */
export interface IMapProvider {
  /**
   * Инициализирует карту в указанном контейнере
   * 
   * @param options - Опции инициализации карты
   * @returns Promise, который резолвится после инициализации
   */
  initialize(options: IMapInitOptions): Promise<void>;

  /**
   * Устанавливает границы карты
   * 
   * @param bounds - Границы карты
   * @param padding - Отступы в пикселях (опционально)
   */
  setBounds(bounds: IMapBounds, padding?: number): void;

  /**
   * Устанавливает центр карты
   * 
   * @param center - Координаты центра [широта, долгота]
   * @param zoom - Уровень масштабирования (опционально)
   */
  setCenter(center: Coordinate, zoom?: number): void;

  /**
   * Получает текущий центр карты
   * 
   * @returns Координаты центра [широта, долгота]
   */
  getCenter(): Coordinate;

  /**
   * Получает текущий уровень масштабирования
   * 
   * @returns Уровень масштабирования
   */
  getZoom(): number;

  /**
   * Добавляет маркер на карту
   * 
   * @param coordinate - Координаты маркера [широта, долгота]
   * @param options - Опции маркера
   * @returns Идентификатор маркера
   */
  addMarker(coordinate: Coordinate, options?: IMarkerOptions): MarkerId;

  /**
   * Удаляет маркер с карты
   * 
   * @param markerId - Идентификатор маркера
   */
  removeMarker(markerId: MarkerId): void;

  /**
   * Обновляет маркер
   * 
   * @param markerId - Идентификатор маркера
   * @param coordinate - Новые координаты (опционально)
   * @param options - Новые опции (опционально)
   */
  updateMarker(markerId: MarkerId, coordinate?: Coordinate, options?: IMarkerOptions): void;

  /**
   * Добавляет полилинию на карту
   * 
   * @param coordinates - Массив координат [широта, долгота][]
   * @param options - Опции полилинии
   * @returns Идентификатор полилинии
   */
  addPolyline(coordinates: Coordinate[], options?: IPolylineOptions): PolylineId;

  /**
   * Удаляет полилинию с карты
   * 
   * @param polylineId - Идентификатор полилинии
   */
  removePolyline(polylineId: PolylineId): void;

  /**
   * Обновляет полилинию
   * 
   * @param polylineId - Идентификатор полилинии
   * @param coordinates - Новые координаты (опционально)
   * @param options - Новые опции (опционально)
   */
  updatePolyline(polylineId: PolylineId, coordinates?: Coordinate[], options?: IPolylineOptions): void;

  /**
   * Очищает все маркеры и полилинии с карты
   */
  clear(): void;

  /**
   * Устанавливает обработчики событий
   * 
   * @param events - Объект с обработчиками событий
   */
  setEvents(events: IMapEvents): void;

  /**
   * Удаляет обработчики событий
   */
  removeEvents(): void;

  /**
   * Уничтожает карту и освобождает ресурсы
   */
  destroy(): void;

  /**
   * Проверяет, инициализирована ли карта
   * 
   * @returns true, если карта инициализирована
   */
  isInitialized(): boolean;

  /**
   * Получает экземпляр нативной карты (для расширенного использования)
   * 
   * @returns Нативный экземпляр карты (тип зависит от провайдера)
   */
  getNativeMap(): unknown;
}








