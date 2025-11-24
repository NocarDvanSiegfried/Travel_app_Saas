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
  fitBounds: (bounds: [[number, number], [number, number]] | { getNorth: () => number; getSouth: () => number; getEast: () => number; getWest: () => number }, options?: { padding?: [number, number] }) => void;
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
  private currentTileLayer: { remove: () => void; on: (event: string, handler: (error: unknown, tile: unknown) => void) => void } | null = null; // Текущий слой тайлов
  private fallbackTileLayer: { addTo: (map: LeafletMap) => unknown } | null = null; // Fallback слой тайлов (CartoDB)
  private tileErrorCount = 0; // Счётчик ошибок загрузки тайлов
  private readonly MAX_TILE_ERRORS = 5; // Максимальное количество ошибок перед переключением на fallback
  private fallbackTimeout: NodeJS.Timeout | null = null; // Таймер для отложенного переключения на fallback

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
      if (process.env.NODE_ENV === 'development') {
        console.log('Loading Leaflet module...');
      }
      
      import('leaflet')
        .then((LModule) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Leaflet module loaded successfully');
          }
          
          const L = (LModule as { default?: unknown }).default || LModule;
          
          if (!L) {
            const error = new Error('Leaflet module loaded but L is undefined');
            console.error('Failed to load Leaflet:', error);
            reject(error);
            return;
          }
          
          // Сохраняем загруженный модуль для последующего использования
          this.leafletModule = L;
          
          // Сохраняем в window для глобального доступа
          if (typeof window !== 'undefined') {
            (window as unknown as { L?: unknown }).L = L;
          }

          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('Creating Leaflet map with options:', {
                containerId: options.containerId,
                center: options.center,
                zoom: options.zoom,
              });
            }
            const center: [number, number] = options.center || [62.0, 129.0];
            const zoom = options.zoom || 10;

            // Создаём карту
            const Leaflet = L as unknown as {
              map: (id: string, opts: unknown) => LeafletMap;
              tileLayer: (url: string, opts: unknown) => {
                addTo: (map: LeafletMap) => unknown;
                on: (event: string, handler: (error: unknown, tile: unknown) => void) => void;
                remove: () => void;
              };
            };
            
            this.map = Leaflet.map(options.containerId, {
              center,
              zoom,
              minZoom: options.minZoom,
              maxZoom: options.maxZoom,
              zoomControl: options.zoomControl !== false,
            });

            // Добавляем тайлы от стабильного провайдера (OpenStreetMap France)
            // Используем OpenStreetMap France как основной провайдер - стабильный, бесплатный, без ограничений
            const tileLayer = Leaflet.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap France contributors | © OpenStreetMap contributors',
              maxZoom: 20,
              subdomains: ['a', 'b', 'c'],
              detectRetina: true,
              errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Прозрачный fallback тайл
            });

            // Обработка ошибок загрузки тайлов с fallback на CartoDB
            tileLayer.on('tileerror', (error: unknown, tile: unknown) => {
              this.tileErrorCount++;
              
              console.warn(`LeafletMapProvider: Tile loading error (${this.tileErrorCount}/${this.MAX_TILE_ERRORS})`, {
                error,
                tile,
                tileUrl: (tile as { url?: string })?.url,
                errorCount: this.tileErrorCount,
              });

              // Если накопилось критическое количество ошибок, переключаемся на fallback провайдер
              // Используем задержку, чтобы дать Leaflet возможность повторить загрузку
              if (this.map && !this.fallbackTileLayer && this.tileErrorCount >= this.MAX_TILE_ERRORS) {
                // Очищаем предыдущий таймер, если он есть
                if (this.fallbackTimeout) {
                  clearTimeout(this.fallbackTimeout);
                }

                // Переключаемся на fallback через 2 секунды (даём время на retry)
                this.fallbackTimeout = setTimeout(() => {
                  if (this.map && !this.fallbackTileLayer) {
                    console.warn('LeafletMapProvider: Switching to fallback tile provider due to multiple errors');
                    this.createFallbackTileLayer(Leaflet);
                  }
                  this.fallbackTimeout = null;
                }, 2000);
              }
            });

            // Логирование успешной загрузки тайлов для мониторинга
            tileLayer.on('tileload', () => {
              // Сбрасываем счётчик ошибок при успешной загрузке
              if (this.tileErrorCount > 0) {
                this.tileErrorCount = Math.max(0, this.tileErrorCount - 1);
              }

              // Тайл успешно загружен (логируем только в dev режиме)
              if (process.env.NODE_ENV === 'development') {
                console.debug('LeafletMapProvider: Tile loaded successfully');
              }
            });

            tileLayer.addTo(this.map);
            this.currentTileLayer = tileLayer;

            // Подключаем события карты
            this.attachMapEvents();

            // Устанавливаем флаг готовности карты
            this.isMapReady = true;

            // Устанавливаем границы, если указаны (после установки isMapReady)
            // Используем небольшую задержку для гарантии, что карта полностью отрендерена
            if (options.bounds) {
              // Используем setTimeout для гарантии, что карта готова к установке bounds
              setTimeout(() => {
                if (this.map && this.isMapReady) {
                  this.setBounds(options.bounds);
                }
              }, 0);
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('Leaflet map initialized successfully', {
                containerId: options.containerId,
                isMapReady: this.isMapReady,
                hasMap: !!this.map,
              });
            }
            resolve();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('Error during Leaflet map creation:', error, {
              containerId: options.containerId,
              errorMessage,
              errorStack,
            });
            reject(error instanceof Error ? error : new Error(errorMessage));
          }
        })
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error('Failed to load Leaflet module:', error, {
            errorMessage,
            errorStack,
            isWindowDefined: typeof window !== 'undefined',
          });
          reject(new Error(`Failed to load Leaflet: ${errorMessage}`));
        });
    });
  }

  /**
   * Устанавливает границы карты
   * Использует fitBounds для подгонки карты под указанные границы
   */
  setBounds(bounds: IMapBounds, padding = 0): void {
    if (!this.map || !this.isMapReady) {
      console.warn('LeafletMapProvider.setBounds: Map is not initialized or not ready');
      return;
    }

    // Валидация bounds: проверяем, что bounds существуют
    if (!bounds) {
      console.warn('LeafletMapProvider.setBounds: Bounds are null or undefined');
      return;
    }

    // Валидация bounds: проверяем, что все значения являются числами и конечными
    const { north, south, east, west } = bounds;
    if (
      typeof north !== 'number' ||
      typeof south !== 'number' ||
      typeof east !== 'number' ||
      typeof west !== 'number' ||
      !Number.isFinite(north) ||
      !Number.isFinite(south) ||
      !Number.isFinite(east) ||
      !Number.isFinite(west)
    ) {
      console.warn('LeafletMapProvider.setBounds: Bounds contain invalid values', {
        north,
        south,
        east,
        west,
      });
      // Используем fallback - центрирование по центру bounds, если они частично валидны
      const centerLat = Number.isFinite(north) && Number.isFinite(south) ? (north + south) / 2 : 62.0;
      const centerLng = Number.isFinite(east) && Number.isFinite(west) ? (east + west) / 2 : 129.0;
      this.setCenter([centerLat, centerLng]);
      return;
    }

    // Валидация bounds: проверяем геометрию (north > south, east > west)
    if (north <= south || east <= west) {
      console.warn('LeafletMapProvider.setBounds: Invalid bounds geometry', {
        north,
        south,
        east,
        west,
        latDiff: north - south,
        lngDiff: east - west,
      });
      // Используем fallback - центрирование по центру bounds
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      this.setCenter([centerLat, centerLng]);
      return;
    }

    // Получаем Leaflet из кэша или window
    const L = this.getLeaflet();
    if (!L) {
      console.error('LeafletMapProvider.setBounds: Leaflet is not loaded');
      return;
    }

    try {
      // Создаём LatLngBounds объект для Leaflet
      const Leaflet = L as unknown as {
        latLngBounds: (southWest: [number, number], northEast: [number, number]) => {
          getNorth: () => number;
          getSouth: () => number;
          getEast: () => number;
          getWest: () => number;
        };
      };

      // Создаём bounds в формате Leaflet: [[south, west], [north, east]]
      const southWest: [number, number] = [south, west];
      const northEast: [number, number] = [north, east];
      
      // Используем LatLngBounds для создания правильного объекта bounds
      const leafletBounds = Leaflet.latLngBounds(southWest, northEast);

      // Проверяем, что bounds не слишком маленькие (минимальный размер 0.001 градуса)
      const latDiff = north - south;
      const lngDiff = east - west;
      const MIN_BOUNDS_SIZE = 0.001;

      if (latDiff < MIN_BOUNDS_SIZE || lngDiff < MIN_BOUNDS_SIZE) {
        console.warn('LeafletMapProvider.setBounds: Bounds are too small, using center instead', {
          latDiff,
          lngDiff,
        });
        // Используем fallback - центрирование по центру bounds
        const centerLat = (north + south) / 2;
        const centerLng = (east + west) / 2;
        this.setCenter([centerLat, centerLng]);
        return;
      }

      // Используем fitBounds вместо setBounds (Leaflet не имеет метода setBounds)
      const options = padding > 0 ? { padding: [padding, padding] as [number, number] } : undefined;
      this.map.fitBounds(leafletBounds, options);
    } catch (error) {
      console.error('LeafletMapProvider.setBounds: Error setting bounds', error, {
        bounds,
        padding,
        isMapReady: this.isMapReady,
        hasMap: !!this.map,
      });
      // Fallback: используем центрирование по центру bounds
      try {
        const centerLat = (north + south) / 2;
        const centerLng = (east + west) / 2;
        this.setCenter([centerLat, centerLng]);
      } catch (fallbackError) {
        console.error('LeafletMapProvider.setBounds: Fallback center also failed', fallbackError);
      }
    }
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
      zIndexOffset?: number;
    } = {
      iconUrl: options?.iconUrl || this.getDefaultMarkerIcon(options?.isTransfer),
      iconSize: options?.iconSize || [32, 32],
      iconAnchor: options?.iconAnchor || [16, 32],
      // Для transfer маркеров устанавливаем более высокий zIndex, чтобы они отображались поверх обычных
      zIndexOffset: options?.isTransfer ? 1000 : 0,
    };

    const icon = (L as { icon: (opts: unknown) => unknown }).icon(iconOptions);
    const marker = (L as { marker: (coords: [number, number], opts: { icon: unknown; zIndexOffset?: number }) => { addTo: (map: unknown) => LeafletMarker } }).marker([coordinate[0], coordinate[1]], { 
      icon,
      // Дополнительно устанавливаем zIndexOffset на уровне маркера для transfer точек
      zIndexOffset: options?.isTransfer ? 1000 : undefined,
    }).addTo(
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

    // Очищаем таймер fallback
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }

    // Сбрасываем счётчик ошибок
    this.tileErrorCount = 0;

    // Удаляем tile layers
    if (this.currentTileLayer) {
      try {
        this.currentTileLayer.remove();
      } catch (error) {
        console.warn('LeafletMapProvider: Error removing current tile layer on destroy', error);
      }
      this.currentTileLayer = null;
    }

    if (this.fallbackTileLayer) {
      try {
        (this.fallbackTileLayer as unknown as { remove: () => void }).remove();
      } catch (error) {
        console.warn('LeafletMapProvider: Error removing fallback tile layer on destroy', error);
      }
      this.fallbackTileLayer = null;
    }

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
   * Обновляет размеры карты (для Leaflet)
   * Полезно после изменения размеров контейнера
   */
  invalidateSize(): void {
    if (!this.map || !this.isMapReady) {
      return;
    }

    // Для Leaflet вызываем invalidateSize на нативном объекте карты
    const nativeMap = this.map as unknown as { invalidateSize?: () => void };
    if (nativeMap.invalidateSize) {
      nativeMap.invalidateSize();
    }
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
   * Создаёт fallback tile layer (CartoDB) при ошибках основного провайдера
   */
  private createFallbackTileLayer(Leaflet: {
    tileLayer: (url: string, opts: unknown) => {
      addTo: (map: LeafletMap) => unknown;
      on: (event: string, handler: (error: unknown, tile: unknown) => void) => void;
      remove: () => void;
    };
  }): void {
    if (!this.map || this.fallbackTileLayer) {
      return;
    }

    console.warn('LeafletMapProvider: Switching to fallback tile provider (CartoDB)');

    // Удаляем текущий слой тайлов
    if (this.currentTileLayer) {
      try {
        this.currentTileLayer.remove();
      } catch (error) {
        console.warn('LeafletMapProvider: Error removing current tile layer', error);
      }
    }

    // Создаём fallback слой (CartoDB Voyager - стабильный и бесплатный)
    const fallbackLayer = Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors | © CARTO',
      maxZoom: 20,
      subdomains: ['a', 'b', 'c', 'd'],
      detectRetina: true,
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    });

    // Обработка ошибок fallback слоя
    fallbackLayer.on('tileerror', (error: unknown, tile: unknown) => {
      console.error('LeafletMapProvider: Fallback tile layer also failed', {
        error,
        tile,
        tileUrl: (tile as { url?: string })?.url,
      });
    });

    fallbackLayer.addTo(this.map);
    this.fallbackTileLayer = fallbackLayer;
    this.currentTileLayer = fallbackLayer as unknown as { remove: () => void; on: (event: string, handler: (error: unknown, tile: unknown) => void) => void };
    
    // Вызываем invalidateSize после переключения на fallback, чтобы карта корректно обновилась
    // Это не мешает invalidateSize и fitBounds, а наоборот помогает им работать корректно
    if (this.map && this.isMapReady) {
      const nativeMap = this.map as unknown as { invalidateSize?: () => void };
      if (nativeMap.invalidateSize) {
        // Используем небольшую задержку для гарантии, что fallback слой полностью добавлен
        setTimeout(() => {
          if (nativeMap.invalidateSize) {
            nativeMap.invalidateSize();
          }
        }, 100);
      }
    }
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

