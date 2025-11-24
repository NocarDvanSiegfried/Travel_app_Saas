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
  private readonly TILE_LOAD_TIMEOUT = 4000; // Таймаут загрузки тайла в миллисекундах (4 секунды)
  private fallbackTimeout: NodeJS.Timeout | null = null; // Таймер для отложенного переключения на fallback
  private tileErrorTimestamps: number[] = []; // Временные метки ошибок для диагностики
  private tileLoadTimestamps: Map<string, number> = new Map(); // Временные метки начала загрузки тайлов
  private tileTimeoutTimers: Map<string, NodeJS.Timeout> = new Map(); // Таймеры таймаутов для каждого тайла
  private tileLoadDurations: number[] = []; // Длительности загрузки тайлов для диагностики

  /**
   * Диагностика DNS и скорости загрузки тайлов (только в dev-режиме)
   */
  private async diagnoseTileServer(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    console.log('[TILE DIAGNOSTICS] Starting tile server diagnostics...');

    const subdomains = ['a', 'b', 'c'];
    const baseUrl = 'tile.openstreetmap.fr';
    const testPath = '/osmfr/10/500/300.png';

    // Проверка DNS для каждого поддомена
    for (const subdomain of subdomains) {
      const hostname = `${subdomain}.${baseUrl}`;
      const fullUrl = `https://${hostname}${testPath}`;

      try {
        // Проверка DNS через fetch с коротким таймаутом
        const startTime = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache',
          });
          clearTimeout(timeoutId);
          const duration = performance.now() - startTime;

          console.log(`[TILE DIAGNOSTICS] ${hostname}`, {
            status: response.status,
            statusText: response.statusText,
            duration: `${duration.toFixed(2)}ms`,
            headers: {
              'content-type': response.headers.get('content-type'),
              'content-length': response.headers.get('content-length'),
            },
          });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          const duration = performance.now() - startTime;
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.warn(`[TILE DIAGNOSTICS] ${hostname} - Timeout after ${duration.toFixed(2)}ms`);
          } else {
            console.error(`[TILE DIAGNOSTICS] ${hostname} - Error`, {
              error: fetchError instanceof Error ? fetchError.message : String(fetchError),
              duration: `${duration.toFixed(2)}ms`,
            });
          }
        }
      } catch (error) {
        console.error(`[TILE DIAGNOSTICS] ${hostname} - Failed to test`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Проверка CartoDB fallback
    const cartoSubdomains = ['a', 'b', 'c', 'd'];
    const cartoBaseUrl = 'basemaps.cartocdn.com';
    const cartoTestPath = '/rastertiles/voyager/10/500/300.png';

    console.log('[TILE DIAGNOSTICS] Testing CartoDB fallback...');
    for (const subdomain of cartoSubdomains.slice(0, 2)) {
      const hostname = `${subdomain}.${cartoBaseUrl}`;
      const fullUrl = `https://${hostname}${cartoTestPath}`;

      try {
        const startTime = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache',
          });
          clearTimeout(timeoutId);
          const duration = performance.now() - startTime;

          console.log(`[TILE DIAGNOSTICS] CartoDB ${hostname}`, {
            status: response.status,
            duration: `${duration.toFixed(2)}ms`,
          });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          const duration = performance.now() - startTime;
          console.warn(`[TILE DIAGNOSTICS] CartoDB ${hostname} - Error`, {
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            duration: `${duration.toFixed(2)}ms`,
          });
        }
      } catch (error) {
        console.error(`[TILE DIAGNOSTICS] CartoDB ${hostname} - Failed to test`, error);
      }
    }
  }

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
              const now = Date.now();
              const tileUrl = (tile as { url?: string })?.url || 'unknown';
              
              this.tileErrorCount++;
              this.tileErrorTimestamps.push(now);
              
              // Очищаем старые метки (старше 10 секунд)
              this.tileErrorTimestamps = this.tileErrorTimestamps.filter(ts => now - ts < 10000);
              
              // Подсчитываем ошибки за последнюю секунду
              const errorsInLastSecond = this.tileErrorTimestamps.filter(ts => now - ts < 1000).length;
              
              // Диагностическое логирование в dev-режиме
              if (process.env.NODE_ENV === 'development') {
                const loadStartTime = this.tileLoadTimestamps.get(tileUrl);
                const loadDuration = loadStartTime ? now - loadStartTime : null;
                
                console.warn(`[TILE DIAGNOSTICS] Tile error #${this.tileErrorCount}/${this.MAX_TILE_ERRORS}`, {
                  tileUrl,
                  error: error instanceof Error ? error.message : String(error),
                  errorType: error instanceof Error ? error.constructor.name : typeof error,
                  errorCount: this.tileErrorCount,
                  errorsInLastSecond,
                  errorsInLast10Seconds: this.tileErrorTimestamps.length,
                  loadDuration: loadDuration !== null ? `${loadDuration}ms` : 'unknown',
                  timestamp: new Date(now).toISOString(),
                  willTriggerFallback: this.tileErrorCount >= this.MAX_TILE_ERRORS,
                });
              } else {
                console.warn(`LeafletMapProvider: Tile loading error (${this.tileErrorCount}/${this.MAX_TILE_ERRORS})`, {
                  error,
                  tile,
                  tileUrl,
                  errorCount: this.tileErrorCount,
                });
              }
              
              // Удаляем метку загрузки
              this.tileLoadTimestamps.delete(tileUrl);

              // Обрабатываем ошибку и проверяем необходимость fallback
              this.handleTileError(Leaflet);
            });

            // Логирование успешной загрузки тайлов для мониторинга
            tileLayer.on('tileload', (event: unknown) => {
              const now = Date.now();
              const tileUrl = (event as { tile?: { url?: string } })?.tile?.url || 'unknown';
              
              // Очищаем таймаут для этого тайла
              const timeoutId = this.tileTimeoutTimers.get(tileUrl);
              if (timeoutId) {
                clearTimeout(timeoutId);
                this.tileTimeoutTimers.delete(tileUrl);
              }
              
              // Сбрасываем счётчик ошибок при успешной загрузке
              if (this.tileErrorCount > 0) {
                this.tileErrorCount = Math.max(0, this.tileErrorCount - 1);
              }

              // Диагностическое логирование в dev-режиме
              if (process.env.NODE_ENV === 'development') {
                const loadStartTime = this.tileLoadTimestamps.get(tileUrl);
                const loadDuration = loadStartTime ? now - loadStartTime : null;
                
                if (loadDuration !== null) {
                  this.tileLoadDurations.push(loadDuration);
                  // Храним только последние 100 значений
                  if (this.tileLoadDurations.length > 100) {
                    this.tileLoadDurations.shift();
                  }
                  
                  // Проверяем, не медленный ли сервер (среднее время > 2 секунды)
                  const avgDuration = this.tileLoadDurations.reduce((a, b) => a + b, 0) / this.tileLoadDurations.length;
                  if (avgDuration > 2000 && this.tileLoadDurations.length >= 5) {
                    console.warn('[TILE SERVER SLOW]', {
                      averageLoadTime: `${avgDuration.toFixed(2)}ms`,
                      sampleSize: this.tileLoadDurations.length,
                      currentTileDuration: `${loadDuration}ms`,
                    });
                  }
                }
                
                console.debug('[TILE LOAD OK]', {
                  tileUrl,
                  loadDuration: loadDuration !== null ? `${loadDuration}ms` : 'unknown',
                  timestamp: new Date(now).toISOString(),
                  currentErrorCount: this.tileErrorCount,
                });
              }
              
              // Удаляем метку загрузки
              this.tileLoadTimestamps.delete(tileUrl);
            });
            
            // Отслеживаем начало загрузки тайлов для измерения времени и установки таймаута
            tileLayer.on('tileloadstart', (event: unknown) => {
              const tileUrl = (event as { tile?: { url?: string } })?.tile?.url || 'unknown';
              const now = Date.now();
              
              this.tileLoadTimestamps.set(tileUrl, now);
              
              // Диагностическое логирование в dev-режиме
              if (process.env.NODE_ENV === 'development') {
                console.debug('[TILE LOAD START]', {
                  tileUrl,
                  timestamp: new Date(now).toISOString(),
                });
              }
              
              // Устанавливаем таймаут для этого тайла
              const timeoutId = setTimeout(() => {
                // Проверяем, не загрузился ли тайл за это время
                if (this.tileLoadTimestamps.has(tileUrl)) {
                  // Тайл не загрузился вовремя - обрабатываем как ошибку
                  this.handleTileTimeout(tileUrl, Leaflet);
                }
                this.tileTimeoutTimers.delete(tileUrl);
              }, this.TILE_LOAD_TIMEOUT);
              
              this.tileTimeoutTimers.set(tileUrl, timeoutId);
            });

            tileLayer.addTo(this.map);
            this.currentTileLayer = tileLayer;

            // Запускаем диагностику tile-сервера в dev-режиме
            if (process.env.NODE_ENV === 'development') {
              // Запускаем диагностику асинхронно, не блокируя инициализацию
              this.diagnoseTileServer().catch((error) => {
                console.warn('[TILE DIAGNOSTICS] Diagnostic failed', error);
              });
            }

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

    // Очищаем все таймеры таймаутов тайлов
    for (const [tileUrl, timeoutId] of this.tileTimeoutTimers) {
      clearTimeout(timeoutId);
    }
    this.tileTimeoutTimers.clear();

    // Сбрасываем счётчик ошибок
    this.tileErrorCount = 0;
    this.tileErrorTimestamps = [];
    this.tileLoadTimestamps.clear();
    this.tileLoadDurations = [];

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
   * Обрабатывает таймаут загрузки тайла
   */
  private handleTileTimeout(tileUrl: string, Leaflet: {
    tileLayer: (url: string, opts: unknown) => {
      addTo: (map: LeafletMap) => unknown;
      on: (event: string, handler: (error: unknown, tile: unknown) => void) => void;
      remove: () => void;
    };
  }): void {
    const now = Date.now();
    const loadStartTime = this.tileLoadTimestamps.get(tileUrl);
    const loadDuration = loadStartTime ? now - loadStartTime : null;
    
    // Диагностическое логирование в dev-режиме
    if (process.env.NODE_ENV === 'development') {
      console.warn('[TILE TIMEOUT]', {
        tileUrl,
        timeout: `${this.TILE_LOAD_TIMEOUT}ms`,
        loadDuration: loadDuration !== null ? `${loadDuration}ms` : 'unknown',
        timestamp: new Date(now).toISOString(),
      });
    }
    
    // Обрабатываем таймаут как ошибку
    this.tileErrorCount++;
    this.tileErrorTimestamps.push(now);
    
    // Очищаем старые метки (старше 10 секунд)
    this.tileErrorTimestamps = this.tileErrorTimestamps.filter(ts => now - ts < 10000);
    
    // Удаляем метку загрузки
    this.tileLoadTimestamps.delete(tileUrl);
    
    // Обрабатываем ошибку и проверяем необходимость fallback
    this.handleTileError(Leaflet);
  }

  /**
   * Обрабатывает ошибку тайла и активирует fallback при необходимости
   */
  private handleTileError(Leaflet: {
    tileLayer: (url: string, opts: unknown) => {
      addTo: (map: LeafletMap) => unknown;
      on: (event: string, handler: (error: unknown, tile: unknown) => void) => void;
      remove: () => void;
    };
  }): void {
    // Если накопилось критическое количество ошибок, переключаемся на fallback провайдер немедленно
    if (this.map && !this.fallbackTileLayer && this.tileErrorCount >= this.MAX_TILE_ERRORS) {
      // Очищаем предыдущий таймер fallback, если он есть
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
        this.fallbackTimeout = null;
      }

      const errorsInLastSecond = this.tileErrorTimestamps.filter(ts => Date.now() - ts < 1000).length;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[TILE FALLBACK ACTIVATED]', {
          errorCount: this.tileErrorCount,
          errorsInLastSecond,
          errorsInLast10Seconds: this.tileErrorTimestamps.length,
          timestamp: new Date().toISOString(),
        });
      }

      // Немедленно переключаемся на fallback (без задержки)
      this.createFallbackTileLayer(Leaflet);
    }
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

    if (process.env.NODE_ENV === 'development') {
      console.warn('[TILE FALLBACK ACTIVATED] Switching to fallback tile provider (CartoDB)', {
        errorCount: this.tileErrorCount,
        errorsInLastSecond: this.tileErrorTimestamps.filter(ts => Date.now() - ts < 1000).length,
        errorsInLast10Seconds: this.tileErrorTimestamps.length,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('LeafletMapProvider: Switching to fallback tile provider (CartoDB)');
    }

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

    // Добавляем таймауты для fallback слоя тоже
    fallbackLayer.on('tileloadstart', (event: unknown) => {
      const tileUrl = (event as { tile?: { url?: string } })?.tile?.url || 'unknown';
      const now = Date.now();
      
      this.tileLoadTimestamps.set(tileUrl, now);
      
      // Устанавливаем таймаут для fallback тайла
      const timeoutId = setTimeout(() => {
        if (this.tileLoadTimestamps.has(tileUrl)) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TILE TIMEOUT] Fallback tile timeout', {
              tileUrl,
              timeout: `${this.TILE_LOAD_TIMEOUT}ms`,
            });
          }
        }
        this.tileTimeoutTimers.delete(tileUrl);
      }, this.TILE_LOAD_TIMEOUT);
      
      this.tileTimeoutTimers.set(tileUrl, timeoutId);
    });

    fallbackLayer.on('tileload', (event: unknown) => {
      const tileUrl = (event as { tile?: { url?: string } })?.tile?.url || 'unknown';
      
      // Очищаем таймаут для этого тайла
      const timeoutId = this.tileTimeoutTimers.get(tileUrl);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.tileTimeoutTimers.delete(tileUrl);
      }
      
      // Удаляем метку загрузки
      this.tileLoadTimestamps.delete(tileUrl);
    });

    fallbackLayer.addTo(this.map);
    this.fallbackTileLayer = fallbackLayer;
    this.currentTileLayer = fallbackLayer as unknown as { remove: () => void; on: (event: string, handler: (error: unknown, tile: unknown) => void) => void };
    
    // Диагностическое логирование активации fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('[TILE FALLBACK ACTIVATED] Fallback tile layer activated', {
        provider: 'CartoDB Voyager',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        timestamp: new Date().toISOString(),
        previousErrorCount: this.tileErrorCount,
        errorsInLastSecond: this.tileErrorTimestamps.filter(ts => Date.now() - ts < 1000).length,
        errorsInLast10Seconds: this.tileErrorTimestamps.length,
      });
    }
    
    // Немедленно вызываем invalidateSize после переключения на fallback
    if (this.map && this.isMapReady) {
      const nativeMap = this.map as unknown as { invalidateSize?: () => void };
      if (nativeMap.invalidateSize) {
        // Вызываем сразу, без задержки
        nativeMap.invalidateSize();
        
        // Дополнительный вызов через requestAnimationFrame для гарантии
        requestAnimationFrame(() => {
          if (nativeMap.invalidateSize) {
            nativeMap.invalidateSize();
          }
        });
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

