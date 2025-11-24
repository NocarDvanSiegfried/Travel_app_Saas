/**
 * BuildRouteMapDataUseCase
 * 
 * Use Case для обогащения маршрута данными для отображения на карте.
 * 
 * Обеспечивает:
 * - Загрузку координат остановок (real/virtual/unified reference fallback)
 * - Построение полилиний для сегментов маршрута
 * - Расчёт границ карты (bounds)
 * - Определение transfer точек
 * - Генерацию полных данных для каждого сегмента
 * 
 * @module application/route-builder/use-cases
 */

import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IBuiltRoute, IRouteSegmentDetails } from '../../../domain/entities/BuiltRoute';
import type { RealStop, VirtualStop } from '../../../domain/entities';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { getLogger } from '../../../shared/logger/Logger';
import {
  buildGreatCirclePolyline,
  buildStraightPolyline,
  calculateDistance,
  type Coordinate,
} from '../../../shared/utils/polyline-builder';
import { getUnifiedCity } from '../../../shared/utils/unified-cities-loader';
import { extractCityFromStopName } from '../../../shared/utils/city-normalizer';

/**
 * Default coordinates для Якутии (центр региона)
 */
const DEFAULT_COORDINATES: Coordinate = [62.0, 129.0];

/**
 * Padding для границ карты (15% с каждой стороны)
 */
const BOUNDS_PADDING = 0.15;

/**
 * Минимальный padding для границ (если все координаты одинаковы)
 */
const MIN_BOUNDS_PADDING = 0.1;

/**
 * Данные остановки для карты
 */
export interface StopMapData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cityName: string;
  isTransfer: boolean;
}

/**
 * Данные полилинии для сегмента
 */
export interface PolylineData {
  coordinates: Coordinate[];
}

/**
 * Данные сегмента маршрута для карты
 */
export interface RouteSegmentMapData {
  segmentId: string;
  transportType: TransportType;
  fromStop: StopMapData;
  toStop: StopMapData;
  polyline: PolylineData;
  distance: number; // км
  duration: number; // минуты
  price: number;
  departureTime: string;
  arrivalTime: string;
}

/**
 * Границы карты
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Ответ Use Case с данными для карты
 */
export interface RouteMapDataResponse {
  routeId: string;
  fromCity: string;
  toCity: string;
  segments: RouteSegmentMapData[];
  bounds: MapBounds;
  totalDistance: number; // км
  totalDuration: number; // минуты
}

/**
 * Запрос на построение данных карты
 */
export interface BuildRouteMapDataRequest {
  route: IBuiltRoute;
}

/**
 * BuildRouteMapDataUseCase
 * 
 * Clean Architecture Use Case для обогащения маршрута данными карты.
 * 
 * @class
 */
export class BuildRouteMapDataUseCase {
  private readonly logger = getLogger('BuildRouteMapDataUseCase');

  constructor(private readonly stopRepository: IStopRepository) {}

  /**
   * Выполнить построение данных карты для маршрута
   * 
   * @param request - Запрос с маршрутом
   * @returns Данные для отображения маршрута на карте
   * @throws Error если маршрут невалиден или не может быть обработан
   */
  public async execute(request: BuildRouteMapDataRequest): Promise<RouteMapDataResponse> {
    const startTime = Date.now();

    try {
      // ====================================================================
      // Step 1: Валидация входных данных
      // ====================================================================
      this.validateRequest(request.route);

      // ====================================================================
      // Step 2: Инициализация структур данных
      // ====================================================================
      const segments: RouteSegmentMapData[] = [];
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;
      let totalDistance = 0;
      const processedStopIds = new Set<string>();

      // ====================================================================
      // Step 3: Обработка каждого сегмента
      // ====================================================================
      for (let i = 0; i < request.route.segments.length; i++) {
        const segment = request.route.segments[i];
        const previousSegment = i > 0 ? request.route.segments[i - 1] : undefined;

        try {
          const segmentMapData = await this.processSegment(
            segment,
            previousSegment,
            processedStopIds
          );

          segments.push(segmentMapData);
          totalDistance += segmentMapData.distance;

          // Обновление bounds
          for (const [lat, lng] of segmentMapData.polyline.coordinates) {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          }
        } catch (error) {
          this.logger.error('Failed to process segment', error as Error, {
            segmentId: segment.segment.segmentId,
            fromStopId: segment.segment.fromStopId,
            toStopId: segment.segment.toStopId,
          });
          // Пропускаем сегмент, но продолжаем обработку остальных
        }
      }

      // Проверка, что хотя бы один сегмент обработан
      if (segments.length === 0) {
        throw new Error('All segments failed to process');
      }

      // ====================================================================
      // Step 4: Расчёт общих границ карты
      // ====================================================================
      const bounds = this.calculateBounds(minLat, maxLat, minLng, maxLng);

      // ====================================================================
      // Step 5: Формирование ответа
      // ====================================================================
      const response: RouteMapDataResponse = {
        routeId: request.route.routeId,
        fromCity: request.route.fromCity,
        toCity: request.route.toCity,
        segments,
        bounds,
        totalDistance: Math.round(totalDistance * 100) / 100, // Округление до 2 знаков
        totalDuration: request.route.totalDuration,
      };

      const duration = Date.now() - startTime;
      this.logger.debug('Route map data built successfully', {
        routeId: request.route.routeId,
        segmentsCount: segments.length,
        totalDistance: response.totalDistance,
        duration_ms: duration,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to build route map data', error as Error, {
        routeId: request.route?.routeId,
        duration_ms: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Валидация входных данных маршрута
   * 
   * @param route - Маршрут для валидации
   * @throws Error если маршрут невалиден
   */
  private validateRequest(route: IBuiltRoute): void {
    if (!route) {
      throw new Error('Route is required');
    }

    if (!route.routeId || route.routeId.trim().length === 0) {
      throw new Error('Route routeId is required');
    }

    if (!route.segments || !Array.isArray(route.segments) || route.segments.length === 0) {
      throw new Error('Route segments array is empty');
    }

    if (!route.fromCity || route.fromCity.trim().length === 0) {
      throw new Error('Route fromCity is required');
    }

    if (!route.toCity || route.toCity.trim().length === 0) {
      throw new Error('Route toCity is required');
    }

    // Валидация каждого сегмента
    for (const segment of route.segments) {
      if (!segment.segment) {
        throw new Error('Segment data is required');
      }

      if (!segment.segment.fromStopId || segment.segment.fromStopId.trim().length === 0) {
        throw new Error('Segment fromStopId is required');
      }

      if (!segment.segment.toStopId || segment.segment.toStopId.trim().length === 0) {
        throw new Error('Segment toStopId is required');
      }
    }
  }

  /**
   * Обработка одного сегмента маршрута
   * 
   * @param segment - Сегмент маршрута
   * @param previousSegment - Предыдущий сегмент (для определения transfer точек)
   * @param processedStopIds - Set обработанных остановок
   * @returns Данные сегмента для карты
   */
  private async processSegment(
    segment: IRouteSegmentDetails,
    previousSegment: IRouteSegmentDetails | undefined,
    processedStopIds: Set<string>
  ): Promise<RouteSegmentMapData> {
    // Загрузка координат остановок
    const fromCoord = await this.loadStopCoordinates(
      segment.segment.fromStopId,
      segment.segment.fromStopId // Используем stopId как fallback для имени
    );

    const toCoord = await this.loadStopCoordinates(
      segment.segment.toStopId,
      segment.segment.toStopId
    );

    // Определение типа транспорта и построение полилинии
    const transportType = segment.segment.transportType;
    const polyline = this.buildPolylineForSegment(fromCoord, toCoord, transportType);

    // Расчёт расстояния
    const distance = calculateDistance(fromCoord, toCoord);

    // Определение transfer точек
    const fromIsTransfer = previousSegment
      ? previousSegment.segment.toStopId === segment.segment.fromStopId
      : false;
    const toIsTransfer = processedStopIds.has(segment.segment.toStopId);

    // Отметка остановок как обработанных
    processedStopIds.add(segment.segment.fromStopId);
    processedStopIds.add(segment.segment.toStopId);

    // Загрузка названий остановок и городов
    const fromStopData = await this.loadStopData(segment.segment.fromStopId);
    const toStopData = await this.loadStopData(segment.segment.toStopId);

    // Формирование данных сегмента
    return {
      segmentId: segment.segment.segmentId,
      transportType,
      fromStop: {
        id: segment.segment.fromStopId,
        name: fromStopData.name,
        latitude: fromCoord[0],
        longitude: fromCoord[1],
        cityName: fromStopData.cityName,
        isTransfer: fromIsTransfer,
      },
      toStop: {
        id: segment.segment.toStopId,
        name: toStopData.name,
        latitude: toCoord[0],
        longitude: toCoord[1],
        cityName: toStopData.cityName,
        isTransfer: toIsTransfer,
      },
      polyline: {
        coordinates: polyline,
      },
      distance,
      duration: segment.duration,
      price: segment.price,
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
    };
  }

  /**
   * Загрузка координат остановки с fallback механизмом
   * 
   * Приоритет источников:
   * 1. Real Stop (PostgreSQL)
   * 2. Virtual Stop (PostgreSQL)
   * 3. Unified Cities Reference (по cityId из остановки или из названия)
   * 4. Default Coordinates
   * 
   * @param stopId - ID остановки
   * @param stopName - Название остановки (опционально, для fallback)
   * @returns Координаты [lat, lng]
   */
  private async loadStopCoordinates(
    stopId: string,
    stopName?: string
  ): Promise<Coordinate> {
    // Загружаем остановки один раз и явно типизируем для избежания never
    const realStop: RealStop | undefined = await this.stopRepository.findRealStopById(stopId);
    const virtualStop: VirtualStop | undefined = await this.stopRepository.findVirtualStopById(stopId);

    // Попытка 1: Real Stop с валидными координатами
    if (realStop && isFinite(realStop.latitude) && isFinite(realStop.longitude)) {
      return [realStop.latitude, realStop.longitude];
    }

    // Попытка 2: Virtual Stop с валидными координатами
    if (virtualStop && isFinite(virtualStop.latitude) && isFinite(virtualStop.longitude)) {
      return [virtualStop.latitude, virtualStop.longitude];
    }

    // Попытка 3: Unified Cities Reference
    // Используем cityId из остановок (если они были загружены, но координаты отсутствуют)
    let cityName: string | null = null;

    // Проверяем cityId из остановок (явная проверка типов гарантирует корректный тип)
    if (realStop && realStop.cityId) {
      cityName = realStop.cityId;
    } else if (virtualStop && virtualStop.cityId) {
      cityName = virtualStop.cityId;
    } else if (stopName) {
      cityName = extractCityFromStopName(stopName);
    } else {
      // Пробуем извлечь из stopId (может содержать название города)
      cityName = extractCityFromStopName(stopId);
    }

    if (cityName) {
      const unifiedCity = getUnifiedCity(cityName);
      if (unifiedCity) {
        this.logger.warn('Using unified city coordinates as fallback', {
          stopId,
          cityName,
          coordinates: [unifiedCity.latitude, unifiedCity.longitude],
        });
        return [unifiedCity.latitude, unifiedCity.longitude];
      }
    }

    // Попытка 4: Default Coordinates
    this.logger.error('Using default coordinates as last resort', undefined, {
      stopId,
      stopName,
      cityName,
      defaultCoordinates: DEFAULT_COORDINATES,
    });
    return DEFAULT_COORDINATES;
  }

  /**
   * Загрузка данных остановки (название и город)
   * 
   * @param stopId - ID остановки
   * @returns Объект с названием остановки и названием города
   */
  private async loadStopData(stopId: string): Promise<{ name: string; cityName: string }> {
    // Попытка загрузить real stop
    const realStop = await this.stopRepository.findRealStopById(stopId);
    if (realStop) {
      return {
        name: realStop.name,
        cityName: realStop.cityId || extractCityFromStopName(realStop.name) || '',
      };
    }

    // Попытка загрузить virtual stop
    const virtualStop = await this.stopRepository.findVirtualStopById(stopId);
    if (virtualStop) {
      return {
        name: virtualStop.name,
        cityName: virtualStop.cityId || extractCityFromStopName(virtualStop.name) || '',
      };
    }

    // Fallback: извлечение из stopId
    const cityName = extractCityFromStopName(stopId);
    return {
      name: stopId, // Используем stopId как название, если остановка не найдена
      cityName: cityName || '',
    };
  }

  /**
   * Построение полилинии для сегмента в зависимости от типа транспорта
   * 
   * @param from - Начальная точка [lat, lng]
   * @param to - Конечная точка [lat, lng]
   * @param transportType - Тип транспорта
   * @returns Массив координат полилинии
   */
  private buildPolylineForSegment(
    from: Coordinate,
    to: Coordinate,
    transportType: TransportType
  ): Coordinate[] {
    // Для авиамаршрутов используем Great Circle
    if (transportType === TransportType.AIRPLANE) {
      const distance = calculateDistance(from, to);
      // Определяем количество шагов на основе расстояния
      const steps = distance > 1000 ? 100 : distance > 10 ? 50 : 10;
      return buildGreatCirclePolyline(from, to, { steps });
    }

    // Для остальных типов транспорта - прямая линия
    return buildStraightPolyline(from, to);
  }

  /**
   * Расчёт границ карты с padding
   * 
   * @param minLat - Минимальная широта
   * @param maxLat - Максимальная широта
   * @param minLng - Минимальная долгота
   * @param maxLng - Максимальная долгота
   * @returns Границы карты
   */
  private calculateBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ): MapBounds {
    // Проверка на валидность координат
    if (
      !isFinite(minLat) ||
      !isFinite(maxLat) ||
      !isFinite(minLng) ||
      !isFinite(maxLng)
    ) {
      throw new Error('No valid coordinates found for bounds calculation');
    }

    // Если все координаты одинаковы (одна точка)
    if (minLat === maxLat && minLng === maxLng) {
      return {
        north: maxLat + MIN_BOUNDS_PADDING,
        south: minLat - MIN_BOUNDS_PADDING,
        east: maxLng + MIN_BOUNDS_PADDING,
        west: minLng - MIN_BOUNDS_PADDING,
      };
    }

    // Вычисление разниц
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;

    // Добавление padding (15%)
    const latPadding = latDiff * BOUNDS_PADDING;
    const lngPadding = lngDiff * BOUNDS_PADDING;

    // Обработка пересечения 180-го меридиана
    let east = maxLng + lngPadding;
    let west = minLng - lngPadding;

    // Нормализация долготы
    if (east > 180) {
      east = 180;
    }
    if (west < -180) {
      west = -180;
    }

    // Обработка полярных регионов
    let north = maxLat + latPadding;
    let south = minLat - latPadding;

    if (north > 90) {
      north = 90;
    }
    if (south < -90) {
      south = -90;
    }

    return {
      north,
      south,
      east,
      west,
    };
  }
}

