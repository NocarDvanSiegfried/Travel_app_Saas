/**
 * Компонент карты с поддержкой альтернативных маршрутов
 * 
 * Расширенная версия RouteMap, которая поддерживает переключение между
 * альтернативными маршрутами с плавной анимацией и сохранением позиции карты.
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { RouteMapSwitcher } from './route-map-switcher';
import type { IBuiltRoute } from '../../../domain/types';
import { safeLocalStorage } from '@/shared/utils/storage';

interface RouteMapWithAlternativesProps {
  /**
   * ID основного маршрута
   */
  primaryRouteId: string;
  
  /**
   * Массив альтернативных маршрутов (опционально, загружается из localStorage если не указан)
   */
  routes?: IBuiltRoute[];
  
  /**
   * Высота карты (по умолчанию 600px)
   */
  height?: string;
  
  /**
   * Показывать ли легенду (по умолчанию true)
   */
  showLegend?: boolean;
  
  /**
   * Сохранять ли позицию карты при переключении (по умолчанию false)
   */
  preserveMapPosition?: boolean;
  
  /**
   * Тип провайдера карты ('yandex' | 'leaflet', по умолчанию 'yandex')
   */
  providerType?: 'yandex' | 'leaflet';
  
  /**
   * Callback при переключении маршрута
   */
  onRouteChange?: (routeIndex: number, route: IBuiltRoute) => void;
}

/**
 * Компонент карты с поддержкой альтернативных маршрутов
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с картой и переключателем маршрутов
 */
export function RouteMapWithAlternatives({
  primaryRouteId,
  routes: externalRoutes,
  height = '600px',
  showLegend = true,
  preserveMapPosition = false,
  providerType = 'yandex',
  onRouteChange,
}: RouteMapWithAlternativesProps) {
  const [routes, setRoutes] = useState<IBuiltRoute[]>(externalRoutes || []);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [loading, setLoading] = useState(!externalRoutes);
  const [isOldFormat, setIsOldFormat] = useState(false);

  // Загрузка маршрутов из localStorage
  useEffect(() => {
    if (externalRoutes && externalRoutes.length > 0) {
      setRoutes(externalRoutes);
      setIsOldFormat(false); // Сбрасываем флаг при загрузке внешних маршрутов
      setLoading(false);
      return;
    }

    if (!primaryRouteId) {
      setIsOldFormat(false);
      setLoading(false);
      return;
    }

    try {
      setIsOldFormat(false); // Сбрасываем флаг в начале загрузки
      // ФАЗА 4: Загружаем основной маршрут с fallback механизмом
      let primaryData = safeLocalStorage.getItem(`route-${primaryRouteId}`);
      
      // Если маршрут не найден по основному ключу, ищем по другим ключам
      if (!primaryData) {
        console.warn('[RouteMapWithAlternatives] Route not found by primary key, searching alternatives:', {
          primaryRouteId,
        });
        
        // Пытаемся найти маршрут по другим ключам
        if (typeof window !== 'undefined' && localStorage) {
          const allKeys = Object.keys(localStorage);
          const routeKey = allKeys.find(key => 
            key.startsWith('route-') && 
            (key.includes(primaryRouteId) || key.endsWith(`-${primaryRouteId}`))
          );
          
          if (routeKey) {
            console.log('[RouteMapWithAlternatives] Found route by alternative key:', routeKey);
            primaryData = safeLocalStorage.getItem(routeKey);
          }
        }
      }
      
      if (!primaryData) {
        console.error('[RouteMapWithAlternatives] Route not found in localStorage:', {
          primaryRouteId,
          storageKey: `route-${primaryRouteId}`,
        });
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Валидация и безопасный парсинг данных маршрута
      let parsedPrimary: { route: IBuiltRoute } | null = null;
      try {
        parsedPrimary = JSON.parse(primaryData);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('[RouteMapWithAlternatives] Failed to parse route data from localStorage:', {
          primaryRouteId,
          storageKey: `route-${primaryRouteId}`,
          error: parseError,
          errorMessage,
          dataLength: primaryData.length,
          dataPreview: primaryData.substring(0, 100),
        });
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Валидация структуры данных после парсинга
      if (!parsedPrimary || typeof parsedPrimary !== 'object') {
        console.error('[RouteMapWithAlternatives] Invalid route data structure: not an object:', {
          primaryRouteId,
          parsedType: typeof parsedPrimary,
          parsedValue: parsedPrimary,
        });
        setLoading(false);
        return;
      }

      if (!parsedPrimary.route || typeof parsedPrimary.route !== 'object') {
        console.error('[RouteMapWithAlternatives] Invalid route data structure: missing or invalid route:', {
          primaryRouteId,
          hasRoute: !!parsedPrimary.route,
          routeType: typeof parsedPrimary.route,
        });
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Проверяем наличие обязательных полей
      const route = parsedPrimary.route;
      if (!route.routeId && primaryRouteId) {
        route.routeId = primaryRouteId;
      }

      // ФАЗА 6 ФИКС: Валидация обязательных полей маршрута
      if (!route.routeId) {
        console.error('[RouteMapWithAlternatives] Route missing routeId:', {
          primaryRouteId,
          routeKeys: Object.keys(route),
        });
        setLoading(false);
        return;
      }

      // КРИТИЧЕСКИЙ ФИКС: Проверяем формат маршрута (старый или новый SmartRoute)
      const routeIsOldFormat = route.segments?.some(seg => {
        const segment = seg.segment || seg;
        // Старый формат: есть fromStopId/toStopId, но нет координат и pathGeometry
        return segment.fromStopId && segment.toStopId && 
               !segment.from?.coordinates && 
               !segment.to?.coordinates && 
               !segment.pathGeometry;
      });

      if (routeIsOldFormat) {
        setIsOldFormat(true);
        console.warn('[RouteMapWithAlternatives] Route is in old format (no SmartRoute data):', {
          routeId: route.routeId,
          fromCity: route.fromCity,
          toCity: route.toCity,
          segmentsCount: route.segments?.length || 0,
          message: 'Old format routes do not contain coordinates and pathGeometry. Map may not display correctly.',
          recommendation: 'Please perform a new route search to get SmartRoute data with coordinates.',
        });
        // Продолжаем загрузку, но карта может не отобразиться корректно
      } else {
        setIsOldFormat(false);
      }

      // ФАЗА 6 ФИКС: Проверяем наличие сегментов (может быть пустым массивом, но должно быть массивом)
      if (!Array.isArray(route.segments)) {
        console.warn('[RouteMapWithAlternatives] Route segments is not an array, setting to empty array:', {
          routeId: route.routeId,
          segmentsType: typeof route.segments,
          segmentsValue: route.segments,
        });
        route.segments = [];
      }
      
      const loadedRoutes: IBuiltRoute[] = [route];

      // ФАЗА 6 ФИКС: Пытаемся загрузить альтернативные маршруты с улучшенной валидацией
      // Альтернативы могут храниться в том же ключе или в отдельных ключах
      const alternativesKey = `route-${primaryRouteId}-alternatives`;
      const alternativesData = safeLocalStorage.getItem(alternativesKey);
      
      if (alternativesData) {
        try {
          const parsedAlternatives: { routes: IBuiltRoute[] } = JSON.parse(alternativesData);
          
          // ФАЗА 6 ФИКС: Валидация структуры альтернативных маршрутов
          if (!parsedAlternatives || typeof parsedAlternatives !== 'object') {
            console.warn('[RouteMapWithAlternatives] Invalid alternatives data structure:', {
              primaryRouteId,
              parsedType: typeof parsedAlternatives,
            });
          } else if (parsedAlternatives.routes && Array.isArray(parsedAlternatives.routes)) {
            // ФАЗА 6 ФИКС: Валидация каждого альтернативного маршрута
            const validatedAlternatives = parsedAlternatives.routes
              .filter((altRoute, index) => {
                // Проверяем, что это объект
                if (!altRoute || typeof altRoute !== 'object') {
                  console.warn('[RouteMapWithAlternatives] Invalid alternative route (not an object):', {
                    index,
                    routeType: typeof altRoute,
                  });
                  return false;
                }
                return true;
              })
              .map((altRoute, index) => {
                // Если альтернативный маршрут не содержит routeId, генерируем его
                if (!altRoute.routeId) {
                  altRoute.routeId = `${primaryRouteId}-alt-${index + 1}`;
                }
                
                // ФАЗА 6 ФИКС: Убеждаемся, что segments - это массив
                if (!Array.isArray(altRoute.segments)) {
                  console.warn('[RouteMapWithAlternatives] Alternative route segments is not an array, setting to empty array:', {
                    routeId: altRoute.routeId,
                    segmentsType: typeof altRoute.segments,
                  });
                  altRoute.segments = [];
                }
                
                return altRoute;
              });
            
            if (validatedAlternatives.length > 0) {
              loadedRoutes.push(...validatedAlternatives);
              console.log('[RouteMapWithAlternatives] Loaded alternative routes:', {
                primaryRouteId,
                alternativesCount: validatedAlternatives.length,
              });
            }
          } else {
            console.warn('[RouteMapWithAlternatives] Alternatives data does not contain routes array:', {
              primaryRouteId,
              hasRoutes: !!parsedAlternatives.routes,
              routesType: typeof parsedAlternatives.routes,
            });
          }
        } catch (parseError) {
          // ФАЗА 6 ФИКС: Логируем ошибку парсинга альтернатив, но не прерываем загрузку основного маршрута
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          console.warn('[RouteMapWithAlternatives] Failed to parse alternatives data, continuing with primary route:', {
            primaryRouteId,
            error: parseError,
            errorMessage,
          });
        }
      }

      // ФАЗА 6 ФИКС: Финальная валидация загруженных маршрутов
      if (loadedRoutes.length === 0) {
        console.error('[RouteMapWithAlternatives] No valid routes loaded:', {
          primaryRouteId,
          loadedRoutesCount: loadedRoutes.length,
        });
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Проверяем, что хотя бы один маршрут валиден
      const validRoutes = loadedRoutes.filter(route => {
        if (!route || typeof route !== 'object') {
          return false;
        }
        if (!route.routeId) {
          return false;
        }
        // Маршрут может быть валидным даже без сегментов (пустой маршрут)
        return true;
      });

      if (validRoutes.length === 0) {
        console.error('[RouteMapWithAlternatives] No valid routes after validation:', {
          primaryRouteId,
          loadedRoutesCount: loadedRoutes.length,
        });
        setLoading(false);
        return;
      }

      setRoutes(validRoutes);
      console.log('[RouteMapWithAlternatives] Successfully loaded routes:', {
        primaryRouteId,
        routesCount: validRoutes.length,
        routeIds: validRoutes.map(r => r.routeId),
      });
      
      // КРИТИЧЕСКИЙ ФИКС: Детальное логирование структуры данных для диагностики карты
      if (validRoutes.length > 0) {
        const firstRoute = validRoutes[0];
        console.log('[RouteMapWithAlternatives] First route structure for map:', {
          routeId: firstRoute.routeId,
          hasSegments: Array.isArray(firstRoute.segments),
          segmentsCount: firstRoute.segments?.length || 0,
          segmentsStructure: firstRoute.segments?.map((seg, i) => ({
            index: i,
            segmentId: seg.segment?.segmentId || seg.segmentId,
            hasSegment: !!seg.segment,
            segmentKeys: seg.segment ? Object.keys(seg.segment) : [],
            hasFromStopId: !!seg.segment?.fromStopId,
            hasToStopId: !!seg.segment?.toStopId,
            transportType: seg.segment?.transportType || seg.transportType,
          })),
          fromCity: firstRoute.fromCity,
          toCity: firstRoute.toCity,
          routeKeys: Object.keys(firstRoute),
        });
      }
    } catch (err) {
      // ФАЗА 6 ФИКС: Улучшенная обработка ошибок с детальным логированием
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      console.error('[RouteMapWithAlternatives] Failed to load routes for map:', {
        primaryRouteId,
        error: err,
        errorMessage,
        errorStack,
      });
    } finally {
      setLoading(false);
    }
  }, [primaryRouteId, externalRoutes]);

  const handleRouteChange = useCallback(
    (routeIndex: number) => {
      setCurrentRouteIndex(routeIndex);
      if (routes[routeIndex] && onRouteChange) {
        onRouteChange(routeIndex, routes[routeIndex]);
      }
    },
    [routes, onRouteChange]
  );

  if (loading) {
    return (
      <div className="card p-lg" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-md"></div>
            <p className="text-secondary">Загрузка карты...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="card p-lg" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-secondary">Маршруты не найдены</p>
        </div>
      </div>
    );
  }

  // КРИТИЧЕСКИЙ ФИКС: Показываем сообщение, если маршрут в старом формате
  if (isOldFormat) {
    return (
      <div className="card p-lg" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="mb-md">
            <svg className="w-16 h-16 mx-auto text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-heading mb-sm">Маршрут в старом формате</h3>
          <p className="text-sm text-secondary mb-md max-w-md">
            Этот маршрут был сохранён в старом формате и не содержит данных для отображения на карте (координаты, путь маршрута).
          </p>
          <p className="text-sm text-secondary">
            Для отображения карты выполните новый поиск маршрута.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RouteMapSwitcher
      routes={routes}
      currentRouteIndex={currentRouteIndex}
      onRouteChange={handleRouteChange}
      height={height}
      showLegend={showLegend}
      preserveMapPosition={preserveMapPosition}
      providerType={providerType}
    />
  );
}






