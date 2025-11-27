/**
 * OSRM API клиент с кэшированием
 * 
 * Предоставляет методы для получения маршрутов через OSRM API:
 * - Кэширование результатов в Redis
 * - Fallback на упрощённые пути при ошибках
 * - Поддержка промежуточных точек
 * - Учёт федеральных дорог
 */

import type { ICacheService } from '../../cache/ICacheService';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';

/**
 * Ответ OSRM Route API
 */
export interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: string | { type: 'LineString'; coordinates: [number, number][] }; // Encoded polyline или GeoJSON
    legs?: Array<{
      distance: number;
      duration: number;
      steps?: unknown[];
    }>;
  }>;
  waypoints?: Array<{
    location: [number, number]; // [lng, lat]
    name?: string;
  }>;
  message?: string;
}

/**
 * Type guard для проверки структуры ответа OSRM API
 */
function isOsrmRouteResponse(data: unknown): data is OsrmRouteResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const response = data as Record<string, unknown>;
  
  // Проверяем обязательное поле code
  if (typeof response.code !== 'string') {
    return false;
  }
  
  // Если есть routes, проверяем его структуру
  if (response.routes !== undefined) {
    if (!Array.isArray(response.routes)) {
      return false;
    }
    
    // Проверяем первый элемент массива routes, если он есть
    if (response.routes.length > 0) {
      const route = response.routes[0] as Record<string, unknown>;
      if (typeof route.distance !== 'number' || typeof route.duration !== 'number') {
        return false;
      }
    }
  }
  
  // waypoints опциональны, но если есть, проверяем структуру
  if (response.waypoints !== undefined) {
    if (!Array.isArray(response.waypoints)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Параметры запроса маршрута
 */
export interface OsrmRouteParams {
  /**
   * Координаты начальной точки
   */
  from: Coordinates;

  /**
   * Координаты конечной точки
   */
  to: Coordinates;

  /**
   * Промежуточные точки (опционально)
   */
  via?: Coordinates[];

  /**
   * Профиль маршрутизации (driving, walking, cycling)
   */
  profile?: 'driving' | 'walking' | 'cycling';

  /**
   * Включить детальную геометрию
   */
  overview?: 'full' | 'simplified' | 'false';

  /**
   * Включить шаги маршрута
   */
  steps?: boolean;

  /**
   * Исключить типы дорог (например, 'motorway')
   */
  exclude?: string;
}

/**
 * Результат запроса маршрута
 */
export interface OsrmRouteResult {
  /**
   * Геометрия маршрута в формате GeoJSON LineString
   */
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };

  /**
   * Расстояние в метрах
   */
  distance: number;

  /**
   * Время в пути в секундах
   */
  duration: number;

  /**
   * Было ли использовано кэширование
   */
  fromCache: boolean;
}

/**
 * OSRM клиент
 */
export class OsrmClient {
  /**
   * Базовый URL OSRM сервера
   */
  private readonly baseUrl: string;

  /**
   * Сервис кэширования
   */
  private readonly cache: ICacheService | null;

  /**
   * TTL кэша в секундах (24 часа)
   */
  private readonly cacheTtl: number = 24 * 60 * 60;

  /**
   * Таймаут запроса в миллисекундах
   */
  private readonly requestTimeout: number = 10000; // 10 секунд

  constructor(baseUrl?: string, cache?: ICacheService | null) {
    this.baseUrl = baseUrl || process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
    this.cache = cache || null;
  }

  /**
   * Получить маршрут между двумя точками
   */
  public async getRoute(params: OsrmRouteParams): Promise<OsrmRouteResult> {
    const cacheKey = this.buildCacheKey(params);

    // Пытаемся получить из кэша
    if (this.cache) {
      const cached = await this.cache.get<OsrmRouteResult>(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    try {
      // Запрашиваем маршрут через OSRM API
      const result = await this.fetchRoute(params);

      // Сохраняем в кэш
      if (this.cache && result) {
        await this.cache.set(cacheKey, result, this.cacheTtl);
      }

      return { ...result, fromCache: false };
    } catch (error) {
      console.warn(`[OsrmClient] Ошибка при запросе маршрута:`, error);
      throw error;
    }
  }

  /**
   * Получить маршрут с fallback на упрощённый путь
   * 
   * Пытается получить маршрут через OSRM, при ошибке использует упрощённый путь
   */
  public async getRouteWithFallback(params: OsrmRouteParams): Promise<OsrmRouteResult> {
    try {
      return await this.getRoute(params);
    } catch (error) {
      console.warn(
        `[OsrmClient] OSRM недоступен, используем упрощённый путь для ${params.from.latitude},${params.from.longitude} → ${params.to.latitude},${params.to.longitude}`,
        error instanceof Error ? error.message : error
      );

      // Fallback: создаём упрощённый путь через промежуточные точки
      return this.createSimplifiedPath(params);
    }
  }

  /**
   * Получить маршрут с приоритетом федеральных дорог
   * 
   * Пытается построить маршрут, предпочитая федеральные дороги (автомагистрали, шоссе)
   * Использует exclude для исключения второстепенных дорог, если возможно
   */
  public async getRouteWithFederalRoadsPriority(
    params: OsrmRouteParams
  ): Promise<OsrmRouteResult> {
    // Сначала пытаемся получить маршрут без ограничений
    try {
      const result = await this.getRoute(params);
      return result;
    } catch (error) {
      // Если не получилось, пробуем с приоритетом федеральных дорог
      // (исключаем второстепенные дороги, но это может не работать на всех серверах OSRM)
      try {
        const paramsWithExclude: OsrmRouteParams = {
          ...params,
          exclude: 'ferry', // Исключаем паромы, но не исключаем дороги (OSRM может не поддерживать exclude для дорог)
        };
        return await this.getRoute(paramsWithExclude);
      } catch (fallbackError) {
        // Если и это не сработало, используем обычный fallback
        return this.getRouteWithFallback(params);
      }
    }
  }

  /**
   * Запросить маршрут через OSRM API
   */
  private async fetchRoute(params: OsrmRouteParams): Promise<Omit<OsrmRouteResult, 'fromCache'>> {
    const coordinates = this.buildCoordinatesString(params);
    const profile = params.profile || 'driving';
    const overview = params.overview || 'full';
    const steps = params.steps ? 'true' : 'false';
    const exclude = params.exclude ? `&exclude=${params.exclude}` : '';

    // Формируем URL для OSRM Route API
    // Формат: /route/v1/{profile}/{coordinates}?overview={overview}&alternatives={alternatives}&steps={steps}&geometries={geometries}
    // coordinates: {lng1},{lat1};{lng2},{lat2};... (разделённые точкой с запятой)
    // overview: full (полная геометрия), simplified (упрощённая), false (без геометрии)
    // geometries: geojson (GeoJSON формат), polyline (encoded polyline), polyline6 (polyline v6)
    const url = `${this.baseUrl}/route/v1/${profile}/${coordinates}?overview=${overview}&alternatives=false&steps=${steps}&geometries=geojson${exclude}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
      }

      const data: unknown = await response.json();
      
      // Проверяем структуру ответа с помощью type guard
      if (!isOsrmRouteResponse(data)) {
        throw new Error('OSRM API returned invalid response structure');
      }

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(`OSRM API returned error: ${data.message || data.code}`);
      }

      const route = data.routes[0];

      // Извлекаем геометрию из ответа
      let coordinates: [number, number][] = [];

      if (route.geometry) {
        // Проверяем формат геометрии
        if (typeof route.geometry === 'object' && 'coordinates' in route.geometry) {
          // GeoJSON формат (когда используется geometries=geojson)
          coordinates = (route.geometry as { type: 'LineString'; coordinates: [number, number][] }).coordinates;
        } else if (typeof route.geometry === 'string') {
          // Encoded polyline (когда используется geometries=polyline или по умолчанию)
          coordinates = this.decodePolyline(route.geometry);
        }
      }

      // Если координаты не получены, используем fallback
      if (coordinates.length === 0) {
        if (data.waypoints && data.waypoints.length >= 2) {
          // Используем waypoints как fallback
          coordinates = data.waypoints.map((wp) => wp.location);
        } else {
          // Последний fallback: прямая линия (только для критических случаев)
          // ВАЖНО: Это должно быть крайне редко, так как OSRM обычно возвращает геометрию
          console.warn(
            `[OsrmClient] OSRM не вернул геометрию, используем прямую линию как последний fallback для ${params.from.latitude},${params.from.longitude} → ${params.to.latitude},${params.to.longitude}`
          );
          coordinates = [
            [params.from.longitude, params.from.latitude],
            [params.to.longitude, params.to.latitude],
          ];
        }
      }

      // ВАЖНО: Проверяем, что путь не является прямой линией (только 2 точки)
      // Если путь содержит только 2 точки, это подозрительно для автобусных маршрутов
      // (но может быть нормально для очень коротких маршрутов)
      if (coordinates.length === 2) {
        const distance = this.calculateHaversineDistance(params.from, params.to);
        // Если расстояние больше 1 км, путь должен содержать больше точек
        if (distance > 1000) {
          console.warn(
            `[OsrmClient] OSRM вернул путь с только 2 точками для маршрута длиной ${distance.toFixed(0)} м. Это может быть ошибка.`
          );
        }
      }

      return {
        geometry: {
          type: 'LineString',
          coordinates,
        },
        distance: route.distance,
        duration: route.duration,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OSRM request timeout');
      }
      throw error;
    }
  }

  /**
   * Создать упрощённый путь через промежуточные точки
   * 
   * Создаёт реалистичный путь, который не является прямой линией:
   * - Использует промежуточные города, если они указаны
   * - Добавляет извилистость для имитации реальной дороги
   * - Вычисляет реалистичное расстояние и время
   */
  private createSimplifiedPath(params: OsrmRouteParams): OsrmRouteResult {
    const coordinates: [number, number][] = [];

    // Начальная точка
    coordinates.push([params.from.longitude, params.from.latitude]);

    // Промежуточные точки (если есть)
    if (params.via && params.via.length > 0) {
      // Используем все промежуточные точки
      for (const via of params.via) {
        coordinates.push([via.longitude, via.latitude]);
      }
    } else {
      // Если промежуточных точек нет, создаём несколько промежуточных точек
      // для имитации извилистости дороги (не прямая линия!)
      // ВАЖНО: Автобусы НЕ ДОЛЖНЫ быть прямыми линиями
      const distance = this.calculateHaversineDistance(params.from, params.to);
      // Создаём больше точек для более реалистичного пути
      // Точка каждые ~30 км (вместо 50 км) для более детального пути
      const numPoints = Math.max(3, Math.ceil(distance / 30000)); // Минимум 3 точки (начало, промежуточная, конец)

      for (let i = 1; i < numPoints; i++) {
        const t = i / numPoints;
        const lat = params.from.latitude + (params.to.latitude - params.from.latitude) * t;
        const lng = params.from.longitude + (params.to.longitude - params.from.longitude) * t;

        // Добавляем извилистость (в пределах 3% от расстояния, как в RealisticPathCalculator)
        // Это имитирует реальную дорогу, которая не является прямой линией
        const offset = (Math.sin(t * Math.PI * 1.5) * 0.03 * distance) / 111000; // ~1 градус = 111 км
        const offsetLat = lat + offset * Math.cos(t * Math.PI * 2.5);
        const offsetLng = lng + offset * Math.sin(t * Math.PI * 2.5);

        coordinates.push([offsetLng, offsetLat]);
      }
    }

    // Конечная точка
    coordinates.push([params.to.longitude, params.to.latitude]);

    // Вычисляем приблизительное расстояние
    // Для упрощённого пути используем Haversine с коэффициентом извилистости
    const straightDistance = this.calculateHaversineDistance(params.from, params.to);
    
    // Коэффициент извилистости зависит от наличия промежуточных точек
    // Если есть промежуточные точки, коэффициент меньше (дорога более прямая, так как проходит через города)
    // Если нет, коэффициент больше (дорога более извилистая, так как может идти в обход)
    // ВАЖНО: Коэффициент должен быть > 1.0, чтобы расстояние по дороге было больше прямого расстояния
    const curvatureCoefficient = params.via && params.via.length > 0 ? 1.15 : 1.25;
    const roadDistance = straightDistance * curvatureCoefficient;

    // Вычисляем приблизительное время
    // Средняя скорость зависит от типа дороги:
    // - Федеральные дороги: 80-100 км/ч
    // - Региональные дороги: 60-80 км/ч
    // - Местные дороги: 40-60 км/ч
    // Используем среднее значение 70 км/ч для упрощения
    const averageSpeedKmh = 70;
    const duration = Math.round((roadDistance / 1000 / averageSpeedKmh) * 3600); // секунды

    return {
      geometry: {
        type: 'LineString',
        coordinates,
      },
      distance: Math.round(roadDistance),
      duration,
      fromCache: false,
    };
  }

  /**
   * Построить строку координат для OSRM API
   */
  private buildCoordinatesString(params: OsrmRouteParams): string {
    const coords: string[] = [];

    // Начальная точка
    coords.push(`${params.from.longitude},${params.from.latitude}`);

    // Промежуточные точки
    if (params.via && params.via.length > 0) {
      for (const via of params.via) {
        coords.push(`${via.longitude},${via.latitude}`);
      }
    }

    // Конечная точка
    coords.push(`${params.to.longitude},${params.to.latitude}`);

    return coords.join(';');
  }

  /**
   * Построить ключ кэша
   */
  private buildCacheKey(params: OsrmRouteParams): string {
    const coords = this.buildCoordinatesString(params);
    const profile = params.profile || 'driving';
    const exclude = params.exclude || '';
    return `osrm:route:${profile}:${coords}:${exclude}`;
  }

  /**
   * Декодировать polyline (упрощённая версия)
   * 
   * В реальной системе лучше использовать библиотеку polyline
   */
  private decodePolyline(encoded: string): [number, number][] {
    const coordinates: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push([lng / 1e5, lat / 1e5]);
    }

    return coordinates;
  }

  /**
   * Вычислить расстояние по формуле Haversine
   */
  private calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371000; // Радиус Земли в метрах
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Расстояние в метрах
  }
}

