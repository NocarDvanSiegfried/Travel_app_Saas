/**
 * Компонент карты маршрута
 * 
 * Отображает маршрут на интерактивной карте с сегментами, маркерами и легендой.
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { IBuiltRoute } from '../../../domain/types';
import type { IRouteMapData, IMapBounds } from '../../../domain/map-types';
import type { IMapProvider } from '../../../lib/map-provider.interface';
import { YandexMapProvider } from '../../../lib/providers/yandex-map-provider';
import { LeafletMapProvider } from '../../../lib/providers/leaflet-map-provider';
import { useRouteMapData } from '../hooks/use-route-map-data';
import { useRouteMapBounds } from '../hooks/use-route-map-bounds';
import { useRouteMapSegments } from '../hooks/use-route-map-segments';
import { generateMapMarkers } from '../lib/marker-generator';
import { getPolylineStyle } from '../lib/map-styles';
import { MapLegend } from './map-legend';
import type { MarkerId, PolylineId } from '../../../lib/map-provider.interface';
import { TransportType } from '../../../domain/types';

interface RouteMapProps {
  /**
   * Маршрут для отображения
   */
  route: IBuiltRoute | null;
  
  /**
   * Предзагруженные данные карты (опционально)
   */
  mapData?: IRouteMapData | null;
  
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
   * Провайдер карты (опционально, по умолчанию YandexMapProvider)
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
   * Тип провайдера карты ('yandex' | 'leaflet', по умолчанию 'yandex')
   */
  providerType?: 'yandex' | 'leaflet';
}

/**
 * Компонент карты маршрута
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с картой маршрута
 */
export function RouteMap({
  route,
  mapData: preloadedMapData,
  isLoading: externalIsLoading,
  onSegmentClick,
  onMarkerClick,
  mapProvider: externalMapProvider,
  className = '',
  height = '600px',
  showLegend = true,
  showControls = true,
  providerType = 'yandex',
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapProviderRef = useRef<IMapProvider | null>(null);
  const markersRef = useRef<Map<MarkerId, string>>(new Map());
  const polylinesRef = useRef<Map<PolylineId, string>>(new Map());
  const previousBoundsRef = useRef<IMapBounds | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Partial<Record<TransportType, boolean>>>({});
  const [initError, setInitError] = useState<Error | null>(null);
  const [isLeafletCssLoaded, setIsLeafletCssLoaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSizeValidated, setIsSizeValidated] = useState(false);

  // Загрузка данных карты
  const {
    data: mapData,
    isLoading: isDataLoading,
    error: mapDataError,
  } = useRouteMapData({
    route: route || undefined,
    mapData: preloadedMapData || undefined,
    enabled: Boolean(route || preloadedMapData),
  });

  const isLoading = externalIsLoading || isDataLoading;

  // Расчёт границ карты
  const { bounds, isValid: boundsValid } = useRouteMapBounds({
    segments: mapData?.segments || [],
    padding: 0.15,
  });

  // Обработка сегментов
  const { visibleSegments, legend, toggleVisibility: toggleVisibilityFn } = useRouteMapSegments({
    mapData: mapData || null,
    visibility,
  });

  // Мемоизация обработчиков событий (должны быть определены до использования в mapEvents)
  const handleSegmentClick = useCallback(
    (segmentId: string) => {
      setSelectedSegmentId(segmentId);
      onSegmentClick?.(segmentId);
    },
    [onSegmentClick]
  );

  const handleMarkerClick = useCallback(
    (markerId: string) => {
      onMarkerClick?.(markerId);
    },
    [onMarkerClick]
  );

  // Мемоизация событий карты (должна быть определена до использования в useEffect)
  const mapEvents = useMemo(
    () => ({
      onPolylineClick: handleSegmentClick,
      onMarkerClick: handleMarkerClick,
    }),
    [handleSegmentClick, handleMarkerClick]
  );

  // Загрузка Leaflet CSS для клиента
  useEffect(() => {
    if (typeof window === 'undefined' || providerType !== 'leaflet') {
      setIsLeafletCssLoaded(false);
      return;
    }

    // Глобальная проверка: ищем существующий <link> по data-атрибуту и по href
    const leafletCssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    const existingLinkByAttr = document.querySelector('link[data-leaflet-css]');
    const existingLinkByHref = document.querySelector(`link[href="${leafletCssUrl}"]`);
    const existingLink = existingLinkByAttr || existingLinkByHref;

    if (existingLink) {
      // CSS уже загружен, устанавливаем состояние
      setIsLeafletCssLoaded(true);
      return;
    }

    // Дополнительная проверка: убеждаемся, что элемент не был добавлен между проверками
    // (защита от race condition при параллельных вызовах)
    const doubleCheck = document.querySelector(`link[href="${leafletCssUrl}"]`);
    if (doubleCheck) {
      setIsLeafletCssLoaded(true);
      return;
    }

    // Создаём link элемент для Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = leafletCssUrl;
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    link.setAttribute('data-leaflet-css', 'true');
    
    // Финальная проверка прямо перед добавлением (защита от race condition)
    // Убеждаемся, что элемент не был добавлен другим экземпляром компонента
    const finalCheck = document.querySelector(`link[href="${leafletCssUrl}"]`) || 
                      document.querySelector('link[data-leaflet-css]');
    if (finalCheck) {
      // Элемент уже существует, не добавляем дубликат
      setIsLeafletCssLoaded(true);
      return;
    }
    
    // Добавляем link в DOM и сразу считаем CSS загруженным
    // onload не срабатывает в большинстве браузеров для CSS, поэтому полагаемся на наличие в DOM
    document.head.appendChild(link);
    setIsLeafletCssLoaded(true);
  }, [providerType]);

  // Инициализация провайдера карты
  const mapProvider = useMemo(() => {
    if (externalMapProvider) {
      return externalMapProvider;
    }

    if (providerType === 'leaflet') {
      return new LeafletMapProvider();
    }

    return new YandexMapProvider();
  }, [externalMapProvider, providerType]);

  // Инициализация карты
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Убеждаемся, что карта не создаётся в состояниях loading/error/empty state
    // где контейнер может быть скрыт или иметь неправильные размеры
    if (isLoading || initError || mapDataError || !mapData || !mapData.segments || mapData.segments.length === 0) {
      // Не инициализируем карту в этих состояниях
      return;
    }

    // Сбрасываем предыдущую ошибку при перезапуске эффекта
    setInitError(null);
    setIsMapReady(false);
    setIsSizeValidated(false);

    if (!containerRef.current || !mapProvider) {
      return;
    }

    // Проверяем, что CSS Leaflet загружен перед инициализацией
    if (providerType === 'leaflet') {
      // Если CSS уже загружен (по состоянию), сразу продолжаем
      if (isLeafletCssLoaded) {
        // Продолжаем инициализацию
      } else {
        // Проверяем наличие CSS в DOM
        const leafletCssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        const cssLinkByAttr = document.querySelector('link[data-leaflet-css]');
        const cssLinkByHref = document.querySelector(`link[href="${leafletCssUrl}"]`);
        const cssLink = cssLinkByAttr || cssLinkByHref;

        if (cssLink) {
          // CSS уже в DOM, обновляем состояние и продолжаем
          setIsLeafletCssLoaded(true);
          // Эффект перезапустится автоматически благодаря зависимости isLeafletCssLoaded
          return;
        }

        // CSS не найден в DOM и не загружается (isLeafletCssLoaded === false)
        // Ждём появления CSS link в DOM (максимум 5 секунд)
        // Это fallback на случай, если эффект загрузки CSS ещё не выполнился
        let cssCheckAttempts = 0;
        const MAX_CSS_CHECK_ATTEMPTS = 50; // 50 попыток * 100ms = 5 секунд
        
        const checkCss = setInterval(() => {
          cssCheckAttempts++;
          const foundLinkByAttr = document.querySelector('link[data-leaflet-css]');
          const foundLinkByHref = document.querySelector(`link[href="${leafletCssUrl}"]`);
          const foundLink = foundLinkByAttr || foundLinkByHref;

          if (foundLink) {
            clearInterval(checkCss);
            setIsLeafletCssLoaded(true);
            // Эффект перезапустится автоматически благодаря зависимости isLeafletCssLoaded
          } else if (cssCheckAttempts >= MAX_CSS_CHECK_ATTEMPTS) {
            clearInterval(checkCss);
            const error = new Error('CSS Leaflet не загрузился в течение 5 секунд');
            setInitError(error);
            console.error('Failed to load Leaflet CSS:', error);
          }
        }, 100);
        
        return () => {
          clearInterval(checkCss);
        };
      }
    }

    // Строгая проверка готовности контейнера - требуем реальные размеры (width > 50 и height > 50)
    const checkContainerSize = () => {
      const container = containerRef.current;
      if (!container) {
        return false;
      }

      const rect = container.getBoundingClientRect();
      // Строгая проверка: контейнер должен иметь реальные размеры
      return rect.width > 50 && rect.height > 50;
    };

    // Счётчик попыток инициализации
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 10;

    // Ждём, пока контейнер получит размеры
    let timeoutIdForRetry: ReturnType<typeof setTimeout> | null = null;
    const initMap = () => {
      if (!checkContainerSize()) {
        initAttempts++;
        if (initAttempts >= MAX_INIT_ATTEMPTS) {
          const error = new Error('Контейнер карты не получил размеры после 10 попыток инициализации');
          setInitError(error);
          console.error('Failed to initialize map: container size check failed after', MAX_INIT_ATTEMPTS, 'attempts');
          return;
        }
        // Повторяем попытку через небольшую задержку (динамическая задержка)
        timeoutIdForRetry = setTimeout(initMap, 100);
        return;
      }
      
      // Очищаем таймер, если контейнер готов
      if (timeoutIdForRetry !== null) {
        clearTimeout(timeoutIdForRetry);
        timeoutIdForRetry = null;
      }

      const containerId = containerRef.current?.id || `route-map-${Date.now()}`;
      if (containerRef.current && !containerRef.current.id) {
        containerRef.current.id = containerId;
      }

      if (!containerRef.current) {
        return;
      }

      // Логирование начала инициализации (только в dev режиме)
      if (process.env.NODE_ENV === 'development') {
        console.log('Initializing map with provider:', mapProvider.constructor.name, 'providerType:', providerType, {
          containerId,
          hasContainer: !!containerRef.current,
          containerSize: containerRef.current ? {
            width: containerRef.current.getBoundingClientRect().width,
            height: containerRef.current.getBoundingClientRect().height,
          } : null,
        });
      }

      mapProvider
        .initialize({
          containerId,
          center: [62.0, 129.0],
          zoom: 10,
          zoomControl: showControls,
          navigationControl: showControls,
        })
        .then(() => {
          mapProviderRef.current = mapProvider;
          setIsMapReady(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('Map initialized successfully', {
              providerType,
              containerId,
              isInitialized: mapProviderRef.current.isInitialized(),
            });
          }
          
          // Двойной invalidateSize после инициализации карты
          if (providerType === 'leaflet' && mapProviderRef.current) {
            // Первый invalidateSize сразу после init
            if (typeof (mapProviderRef.current as { invalidateSize?: () => void }).invalidateSize === 'function') {
              (mapProviderRef.current as { invalidateSize: () => void }).invalidateSize();
            }
            
            // Второй invalidateSize внутри requestAnimationFrame / setTimeout(0)
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (mapProviderRef.current && typeof (mapProviderRef.current as { invalidateSize?: () => void }).invalidateSize === 'function') {
                  (mapProviderRef.current as { invalidateSize: () => void }).invalidateSize();
                  
                  // Повторная проверка размеров контейнера через небольшую задержку (100–200 мс)
                  setTimeout(() => {
                    const container = containerRef.current;
                    if (container && mapProviderRef.current) {
                      const rect = container.getBoundingClientRect();
                      const previousWidth = container.getAttribute('data-previous-width');
                      const previousHeight = container.getAttribute('data-previous-height');
                      const currentWidth = Math.round(rect.width);
                      const currentHeight = Math.round(rect.height);
                      
                      // Если контейнер получил новые размеры — повторно вызываем invalidateSize + setBounds
                      if (
                        previousWidth && previousHeight &&
                        (currentWidth !== Number(previousWidth) || currentHeight !== Number(previousHeight))
                      ) {
                        if (process.env.NODE_ENV === 'development') {
                          console.log('LeafletMapProvider: Container size changed, revalidating size', {
                            previous: { width: previousWidth, height: previousHeight },
                            current: { width: currentWidth, height: currentHeight },
                          });
                        }
                        
                        if (typeof (mapProviderRef.current as { invalidateSize?: () => void }).invalidateSize === 'function') {
                          (mapProviderRef.current as { invalidateSize: () => void }).invalidateSize();
                        }
                        
                        // Вызываем setBounds после invalidateSize, если bounds доступны
                        if (bounds && boundsValid && mapProviderRef.current.isInitialized()) {
                          mapProviderRef.current.setBounds(bounds, 50);
                        }
                      }
                      
                      // Сохраняем текущие размеры для следующей проверки
                      container.setAttribute('data-previous-width', String(currentWidth));
                      container.setAttribute('data-previous-height', String(currentHeight));
                    }
                    
                    // Устанавливаем флаг после успешного обновления размеров
                    setIsSizeValidated(true);
                  }, 150);
                }
              }, 0);
            });
          } else {
            // Для не-Leaflet провайдеров сразу считаем размеры валидными
            setIsSizeValidated(true);
          }
        })
        .catch((error) => {
          const initError = error instanceof Error ? error : new Error(String(error));
          setInitError(initError);
          console.error('Failed to initialize map:', error, {
            providerType,
            containerId,
            hasContainer: !!containerRef.current,
            containerSize: containerRef.current ? {
              width: containerRef.current.getBoundingClientRect().width,
              height: containerRef.current.getBoundingClientRect().height,
            } : null,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          });
        });
    };

    // Задержка для гарантии, что DOM полностью отрендерился
    // Используем requestAnimationFrame для более надёжного ожидания следующего кадра рендера
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;

    const scheduleInit = () => {
      rafId = requestAnimationFrame(() => {
        // Дополнительная задержка 100ms для гарантии готовности контейнера
        timeoutId = setTimeout(initMap, 100);
      });
    };

    scheduleInit();

    return () => {
      // Очищаем все таймеры и анимации
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (timeoutIdForRetry !== null) {
        clearTimeout(timeoutIdForRetry);
        timeoutIdForRetry = null;
      }
      // Очищаем карту
      if (mapProviderRef.current) {
        mapProviderRef.current.destroy();
        mapProviderRef.current = null;
      }
      // Сбрасываем состояния
      setInitError(null);
      setIsMapReady(false);
      setIsSizeValidated(false);
      previousBoundsRef.current = null;
      
      // Очищаем сохранённые размеры контейнера
      if (containerRef.current) {
        containerRef.current.removeAttribute('data-previous-width');
        containerRef.current.removeAttribute('data-previous-height');
      }
    };
  }, [mapProvider, showControls, providerType, isLeafletCssLoaded, isLoading, initError, mapDataError, mapData]);

  // Установка границ карты - выполняется только после invalidateSize, когда карта точно получила размеры
  useEffect(() => {
    if (!mapProviderRef.current || !bounds || !boundsValid || !isMapReady) {
      return;
    }

    if (!mapProviderRef.current.isInitialized()) {
      return;
    }

    // Для Leaflet ждём, пока размеры карты будут обновлены через invalidateSize
    // setBounds должен выполняться только после invalidateSize
    if (providerType === 'leaflet' && !isSizeValidated) {
      return;
    }

    // Сравниваем текущие bounds с предыдущими, чтобы избежать лишних вызовов
    const previousBounds = previousBoundsRef.current;
    if (
      previousBounds &&
      previousBounds.north === bounds.north &&
      previousBounds.south === bounds.south &&
      previousBounds.east === bounds.east &&
      previousBounds.west === bounds.west
    ) {
      // Bounds не изменились, пропускаем вызов
      return;
    }

    // Обновляем предыдущие bounds и вызываем setBounds
    previousBoundsRef.current = bounds;
    mapProviderRef.current.setBounds(bounds, 50);
  }, [bounds, boundsValid, isMapReady, isSizeValidated, providerType]);

  // Обработка событий карты
  useEffect(() => {
    if (!mapProviderRef.current || !isMapReady) {
      return;
    }

    if (!mapProviderRef.current.isInitialized()) {
      return;
    }

    mapProviderRef.current.setEvents(mapEvents);

    return () => {
      if (mapProviderRef.current) {
        mapProviderRef.current.removeEvents();
      }
    };
  }, [mapEvents, isMapReady]);

  // Рендеринг полилиний - выполняем только когда карта инициализирована и после успешного invalidateSize
  useEffect(() => {
    if (!mapProviderRef.current || !visibleSegments || visibleSegments.length === 0) {
      return;
    }

    // Проверяем, что карта инициализирована и размеры валидированы
    if (!isMapReady || !mapProviderRef.current.isInitialized()) {
      return;
    }

    // Для Leaflet ждём, пока размеры карты будут обновлены через invalidateSize
    // Не рендерим полилинии преждевременно
    if (providerType === 'leaflet' && !isSizeValidated) {
      return;
    }

    const provider = mapProviderRef.current;

    // Очищаем старые полилинии
    for (const polylineId of polylinesRef.current.keys()) {
      provider.removePolyline(polylineId);
    }
    polylinesRef.current.clear();

    // Добавляем новые полилинии
    for (const segment of visibleSegments) {
      const isHighlighted = selectedSegmentId === segment.segmentId;
      const style = getPolylineStyle(segment.transportType, isHighlighted);

      // TODO: Использовать pathGeometry из SmartRoute вместо polyline.coordinates
      // Приоритет: pathGeometry > polyline.coordinates > fallback (прямая линия)
      let coordinates: Array<[number, number]>;
      if (segment.pathGeometry && segment.pathGeometry.length > 0) {
        // Используем реалистичный путь из SmartRoute
        coordinates = segment.pathGeometry as Array<[number, number]>;
      } else if (segment.polyline?.coordinates && segment.polyline.coordinates.length > 0) {
        // Fallback на старый формат
        coordinates = segment.polyline.coordinates;
      } else {
        // Fallback: прямая линия между остановками
        coordinates = [
          [segment.fromStop.latitude, segment.fromStop.longitude],
          [segment.toStop.latitude, segment.toStop.longitude],
        ];
      }

      const polylineId = provider.addPolyline(coordinates, {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        transportType: segment.transportType,
        metadata: {
          segmentId: segment.segmentId,
          hintContent: `${segment.fromStop.name} → ${segment.toStop.name}`,
          // Добавляем информацию о хабах для popup
          viaHubs: segment.viaHubs,
          isDirect: segment.isDirect,
          isHub: segment.fromStop.isHub || segment.toStop.isHub,
          hubLevel: segment.fromStop.hubLevel || segment.toStop.hubLevel,
        },
      });

      polylinesRef.current.set(polylineId, segment.segmentId);
    }
  }, [visibleSegments, selectedSegmentId, isMapReady, isSizeValidated, providerType]);

  // Рендеринг маркеров - выполняем только когда карта инициализирована и после успешного invalidateSize
  useEffect(() => {
    if (!mapProviderRef.current || !mapData || !mapData.segments || mapData.segments.length === 0) {
      return;
    }

    // Проверяем, что карта инициализирована и размеры валидированы
    if (!isMapReady || !mapProviderRef.current.isInitialized()) {
      return;
    }

    // Для Leaflet ждём, пока размеры карты будут обновлены через invalidateSize
    // Не рендерим маркеры преждевременно
    if (providerType === 'leaflet' && !isSizeValidated) {
      return;
    }

    const provider = mapProviderRef.current;

    // Очищаем старые маркеры
    for (const markerId of markersRef.current.keys()) {
      provider.removeMarker(markerId);
    }
    markersRef.current.clear();

    // Генерируем маркеры
    const markers = generateMapMarkers(mapData.segments);

    // Добавляем маркеры на карту
    for (const marker of markers) {
      const markerId = provider.addMarker(marker.coordinate, {
        popupContent: marker.popupContent,
        iconUrl: undefined, // Используем дефолтные иконки провайдера
        isTransfer: marker.type === 'transfer',
        metadata: {
          markerType: marker.type,
          stopId: marker.id,
          ...marker.metadata,
        },
      });

      markersRef.current.set(markerId, marker.id);
    }
  }, [mapData, isMapReady, isSizeValidated, providerType]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (mapProviderRef.current) {
        mapProviderRef.current.clear();
        mapProviderRef.current.destroy();
        mapProviderRef.current = null;
      }
    };
  }, []);

  // Обработчик переключения видимости (мемоизирован)
  const handleToggleVisibility = useCallback(
    (transportType: TransportType) => {
      const newVisibility = toggleVisibilityFn(transportType);
      setVisibility(newVisibility);
    },
    [toggleVisibilityFn]
  );

  // Состояния загрузки и ошибок
  if (isLoading) {
    return (
      <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-md"></div>
            <p className="text-secondary">Загрузка данных карты...</p>
          </div>
        </div>
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-200"
          style={{
            height: height,
            minHeight: height,
            position: 'relative',
            zIndex: 0,
          }}
          data-testid="route-map-container"
        />
      </div>
    );
  }

  // Отображаем ошибку инициализации карты
  if (initError) {
    return (
      <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
        <div className="absolute inset-0 flex items-center justify-center bg-error-light text-error z-10 p-lg">
          <div className="text-center">
            <p className="font-medium mb-sm">Ошибка инициализации карты</p>
            <p className="text-sm">{initError.message || 'Неизвестная ошибка'}</p>
            <button
              onClick={() => {
                setInitError(null);
                setIsMapReady(false);
                setIsSizeValidated(false);
                // Сбрасываем состояние загрузки CSS для перезапуска загрузки
                setIsLeafletCssLoaded(false);
                // Перезапускаем инициализацию через изменение зависимостей
                if (mapProviderRef.current) {
                  mapProviderRef.current.destroy();
                  mapProviderRef.current = null;
                }
              }}
              className="mt-md px-md py-sm bg-primary text-inverse rounded-sm hover:bg-primary-dark transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-200"
          style={{
            height: height,
            minHeight: height,
            position: 'relative',
            zIndex: 0,
          }}
          data-testid="route-map-container"
        />
      </div>
    );
  }

  if (mapDataError) {
    return (
      <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
        <div className="absolute inset-0 flex items-center justify-center bg-error-light text-error z-10 p-lg">
          <p className="text-center">
            Ошибка загрузки карты: {mapDataError.message || 'Неизвестная ошибка'}
          </p>
        </div>
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-200"
          style={{
            height: height,
            minHeight: height,
            position: 'relative',
            zIndex: 0,
          }}
          data-testid="route-map-container"
        />
      </div>
    );
  }

  if (!mapData || !mapData.segments || mapData.segments.length === 0) {
    return (
      <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
        <div className="absolute inset-0 flex items-center justify-center bg-info-light text-info z-10 p-lg">
          <p className="text-center">Данные для карты отсутствуют.</p>
        </div>
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-200"
          style={{
            height: height,
            minHeight: height,
            position: 'relative',
            zIndex: 0,
          }}
          data-testid="route-map-container"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
      {/* Контейнер карты */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ 
          height: height,
          minHeight: height,
          position: 'relative',
          zIndex: 0,
        }}
        data-testid="route-map-container"
      />

      {/* Легенда */}
      {showLegend && (
        <div className="absolute top-md right-md z-10" data-testid="route-map-legend">
          <MapLegend legend={legend} onToggle={handleToggleVisibility} />
        </div>
      )}
    </div>
  );
}

