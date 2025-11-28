/**
 * Адаптер для конвертации умных маршрутов из backend формата в frontend формат
 * 
 * Преобразует SmartRoute (backend) в SmartRouteData (frontend) для визуализации
 * 
 * @module routes/lib
 */

import type { SmartRouteSegmentData, SmartRouteData } from '../features/route-map/lib/smart-route-map-renderer';
import type { Coordinate } from '../domain/map-types';
import { TransportType } from '../domain/types';

/**
 * Тип SmartRoute из backend (упрощённая версия для адаптера)
 * 
 * Соответствует структуре ответа от POST /smart-routes/build
 */
export interface BackendSmartRoute {
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
    id?: string; // Backend возвращает id, а не segmentId
    segmentId?: string; // Для обратной совместимости
    type?: string; // Может отсутствовать, используем fallback
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
    // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт viaHubs как массив полных объектов Hub.toJSON() с полями { id, name, level, ... }
    viaHubs?: Array<{
      id?: string;
      name?: string;
      level?: 'federal' | 'regional';
      [key: string]: unknown;
    }>;
    // КРИТИЧЕСКИЙ ФИКС: Backend может отдавать pathGeometry как объект { type, coordinates } или массив координат
    pathGeometry?: {
      type?: string;
      coordinates?: Array<[number, number]>;
    } | Array<[number, number]>;
    schedule?: {
      departureTime?: string;
      arrivalTime?: string;
    };
    seasonality?: {
      available: boolean;
      season: string;
    };
    // ФАЗА 4: Backend может отдавать riskScore для сегмента
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
    // Предупреждения и валидация сегмента
    warnings?: string[];
    validation?: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  }>;
  // ФАЗА 4: Backend может отдавать riskScore для всего маршрута (максимум среди сегментов)
  riskScore?: {
    value: number;
    level: string;
    description: string;
  };
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
}

/**
 * ФАЗА 2 ФИКС: Конвертирует координаты из backend формата в frontend формат
 * Добавлена валидация координат перед конвертацией
 */
function convertCoordinates(
  coords?: { latitude?: number; longitude?: number } | null
): Coordinate | null {
  if (!coords) {
    return null;
  }
  
  const lat = coords.latitude;
  const lng = coords.longitude;
  
  // Валидация координат
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return null;
  }
  
  // Проверка диапазонов
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  
  return [lat, lng];
}

/**
 * ФАЗА 2 ФИКС: Конвертирует pathGeometry из backend формата в frontend формат
 * 
 * Backend отдаёт pathGeometry в формате GeoJSON:
 * - объект { type: 'LineString', coordinates: Array<[longitude, latitude]> }
 * - координаты в формате [longitude, latitude] (GeoJSON стандарт)
 * 
 * Frontend ожидает формат [latitude, longitude]
 * 
 * Улучшена валидация и определение формата координат
 */
function convertPathGeometry(
  pathGeometry?: { coordinates?: Array<[number, number]> } | Array<[number, number]>,
  fromCoords?: Coordinate | null,
  toCoords?: Coordinate | null
): Coordinate[] | undefined {
  if (!pathGeometry) {
    // ФАЗА 2 ФИКС: Если pathGeometry отсутствует, возвращаем undefined
    // Рендерер карты использует fallback на прямую линию между from и to
    return undefined;
  }

  let coordsArray: Array<[number, number]> | undefined;

  // Если pathGeometry - массив координат
  if (Array.isArray(pathGeometry)) {
    coordsArray = pathGeometry;
  }
  // Если pathGeometry - объект с coordinates
  else if (typeof pathGeometry === 'object' && pathGeometry !== null && 'coordinates' in pathGeometry) {
    const pathGeoObj = pathGeometry as { coordinates?: Array<[number, number]> };
    if (Array.isArray(pathGeoObj.coordinates)) {
      coordsArray = pathGeoObj.coordinates;
    }
  }

  if (!coordsArray || coordsArray.length < 2) {
    return undefined;
  }

  // ФАЗА 2 ФИКС: Улучшенная валидация и конвертация координат
  const validCoords = coordsArray
    .filter((coord): coord is [number, number] => {
      if (!Array.isArray(coord) || coord.length !== 2) {
        return false;
      }
      const val1 = coord[0];
      const val2 = coord[1];
      return (
        typeof val1 === 'number' &&
        typeof val2 === 'number' &&
        !isNaN(val1) &&
        !isNaN(val2) &&
        isFinite(val1) &&
        isFinite(val2)
      );
    })
    .map((coord) => {
      const val1 = coord[0];
      const val2 = coord[1];

      // ФАЗА 2 ФИКС: Улучшенное определение формата координат
      // Проверяем, является ли первый элемент longitude (диапазон [-180, 180])
      // и второй элемент latitude (диапазон [-90, 90])
      const isLongitudeFirst =
        val1 >= -180 &&
        val1 <= 180 &&
        val2 >= -90 &&
        val2 <= 90 &&
        // Дополнительная проверка: longitude обычно больше по модулю для России
        (Math.abs(val1) > 90 || (val1 >= -90 && val1 <= 90 && Math.abs(val2) < 90));

      // Если есть fromCoords и toCoords, используем их для проверки формата
      if (fromCoords && toCoords) {
        const fromLat = fromCoords[0];
        const fromLng = fromCoords[1];
        const toLat = toCoords[0];
        const toLng = toCoords[1];

        // Проверяем, совпадает ли первая координата pathGeometry с fromCoords
        const matchesFromAsLatLng = Math.abs(val1 - fromLat) < 0.1 && Math.abs(val2 - fromLng) < 0.1;
        const matchesFromAsLngLat = Math.abs(val1 - fromLng) < 0.1 && Math.abs(val2 - fromLat) < 0.1;

        if (matchesFromAsLngLat) {
          // Формат [longitude, latitude] - конвертируем
          const lat = val2;
          const lng = val1;
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return [lat, lng] as [number, number];
          }
        } else if (matchesFromAsLatLng) {
          // Уже в формате [latitude, longitude]
          return coord as [number, number];
        }
      }

      // Если не удалось определить по fromCoords/toCoords, используем эвристику
      if (isLongitudeFirst) {
        // Backend формат: [longitude, latitude] -> Frontend: [latitude, longitude]
        const lat = val2;
        const lng = val1;
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return [lat, lng] as [number, number];
        }
        return null;
      } else {
        // Уже в формате [latitude, longitude] или невалидные координаты
        if (val1 >= -90 && val1 <= 90 && val2 >= -180 && val2 <= 180) {
          return coord as [number, number];
        }
        return null;
      }
    })
    .filter((coord): coord is [number, number] => coord !== null);

  if (validCoords.length < 2) {
    return undefined;
  }

  return validCoords;
}

/**
 * Конвертирует тип транспорта из backend формата в frontend enum
 * КРИТИЧЕСКИЙ ФИКС: Добавлена проверка на undefined/null
 */
function convertTransportType(backendType: string | undefined | null): TransportType {
  if (!backendType || typeof backendType !== 'string') {
    console.warn('[convertTransportType] Invalid backendType:', backendType);
    return TransportType.UNKNOWN;
  }

  const typeMap: Record<string, TransportType> = {
    airplane: TransportType.AIRPLANE,
    train: TransportType.TRAIN,
    bus: TransportType.BUS,
    ferry: TransportType.FERRY,
    taxi: TransportType.TAXI,
    winter_road: TransportType.WINTER_ROAD,
    unknown: TransportType.UNKNOWN,
  };

  return typeMap[backendType.toLowerCase()] || TransportType.UNKNOWN;
}

/**
 * Определяет, является ли остановка пересадкой
 */
function isTransferStop(
  segmentIndex: number,
  totalSegments: number,
  stopId: string,
  previousSegmentToId?: string
): boolean {
  // Первая остановка первого сегмента - не пересадка
  if (segmentIndex === 0) {
    return false;
  }

  // Если остановка совпадает с конечной точкой предыдущего сегмента - это пересадка
  return stopId === previousSegmentToId;
}

/**
 * Конвертирует умный маршрут из backend формата в frontend формат
 */
export function adaptSmartRouteToFrontend(
  backendRoute: BackendSmartRoute
): SmartRouteData {
  const segments: SmartRouteSegmentData[] = [];
  let previousSegmentToId: string | undefined;

  // КРИТИЧЕСКИЙ ФИКС: Обрабатываем случай, когда fromCity/toCity - это строки, а не объекты
  // (формат IBuiltRoute из localStorage)
  let fromCityObj = backendRoute.fromCity;
  let toCityObj = backendRoute.toCity;
  
  if (typeof backendRoute.fromCity === 'string') {
    const cityName = backendRoute.fromCity;
    const fallbackCoords = getFallbackCityCoordinates(cityName);
    if (fallbackCoords) {
      fromCityObj = {
        id: cityName.toLowerCase().replace(/\s+/g, '-'),
        name: cityName,
        coordinates: { latitude: fallbackCoords[0], longitude: fallbackCoords[1] },
      } as any;
      console.log(`[adaptSmartRouteToFrontend] Converted fromCity string to object with fallback coordinates:`, {
        cityName,
        coordinates: fallbackCoords,
      });
    }
  }
  
  if (typeof backendRoute.toCity === 'string') {
    const cityName = backendRoute.toCity;
    const fallbackCoords = getFallbackCityCoordinates(cityName);
    if (fallbackCoords) {
      toCityObj = {
        id: cityName.toLowerCase().replace(/\s+/g, '-'),
        name: cityName,
        coordinates: { latitude: fallbackCoords[0], longitude: fallbackCoords[1] },
      } as any;
      console.log(`[adaptSmartRouteToFrontend] Converted toCity string to object with fallback coordinates:`, {
        cityName,
        coordinates: fallbackCoords,
      });
    }
  }
  
  // Обновляем backendRoute для использования в дальнейшем
  const normalizedBackendRoute = {
    ...backendRoute,
    fromCity: fromCityObj,
    toCity: toCityObj,
  };

  // ФАЗА 2 ФИКС: Логируем все сегменты для отладки
  console.log('[adaptSmartRouteToFrontend] Converting route:', {
    routeId: normalizedBackendRoute.id || (backendRoute as any).routeId,
    segmentsCount: normalizedBackendRoute.segments.length,
    segmentTypes: normalizedBackendRoute.segments.map(s => (s as any).type || (s as any).transportType),
    hasFromCity: !!normalizedBackendRoute.fromCity,
    hasToCity: !!normalizedBackendRoute.toCity,
    fromCityId: normalizedBackendRoute.fromCity?.id || (typeof backendRoute.fromCity === 'string' ? backendRoute.fromCity : undefined),
    toCityId: normalizedBackendRoute.toCity?.id || (typeof backendRoute.toCity === 'string' ? backendRoute.toCity : undefined),
    fromCityType: typeof backendRoute.fromCity,
    toCityType: typeof backendRoute.toCity,
  });
  
  // КРИТИЧЕСКИЙ ФИКС: Проверяем структуру сегментов перед обработкой
  for (let i = 0; i < normalizedBackendRoute.segments.length; i++) {
    const seg = normalizedBackendRoute.segments[i];
    if (!seg.from || !seg.to) {
      console.error(`[adaptSmartRouteToFrontend] Segment ${i} has null from/to:`, {
        segmentId: seg.id || seg.segmentId || `segment-${i}`,
        hasFrom: !!seg.from,
        hasTo: !!seg.to,
        fromValue: seg.from,
        toValue: seg.to,
        segmentKeys: Object.keys(seg),
      });
    }
  }

  // ФАЗА 2 ФИКС: Улучшенная функция для получения координат из всех возможных источников
  const getCoordinatesFromAllSources = (
    segmentIndex: number,
    stop: { coordinates?: { latitude?: number; longitude?: number } } | null | undefined,
    isFrom: boolean
  ): Coordinate | null => {
    // 1. Пробуем координаты из самого сегмента
    if (stop?.coordinates) {
      const coords = convertCoordinates(stop.coordinates);
      if (coords) {
        return coords;
      }
    }

    // 2. Пробуем координаты из fromCity (для первого сегмента) или toCity (для последнего)
    if (isFrom && segmentIndex === 0 && normalizedBackendRoute.fromCity?.coordinates) {
      const coords = convertCoordinates(normalizedBackendRoute.fromCity.coordinates);
      if (coords) {
        console.warn(`[adaptSmartRouteToFrontend] Segment ${segmentIndex} ${isFrom ? 'from' : 'to'} missing coordinates, using ${isFrom ? 'fromCity' : 'toCity'} coordinates`);
        return coords;
      }
    }
    if (!isFrom && segmentIndex === normalizedBackendRoute.segments.length - 1 && normalizedBackendRoute.toCity?.coordinates) {
      const coords = convertCoordinates(normalizedBackendRoute.toCity.coordinates);
      if (coords) {
        console.warn(`[adaptSmartRouteToFrontend] Segment ${segmentIndex} ${isFrom ? 'from' : 'to'} missing coordinates, using ${isFrom ? 'fromCity' : 'toCity'} coordinates`);
        return coords;
      }
    }

    // 3. Пробуем координаты из предыдущего сегмента (для from)
    if (isFrom && segmentIndex > 0) {
      const prevSegment = normalizedBackendRoute.segments[segmentIndex - 1];
      if (prevSegment?.to?.coordinates) {
        const coords = convertCoordinates(prevSegment.to.coordinates);
        if (coords) {
          console.warn(`[adaptSmartRouteToFrontend] Segment ${segmentIndex} from missing coordinates, using previous segment to coordinates`);
          return coords;
        }
      }
    }

    // 4. Пробуем координаты из следующего сегмента (для to)
    if (!isFrom && segmentIndex < normalizedBackendRoute.segments.length - 1) {
      const nextSegment = normalizedBackendRoute.segments[segmentIndex + 1];
      if (nextSegment?.from?.coordinates) {
        const coords = convertCoordinates(nextSegment.from.coordinates);
        if (coords) {
          console.warn(`[adaptSmartRouteToFrontend] Segment ${segmentIndex} to missing coordinates, using next segment from coordinates`);
          return coords;
        }
      }
    }

    // 5. ФАЗА 6 ФИКС: Используем fallback координаты из справочника городов
    const fallbackCoordinates = getFallbackCityCoordinates(stop?.name || stop?.id || '');
    if (fallbackCoordinates) {
      console.warn(`[adaptSmartRouteToFrontend] Segment ${segmentIndex} ${isFrom ? 'from' : 'to'} using fallback coordinates for ${stop?.name || stop?.id}`);
      return fallbackCoordinates;
    }

    return null;
  };

  // ФАЗА 6 ФИКС: Функция для получения fallback координат городов
  function getFallbackCityCoordinates(cityNameOrId: string): Coordinate | null {
    const cityFallbacks: Record<string, Coordinate> = {
      'moscow': [55.7558, 37.6173],
      'москва': [55.7558, 37.6173],
      'yakutsk': [62.0355, 129.6755],
      'якутск': [62.0355, 129.6755],
      'mirny': [62.5353, 113.9614],
      'мирный': [62.5353, 113.9614],
      'lensk': [60.7253, 114.9300],
      'ленск': [60.7253, 114.9300],
      'vilyuisk': [63.7553, 121.6244],
      'вилюйск': [63.7553, 121.6244],
      'olekminsk': [60.3733, 120.4264],
      'олёкминск': [60.3733, 120.4264],
      'olek': [60.3733, 120.4264],
      'nizhny-bestyakh': [61.9611, 129.9081],
      'нижний бестях': [61.9611, 129.9081],
      'бестях': [61.9611, 129.9081],
      'bestyakh': [61.9611, 129.9081],
      'tommot': [58.9567, 126.2933],
      'томмот': [58.9567, 126.2933],
      'aldan': [58.6033, 125.3933],
      'алдан': [58.6033, 125.3933],
      'neryungri': [56.6583, 124.7264],
      'нерюнгри': [56.6583, 124.7264],
      'novosibirsk': [55.0084, 82.9357],
      'новосибирск': [55.0084, 82.9357],
      'krasnoyarsk': [56.0184, 92.8672],
      'красноярск': [56.0184, 92.8672],
      'irkutsk': [52.2864, 104.2807],
      'иркутск': [52.2864, 104.2807],
      'khabarovsk': [48.4802, 135.0719],
      'хабаровск': [48.4802, 135.0719],
      'tynda': [55.1556, 124.7244],
      'тында': [55.1556, 124.7244],
      'skovorodino': [53.9856, 123.9433],
      'сковородино': [53.9856, 123.9433],
      'tiksi': [71.6900, 128.8700],
      'тикси': [71.6900, 128.8700],
      'verkhoyansk': [67.5500, 133.3900],
      'верхоянск': [67.5500, 133.3900],
      'zhigansk': [66.7683, 123.3714],
      'жиганск': [66.7683, 123.3714],
      'amga': [60.8967, 131.9783],
      'амга': [60.8967, 131.9783],
      'udachny': [66.4167, 112.4000],
      'удачный': [66.4167, 112.4000],
      'pokrovsk': [61.4783, 129.1283],
      'покровск': [61.4783, 129.1283],
      'khandyga': [62.6567, 135.5600],
      'хандыга': [62.6567, 135.5600],
      'srednekolymsk': [67.4500, 153.7000],
      'среднеколымск': [67.4500, 153.7000],
      'chokurdakh': [70.6167, 147.9000],
      'чокурдах': [70.6167, 147.9000],
    };

    const key = cityNameOrId.toLowerCase().trim();
    if (cityFallbacks[key]) {
      return cityFallbacks[key];
    }

    // Частичное совпадение
    for (const [cityKey, coords] of Object.entries(cityFallbacks)) {
      if (key.includes(cityKey) || cityKey.includes(key)) {
        return coords;
      }
    }

    return null;
  }

  // ФАЗА 2 ФИКС: Собираем статистику пропущенных сегментов
  const skippedSegments: Array<{ index: number; segmentId: string; reason: string }> = [];

  // ФАЗА 2 ФИКС: Конвертируем ВСЕ сегменты, не фильтруем по типу транспорта
  for (let i = 0; i < normalizedBackendRoute.segments.length; i++) {
    let backendSegment = normalizedBackendRoute.segments[i];
    
    // КРИТИЧЕСКИЙ ФИКС: Обрабатываем формат IBuiltRoute, где данные находятся в seg.segment
    // Проверяем, есть ли вложенный объект segment (формат IBuiltRoute)
    if ((backendSegment as any).segment && typeof (backendSegment as any).segment === 'object') {
      console.log(`[adaptSmartRouteToFrontend] Segment ${i} is in IBuiltRoute format, extracting nested segment data`);
      const ibuiltSegment = backendSegment as any;
      // Извлекаем данные из вложенного segment
      backendSegment = {
        ...ibuiltSegment.segment,
        // Сохраняем дополнительные данные из внешнего объекта
        departureTime: ibuiltSegment.departureTime,
        arrivalTime: ibuiltSegment.arrivalTime,
        duration: ibuiltSegment.duration,
        price: ibuiltSegment.price,
      } as any;
    }
    
    // КРИТИЧЕСКИЙ ФИКС: Получаем segmentId из id или segmentId
    const segmentId = backendSegment.segmentId || backendSegment.id || `segment-${i}`;
    
    // КРИТИЧЕСКИЙ ФИКС: Логируем полный объект сегмента для диагностики
    if (i === 0) {
      console.log('[adaptSmartRouteToFrontend] First segment structure:', {
        keys: Object.keys(backendSegment),
        hasType: 'type' in backendSegment,
        hasTransportType: 'transportType' in backendSegment,
        hasId: 'id' in backendSegment,
        hasSegmentId: 'segmentId' in backendSegment,
        hasFrom: 'from' in backendSegment,
        hasTo: 'to' in backendSegment,
        hasFromStopId: 'fromStopId' in backendSegment,
        hasToStopId: 'toStopId' in backendSegment,
        typeValue: (backendSegment as any).type,
        transportTypeValue: (backendSegment as any).transportType,
        idValue: (backendSegment as any).id,
        segmentIdValue: (backendSegment as any).segmentId,
        fromValue: (backendSegment as any).from,
        toValue: (backendSegment as any).to,
        fromStopId: (backendSegment as any).fromStopId,
        toStopId: (backendSegment as any).toStopId,
        fromType: typeof (backendSegment as any).from,
        toType: typeof (backendSegment as any).to,
        fromIsNull: (backendSegment as any).from === null,
        toIsNull: (backendSegment as any).to === null,
        hasPathGeometry: !!(backendSegment as any).pathGeometry,
        fullSegment: JSON.stringify(backendSegment, null, 2).substring(0, 1000),
      });
    }
    
    // КРИТИЧЕСКИЙ ФИКС: Определяем тип транспорта с fallback
    // 1. Пробуем segment.type
    // 2. Пробуем segment.transportType
    // 3. Пробуем определить по from.type или to.type (если это airport/train_station/bus_station)
    // 4. Пробуем определить по viaHubs (если есть - скорее всего airplane)
    let segmentType: string | undefined = backendSegment.type;
    
    if (!segmentType) {
      // Пробуем transportType
      segmentType = (backendSegment as any).transportType;
    }
    
    if (!segmentType) {
      // Пробуем определить по типу остановки
      const fromType = backendSegment.from?.type?.toLowerCase() || '';
      const toType = backendSegment.to?.type?.toLowerCase() || '';
      
      if (fromType.includes('airport') || toType.includes('airport') || fromType.includes('аэропорт') || toType.includes('аэропорт')) {
        segmentType = 'airplane';
      } else if (fromType.includes('train') || toType.includes('train') || fromType.includes('station') || toType.includes('station') || fromType.includes('вокзал') || toType.includes('вокзал')) {
        segmentType = 'train';
      } else if (fromType.includes('bus') || toType.includes('bus') || fromType.includes('автовокзал') || toType.includes('автовокзал')) {
        segmentType = 'bus';
      } else if (fromType.includes('ferry') || toType.includes('ferry') || fromType.includes('порт') || toType.includes('порт')) {
        segmentType = 'ferry';
      }
    }
    
    if (!segmentType && backendSegment.viaHubs && backendSegment.viaHubs.length > 0) {
      // Если есть viaHubs, скорее всего это airplane
      segmentType = 'airplane';
    }
    
    // КРИТИЧЕСКИЙ ФИКС: Если тип не определен, используем 'unknown' вместо пропуска сегмента
    if (!segmentType) {
      console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing type, using UNKNOWN as fallback:`, {
        segmentId,
        hasFrom: !!backendSegment.from,
        hasTo: !!backendSegment.to,
        fromType: backendSegment.from?.type,
        toType: backendSegment.to?.type,
        hasViaHubs: !!(backendSegment.viaHubs && backendSegment.viaHubs.length > 0),
        segmentKeys: Object.keys(backendSegment),
        segmentTypeValue: (backendSegment as any).type,
        segmentTransportTypeValue: (backendSegment as any).transportType,
      });
      segmentType = 'unknown'; // Используем 'unknown' вместо пропуска
    }
    
    const transportType = convertTransportType(segmentType);
    
    console.log('[adaptSmartRouteToFrontend] Converting segment:', {
      index: i,
      segmentId,
      backendType: segmentType,
      frontendType: transportType,
    });

    // КРИТИЧЕСКИЙ ФИКС: Если from или to отсутствуют, используем fallback координаты
    // Используем координаты из предыдущего сегмента, следующего сегмента, или города
    let fromStop = backendSegment.from;
    let toStop = backendSegment.to;
    
    // КРИТИЧЕСКИЙ ФИКС: Если from/to отсутствуют, но есть fromStopId/toStopId и pathGeometry,
    // извлекаем координаты из pathGeometry
    if ((!fromStop || fromStop === null) && (backendSegment as any).fromStopId && (backendSegment as any).pathGeometry) {
      const pathGeo = (backendSegment as any).pathGeometry;
      let firstCoord: [number, number] | null = null;
      
      // Обрабатываем разные форматы pathGeometry
      if (Array.isArray(pathGeo)) {
        // Массив координат напрямую
        if (pathGeo.length > 0 && Array.isArray(pathGeo[0]) && pathGeo[0].length >= 2) {
          firstCoord = [pathGeo[0][1], pathGeo[0][0]]; // [lat, lng] из [lng, lat]
        }
      } else if (pathGeo.coordinates && Array.isArray(pathGeo.coordinates) && pathGeo.coordinates.length > 0) {
        // Объект с coordinates
        const coord = pathGeo.coordinates[0];
        if (Array.isArray(coord) && coord.length >= 2) {
          firstCoord = [coord[1], coord[0]]; // [lat, lng] из [lng, lat]
        }
      }
      
      if (firstCoord) {
        fromStop = {
          id: (backendSegment as any).fromStopId,
          name: (backendSegment as any).fromStopId,
          type: 'stop',
          coordinates: { latitude: firstCoord[0], longitude: firstCoord[1] },
          cityId: normalizedBackendRoute.fromCity?.id || '',
        } as any;
        console.log(`[adaptSmartRouteToFrontend] Segment ${i} extracted from coordinates from pathGeometry`);
      }
    }
    
    if ((!toStop || toStop === null) && (backendSegment as any).toStopId && (backendSegment as any).pathGeometry) {
      const pathGeo = (backendSegment as any).pathGeometry;
      let lastCoord: [number, number] | null = null;
      
      // Обрабатываем разные форматы pathGeometry
      if (Array.isArray(pathGeo)) {
        // Массив координат напрямую
        if (pathGeo.length > 0 && Array.isArray(pathGeo[pathGeo.length - 1]) && pathGeo[pathGeo.length - 1].length >= 2) {
          const coord = pathGeo[pathGeo.length - 1];
          lastCoord = [coord[1], coord[0]]; // [lat, lng] из [lng, lat]
        }
      } else if (pathGeo.coordinates && Array.isArray(pathGeo.coordinates) && pathGeo.coordinates.length > 0) {
        // Объект с coordinates
        const coord = pathGeo.coordinates[pathGeo.coordinates.length - 1];
        if (Array.isArray(coord) && coord.length >= 2) {
          lastCoord = [coord[1], coord[0]]; // [lat, lng] из [lng, lat]
        }
      }
      
      if (lastCoord) {
        toStop = {
          id: (backendSegment as any).toStopId,
          name: (backendSegment as any).toStopId,
          type: 'stop',
          coordinates: { latitude: lastCoord[0], longitude: lastCoord[1] },
          cityId: normalizedBackendRoute.toCity?.id || '',
        } as any;
        console.log(`[adaptSmartRouteToFrontend] Segment ${i} extracted to coordinates from pathGeometry`);
      }
    }
    
    // Fallback для from: используем предыдущий сегмент, fromCity, или следующий сегмент
    // КРИТИЧЕСКИЙ ФИКС: Проверяем и null, и undefined
    if (!fromStop || fromStop === null) {
      // Приоритет 1: Для первого сегмента используем fromCity
      if (i === 0 && normalizedBackendRoute.fromCity?.coordinates) {
        fromStop = {
          id: `city-${normalizedBackendRoute.fromCity.id}`,
          name: normalizedBackendRoute.fromCity.name,
          type: 'city',
          coordinates: normalizedBackendRoute.fromCity.coordinates,
          cityId: normalizedBackendRoute.fromCity.id,
          isHub: false,
          hubLevel: undefined,
        } as any;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing from stop, using fromCity as fallback`);
      }
      // Приоритет 2: Для промежуточных сегментов используем координаты конца предыдущего сегмента
      else if (i > 0 && normalizedBackendRoute.segments[i - 1]?.to && normalizedBackendRoute.segments[i - 1].to !== null) {
        fromStop = normalizedBackendRoute.segments[i - 1].to;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing from stop, using previous segment's to as fallback`);
      }
      // Приоритет 3: Используем начало следующего сегмента
      else if (i < normalizedBackendRoute.segments.length - 1 && normalizedBackendRoute.segments[i + 1]?.from && normalizedBackendRoute.segments[i + 1].from !== null) {
        fromStop = normalizedBackendRoute.segments[i + 1].from;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing from stop, using next segment's from as fallback`);
      }
      // Приоритет 4: Используем fromCity как последний fallback
      else if (normalizedBackendRoute.fromCity?.coordinates) {
        fromStop = {
          id: `city-${normalizedBackendRoute.fromCity.id}`,
          name: normalizedBackendRoute.fromCity.name,
          type: 'city',
          coordinates: normalizedBackendRoute.fromCity.coordinates,
          cityId: normalizedBackendRoute.fromCity.id,
          isHub: false,
          hubLevel: undefined,
        } as any;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing from stop, using fromCity as final fallback`);
      }
    }
    
    // Fallback для to: используем следующий сегмент, toCity, или предыдущий сегмент
    // КРИТИЧЕСКИЙ ФИКС: Проверяем и null, и undefined
    if (!toStop || toStop === null) {
      // Приоритет 1: Для последнего сегмента используем toCity
      if (i === normalizedBackendRoute.segments.length - 1 && normalizedBackendRoute.toCity?.coordinates) {
        toStop = {
          id: `city-${normalizedBackendRoute.toCity.id}`,
          name: normalizedBackendRoute.toCity.name,
          type: 'city',
          coordinates: normalizedBackendRoute.toCity.coordinates,
          cityId: normalizedBackendRoute.toCity.id,
          isHub: false,
          hubLevel: undefined,
        } as any;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing to stop, using toCity as fallback`);
      }
      // Приоритет 2: Для промежуточных сегментов используем координаты начала следующего сегмента
      else if (i < normalizedBackendRoute.segments.length - 1 && normalizedBackendRoute.segments[i + 1]?.from && normalizedBackendRoute.segments[i + 1].from !== null) {
        toStop = normalizedBackendRoute.segments[i + 1].from;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing to stop, using next segment's from as fallback`);
      }
      // Приоритет 3: Используем конец предыдущего сегмента
      else if (i > 0 && normalizedBackendRoute.segments[i - 1]?.to && normalizedBackendRoute.segments[i - 1].to !== null) {
        toStop = normalizedBackendRoute.segments[i - 1].to;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing to stop, using previous segment's to as fallback`);
      }
      // Приоритет 4: Используем toCity как последний fallback
      else if (normalizedBackendRoute.toCity?.coordinates) {
        toStop = {
          id: `city-${normalizedBackendRoute.toCity.id}`,
          name: normalizedBackendRoute.toCity.name,
          type: 'city',
          coordinates: normalizedBackendRoute.toCity.coordinates,
          cityId: normalizedBackendRoute.toCity.id,
          isHub: false,
          hubLevel: undefined,
        } as any;
        console.warn(`[adaptSmartRouteToFrontend] Segment ${i} missing to stop, using toCity as final fallback`);
      }
    }
    
    // Если всё ещё отсутствуют from или to, пропускаем сегмент
    if (!fromStop || !toStop) {
      const reason = `Missing ${!fromStop ? 'from' : ''}${!fromStop && !toStop ? ' and ' : ''}${!toStop ? 'to' : ''} stop (no fallback available)`;
      console.warn(`[adaptSmartRouteToFrontend] Segment ${i} ${reason}, skipping:`, {
        hasFrom: !!fromStop,
        hasTo: !!toStop,
        segmentId,
        hasFromCity: !!normalizedBackendRoute.fromCity,
        hasToCity: !!normalizedBackendRoute.toCity,
        previousSegment: i > 0 ? !!normalizedBackendRoute.segments[i - 1] : false,
        nextSegment: i < normalizedBackendRoute.segments.length - 1 ? !!normalizedBackendRoute.segments[i + 1] : false,
      });
      skippedSegments.push({ index: i, segmentId, reason });
      continue;
    }

    // ФАЗА 2 ФИКС: Улучшенная конвертация координат с расширенным fallback
    const fromCoords = getCoordinatesFromAllSources(i, fromStop, true);
    const toCoords = getCoordinatesFromAllSources(i, toStop, false);

    // Если координаты всё ещё отсутствуют, пропускаем сегмент
    if (!fromCoords || !toCoords) {
      const reason = `No valid coordinates (from: ${fromCoords ? 'ok' : 'missing'}, to: ${toCoords ? 'ok' : 'missing'})`;
      console.error(`[adaptSmartRouteToFrontend] Segment ${i} ${reason}, skipping:`, {
        segmentId,
        fromCoords,
        toCoords,
        fromCityCoords: normalizedBackendRoute.fromCity?.coordinates,
        toCityCoords: normalizedBackendRoute.toCity?.coordinates,
        segmentFrom: backendSegment.from?.coordinates,
        segmentTo: backendSegment.to?.coordinates,
      });
      skippedSegments.push({ index: i, segmentId, reason });
      continue;
    }

    // Определяем, является ли остановка пересадкой
    const fromIsTransfer = isTransferStop(i, normalizedBackendRoute.segments.length, fromStop.id, previousSegmentToId);
    const toIsTransfer = i < normalizedBackendRoute.segments.length - 1; // Конечная остановка последнего сегмента - не пересадка

    // ФАЗА 2 ФИКС: Конвертируем pathGeometry с передачей fromCoords и toCoords для улучшенного определения формата
    const pathGeometry = convertPathGeometry(backendSegment.pathGeometry, fromCoords, toCoords);

    // Создаём сегмент для frontend
    const frontendSegment: SmartRouteSegmentData = {
      segmentId,
      transportType,
      from: fromCoords,
      to: toCoords,
      pathGeometry, // Может быть undefined - рендерер использует fallback на прямую линию
      isDirect: backendSegment.isDirect,
      viaHubs: backendSegment.viaHubs,
      fromStop: {
        id: fromStop.id,
        name: fromStop.name,
        type: fromStop.type,
        isHub: fromStop.isHub,
        hubLevel: fromStop.hubLevel,
        isTransfer: fromIsTransfer,
      },
      toStop: {
        id: toStop.id,
        name: toStop.name,
        type: toStop.type,
        isHub: toStop.isHub,
        hubLevel: toStop.hubLevel,
        isTransfer: toIsTransfer,
      },
      metadata: {
        distance: backendSegment.distance?.value ?? 0,
        duration: backendSegment.duration?.value ?? 0, // В минутах
        price: backendSegment.price?.total ?? 0,
        departureTime: backendSegment.schedule?.departureTime,
        arrivalTime: backendSegment.schedule?.arrivalTime,
        // ФАЗА 4: Добавляем riskScore в metadata для доступа в UI
        riskScore: backendSegment.riskScore,
      },
    };

    segments.push(frontendSegment);
    previousSegmentToId = toStop.id;
  }

  // ФАЗА 2 ФИКС: Логируем статистику пропущенных сегментов
  if (skippedSegments.length > 0) {
    console.warn('[adaptSmartRouteToFrontend] Some segments were skipped:', {
      totalSegments: normalizedBackendRoute.segments.length,
      convertedSegments: segments.length,
      skippedSegments: skippedSegments.length,
      skippedDetails: skippedSegments,
    });
  } else {
    console.log('[adaptSmartRouteToFrontend] All segments converted successfully:', {
      totalSegments: normalizedBackendRoute.segments.length,
      convertedSegments: segments.length,
    });
  }

  // ФАЗА 2 ФИКС: Если все сегменты пропущены, возвращаем пустой маршрут с предупреждением
  if (segments.length === 0) {
    console.error('[adaptSmartRouteToFrontend] All segments were skipped, route cannot be displayed');
    // Возвращаем маршрут с пустыми сегментами, но с валидными границами
    return {
      routeId: backendRoute.id,
      segments: [],
      bounds: {
        north: normalizedBackendRoute.fromCity?.coordinates?.latitude ?? 73.0,
        south: normalizedBackendRoute.toCity?.coordinates?.latitude ?? 55.0,
        east: Math.max(
          normalizedBackendRoute.fromCity?.coordinates?.longitude ?? 140.0,
          normalizedBackendRoute.toCity?.coordinates?.longitude ?? 140.0
        ),
        west: Math.min(
          normalizedBackendRoute.fromCity?.coordinates?.longitude ?? 105.0,
          normalizedBackendRoute.toCity?.coordinates?.longitude ?? 105.0
        ),
      },
    };
  }

  // Вычисляем границы маршрута
  const allCoordinates: Coordinate[] = [];
  segments.forEach((segment) => {
    allCoordinates.push(segment.from);
    allCoordinates.push(segment.to);
    if (segment.pathGeometry) {
      allCoordinates.push(...segment.pathGeometry);
    }
  });

  let bounds: SmartRouteData['bounds'];
  if (allCoordinates.length > 0) {
    const latitudes = allCoordinates.map((c) => c[0]);
    const longitudes = allCoordinates.map((c) => c[1]);
    bounds = {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes),
    };
  } else {
    // Fallback границы (Якутия)
    bounds = {
      north: 73.0,
      south: 55.0,
      east: 140.0,
      west: 105.0,
    };
  }

  return {
    routeId: backendRoute.id,
    segments,
    bounds,
  };
}

/**
 * Конвертирует массив умных маршрутов
 */
export function adaptSmartRoutesToFrontend(
  backendRoutes: BackendSmartRoute[]
): SmartRouteData[] {
  return backendRoutes.map(adaptSmartRouteToFrontend);
}

