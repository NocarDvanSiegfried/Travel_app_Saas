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
import type { IRouteMapData } from '../../../domain/map-types';
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
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Partial<Record<TransportType, boolean>>>({});

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
    if (!containerRef.current || !mapProvider) {
      return;
    }

    const containerId = containerRef.current.id || `route-map-${Date.now()}`;
    if (!containerRef.current.id) {
      containerRef.current.id = containerId;
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
      })
      .catch((error) => {
        console.error('Failed to initialize map:', error);
      });

    return () => {
      if (mapProviderRef.current) {
        mapProviderRef.current.destroy();
        mapProviderRef.current = null;
      }
    };
  }, [mapProvider, showControls]);

  // Установка границ карты
  useEffect(() => {
    if (!mapProviderRef.current || !bounds || !boundsValid) {
      return;
    }

    mapProviderRef.current.setBounds(bounds, 50);
  }, [bounds, boundsValid]);

  // Обработка событий карты
  useEffect(() => {
    if (!mapProviderRef.current) {
      return;
    }

    mapProviderRef.current.setEvents(mapEvents);

    return () => {
      if (mapProviderRef.current) {
        mapProviderRef.current.removeEvents();
      }
    };
  }, [mapEvents]);

  // Рендеринг полилиний
  useEffect(() => {
    if (!mapProviderRef.current || !visibleSegments || visibleSegments.length === 0) {
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

      const polylineId = provider.addPolyline(segment.polyline.coordinates, {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        transportType: segment.transportType,
        metadata: {
          segmentId: segment.segmentId,
          hintContent: `${segment.fromStop.name} → ${segment.toStop.name}`,
        },
      });

      polylinesRef.current.set(polylineId, segment.segmentId);
    }
  }, [visibleSegments, selectedSegmentId]);

  // Рендеринг маркеров
  useEffect(() => {
    if (!mapProviderRef.current || !mapData || !mapData.segments || mapData.segments.length === 0) {
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
  }, [mapData]);

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
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-md"></div>
            <p className="text-secondary">Загрузка данных карты...</p>
          </div>
        </div>
        <div ref={containerRef} className="w-full h-full bg-gray-200" data-testid="route-map-container"></div>
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
        <div ref={containerRef} className="w-full h-full bg-gray-200" data-testid="route-map-container"></div>
      </div>
    );
  }

  if (!mapData || !mapData.segments || mapData.segments.length === 0) {
    return (
      <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
        <div className="absolute inset-0 flex items-center justify-center bg-info-light text-info z-10 p-lg">
          <p className="text-center">Данные для карты отсутствуют.</p>
        </div>
        <div ref={containerRef} className="w-full h-full bg-gray-200" data-testid="route-map-container"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
      {/* Контейнер карты */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: height }}
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

