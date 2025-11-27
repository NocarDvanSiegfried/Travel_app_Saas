/**
 * Компонент карты умного мультимодального маршрута
 * 
 * Отображает умный маршрут на интерактивной карте с правилами визуализации
 * для каждого типа транспорта (авиа, ЖД, автобус, паром, зимник, такси)
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import type { IMapProvider } from '../../../lib/map-provider.interface';
import { LeafletMapProvider } from '../../../lib/providers/leaflet-map-provider';
import { SmartRouteMapRenderer, type SmartRouteData } from '../lib/smart-route-map-renderer';
import { adaptSmartRouteToFrontend } from '../../../lib/smart-route-adapter';
import type { IMapBounds } from '../../../domain/map-types';

/**
 * Компонент легенды типов транспорта
 * Всегда видимый, не зависит от состояния карты
 */
const TransportLegend = memo(() => {
  return (
    <div className="absolute bottom-4 right-4 z-[100] bg-white rounded-lg shadow-lg p-4 pointer-events-none">
      <h4 className="text-sm font-semibold mb-2">Типы транспорта</h4>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#0066CC]"></div>
          <span>Самолёт</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#FF6600]"></div>
          <span>Поезд</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#00CC66]"></div>
          <span>Автобус</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#00CCFF]"></div>
          <span>Паром</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#FFCC00]"></div>
          <span>Такси</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 border-dashed border-[#CCCCCC] border-t"></div>
          <span>Зимник</span>
        </div>
      </div>
    </div>
  );
});

TransportLegend.displayName = 'TransportLegend';

/**
 * Тип ответа от API для умного маршрута
 */
interface SmartRouteApiResponse {
  success: boolean;
  route: {
    id: string;
    fromCity: {
      id: string;
      name: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    toCity: {
      id: string;
      name: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    segments: Array<{
      segmentId: string;
      type: string;
      from: {
        id: string;
        name: string;
        type: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        isHub?: boolean;
        hubLevel?: 'federal' | 'regional';
        cityId: string;
      };
      to: {
        id: string;
        name: string;
        type: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        isHub?: boolean;
        hubLevel?: 'federal' | 'regional';
        cityId: string;
      };
      distance: {
        value: number;
        unit: string;
      };
      duration: {
        value: number;
        unit: string;
        display: string;
      };
      price: {
        base: number;
        total: number;
        currency: string;
      };
      isDirect?: boolean;
      viaHubs?: Array<{
        level: 'federal' | 'regional';
      }>;
      pathGeometry?: {
        coordinates: Array<[number, number]>;
      };
      schedule?: {
        departureTime?: string;
        arrivalTime?: string;
      };
      seasonality?: {
        available: boolean;
        season: string;
      };
    }>;
    totalDistance: {
      value: number;
      unit: string;
    };
    totalDuration: {
      value: number;
      unit: string;
      display: string;
    };
    totalPrice: {
      base: number;
      total: number;
      currency: string;
      display: string;
    };
    validation?: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  };
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  alternatives?: Array<unknown>;
  executionTimeMs?: number;
}

interface SmartRouteMapProps {
  /**
   * Данные умного маршрута из API (опционально)
   */
  routeData?: SmartRouteApiResponse['route'] | null;

  /**
   * Полный ответ от API (опционально)
   */
  apiResponse?: SmartRouteApiResponse | null;

  /**
   * Состояние загрузки (опционально)
   */
  isLoading?: boolean;

  /**
   * Callback при клике на сегмент
   */
  onSegmentClick?: (segmentId: string) => void;

  /**
   * Callback при клике на маркер
   */
  onMarkerClick?: (markerId: string) => void;

  /**
   * Провайдер карты (опционально)
   */
  mapProvider?: IMapProvider;

  /**
   * CSS классы
   */
  className?: string;

  /**
   * Высота карты (по умолчанию 600px)
   */
  height?: string;

  /**
   * Показывать ли легенду (по умолчанию true)
   */
  showLegend?: boolean;

  /**
   * Показывать ли элементы управления (по умолчанию true)
   */
  showControls?: boolean;


  /**
   * Показывать ли общую информацию о маршруте (по умолчанию true)
   */
  showRouteSummary?: boolean;
}

/**
 * Компонент карты умного маршрута
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с картой умного маршрута
 */
export function SmartRouteMap({
  routeData,
  apiResponse,
  isLoading: externalIsLoading,
  onSegmentClick,
  onMarkerClick,
  mapProvider: externalMapProvider,
  className = '',
  height = '600px',
  showLegend = true,
  showControls = true,
  showRouteSummary = true,
}: SmartRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapProviderRef = useRef<IMapProvider | null>(null);
  const rendererRef = useRef<SmartRouteMapRenderer | null>(null);
  const [initError, setInitError] = useState<Error | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLeafletCssLoaded, setIsLeafletCssLoaded] = useState(false);
  const mapLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const containerIdRef = useRef<string | null>(null);
  const initMapCalledRef = useRef<boolean>(false);

  // Устанавливаем стабильный ID контейнера один раз при монтировании
  useLayoutEffect(() => {
    if (containerRef.current && !containerIdRef.current) {
      containerIdRef.current = containerRef.current.id || `smart-route-map-container-${Date.now()}`;
      containerRef.current.id = containerIdRef.current;
    }
  }, []);

  // Адаптируем данные маршрута из backend формата в frontend формат
  // КРИТИЧЕСКИЙ ФИКС: Добавляем детальное логирование и обработку ошибок
  // КРИТИЧЕСКИЙ ФИКС: Не блокируем рендеринг карты, если адаптация не удалась
  const frontendRouteData: SmartRouteData | null = useMemo(() => {
    if (!routeData && !apiResponse?.route) {
      console.warn('[SmartRouteMap] No route data available:', {
        hasRouteData: !!routeData,
        hasApiResponse: !!apiResponse,
        hasRouteInResponse: !!apiResponse?.route,
      });
      return null;
    }

    const backendRoute = routeData || apiResponse?.route;
    if (!backendRoute) {
      console.warn('[SmartRouteMap] Backend route is null or undefined');
      return null;
    }

    // КРИТИЧЕСКИЙ ФИКС: Проверяем, что это не INVALID_ROUTE_RESPONSE
    // Если apiResponse содержит ошибку валидации, не пытаемся адаптировать
    if (apiResponse?.validation && !apiResponse.validation.isValid && apiResponse.validation.errors.length > 0) {
      const hasInvalidResponseError = apiResponse.validation.errors.some(err => 
        err.toLowerCase().includes('invalid') || 
        err.toLowerCase().includes('неверный формат')
      );
      if (hasInvalidResponseError) {
        console.warn('[SmartRouteMap] Route has INVALID_ROUTE_RESPONSE error, skipping adaptation:', {
          errors: apiResponse.validation.errors,
        });
        return null;
      }
    }

    try {
      const adapted = adaptSmartRouteToFrontend(backendRoute as Parameters<typeof adaptSmartRouteToFrontend>[0]);
      if (!adapted) {
        console.warn('[SmartRouteMap] Adaptation returned null:', {
          backendRoute,
          routeId: (backendRoute as any)?.id,
        });
        // КРИТИЧЕСКИЙ ФИКС: Не устанавливаем initError здесь, чтобы карта могла инициализироваться без маршрута
        return null;
      }
      return adapted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SmartRouteMap] Error adapting smart route data:', errorMessage, {
        error,
        backendRoute,
        routeId: (backendRoute as any)?.id,
        segmentsCount: (backendRoute as any)?.segments?.length,
      });
      // КРИТИЧЕСКИЙ ФИКС: Не устанавливаем initError здесь, чтобы карта могла инициализироваться без маршрута
      // Ошибка адаптации не должна блокировать инициализацию карты
      return null;
    }
  }, [routeData, apiResponse]);

  // Загрузка Leaflet CSS для клиента
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const leafletCssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    const existingLink = document.querySelector(`link[href="${leafletCssUrl}"]`);

    if (existingLink) {
      setIsLeafletCssLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = leafletCssUrl;
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    link.setAttribute('data-leaflet-css', 'true');

    link.onload = () => setIsLeafletCssLoaded(true);
    link.onerror = () => {
      console.warn('Failed to load Leaflet CSS');
      setIsLeafletCssLoaded(true);
    };

    document.head.appendChild(link);
  }, []);


  // Инициализация карты - вызывается строго один раз
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isInitializedRef.current || isInitializingRef.current || initMapCalledRef.current) {
      return;
    }

    initMapCalledRef.current = true;

    const initMap = async () => {
      if (isInitializedRef.current || isInitializingRef.current) {
        return;
      }

      isInitializingRef.current = true;

      const waitForContainer = (): Promise<HTMLDivElement> => {
        return new Promise((resolve, reject) => {
          if (containerRef.current && document.contains(containerRef.current)) {
            if (containerIdRef.current && containerRef.current.id !== containerIdRef.current) {
              containerRef.current.id = containerIdRef.current;
            }
            resolve(containerRef.current);
            return;
          }

          const containerId = containerIdRef.current;
          if (containerId) {
            const found = document.getElementById(containerId) as HTMLDivElement;
            if (found) {
              containerRef.current = found;
              resolve(found);
              return;
            }
          }

          const foundContainer = document.querySelector('[data-testid="smart-route-map-container"]') as HTMLDivElement;
          if (foundContainer) {
            containerRef.current = foundContainer;
            if (containerIdRef.current && foundContainer.id !== containerIdRef.current) {
              foundContainer.id = containerIdRef.current;
            }
            resolve(foundContainer);
            return;
          }

          let attempts = 0;
          const maxAttempts = 60;
          
          containerCheckIntervalRef.current = setInterval(() => {
            attempts++;
            
            if (containerRef.current && document.contains(containerRef.current)) {
              if (containerCheckIntervalRef.current) {
                clearInterval(containerCheckIntervalRef.current);
                containerCheckIntervalRef.current = null;
              }
              if (containerIdRef.current && containerRef.current.id !== containerIdRef.current) {
                containerRef.current.id = containerIdRef.current;
              }
              resolve(containerRef.current);
              return;
            }

            if (containerId) {
              const found = document.getElementById(containerId) as HTMLDivElement;
              if (found) {
                if (containerCheckIntervalRef.current) {
                  clearInterval(containerCheckIntervalRef.current);
                  containerCheckIntervalRef.current = null;
                }
                containerRef.current = found;
                resolve(found);
                return;
              }
            }

            const found = document.querySelector('[data-testid="smart-route-map-container"]') as HTMLDivElement;
            if (found) {
              if (containerCheckIntervalRef.current) {
                clearInterval(containerCheckIntervalRef.current);
                containerCheckIntervalRef.current = null;
              }
              containerRef.current = found;
              if (containerIdRef.current && found.id !== containerIdRef.current) {
                found.id = containerIdRef.current;
              }
              resolve(found);
              return;
            }

            if (attempts >= maxAttempts) {
              if (containerCheckIntervalRef.current) {
                clearInterval(containerCheckIntervalRef.current);
                containerCheckIntervalRef.current = null;
              }
              reject(new Error('Container not found after maximum attempts'));
            }
          }, 100);
        });
      };

      try {
        const container = await waitForContainer();
        const containerId = containerIdRef.current!;

        if (mapLoadingTimeoutRef.current) {
          clearTimeout(mapLoadingTimeoutRef.current);
          mapLoadingTimeoutRef.current = null;
        }
        
        mapLoadingTimeoutRef.current = setTimeout(() => {
          isInitializingRef.current = false;
          setIsMapReady(false);
          setInitError(new Error('Карта не загрузилась за отведённое время (10 секунд)'));
          mapLoadingTimeoutRef.current = null;
        }, 10000);

        const mapProvider = externalMapProvider || new LeafletMapProvider();

        await mapProvider.initialize({
          containerId,
          center: [62.0, 129.0],
          zoom: 6,
          zoomControl: showControls,
          navigationControl: showControls,
        });

        if (mapLoadingTimeoutRef.current) {
          clearTimeout(mapLoadingTimeoutRef.current);
          mapLoadingTimeoutRef.current = null;
        }

        mapProviderRef.current = mapProvider;
        rendererRef.current = new SmartRouteMapRenderer(mapProvider);
        setIsMapReady(true);
        setInitError(null);
        
        isInitializedRef.current = true;
        isInitializingRef.current = false;

        // Обработчики событий будут установлены в отдельном useEffect

        if (frontendRouteData) {
          renderRoute(frontendRouteData);
        }
      } catch (error) {
        isInitializingRef.current = false;
        
        if (mapLoadingTimeoutRef.current) {
          clearTimeout(mapLoadingTimeoutRef.current);
          mapLoadingTimeoutRef.current = null;
        }

        const initError = error instanceof Error ? error : new Error(String(error));
        setInitError(new Error(`Ошибка инициализации карты: ${initError.message}`));
        setIsMapReady(false);
      }
    };

    const rafId = requestAnimationFrame(() => {
      if (isInitializedRef.current || isInitializingRef.current) {
        return;
      }
      initMap();
    });

    return () => {
      cancelAnimationFrame(rafId);

      if (mapLoadingTimeoutRef.current) {
        clearTimeout(mapLoadingTimeoutRef.current);
        mapLoadingTimeoutRef.current = null;
      }

      if (containerCheckIntervalRef.current) {
        clearInterval(containerCheckIntervalRef.current);
        containerCheckIntervalRef.current = null;
      }

      if (isInitializedRef.current) {
        if (rendererRef.current) {
          try {
            rendererRef.current.clearAll();
          } catch (error) {
            console.warn('[SmartRouteMap] Error clearing renderer:', error);
          }
        }
        if (mapProviderRef.current) {
          try {
            mapProviderRef.current.destroy();
          } catch (error) {
            console.warn('[SmartRouteMap] Error destroying map provider:', error);
          }
          mapProviderRef.current = null;
        }
        if (rendererRef.current) {
          rendererRef.current = null;
        }
        isInitializedRef.current = false;
      }
      
      isInitializingRef.current = false;
      initMapCalledRef.current = false;
    };
  }, []);

  // Обновление обработчиков событий без переинициализации карты
  // Мемоизируем обработчики для предотвращения лишних обновлений
  const handlePolylineClick = useCallback((segmentId: string) => {
    onSegmentClick?.(segmentId);
  }, [onSegmentClick]);

  const handleMarkerClick = useCallback((markerId: string) => {
    onMarkerClick?.(markerId);
  }, [onMarkerClick]);

  useEffect(() => {
    if (mapProviderRef.current && isInitializedRef.current) {
      mapProviderRef.current.setEvents({
        onPolylineClick: handlePolylineClick,
        onMarkerClick: handleMarkerClick,
      });
    }
  }, [handlePolylineClick, handleMarkerClick]);

  // Рендеринг маршрута - мемоизирован для предотвращения лишних перерендеров
  const renderRoute = useCallback(
    (route: SmartRouteData) => {
      if (!rendererRef.current || !mapProviderRef.current) {
        console.warn('[SmartRouteMap] Cannot render route: renderer or provider not ready', {
          hasRenderer: !!rendererRef.current,
          hasProvider: !!mapProviderRef.current,
        });
        return;
      }

      try {
        if (!route) {
          console.warn('[SmartRouteMap] Route is null or undefined, skipping render');
          return;
        }
        
        if (!route.segments) {
          console.warn('[SmartRouteMap] Route has no segments array, skipping render', {
            routeId: route.routeId,
          });
          return;
        }
        
        if (route.segments.length === 0) {
          console.warn('[SmartRouteMap] Route has no segments, skipping render', {
            routeId: route.routeId,
            segmentsCount: 0,
          });
          return;
        }

        // Проверка валидности координат всех сегментов
        const segmentsWithValidCoordinates = route.segments.filter((segment) => {
          if (!segment.from || !segment.to) {
            return false;
          }
          
          const fromValid = Array.isArray(segment.from) && 
                           segment.from.length === 2 &&
                           typeof segment.from[0] === 'number' &&
                           typeof segment.from[1] === 'number' &&
                           !isNaN(segment.from[0]) &&
                           !isNaN(segment.from[1]) &&
                           isFinite(segment.from[0]) &&
                           isFinite(segment.from[1]) &&
                           segment.from[0] >= -90 &&
                           segment.from[0] <= 90 &&
                           segment.from[1] >= -180 &&
                           segment.from[1] <= 180;
          
          const toValid = Array.isArray(segment.to) && 
                         segment.to.length === 2 &&
                         typeof segment.to[0] === 'number' &&
                         typeof segment.to[1] === 'number' &&
                         !isNaN(segment.to[0]) &&
                         !isNaN(segment.to[1]) &&
                         isFinite(segment.to[0]) &&
                         isFinite(segment.to[1]) &&
                         segment.to[0] >= -90 &&
                         segment.to[0] <= 90 &&
                         segment.to[1] >= -180 &&
                         segment.to[1] <= 180;
          
          return fromValid && toValid;
        });

        if (segmentsWithValidCoordinates.length === 0) {
          console.error('[SmartRouteMap] All segments have invalid coordinates, cannot render route', {
            routeId: route.routeId,
            totalSegments: route.segments.length,
          });
          return;
        }

        // Создаём маршрут только с валидными сегментами
        const validRoute: SmartRouteData = {
          ...route,
          segments: segmentsWithValidCoordinates,
        };

        // Очищаем предыдущий маршрут
        rendererRef.current.clearAll();

        // Рендерим новый маршрут
        const renderResult = rendererRef.current.renderRoute(validRoute);

        // Устанавливаем границы карты
        if (validRoute.bounds) {
          mapProviderRef.current.setBounds(validRoute.bounds, 50);
        } else {
          const allCoordinates = segmentsWithValidCoordinates.flatMap(seg => [
            seg.from,
            seg.to,
            ...(seg.pathGeometry || []),
          ]);
          
          if (allCoordinates.length > 0) {
            const latitudes = allCoordinates.map(c => c[0]);
            const longitudes = allCoordinates.map(c => c[1]);
            const computedBounds: IMapBounds = {
              north: Math.max(...latitudes),
              south: Math.min(...latitudes),
              east: Math.max(...longitudes),
              west: Math.min(...longitudes),
            };
            mapProviderRef.current.setBounds(computedBounds, 50);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SmartRouteMap] Error rendering route:', errorMessage, {
          routeId: route?.routeId,
          segmentsCount: route?.segments?.length,
        });
      }
    },
    []
  );

  // Обновление маршрута при изменении данных - только обновляет полилинии, не переинициализирует карту
  useEffect(() => {
    if (!isMapReady || !frontendRouteData || !rendererRef.current || !isInitializedRef.current) {
      return;
    }

    renderRoute(frontendRouteData);
  }, [frontendRouteData, isMapReady, renderRoute]);


  // Форматирование общей информации о маршруте - мемоизировано для предотвращения лишних перерендеров
  const routeSummary = useMemo(() => {
    if (!apiResponse?.route) {
      return null;
    }

    return {
      totalDistance: (apiResponse.route.totalDistance?.value ?? 0).toFixed(0),
      totalDuration: apiResponse.route.totalDuration?.display ?? (() => {
        const durationValue = apiResponse.route.totalDuration?.value ?? 0;
        const hours = Math.floor(durationValue / 60);
        const minutes = durationValue % 60;
        return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
      })(),
      totalPrice: apiResponse.route.totalPrice?.display ?? (() => {
        const priceValue = apiResponse.route.totalPrice?.total ?? 0;
        const currency = apiResponse.route.totalPrice?.currency ?? '₽';
        return `${priceValue.toFixed(0)}${currency}`;
      })(),
      totalDistanceUnit: apiResponse.route.totalDistance?.unit ?? 'км',
    };
  }, [apiResponse?.route]);

  return (
    <div className={`relative ${className}`} style={{ height }} data-testid="smart-route-map">
      {/* Контейнер карты - всегда рендерится с стабильным ID */}
      <div
        ref={containerRef}
        id={containerIdRef.current || undefined}
        className="w-full h-full"
        data-testid="smart-route-map-container"
      />

      {/* Overlay для ошибок */}
      {initError && !isInitializedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-md mx-4 pointer-events-auto">
            <div className="text-center">
              <p className="text-lg font-medium text-error mb-2">Ошибка инициализации карты</p>
              <p className="text-sm text-secondary mb-4">{initError.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay для загрузки - только если карта еще не инициализирована */}
      {!isInitializedRef.current && !isMapReady && !initError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-md mx-4 pointer-events-auto">
            <div className="text-center">
              <p className="text-lg font-medium">Загрузка карты...</p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay для отсутствия данных */}
      {!frontendRouteData && isMapReady && !initError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-md mx-4 pointer-events-auto">
            <p className="text-lg font-medium text-secondary mb-2">Маршрут не найден</p>
            <p className="text-sm text-secondary">
              {externalIsLoading 
                ? 'Загрузка данных маршрута...' 
                : 'Выберите маршрут для отображения на карте'}
            </p>
          </div>
        </div>
      )}

      {/* Overlay для отсутствия сегментов */}
      {frontendRouteData && (!frontendRouteData.segments || frontendRouteData.segments.length === 0) && isMapReady && !initError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-md mx-4 pointer-events-auto">
            <p className="text-lg font-medium text-secondary mb-2">Маршрут не содержит сегментов</p>
            <p className="text-sm text-secondary">
              Маршрут не может быть отображён, так как не содержит валидных сегментов.
            </p>
          </div>
        </div>
      )}

      {/* Общая информация о маршруте */}
      {showRouteSummary && routeSummary && (
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="text-lg font-semibold mb-2">Информация о маршруте</h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Расстояние:</strong> {routeSummary.totalDistance} {routeSummary.totalDistanceUnit}
            </p>
            <p>
              <strong>Время:</strong> {routeSummary.totalDuration}
            </p>
            <p>
              <strong>Цена:</strong> {routeSummary.totalPrice}
            </p>
          </div>
        </div>
      )}

      {/* Легенда - всегда видима, независимый компонент */}
      {showLegend && <TransportLegend />}

      {/* Индикатор валидации */}
      {apiResponse?.validation && !apiResponse.validation.isValid && (
        <div className="absolute top-4 right-4 z-10 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-xs">
          <p className="text-sm font-medium text-yellow-800">Предупреждения:</p>
          <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
            {apiResponse.validation.warnings.slice(0, 3).map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

