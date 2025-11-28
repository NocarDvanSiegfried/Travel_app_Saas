/**
 * Рендерер для умных мультимодальных маршрутов на карте
 * 
 * Отвечает за отрисовку умных маршрутов с правилами визуализации
 * для каждого типа транспорта
 * 
 * @module routes/features/route-map/lib
 */

import type { IMapProvider } from '../../../lib/map-provider.interface';
import type { Coordinate, IMarkerOptions, IPolylineOptions } from '../../../domain/map-types';
import type { MarkerId, PolylineId } from '../../../lib/map-provider.interface';
import {
  getSmartPolylineStyle,
  getSmartMarkerOptions,
  convertToLeafletPolylineOptions,
  createWavyPath,
  type SmartPolylineStyle,
} from './smart-route-visualization';
import { TransportType } from '../../../domain/types';

/**
 * Данные сегмента умного маршрута для визуализации
 */
export interface SmartRouteSegmentData {
  /**
   * ID сегмента
   */
  segmentId: string;

  /**
   * Тип транспорта
   */
  transportType: TransportType;

  /**
   * Координаты начала сегмента [lat, lng]
   */
  from: Coordinate;

  /**
   * Координаты конца сегмента [lat, lng]
   */
  to: Coordinate;

  /**
   * Геометрия пути (массив координат для не-прямых маршрутов)
   */
  pathGeometry?: Coordinate[];

  /**
   * Является ли прямым рейсом (для авиа)
   */
  isDirect?: boolean;

  /**
   * ФАЗА 4 ФИКС: Информация о хабах (для авиа)
   * Может содержать id, name, level и другие поля
   */
  viaHubs?: Array<{
    id?: string;
    name?: string;
    level?: 'federal' | 'regional';
    [key: string]: unknown;
  }>;

  /**
   * Информация об остановке начала
   */
  fromStop: {
    id: string;
    name: string;
    type: string;
    isHub?: boolean;
    hubLevel?: 'federal' | 'regional';
    isTransfer?: boolean;
  };

  /**
   * Информация об остановке конца
   */
  toStop: {
    id: string;
    name: string;
    type: string;
    isHub?: boolean;
    hubLevel?: 'federal' | 'regional';
    isTransfer?: boolean;
  };

  /**
   * Дополнительная информация для popup
   */
  metadata?: {
    distance?: number;
    duration?: number;
    price?: number;
    departureTime?: string;
    arrivalTime?: string;
    // ФАЗА 4: Оценка риска для сегмента
    riskScore?: {
      value: number;
      level: string;
      description: string;
      factors?: {
        weather?: {
          temperature?: number;
          visibility?: number;
          wind?: number;
          storms?: boolean;
        };
        delays?: {
          avg30: number;
          avg60: number;
          avg90: number;
          delayFreq: number;
        };
        cancellations?: {
          rate30: number;
          rate60: number;
          rate90: number;
          total: number;
        };
        occupancy?: {
          avg: number;
          highLoadPercent: number;
        };
        seasonality?: {
          month: number;
          riskFactor: number;
        };
        schedule?: {
          regularityScore: number;
        };
      };
    };
    warnings?: string[];
    validation?: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  };
}

/**
 * Данные умного маршрута для визуализации
 */
export interface SmartRouteData {
  /**
   * ID маршрута
   */
  routeId: string;

  /**
   * Сегменты маршрута
   */
  segments: SmartRouteSegmentData[];

  /**
   * Границы маршрута для автоматического масштабирования
   */
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Результат рендеринга маршрута
 */
export interface RenderResult {
  /**
   * ID добавленных полилиний
   */
  polylineIds: PolylineId[];

  /**
   * ID добавленных маркеров
   */
  markerIds: MarkerId[];

  /**
   * Соответствие ID сегментов к ID полилиний
   */
  segmentToPolyline: Map<string, PolylineId>;

  /**
   * Соответствие ID остановок к ID маркеров
   */
  stopToMarker: Map<string, MarkerId>;
}

/**
 * Рендерер умных маршрутов на карте
 */
export class SmartRouteMapRenderer {
  private mapProvider: IMapProvider;
  private renderedRoutes: Map<string, RenderResult> = new Map();

  constructor(mapProvider: IMapProvider) {
    this.mapProvider = mapProvider;
  }

  /**
   * Рендерит умный маршрут на карте
   */
  public renderRoute(route: SmartRouteData): RenderResult {
    const polylineIds: PolylineId[] = [];
    const markerIds: MarkerId[] = [];
    const segmentToPolyline = new Map<string, PolylineId>();
    const stopToMarker = new Map<string, MarkerId>();

    // ФАЗА 3 ФИКС: Улучшенное логирование для диагностики
    console.log('[SmartRouteMapRenderer] Rendering route:', {
      routeId: route.routeId,
      segmentsCount: route.segments.length,
      transportTypes: route.segments.map(s => s.transportType),
      segmentIds: route.segments.map(s => s.segmentId),
      bounds: route.bounds,
    });

    // ФАЗА 3 ФИКС: Рендерим ВСЕ сегменты, не фильтруем по типу транспорта
    for (const segment of route.segments) {
      // ФАЗА 3 ФИКС: Валидируем входные данные сегмента перед рендерингом
      if (!this.isValidCoordinate(segment.from) || !this.isValidCoordinate(segment.to)) {
        console.error('[SmartRouteMapRenderer] Segment has invalid coordinates, skipping:', {
          segmentId: segment.segmentId,
          transportType: segment.transportType,
          from: segment.from,
          to: segment.to,
          fromValid: this.isValidCoordinate(segment.from),
          toValid: this.isValidCoordinate(segment.to),
        });
        continue; // Пропускаем сегмент с невалидными координатами
      }

      console.log('[SmartRouteMapRenderer] Rendering segment:', {
        segmentId: segment.segmentId,
        transportType: segment.transportType,
        hasPathGeometry: !!segment.pathGeometry,
        pathGeometryLength: segment.pathGeometry?.length || 0,
        from: segment.from,
        to: segment.to,
        fromStop: segment.fromStop?.name,
        toStop: segment.toStop?.name,
      });
      // Получаем стиль для сегмента
      const style = getSmartPolylineStyle(
        segment.transportType,
        segment.isDirect,
        segment.viaHubs
      );

      // ФАЗА 3 ФИКС: Определяем координаты для полилинии с улучшенной обработкой fallback
      // Приоритет: pathGeometry > generateRealisticPath > прямая линия
      let coordinates: Coordinate[];
      
      if (segment.pathGeometry && segment.pathGeometry.length > 0) {
        // ФАЗА 3 ФИКС: Валидируем pathGeometry перед использованием
        const validatedGeometry = this.validatePathGeometry(segment.pathGeometry);
        if (validatedGeometry && validatedGeometry.length >= 2) {
          // Используем реальную геометрию пути
          coordinates = validatedGeometry;
          console.log('[SmartRouteMapRenderer] Using pathGeometry:', {
            segmentId: segment.segmentId,
            coordinatesCount: coordinates.length,
            transportType: segment.transportType,
            firstCoord: coordinates[0],
            lastCoord: coordinates[coordinates.length - 1],
          });
        } else {
          // ФАЗА 3 ФИКС: Если pathGeometry невалиден, используем fallback
          console.warn('[SmartRouteMapRenderer] pathGeometry invalid, using fallback:', {
            segmentId: segment.segmentId,
            pathGeometryLength: segment.pathGeometry.length,
            transportType: segment.transportType,
            from: segment.from,
            to: segment.to,
          });
          coordinates = this.generateRealisticPath(
            segment.from,
            segment.to,
            segment.transportType
          );
        }
      } else {
        // ФАЗА 3 ФИКС: Генерируем реалистичный путь вместо прямой линии
        // Для авиа: ломаная линия с промежуточными точками
        // Для других типов: путь с небольшими отклонениями
        console.log('[SmartRouteMapRenderer] No pathGeometry, generating realistic path:', {
          segmentId: segment.segmentId,
          transportType: segment.transportType,
          from: segment.from,
          to: segment.to,
        });
        coordinates = this.generateRealisticPath(
          segment.from,
          segment.to,
          segment.transportType
        );
      }

      // ФАЗА 3 ФИКС: Финальная валидация сгенерированных координат
      const finalValidatedCoordinates = this.validatePathGeometry(coordinates);
      if (!finalValidatedCoordinates || finalValidatedCoordinates.length < 2) {
        // ФАЗА 3 ФИКС: Если даже fallback невалиден, используем прямую линию как последний резерв
        console.error('[SmartRouteMapRenderer] Generated path is invalid, using straight line as last resort:', {
          segmentId: segment.segmentId,
          from: segment.from,
          to: segment.to,
          transportType: segment.transportType,
          generatedCoordinatesCount: coordinates.length,
          generatedCoordinates: coordinates,
        });
        // Проверяем валидность from и to перед использованием
        if (this.isValidCoordinate(segment.from) && this.isValidCoordinate(segment.to)) {
          coordinates = [segment.from, segment.to];
          console.log('[SmartRouteMapRenderer] Using straight line fallback:', {
            segmentId: segment.segmentId,
            from: segment.from,
            to: segment.to,
          });
        } else {
          // ФАЗА 3 ФИКС: Если даже from/to невалидны, пропускаем этот сегмент
          console.error('[SmartRouteMapRenderer] Cannot render segment: invalid from/to coordinates:', {
            segmentId: segment.segmentId,
            from: segment.from,
            to: segment.to,
            fromValid: this.isValidCoordinate(segment.from),
            toValid: this.isValidCoordinate(segment.to),
          });
          continue; // Пропускаем этот сегмент
        }
      } else {
        coordinates = finalValidatedCoordinates;
        console.log('[SmartRouteMapRenderer] Final validated coordinates:', {
          segmentId: segment.segmentId,
          coordinatesCount: coordinates.length,
          firstCoord: coordinates[0],
          lastCoord: coordinates[coordinates.length - 1],
        });
      }

      // Для паромов создаём волнистую линию
      if (segment.transportType === TransportType.FERRY && style.wavyOptions) {
        coordinates = createWavyPath(
          coordinates,
          style.wavyOptions.amplitude,
          style.wavyOptions.frequency
        );
      }

      // ФАЗА 5 ФИКС: Конвертируем стиль в опции Leaflet
      const polylineOptions = convertToLeafletPolylineOptions(style);

      // ФАЗА 5 ФИКС: Убеждаемся, что все опции применены правильно
      const finalPolylineOptions: IPolylineOptions = {
        ...polylineOptions,
        transportType: segment.transportType,
        // ФАЗА 5 ФИКС: Явно устанавливаем все параметры для гарантированной видимости
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        zIndexOffset: style.zIndex,
        dashArray: style.dashArray,
        metadata: {
          segmentId: segment.segmentId,
          hintContent: this.createSegmentPopupContent(segment, style),
        },
      };

      // ФАЗА 5 ФИКС: Логируем параметры полилинии для отладки
      console.log('[SmartRouteMapRenderer] Adding polyline with options:', {
        segmentId: segment.segmentId,
        transportType: segment.transportType,
        color: finalPolylineOptions.color,
        weight: finalPolylineOptions.weight,
        opacity: finalPolylineOptions.opacity,
        zIndexOffset: finalPolylineOptions.zIndexOffset,
        dashArray: finalPolylineOptions.dashArray,
        coordinatesCount: coordinates.length,
      });

      // Добавляем полилинию на карту
      const polylineId = this.mapProvider.addPolyline(coordinates, finalPolylineOptions);

      polylineIds.push(polylineId);
      segmentToPolyline.set(segment.segmentId, polylineId);

      // Рендерим маркеры для остановок
      // КРИТИЧЕСКИЙ ФИКС: Проверяем наличие fromStop и toStop перед рендерингом
      // Маркер начала (если это первый сегмент или пересадка)
      const isFirstSegment = route.segments.indexOf(segment) === 0;
      const isTransferPoint = segment.fromStop?.isTransfer || 
                             (route.segments.length > 1 && !isFirstSegment);
      
      if (segment.fromStop && segment.from) {
        const fromMarkerId = this.renderStopMarker(
          segment.fromStop,
          segment.from,
          isFirstSegment || isTransferPoint,
          isTransferPoint
        );
        if (fromMarkerId) {
          markerIds.push(fromMarkerId);
          stopToMarker.set(segment.fromStop.id, fromMarkerId);
        }
      } else {
        console.warn('[SmartRouteMapRenderer] Missing fromStop or from coordinates:', {
          segmentId: segment.segmentId,
          hasFromStop: !!segment.fromStop,
          hasFrom: !!segment.from,
        });
      }

      // Маркер конца (всегда рендерим)
      const isLastSegment = route.segments.indexOf(segment) === route.segments.length - 1;
      if (segment.toStop && segment.to) {
        const toMarkerId = this.renderStopMarker(
          segment.toStop,
          segment.to,
          true,
          !isLastSegment && route.segments.length > 1 // Пересадка, если не последний сегмент
        );
        if (toMarkerId) {
          markerIds.push(toMarkerId);
          stopToMarker.set(segment.toStop.id, toMarkerId);
        }
      } else {
        console.warn('[SmartRouteMapRenderer] Missing toStop or to coordinates:', {
          segmentId: segment.segmentId,
          hasToStop: !!segment.toStop,
          hasTo: !!segment.to,
        });
      }

      // ФАЗА 4 ФИКС: Рендерим маркеры для промежуточных хабов (viaHubs)
      if (segment.viaHubs && segment.viaHubs.length > 0) {
        console.log('[SmartRouteMapRenderer] Rendering markers for viaHubs:', {
          segmentId: segment.segmentId,
          viaHubsCount: segment.viaHubs.length,
          viaHubs: segment.viaHubs,
        });

        for (const hub of segment.viaHubs) {
          // ФАЗА 4 ФИКС: Получаем координаты хаба из pathGeometry или используем fallback
          let hubCoordinate: Coordinate | null = null;

          // Пытаемся найти координаты в pathGeometry (если есть)
          if (segment.pathGeometry && segment.pathGeometry.length > 0) {
            // Берём среднюю точку pathGeometry как приблизительные координаты хаба
            const middleIndex = Math.floor(segment.pathGeometry.length / 2);
            hubCoordinate = segment.pathGeometry[middleIndex];
            
            // Валидируем координаты
            if (!this.isValidCoordinate(hubCoordinate)) {
              hubCoordinate = null;
            }
          }

          // Если не нашли в pathGeometry, используем fallback
          if (!hubCoordinate) {
            hubCoordinate = this.getFallbackCoordinateForHub(hub);
          }

          if (hubCoordinate && this.isValidCoordinate(hubCoordinate)) {
            // Создаём объект остановки для хаба
            const hubStop = {
              id: hub.id || `hub-${hub.name || 'unknown'}`,
              name: hub.name || 'Промежуточный хаб',
              type: 'hub' as const,
              isHub: true,
              hubLevel: hub.level || 'regional',
              isTransfer: true,
            };

            const hubMarkerId = this.renderStopMarker(
              hubStop,
              hubCoordinate,
              true, // Всегда рендерим хабы
              true  // Хабы всегда являются пересадками
            );

            if (hubMarkerId) {
              markerIds.push(hubMarkerId);
              console.log('[SmartRouteMapRenderer] Rendered marker for viaHub:', {
                hubId: hubStop.id,
                hubName: hubStop.name,
                hubLevel: hubStop.hubLevel,
                coordinate: hubCoordinate,
              });
            } else {
              console.warn('[SmartRouteMapRenderer] Failed to render marker for viaHub:', {
                hubId: hubStop.id,
                hubName: hubStop.name,
                coordinate: hubCoordinate,
              });
            }
          } else {
            console.warn('[SmartRouteMapRenderer] Cannot render marker for viaHub: no valid coordinates:', {
              hubId: hub.id,
              hubName: hub.name,
              hubLevel: hub.level,
            });
          }
        }
      }
    }

    // ФАЗА 6 ФИКС: Проверка, что хотя бы что-то было отрендерено
    if (polylineIds.length === 0 && markerIds.length === 0) {
      console.warn('[SmartRouteMapRenderer] No polylines or markers were rendered', {
        routeId: route.routeId,
        segmentsCount: route.segments.length,
        segmentsProcessed: route.segments.length,
      });
      // ФАЗА 6 ФИКС: Не возвращаем пустой результат - это будет обработано в smart-route-map.tsx
    }

    const result: RenderResult = {
      polylineIds,
      markerIds,
      segmentToPolyline,
      stopToMarker,
    };

    // Сохраняем результат для последующего удаления
    this.renderedRoutes.set(route.routeId, result);

    // ФАЗА 6 ФИКС: Логируем итоговый результат рендеринга
    console.log('[SmartRouteMapRenderer] Route rendering completed:', {
      routeId: route.routeId,
      segmentsCount: route.segments.length,
      renderedPolylines: polylineIds.length,
      renderedMarkers: markerIds.length,
      hasBounds: !!route.bounds,
    });

    return result;
  }

  /**
   * Удаляет маршрут с карты
   */
  public removeRoute(routeId: string): void {
    const result = this.renderedRoutes.get(routeId);
    if (!result) {
      return;
    }

    // Удаляем все полилинии
    for (const polylineId of result.polylineIds) {
      this.mapProvider.removePolyline(polylineId);
    }

    // Удаляем все маркеры
    for (const markerId of result.markerIds) {
      this.mapProvider.removeMarker(markerId);
    }

    this.renderedRoutes.delete(routeId);
  }

  /**
   * Обновляет маршрут на карте
   */
  public updateRoute(route: SmartRouteData): RenderResult {
    // Удаляем старый маршрут
    this.removeRoute(route.routeId);

    // Рендерим новый
    return this.renderRoute(route);
  }

  /**
   * Очищает все маршруты с карты
   */
  public clearAll(): void {
    for (const routeId of this.renderedRoutes.keys()) {
      this.removeRoute(routeId);
    }
  }

  /**
   * Рендерит маркер остановки
   * 
   * Соответствует требованиям 12.4.2: Интерактивные подсказки
   * При наведении на маркер показывает:
   * - Название остановки
   * - Тип остановки
   * - Время пересадки (если есть)
   * - Координаты
   */
  private renderStopMarker(
    stop: SmartRouteSegmentData['fromStop'],
    coordinate: Coordinate,
    alwaysRender: boolean = false,
    isTransfer: boolean = false
  ): MarkerId | null {
    // КРИТИЧЕСКИЙ ФИКС: Валидируем координаты перед использованием
    let finalCoordinate = coordinate;
    
    if (!this.isValidCoordinate(coordinate)) {
      console.warn('[SmartRouteMapRenderer] Invalid coordinates for marker, attempting fallback:', {
        stopId: stop?.id,
        stopName: stop?.name,
        coordinate,
      });
      
      // КРИТИЧЕСКИЙ ФИКС: Пытаемся получить fallback координаты из названия остановки
      // Если остановка связана с городом, используем координаты города
      // Это временное решение - в будущем можно использовать API для получения координат
      const fallbackCoordinate = this.getFallbackCoordinateForStop(stop);
      if (fallbackCoordinate && this.isValidCoordinate(fallbackCoordinate)) {
        console.log('[SmartRouteMapRenderer] Using fallback coordinates for marker:', {
          stopId: stop?.id,
          stopName: stop?.name,
          fallbackCoordinate,
        });
        finalCoordinate = fallbackCoordinate;
      } else {
        console.error('[SmartRouteMapRenderer] Cannot render marker: no valid coordinates:', {
          stopId: stop?.id,
          stopName: stop?.name,
          originalCoordinate: coordinate,
          fallbackCoordinate,
        });
        return null;
      }
    }
    
    const [lat, lng] = finalCoordinate;
    
    // КРИТИЧЕСКИЙ ФИКС: Проверяем наличие stop.id и stop.name
    if (!stop?.id || !stop?.name) {
      console.warn('[SmartRouteMapRenderer] Missing stop id or name:', {
        stopId: stop?.id,
        stopName: stop?.name,
        stop,
      });
      return null;
    }
    
    // Получаем опции маркера (используем переданный isTransfer или из stop)
    const markerOptions = getSmartMarkerOptions(
      stop.type,
      stop.isHub,
      stop.hubLevel,
      isTransfer || stop.isTransfer,
      stop.name
    );

    // Создаём popup контент с полной информацией
    const popupParts: string[] = [];
    popupParts.push(`<strong>${stop.name}</strong>`);
    
    // Тип остановки
    const stopTypeLabels: Record<string, string> = {
      airport: 'Аэропорт',
      train_station: 'Вокзал',
      bus_station: 'Автовокзал',
      ferry_pier: 'Пристань',
      winter_road_point: 'Точка зимника',
      taxi_stand: 'Точка такси',
    };
    popupParts.push(`Тип: ${stopTypeLabels[stop.type] || stop.type}`);
    
    // Информация о хабе
    if (stop.isHub && stop.hubLevel) {
      const hubLabel = stop.hubLevel === 'federal' ? 'Федеральный хаб' : 'Региональный хаб';
      popupParts.push(`Хаб: ${hubLabel}`);
    }
    
    // Информация о пересадке
    if (stop.isTransfer) {
      popupParts.push('Пересадка');
    }
    
    // Координаты
    popupParts.push(`Координаты: ${finalCoordinate[0].toFixed(6)}, ${finalCoordinate[1].toFixed(6)}`);

    // Создаём опции для IMapProvider
    const options: IMarkerOptions = {
      iconUrl: this.getMarkerIconUrl(markerOptions.icon),
      iconSize: markerOptions.size,
      iconAnchor: [markerOptions.size[0] / 2, markerOptions.size[1]],
      isTransfer: stop.isTransfer || false,
      popupContent: popupParts.join('<br>'),
      metadata: {
        stopId: stop.id,
        stopName: stop.name,
        stopType: stop.type,
        isHub: stop.isHub,
        hubLevel: stop.hubLevel,
        isTransfer: stop.isTransfer,
        coordinates: finalCoordinate,
      },
    };

    // Добавляем маркер на карту
    try {
      return this.mapProvider.addMarker(finalCoordinate, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SmartRouteMapRenderer] Error adding marker:', errorMessage, {
        stopId: stop.id,
        stopName: stop.name,
        coordinate: finalCoordinate,
        error,
      });
      return null;
    }
  }

  /**
   * ФАЗА 4 ФИКС: Получает fallback координаты для остановки на основе её названия
   * 
   * Расширенная база координат с поддержкой всех городов из маршрутов
   * Использует упрощённую логику для определения координат города
   * В будущем можно использовать API для получения точных координат
   */
  private getFallbackCoordinateForStop(
    stop: SmartRouteSegmentData['fromStop']
  ): Coordinate | null {
    if (!stop?.name) {
      return null;
    }

    // ФАЗА 4 ФИКС: Расширенная база координат всех городов из маршрутов
    // Включает все города, которые могут встречаться в маршрутах
    const cityCoordinates: Record<string, Coordinate> = {
      // Федеральные города
      'Москва': [55.7558, 37.6173],
      'Санкт-Петербург': [59.9343, 30.3351],
      'Новосибирск': [55.0084, 82.9357],
      'Красноярск': [56.0184, 92.8672],
      'Иркутск': [52.2864, 104.2807],
      
      // Города Якутии
      'Якутск': [62.0355, 129.6755],
      'Мирный': [62.5353, 113.9614],
      'Ленск': [60.7253, 114.9300],
      'Вилюйск': [63.7553, 121.6244],
      'Олёкминск': [60.3733, 120.4264],
      'Олекминск': [60.3733, 120.4264], // Альтернативное написание
      'Нижний Бестях': [61.9611, 129.9081],
      'Бестях': [61.9611, 129.9081],
      'Жиганск': [66.7683, 123.3714],
      'Тикси': [71.6900, 128.8700],
      'Нерюнгри': [56.6583, 124.7264],
      'Алдан': [58.6033, 125.3933],
      'Томмот': [58.9567, 126.2933],
      'Амга': [60.8967, 131.9783],
      'Верхоянск': [67.5500, 133.3900],
      'Верхоянск-Пассажирский': [67.5500, 133.3900],
      
      // Железнодорожные станции
      'Новосибирск-Главный': [55.0084, 82.9357],
      'Красноярск-Пассажирский': [56.0184, 92.8672],
      'Иркутск-Пассажирский': [52.2864, 104.2807],
      
      // Речные порты
      'Усть-Кут': [56.7933, 105.7767],
      'Киренск': [57.7853, 108.1114],
      'Ленск (порт)': [60.7253, 114.9300],
      
      // Аэропорты (используем координаты городов)
      'Якутск (аэропорт)': [62.0355, 129.6755],
      'Мирный (аэропорт)': [62.5353, 113.9614],
      'Новосибирск (аэропорт)': [55.0084, 82.9357],
      'Красноярск (аэропорт)': [56.0184, 92.8672],
      'Иркутск (аэропорт)': [52.2864, 104.2807],
    };

    // ФАЗА 4 ФИКС: Улучшенный поиск города по названию остановки
    // Поддерживает частичное совпадение и альтернативные названия
    const stopNameLower = stop.name.toLowerCase().trim();
    
    // Прямое совпадение
    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      const cityNameLower = cityName.toLowerCase();
      if (stopNameLower === cityNameLower) {
        return coords;
      }
    }
    
    // Частичное совпадение (название города содержится в названии остановки или наоборот)
    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      const cityNameLower = cityName.toLowerCase();
      if (stopNameLower.includes(cityNameLower) || cityNameLower.includes(stopNameLower)) {
        return coords;
      }
    }
    
    // Поиск по ключевым словам (для аэропортов, вокзалов и т.д.)
    const keywords: Record<string, Coordinate> = {
      'москва': [55.7558, 37.6173],
      'якутск': [62.0355, 129.6755],
      'мирный': [62.5353, 113.9614],
      'ленск': [60.7253, 114.9300],
      'вилюйск': [63.7553, 121.6244],
      'олёкминск': [60.3733, 120.4264],
      'новосибирск': [55.0084, 82.9357],
      'красноярск': [56.0184, 92.8672],
      'иркутск': [52.2864, 104.2807],
    };
    
    for (const [keyword, coords] of Object.entries(keywords)) {
      if (stopNameLower.includes(keyword)) {
        return coords;
      }
    }

    // Если не найдено, возвращаем координаты Якутска как центр региона
    console.warn('[SmartRouteMapRenderer] City not found in fallback coordinates, using Yakutsk:', {
      stopName: stop.name,
      stopId: stop.id,
    });
    return [62.0355, 129.6755];
  }

  /**
   * ФАЗА 4 ФИКС: Получает fallback координаты для хаба
   * 
   * Использует ту же логику, что и для остановок, но с поддержкой объектов Hub
   */
  private getFallbackCoordinateForHub(
    hub: { id?: string; name?: string; level?: 'federal' | 'regional' }
  ): Coordinate | null {
    if (!hub?.name && !hub?.id) {
      return null;
    }

    // Используем название хаба или его ID для поиска координат
    const hubName = hub.name || hub.id || '';
    
    // Создаём временный объект остановки для использования существующей логики
    const tempStop = {
      id: hub.id || 'hub-unknown',
      name: hubName,
      type: 'hub' as const,
      isHub: true,
      hubLevel: hub.level,
      isTransfer: false,
    };

    return this.getFallbackCoordinateForStop(tempStop);
  }

  /**
   * Создаёт контент для popup сегмента
   * 
   * Соответствует требованиям 12.4.2: Интерактивные подсказки
   * При наведении на сегмент показывает:
   * - Тип транспорта
   * - Расстояние
   * - Время в пути
   * - Цену
   * - Промежуточные точки (если есть)
   */
  private createSegmentPopupContent(
    segment: SmartRouteSegmentData,
    style: SmartPolylineStyle
  ): string {
    const parts: string[] = [];

    // Тип транспорта
    const transportLabels: Record<TransportType, string> = {
      [TransportType.AIRPLANE]: 'Самолёт',
      [TransportType.TRAIN]: 'Поезд',
      [TransportType.BUS]: 'Автобус',
      [TransportType.FERRY]: 'Паром',
      [TransportType.TAXI]: 'Такси',
      [TransportType.WINTER_ROAD]: 'Зимник',
      [TransportType.UNKNOWN]: 'Неизвестно',
    };
    parts.push(`<strong>${transportLabels[segment.transportType] || 'Транспорт'}</strong>`);

    // Маршрут
    parts.push(`${segment.fromStop.name} → ${segment.toStop.name}`);

    // Метаданные (расстояние, время, цена)
    if (segment.metadata) {
      if (segment.metadata.distance) {
        // Формат: "Расстояние: 400 км (по прямой)" для авиа
        const distanceText = segment.transportType === TransportType.AIRPLANE
          ? `${segment.metadata.distance.toFixed(0)} км (по прямой)`
          : `${segment.metadata.distance.toFixed(0)} км`;
        parts.push(`Расстояние: ${distanceText}`);
      }
      if (segment.metadata.duration) {
        // Формат: "Время: 1.5 часа" или "Время: 1ч 30м"
        const hours = Math.floor(segment.metadata.duration / 60);
        const minutes = segment.metadata.duration % 60;
        if (hours > 0 && minutes > 0) {
          parts.push(`Время: ${hours}ч ${minutes}м`);
        } else if (hours > 0) {
          parts.push(`Время: ${hours}ч`);
        } else {
          parts.push(`Время: ${minutes}м`);
        }
      }
      if (segment.metadata.price) {
        parts.push(`Цена: ${segment.metadata.price.toFixed(0)}₽`);
      }
      if (segment.metadata.departureTime) {
        parts.push(`Отправление: ${segment.metadata.departureTime}`);
      }
      if (segment.metadata.arrivalTime) {
        parts.push(`Прибытие: ${segment.metadata.arrivalTime}`);
      }
    }

    // Промежуточные точки (если есть в pathGeometry)
    if (segment.pathGeometry && segment.pathGeometry.length > 2) {
      const intermediateCount = segment.pathGeometry.length - 2;
      if (intermediateCount > 0) {
        parts.push(`Промежуточных точек: ${intermediateCount}`);
      }
    }

    return parts.join('<br>');
  }

  /**
   * Получает URL иконки маркера
   * 
   * Примечание: В реальном приложении можно использовать
   * кастомные SVG иконки или emoji-to-image конвертацию
   */
  private getMarkerIconUrl(icon: string): string {
    // Для emoji используем fallback на стандартные иконки Leaflet
    // В реальном приложении можно использовать кастомные SVG
    if (icon.startsWith('http') || icon.startsWith('/')) {
      return icon;
    }

    // Используем стандартную иконку Leaflet с цветом
    // В реальном приложении можно создать кастомные иконки
    return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
  }

  /**
   * Валидирует pathGeometry на наличие NaN/null/undefined значений
   * Фильтрует невалидные координаты и проверяет диапазоны
   * 
   * @param pathGeometry - Массив координат для валидации
   * @returns Валидированный массив координат или null, если невалиден
   */
  private validatePathGeometry(pathGeometry: Coordinate[]): Coordinate[] | null {
    if (!pathGeometry || !Array.isArray(pathGeometry) || pathGeometry.length === 0) {
      return null;
    }

    const validCoordinates: Coordinate[] = pathGeometry.filter((coord): coord is Coordinate => {
      if (!Array.isArray(coord) || coord.length !== 2) {
        return false;
      }
      const [lat, lng] = coord;
      return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng) &&
        lat !== null &&
        lng !== null &&
        lat !== undefined &&
        lng !== undefined &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
      );
    });

    // Минимум 2 координаты для построения пути
    if (validCoordinates.length < 2) {
      return null;
    }

    return validCoordinates;
  }

  /**
   * ФАЗА 3 ФИКС: Генерирует реалистичный путь вместо прямой линии
   * 
   * Для авиа: ломаная линия с промежуточными точками
   * Для других типов: путь с небольшими отклонениями для реалистичности
   * 
   * Валидирует входные координаты перед генерацией и всегда возвращает валидный путь
   */
  private generateRealisticPath(
    from: Coordinate,
    to: Coordinate,
    transportType: TransportType
  ): Coordinate[] {
    // ФАЗА 3 ФИКС: Валидируем входные координаты
    if (!this.isValidCoordinate(from) || !this.isValidCoordinate(to)) {
      console.error('[SmartRouteMapRenderer] Invalid input coordinates for generateRealisticPath:', {
        from,
        to,
        transportType,
        fromValid: this.isValidCoordinate(from),
        toValid: this.isValidCoordinate(to),
      });
      // ФАЗА 3 ФИКС: Возвращаем минимальный путь (прямая линия) только если координаты валидны
      if (this.isValidCoordinate(from) && this.isValidCoordinate(to)) {
        console.warn('[SmartRouteMapRenderer] Using straight line as fallback for generateRealisticPath:', {
          from,
          to,
          transportType,
        });
        return [from, to];
      }
      // ФАЗА 3 ФИКС: Если координаты невалидны, возвращаем пустой массив
      // Вызывающий код должен обработать это и использовать прямую линию или пропустить сегмент
      console.error('[SmartRouteMapRenderer] Cannot generate path: invalid coordinates:', {
        from,
        to,
        transportType,
      });
      return [];
    }

    const coordinates: Coordinate[] = [from];

    // Вычисляем расстояние
    const latDiff = to[0] - from[0];
    const lngDiff = to[1] - from[1];
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // ФАЗА 3 ФИКС: Проверяем, что расстояние валидно
    if (!isFinite(distance) || isNaN(distance) || distance <= 0) {
      console.warn('[SmartRouteMapRenderer] Invalid distance calculated, using straight line:', {
        from,
        to,
        distance,
        transportType,
        latDiff,
        lngDiff,
      });
      return [from, to];
    }

    // Количество промежуточных точек зависит от расстояния и типа транспорта
    let numPoints: number;
    if (transportType === TransportType.AIRPLANE) {
      // Для авиа: 2-3 промежуточные точки для ломаной линии
      numPoints = Math.max(2, Math.min(3, Math.ceil(distance * 10)));
    } else if (transportType === TransportType.TRAIN) {
      // Для ЖД: больше точек для плавной линии вдоль путей
      numPoints = Math.max(3, Math.min(5, Math.ceil(distance * 15)));
    } else if (transportType === TransportType.BUS) {
      // Для автобусов: среднее количество точек
      numPoints = Math.max(2, Math.min(4, Math.ceil(distance * 12)));
    } else {
      // Для остальных: минимальное количество
      numPoints = Math.max(2, Math.min(3, Math.ceil(distance * 10)));
    }

    // Генерируем промежуточные точки
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      let lat = from[0] + latDiff * t;
      let lng = from[1] + lngDiff * t;

      // Добавляем небольшие отклонения для реалистичности (кроме авиа)
      if (transportType !== TransportType.AIRPLANE) {
        // Отклонение зависит от типа транспорта
        const deviation = transportType === TransportType.TRAIN ? 0.002 : 0.001;
        const angle = Math.atan2(latDiff, lngDiff) + Math.PI / 2;
        const offset = Math.sin(t * Math.PI * 2) * deviation;
        lat += offset * Math.cos(angle);
        lng += offset * Math.sin(angle);
      } else {
        // Для авиа: более выраженные изломы для ломаной линии
        const deviation = 0.003;
        const angle = Math.atan2(latDiff, lngDiff) + Math.PI / 2;
        const offset = Math.sin(t * Math.PI * 3) * deviation;
        lat += offset * Math.cos(angle);
        lng += offset * Math.sin(angle);
      }

      // ФАЗА 3 ФИКС: Валидируем сгенерированные координаты
      const generatedCoord: Coordinate = [lat, lng];
      if (this.isValidCoordinate(generatedCoord)) {
        coordinates.push(generatedCoord);
      } else {
        console.warn('[SmartRouteMapRenderer] Generated invalid coordinate, skipping:', {
          lat,
          lng,
          t,
          transportType,
          from,
          to,
          latDiff,
          lngDiff,
        });
        // ФАЗА 3 ФИКС: Если координата невалидна, используем интерполяцию без отклонений
        const safeLat = from[0] + latDiff * t;
        const safeLng = from[1] + lngDiff * t;
        if (this.isValidCoordinate([safeLat, safeLng])) {
          coordinates.push([safeLat, safeLng]);
        }
      }
    }

    // Добавляем конечную точку (уже валидирована выше)
    coordinates.push(to);

    // ФАЗА 3 ФИКС: Финальная валидация всего пути
    const validatedPath = this.validatePathGeometry(coordinates);
    if (!validatedPath || validatedPath.length < 2) {
      console.warn('[SmartRouteMapRenderer] Generated path is invalid, using straight line:', {
        from,
        to,
        transportType,
        generatedCount: coordinates.length,
        coordinates,
      });
      // ФАЗА 3 ФИКС: Возвращаем прямую линию как последний резерв
      return [from, to];
    }

    console.log('[SmartRouteMapRenderer] Generated realistic path:', {
      transportType,
      from,
      to,
      coordinatesCount: validatedPath.length,
      firstCoord: validatedPath[0],
      lastCoord: validatedPath[validatedPath.length - 1],
    });

    return validatedPath;
  }

  /**
   * Проверяет, является ли координата валидной
   */
  private isValidCoordinate(coord: Coordinate): boolean {
    if (!coord || !Array.isArray(coord) || coord.length !== 2) {
      return false;
    }
    const [lat, lng] = coord;
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      isFinite(lat) &&
      isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Вычисляет границы маршрута
   */
  public static calculateBounds(route: SmartRouteData): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const allCoordinates: Coordinate[] = [];

    // Собираем все координаты из сегментов
    for (const segment of route.segments) {
      allCoordinates.push(segment.from);
      allCoordinates.push(segment.to);

      if (segment.pathGeometry) {
        allCoordinates.push(...segment.pathGeometry);
      }
    }

    if (allCoordinates.length === 0) {
      // Fallback границы (Якутия)
      return {
        north: 73.0,
        south: 55.0,
        east: 140.0,
        west: 105.0,
      };
    }

    const latitudes = allCoordinates.map((c) => c[0]);
    const longitudes = allCoordinates.map((c) => c[1]);

    return {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes),
    };
  }
}

