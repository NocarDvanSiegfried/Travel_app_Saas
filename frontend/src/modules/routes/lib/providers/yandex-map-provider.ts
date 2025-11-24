/**
 * Yandex Maps Provider
 * 
 * Реализация IMapProvider для Yandex Maps JavaScript API
 * 
 * Использует официальный Yandex Maps API для отображения карт.
 * 
 * @module routes/lib/providers
 */

import type { IMapProvider } from '../map-provider.interface';
import type {
  Coordinate,
  IMapInitOptions,
  IMapBounds,
  IMarkerOptions,
  IPolylineOptions,
  IMapEvents,
} from '../../domain/map-types';
import type { MarkerId, PolylineId } from '../map-provider.interface';

/**
 * Типы для Yandex Maps API
 */
declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void;
      Map: new (containerId: string, options: unknown) => unknown;
      Placemark: new (coords: number[], properties?: unknown, options?: unknown) => unknown;
      Polyline: new (coords: number[][], properties?: unknown, options?: unknown) => unknown;
      GeoObjectCollection: new () => unknown;
    };
  }
}

/**
 * Yandex Maps Provider Implementation
 */
export class YandexMapProvider implements IMapProvider {
  private map: unknown | null = null;
  private markers: Map<MarkerId, unknown> = new Map();
  private polylines: Map<PolylineId, unknown> = new Map();
  private geoObjects: unknown | null = null;
  private events: IMapEvents | null = null;
  private isMapReady = false;
  private markerCounter = 0;
  private polylineCounter = 0;

  /**
   * Инициализирует карту Yandex Maps
   */
  async initialize(options: IMapInitOptions): Promise<void> {
    if (this.isMapReady && this.map) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps API is not loaded. Please include the script tag.'));
        return;
      }

      window.ymaps.ready(() => {
        try {
          const mapOptions: Record<string, unknown> = {
            center: options.center || [62.0, 129.0],
            zoom: options.zoom || 10,
            controls: [],
          };

          if (options.minZoom !== undefined) {
            mapOptions.minZoom = options.minZoom;
          }

          if (options.maxZoom !== undefined) {
            mapOptions.maxZoom = options.maxZoom;
          }

          if (options.providerOptions) {
            Object.assign(mapOptions, options.providerOptions);
          }

          this.map = new window.ymaps!.Map(options.containerId, mapOptions);

          // Создаём коллекцию геообъектов
          this.geoObjects = new window.ymaps!.GeoObjectCollection();
          (this.map as { geoObjects: { add: (obj: unknown) => void } }).geoObjects.add(
            this.geoObjects as unknown
          );

          // Добавляем контролы
          if (options.zoomControl !== false) {
            (this.map as { controls: { add: (control: string) => void } }).controls.add('zoomControl');
          }

          if (options.navigationControl !== false && window.ymaps) {
            (this.map as { controls: { add: (control: string) => void } }).controls.add('geolocationControl');
          }

          // Устанавливаем границы, если указаны
          if (options.bounds) {
            this.setBounds(options.bounds);
          }

          // Подключаем события карты
          this.attachMapEvents();

          this.isMapReady = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Устанавливает границы карты
   */
  setBounds(bounds: IMapBounds, padding = 0): void {
    if (!this.map || !this.isMapReady) {
      return;
    }

    const mapBounds = [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ];

    (this.map as { setBounds: (bounds: number[][], options?: { padding?: number }) => void }).setBounds(
      mapBounds,
      padding > 0 ? { padding } : undefined
    );
  }

  /**
   * Устанавливает центр карты
   */
  setCenter(center: Coordinate, zoom?: number): void {
    if (!this.map || !this.isMapReady) {
      return;
    }

    (this.map as { setCenter: (center: number[], zoom?: number) => void }).setCenter(center, zoom);
  }

  /**
   * Получает текущий центр карты
   */
  getCenter(): Coordinate {
    if (!this.map || !this.isMapReady) {
      return [62.0, 129.0];
    }

    const center = (this.map as { getCenter: () => number[] }).getCenter();
    return [center[0], center[1]];
  }

  /**
   * Получает текущий уровень масштабирования
   */
  getZoom(): number {
    if (!this.map || !this.isMapReady) {
      return 10;
    }

    return (this.map as { getZoom: () => number }).getZoom();
  }

  /**
   * Добавляет маркер на карту
   */
  addMarker(coordinate: Coordinate, options?: IMarkerOptions): MarkerId {
    if (!this.map || !this.geoObjects || !this.isMapReady) {
      throw new Error('Map is not initialized');
    }

    const markerId = `marker-${++this.markerCounter}`;

    const properties: Record<string, unknown> = {
      balloonContent: options?.popupContent || '',
      hintContent: options?.popupContent || '',
    };

    if (options?.metadata) {
      Object.assign(properties, options.metadata);
    }

    const markerOptions: Record<string, unknown> = {
      iconLayout: 'default#image',
      iconImageHref: options?.iconUrl || this.getDefaultMarkerIcon(options?.isTransfer),
      iconImageSize: options?.iconSize || [32, 32],
      iconImageOffset: options?.iconAnchor || [-16, -16],
    };

    const marker = new window.ymaps!.Placemark(coordinate, properties, markerOptions);

    // Подключаем обработчик клика
    if (this.events?.onMarkerClick) {
      (marker as { events: { add: (event: string, handler: () => void) => void } }).events.add(
        'click',
        () => {
          this.events?.onMarkerClick?.(markerId, coordinate);
        }
      );
    }

    (this.geoObjects as { add: (obj: unknown) => void }).add(marker);
    this.markers.set(markerId, marker);

    return markerId;
  }

  /**
   * Удаляет маркер с карты
   */
  removeMarker(markerId: MarkerId): void {
    if (!this.geoObjects) {
      return;
    }

    const marker = this.markers.get(markerId);
    if (marker) {
      (this.geoObjects as { remove: (obj: unknown) => void }).remove(marker);
      this.markers.delete(markerId);
    }
  }

  /**
   * Обновляет маркер
   */
  updateMarker(markerId: MarkerId, coordinate?: Coordinate, options?: IMarkerOptions): void {
    const marker = this.markers.get(markerId);
    if (!marker) {
      return;
    }

    if (coordinate) {
      (marker as { geometry: { setCoordinates: (coords: number[]) => void } }).geometry.setCoordinates(
        coordinate
      );
    }

    if (options) {
      // Обновление свойств маркера
      if (options.popupContent) {
        (marker as { properties: { set: (key: string, value: unknown) => void } }).properties.set(
          'balloonContent',
          options.popupContent
        );
      }
    }
  }

  /**
   * Добавляет полилинию на карту
   */
  addPolyline(coordinates: Coordinate[], options?: IPolylineOptions): PolylineId {
    if (!this.map || !this.geoObjects || !this.isMapReady) {
      throw new Error('Map is not initialized');
    }

    const polylineId = `polyline-${++this.polylineCounter}`;

    const properties: Record<string, unknown> = {
      hintContent: options?.metadata?.hintContent || '',
    };

    if (options?.metadata) {
      Object.assign(properties, options.metadata);
    }

    const polylineOptions: Record<string, unknown> = {
      strokeColor: options?.color || this.getDefaultColor(options?.transportType),
      strokeWidth: options?.weight || 3,
      strokeOpacity: options?.opacity || 0.8,
    };

    const polyline = new window.ymaps!.Polyline(coordinates, properties, polylineOptions);

    // Подключаем обработчик клика
    if (this.events?.onPolylineClick) {
      (polyline as { events: { add: (event: string, handler: () => void) => void } }).events.add(
        'click',
        () => {
          this.events?.onPolylineClick?.(polylineId);
        }
      );
    }

    (this.geoObjects as { add: (obj: unknown) => void }).add(polyline);
    this.polylines.set(polylineId, polyline);

    return polylineId;
  }

  /**
   * Удаляет полилинию с карты
   */
  removePolyline(polylineId: PolylineId): void {
    if (!this.geoObjects) {
      return;
    }

    const polyline = this.polylines.get(polylineId);
    if (polyline) {
      (this.geoObjects as { remove: (obj: unknown) => void }).remove(polyline);
      this.polylines.delete(polylineId);
    }
  }

  /**
   * Обновляет полилинию
   */
  updatePolyline(polylineId: PolylineId, coordinates?: Coordinate[], options?: IPolylineOptions): void {
    const polyline = this.polylines.get(polylineId);
    if (!polyline) {
      return;
    }

    if (coordinates) {
      (polyline as { geometry: { setCoordinates: (coords: number[][]) => void } }).geometry.setCoordinates(
        coordinates
      );
    }

    if (options) {
      // Обновление стиля полилинии
      if (options.color) {
        (polyline as { options: { set: (key: string, value: unknown) => void } }).options.set(
          'strokeColor',
          options.color
        );
      }

      if (options.weight) {
        (polyline as { options: { set: (key: string, value: unknown) => void } }).options.set(
          'strokeWidth',
          options.weight
        );
      }
    }
  }

  /**
   * Очищает все маркеры и полилинии
   */
  clear(): void {
    if (!this.geoObjects) {
      return;
    }

    (this.geoObjects as { removeAll: () => void }).removeAll();
    this.markers.clear();
    this.polylines.clear();
  }

  /**
   * Устанавливает обработчики событий
   */
  setEvents(events: IMapEvents): void {
    this.events = events;
    this.attachMapEvents();
  }

  /**
   * Удаляет обработчики событий
   */
  removeEvents(): void {
    this.events = null;
  }

  /**
   * Уничтожает карту
   */
  destroy(): void {
    this.clear();
    this.removeEvents();

    if (this.map) {
      (this.map as { destroy: () => void }).destroy();
      this.map = null;
    }

    this.geoObjects = null;
    this.isMapReady = false;
  }

  /**
   * Проверяет, инициализирована ли карта
   */
  isInitialized(): boolean {
    return this.isMapReady && this.map !== null;
  }

  /**
   * Получает нативный экземпляр карты
   */
  getNativeMap(): unknown {
    return this.map;
  }

  /**
   * Подключает события карты
   */
  private attachMapEvents(): void {
    if (!this.map || !this.events) {
      return;
    }

    if (this.events.onClick) {
      (this.map as { events: { add: (event: string, handler: (e: { get: (key: string) => number[] }) => void) => void } }).events.add(
        'click',
        (e: { get: (key: string) => number[] }) => {
          const coords = e.get('coords');
          this.events?.onClick?.([coords[0], coords[1]]);
        }
      );
    }

    if (this.events.onBoundsChange) {
      (this.map as { events: { add: (event: string, handler: () => void) => void } }).events.add(
        'boundschange',
        () => {
          const bounds = this.getCurrentBounds();
          if (bounds) {
            this.events?.onBoundsChange?.(bounds);
          }
        }
      );
    }

    if (this.events.onCenterChange) {
      (this.map as { events: { add: (event: string, handler: () => void) => void } }).events.add(
        'actionend',
        () => {
          const center = this.getCenter();
          this.events?.onCenterChange?.(center);
        }
      );
    }

    if (this.events.onZoomChange) {
      (this.map as { events: { add: (event: string, handler: () => void) => void } }).events.add(
        'zoomchange',
        () => {
          const zoom = this.getZoom();
          this.events?.onZoomChange?.(zoom);
        }
      );
    }
  }

  /**
   * Получает текущие границы карты
   */
  private getCurrentBounds(): IMapBounds | null {
    if (!this.map || !this.isMapReady) {
      return null;
    }

    const bounds = (this.map as { getBounds: () => number[][] }).getBounds();
    return {
      north: bounds[1][0],
      south: bounds[0][0],
      east: bounds[1][1],
      west: bounds[0][1],
    };
  }

  /**
   * Получает иконку маркера по умолчанию
   */
  private getDefaultMarkerIcon(isTransfer?: boolean): string {
    if (isTransfer) {
      // Иконка для transfer точки
      return 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    }
    // Стандартная иконка Yandex Maps
    return 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
  }

  /**
   * Получает цвет по умолчанию для типа транспорта
   */
  private getDefaultColor(transportType?: string): string {
    switch (transportType) {
      case 'airplane':
        return '#FF6B6B';
      case 'bus':
        return '#4ECDC4';
      case 'train':
        return '#45B7D1';
      case 'ferry':
        return '#96CEB4';
      case 'taxi':
        return '#FFEAA7';
      default:
        return '#95A5A6';
    }
  }
}

