/**
 * Leaflet Map Provider
 * 
 * Реализация IMapProvider для Leaflet
 * 
 * Использует Leaflet для отображения карт с OpenStreetMap тайлами.
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
 * Типы для Leaflet
 */
type LeafletMap = {
  setView: (center: [number, number], zoom: number) => void;
  setBounds: (bounds: [[number, number], [number, number]], options?: { padding?: [number, number] }) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler?: () => void) => void;
  remove: () => void;
};

type LeafletMarker = {
  setLatLng: (coords: [number, number]) => void;
  bindPopup: (content: string) => LeafletMarker;
  unbindPopup: () => LeafletMarker;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler?: () => void) => void;
  remove: () => void;
};

type LeafletPolyline = {
  setLatLngs: (coords: [number, number][]) => void;
  setStyle: (options: Record<string, unknown>) => void;
  bindPopup: (content: string) => LeafletPolyline;
  unbindPopup: () => LeafletPolyline;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler?: () => void) => void;
  remove: () => void;
};

/**
 * Leaflet Map Provider Implementation
 */
export class LeafletMapProvider implements IMapProvider {
  private map: LeafletMap | null = null;
  private markers: Map<MarkerId, LeafletMarker> = new Map();
  private polylines: Map<PolylineId, LeafletPolyline> = new Map();
  private events: IMapEvents | null = null;
  private isMapReady = false;
  private markerCounter = 0;
  private polylineCounter = 0;
  private eventHandlers: Map<string, () => void> = new Map();
  private leafletModule: unknown | null = null; // Кэш для загруженного Leaflet модуля

  /**
   * Инициализирует карту Leaflet
   */
  async initialize(options: IMapInitOptions): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Leaflet can only be initialized in browser environment');
    }

    if (this.isMapReady && this.map) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Динамический импорт Leaflet (для SSR совместимости)
      import('leaflet')
        .then((LModule) => {
          const L = (LModule as { default?: unknown }).default || LModule;
          // Сохраняем загруженный модуль для последующего использования
          this.leafletModule = L;
          
          // Сохраняем в window для глобального доступа
          if (typeof window !== 'undefined') {
            (window as unknown as { L?: unknown }).L = L;
          }

          try {
            const center: [number, number] = options.center || [62.0, 129.0];
            const zoom = options.zoom || 10;

            // Создаём карту
            const Leaflet = L as unknown as {
              map: (id: string, opts: unknown) => LeafletMap;
              tileLayer: (url: string, opts: unknown) => { addTo: (map: LeafletMap) => unknown };
            };
            
            this.map = Leaflet.map(options.containerId, {
              center,
              zoom,
              minZoom: options.minZoom,
              maxZoom: options.maxZoom,
              zoomControl: options.zoomControl !== false,
            });

            // Добавляем тайлы OpenStreetMap
            Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
            }).addTo(this.map);

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
        })
        .catch((error) => {
          reject(new Error(`Failed to load Leaflet: ${error.message}`));
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

    const leafletBounds: [[number, number], [number, number]] = [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ];

    this.map.setBounds(leafletBounds, padding > 0 ? { padding: [padding, padding] } : undefined);
  }

  /**
   * Устанавливает центр карты
   */
  setCenter(center: Coordinate, zoom?: number): void {
    if (!this.map || !this.isMapReady) {
      return;
    }

    this.map.setView([center[0], center[1]], zoom || this.getZoom());
  }

  /**
   * Получает текущий центр карты
   */
  getCenter(): Coordinate {
    if (!this.map || !this.isMapReady) {
      return [62.0, 129.0];
    }

    const center = this.map.getCenter();
    return [center.lat, center.lng];
  }

  /**
   * Получает текущий уровень масштабирования
   */
  getZoom(): number {
    if (!this.map || !this.isMapReady) {
      return 10;
    }

    return this.map.getZoom();
  }

  /**
   * Добавляет маркер на карту
   */
  addMarker(coordinate: Coordinate, options?: IMarkerOptions): MarkerId {
    if (typeof window === 'undefined') {
      throw new Error('Leaflet can only be used in browser environment');
    }

    if (!this.map || !this.isMapReady) {
      throw new Error('Map is not initialized');
    }

    const markerId = `marker-${++this.markerCounter}`;

    // Получаем Leaflet из кэша или window
    const L = this.getLeaflet();
    if (!L) {
      throw new Error('Leaflet is not loaded. Call initialize() first.');
    }
    
    const iconOptions: {
      iconUrl: string;
      iconSize: [number, number];
      iconAnchor: [number, number];
    } = {
      iconUrl: options?.iconUrl || this.getDefaultMarkerIcon(options?.isTransfer),
      iconSize: options?.iconSize || [32, 32],
      iconAnchor: options?.iconAnchor || [16, 32],
    };

    const icon = (L as { icon: (opts: unknown) => unknown }).icon(iconOptions);
    const marker = (L as { marker: (coords: [number, number], opts: { icon: unknown }) => { addTo: (map: unknown) => LeafletMarker } }).marker([coordinate[0], coordinate[1]], { icon }).addTo(
      this.map as unknown
    ) as unknown as LeafletMarker;

    // Подключаем popup
    if (options?.popupContent) {
      marker.bindPopup(options.popupContent);
    }

    // Подключаем обработчик клика
    if (this.events?.onMarkerClick) {
      const clickHandler = () => {
        this.events?.onMarkerClick?.(markerId, coordinate);
      };
      marker.on('click', clickHandler);
      this.eventHandlers.set(`marker-${markerId}`, clickHandler);
    }

    this.markers.set(markerId, marker);

    return markerId;
  }

  /**
   * Удаляет маркер с карты
   */
  removeMarker(markerId: MarkerId): void {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.remove();
      this.markers.delete(markerId);

      // Удаляем обработчик событий
      const handler = this.eventHandlers.get(`marker-${markerId}`);
      if (handler) {
        marker.off('click', handler);
        this.eventHandlers.delete(`marker-${markerId}`);
      }
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
      marker.setLatLng([coordinate[0], coordinate[1]]);
    }

    if (options?.popupContent) {
      marker.unbindPopup();
      marker.bindPopup(options.popupContent);
    }
  }

  /**
   * Добавляет полилинию на карту
   */
  addPolyline(coordinates: Coordinate[], options?: IPolylineOptions): PolylineId {
    if (typeof window === 'undefined') {
      throw new Error('Leaflet can only be used in browser environment');
    }

    if (!this.map || !this.isMapReady) {
      throw new Error('Map is not initialized');
    }

    const polylineId = `polyline-${++this.polylineCounter}`;

    // Получаем Leaflet из кэша или window
    const L = this.getLeaflet();
    if (!L) {
      throw new Error('Leaflet is not loaded. Call initialize() first.');
    }

    const latlngs: [number, number][] = coordinates.map((coord) => [coord[0], coord[1]]);

    const polylineOptions: {
      color: string;
      weight: number;
      opacity: number;
    } = {
      color: options?.color || this.getDefaultColor(options?.transportType),
      weight: options?.weight || 3,
      opacity: options?.opacity || 0.8,
    };

    const polyline = (L as { polyline: (coords: [number, number][], opts: unknown) => { addTo: (map: unknown) => LeafletPolyline } }).polyline(latlngs, polylineOptions).addTo(this.map as unknown) as unknown as LeafletPolyline;

    // Подключаем popup
    if (options?.metadata?.hintContent) {
      polyline.bindPopup(options.metadata.hintContent as string);
    }

    // Подключаем обработчик клика
    if (this.events?.onPolylineClick) {
      const clickHandler = () => {
        this.events?.onPolylineClick?.(polylineId);
      };
      polyline.on('click', clickHandler);
      this.eventHandlers.set(`polyline-${polylineId}`, clickHandler);
    }

    this.polylines.set(polylineId, polyline);

    return polylineId;
  }

  /**
   * Удаляет полилинию с карты
   */
  removePolyline(polylineId: PolylineId): void {
    const polyline = this.polylines.get(polylineId);
    if (polyline) {
      polyline.remove();
      this.polylines.delete(polylineId);

      // Удаляем обработчик событий
      const handler = this.eventHandlers.get(`polyline-${polylineId}`);
      if (handler) {
        polyline.off('click', handler);
        this.eventHandlers.delete(`polyline-${polylineId}`);
      }
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
      const latlngs: [number, number][] = coordinates.map((coord) => [coord[0], coord[1]]);
      polyline.setLatLngs(latlngs);
    }

    if (options) {
      const styleOptions: Record<string, unknown> = {};
      if (options.color) styleOptions.color = options.color;
      if (options.weight) styleOptions.weight = options.weight;
      if (options.opacity) styleOptions.opacity = options.opacity;

      polyline.setStyle(styleOptions);
    }
  }

  /**
   * Очищает все маркеры и полилинии
   */
  clear(): void {
    // Удаляем все маркеры
    for (const [markerId] of this.markers) {
      this.removeMarker(markerId);
    }

    // Удаляем все полилинии
    for (const [polylineId] of this.polylines) {
      this.removePolyline(polylineId);
    }
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
    // Удаляем все обработчики событий карты
    for (const [eventName, handler] of this.eventHandlers) {
      if (eventName.startsWith('map-') && this.map) {
        this.map.off(eventName.replace('map-', ''), handler);
      }
    }

    this.events = null;
  }

  /**
   * Уничтожает карту
   */
  destroy(): void {
    this.clear();
    this.removeEvents();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

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
      const clickHandler = () => {
        const center = this.getCenter();
        this.events?.onClick?.(center);
      };
      this.map.on('click', clickHandler);
      this.eventHandlers.set('map-click', clickHandler);
    }

    if (this.events.onBoundsChange) {
      const boundsChangeHandler = () => {
        const bounds = this.getCurrentBounds();
        if (bounds) {
          this.events?.onBoundsChange?.(bounds);
        }
      };
      this.map.on('moveend', boundsChangeHandler);
      this.map.on('zoomend', boundsChangeHandler);
      this.eventHandlers.set('map-boundschange', boundsChangeHandler);
    }

    if (this.events.onCenterChange) {
      const centerChangeHandler = () => {
        const center = this.getCenter();
        this.events?.onCenterChange?.(center);
      };
      this.map.on('moveend', centerChangeHandler);
      this.eventHandlers.set('map-centerchange', centerChangeHandler);
    }

    if (this.events.onZoomChange) {
      const zoomChangeHandler = () => {
        const zoom = this.getZoom();
        this.events?.onZoomChange?.(zoom);
      };
      this.map.on('zoomend', zoomChangeHandler);
      this.eventHandlers.set('map-zoomchange', zoomChangeHandler);
    }
  }

  /**
   * Получает текущие границы карты
   */
  private getCurrentBounds(): IMapBounds | null {
    if (!this.map || !this.isMapReady) {
      return null;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const map = this.map as unknown as { getBounds: () => { getNorth: () => number; getSouth: () => number; getEast: () => number; getWest: () => number } };
      const bounds = map.getBounds();
      
      return {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Получает загруженный модуль Leaflet
   * Использует кэш или window.L
   */
  private getLeaflet(): unknown | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // Сначала пробуем кэш
    if (this.leafletModule) {
      return this.leafletModule;
    }

    // Затем пробуем window.L
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowL = (window as any).L;
    if (windowL) {
      this.leafletModule = windowL;
      return windowL;
    }

    return null;
  }

  /**
   * Получает иконку маркера по умолчанию
   */
  private getDefaultMarkerIcon(isTransfer?: boolean): string {
    if (isTransfer) {
      // Иконка для transfer точки (можно использовать кастомную)
      return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
    }
    // Стандартная иконка Leaflet
    return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
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

