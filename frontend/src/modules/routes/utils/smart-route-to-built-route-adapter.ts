/**
 * Адаптер для преобразования SmartRoute (новый формат) в IBuiltRoute (старый формат)
 * 
 * Поддерживает все новые поля SmartRoute:
 * - viaHubs, pathGeometry, isHub, hubLevel
 * - validation, segmentValidations
 * - seasonality, schedule
 * - price.total, distance.value, duration.value
 * 
 * @module routes/utils
 */

import type { IBuiltRoute, IRouteSegmentDetails, IRouteSegment, IRiskScore, IRiskAssessment, IRiskFactors } from '../domain/types'
import { TransportType } from '../domain/types'

/**
 * Тип SmartRoute из backend (полная версия)
 */
export interface SmartRouteSegment {
  // КРИТИЧЕСКИЙ ФИКС: Backend возвращает id, а не segmentId
  id?: string
  segmentId?: string
  type?: string
  // КРИТИЧЕСКИЙ ФИКС: Backend может не отдавать from/to или их поля могут быть необязательными
  from?: {
    id?: string
    name?: string
    type?: string
    coordinates?: {
      latitude?: number
      longitude?: number
    }
    isHub?: boolean
    hubLevel?: 'federal' | 'regional'
    cityId?: string
  }
  to?: {
    id?: string
    name?: string
    type?: string
    coordinates?: {
      latitude?: number
      longitude?: number
    }
    isHub?: boolean
    hubLevel?: 'federal' | 'regional'
    cityId?: string
  }
  distance?: {
    value?: number
    unit?: string
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт duration = { value, display } (unit может отсутствовать)
  duration?: {
    value?: number
    unit?: string
    display?: string
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт price = { total, display } (base и currency могут отсутствовать)
  price?: {
    base?: number
    total?: number
    currency?: string
    display?: string
  }
  isDirect?: boolean
  // КРИТИЧЕСКИЙ ФИКС: Backend возвращает viaHubs как массив Hub.toJSON() с полями { id, name, level, ... }
  viaHubs?: Array<{
    id?: string
    name?: string
    level: 'federal' | 'regional'
    [key: string]: unknown
  }>
  // КРИТИЧЕСКИЙ ФИКС: Backend возвращает pathGeometry как объект { type: 'LineString', coordinates: [...] }
  pathGeometry?: {
    type?: string
    coordinates: Array<[number, number]>
  } | Array<[number, number]>
  // КРИТИЧЕСКИЙ ФИКС: Backend не возвращает schedule в toJSON()
  schedule?: {
    departureTime?: string
    arrivalTime?: string
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend может не отдавать seasonality или его поля могут быть необязательными
  seasonality?: {
    available?: boolean
    season?: string
    period?: {
      start?: string
      end?: string
    }
  }
  // ФАЗА 4: Backend может отдавать riskScore для сегмента
  riskScore?: IRiskScore
}

export interface SmartRoute {
  id?: string
  // КРИТИЧЕСКИЙ ФИКС: Backend может не отдавать fromCity/toCity или их поля могут быть необязательными
  fromCity?: {
    id?: string
    name?: string
    coordinates?: {
      latitude?: number
      longitude?: number
    }
  }
  toCity?: {
    id?: string
    name?: string
    coordinates?: {
      latitude?: number
      longitude?: number
    }
  }
  segments?: SmartRouteSegment[]
  // ФАЗА 4: Backend может отдавать riskScore для всего маршрута (максимум среди сегментов)
  riskScore?: IRiskScore
  totalDistance?: {
    value?: number
    unit?: string
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт totalDuration = { value, display } (unit и breakdown могут отсутствовать)
  totalDuration?: {
    value?: number
    unit?: string
    display?: string
    breakdown?: {
      travel?: number
      transfers?: number
    }
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт totalPrice = { total, display } (base и currency могут отсутствовать)
  totalPrice?: {
    base?: number
    total?: number
    currency?: string
    display?: string
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend может не отдавать validation или его поля могут быть необязательными
  validation?: {
    isValid?: boolean
    errors?: string[]
    warnings?: string[]
    segmentValidations?: Array<{
      segmentId?: string
      isValid?: boolean
      errors?: string[]
      warnings?: string[]
    }>
  }
}

/**
 * Преобразует тип транспорта из строки в TransportType enum
 */
/**
 * ФАЗА 4 ФИКС: Нормализует pathGeometry из разных форматов в единый формат [latitude, longitude][]
 * 
 * Поддерживает форматы:
 * - Массив координат: [[lng, lat], [lng, lat], ...] или [[lat, lng], [lat, lng], ...]
 * - Объект GeoJSON: { type: 'LineString', coordinates: [[lng, lat], ...] }
 * - null или undefined
 */
function normalizePathGeometry(
  pathGeometry: any,
  segmentIndex?: number
): Array<[number, number]> | undefined {
  if (!pathGeometry) {
    return undefined;
  }

  let coords: any[] = [];

  // Если pathGeometry - массив координат
  if (Array.isArray(pathGeometry)) {
    coords = pathGeometry;
  }
  // Если pathGeometry - объект с coordinates
  else if (typeof pathGeometry === 'object' && pathGeometry !== null && 'coordinates' in pathGeometry) {
    coords = (pathGeometry as any).coordinates;
  } else {
    if (segmentIndex !== undefined) {
      console.warn(`[normalizePathGeometry] Unknown pathGeometry format for segment ${segmentIndex}:`, pathGeometry);
    }
    return undefined;
  }

  if (!Array.isArray(coords) || coords.length === 0) {
    return undefined;
  }

  // Валидируем и конвертируем координаты
  const validCoords = coords
    .filter((coord: any) => {
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
    .map((coord: any) => {
      const val1 = coord[0];
      const val2 = coord[1];

      // Определяем формат: [longitude, latitude] или [latitude, longitude]
      // longitude: [-180, 180], latitude: [-90, 90]
      const isLongitudeFirst =
        val1 >= -180 &&
        val1 <= 180 &&
        val2 >= -90 &&
        val2 <= 90 &&
        (val1 < -90 || val1 > 90); // Дополнительная проверка

      if (isLongitudeFirst) {
        // Backend формат: [longitude, latitude] -> Frontend: [latitude, longitude]
        const lat = val2;
        const lng = val1;
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return [lat, lng] as [number, number];
        }
        return null;
      } else {
        // Уже в формате [latitude, longitude]
        if (val1 >= -90 && val1 <= 90 && val2 >= -180 && val2 <= 180) {
          return coord as [number, number];
        }
        return null;
      }
    })
    .filter((coord): coord is [number, number] => coord !== null);

  if (validCoords.length >= 2) {
    return validCoords;
  }

  if (segmentIndex !== undefined) {
    console.warn(`[normalizePathGeometry] Invalid pathGeometry for segment ${segmentIndex}, got ${validCoords.length} valid coordinates`);
  }

  return undefined;
}

function normalizeTransportType(type: string): TransportType {
  const normalized = type.toLowerCase()
  switch (normalized) {
    case 'airplane':
    case 'plane':
    case 'air':
      return TransportType.AIRPLANE
    case 'bus':
      return TransportType.BUS
    case 'train':
      return TransportType.TRAIN
    case 'ferry':
      return TransportType.FERRY
    case 'taxi':
      return TransportType.TAXI
    case 'winter_road':
    case 'winterroad':
      return TransportType.WINTER_ROAD
    default:
      return TransportType.UNKNOWN
  }
}

/**
 * Преобразует SmartRoute в IBuiltRoute с поддержкой всех новых полей
 */
export function adaptSmartRouteToIBuiltRoute(
  smartRoute: SmartRoute,
  date?: string,
  passengers: number = 1
): IBuiltRoute {
  // КРИТИЧЕСКИЙ ФИКС: Все поля могут быть необязательными - используем fallback вместо исключений
  // Если segments отсутствуют или пусты, создаем пустой массив (маршрут будет пустым, но не сломается)
  const segments = smartRoute.segments && Array.isArray(smartRoute.segments) && smartRoute.segments.length > 0
    ? smartRoute.segments
    : []
  
  if (segments.length === 0) {
    console.warn('[adaptSmartRouteToIBuiltRoute] No segments found, creating empty route:', {
      routeId: smartRoute.id,
      hasSegments: !!smartRoute.segments,
      isArray: Array.isArray(smartRoute.segments),
      length: smartRoute.segments?.length,
    })
  }
  
  // Если cities отсутствуют, используем fallback значения
  const fromCityName = smartRoute.fromCity?.name || ''
  const toCityName = smartRoute.toCity?.name || ''
  const fromCityId = smartRoute.fromCity?.id || ''
  const toCityId = smartRoute.toCity?.id || ''
  
  if (!fromCityName || !toCityName) {
    console.warn('[adaptSmartRouteToIBuiltRoute] Missing city names, using fallback:', {
      fromCity: smartRoute.fromCity,
      toCity: smartRoute.toCity,
      routeId: smartRoute.id,
    })
  }

  // Преобразуем сегменты (используем безопасный массив segments)
  // КРИТИЧЕСКИЙ ФИКС: Оборачиваем весь map в try-catch для предотвращения падения адаптера
  let adaptedSegments: IRouteSegmentDetails[] = []
  try {
    adaptedSegments = segments.map((segment, index) => {
    try {
      // КРИТИЧЕСКИЙ ФИКС: Безопасная обработка типа транспорта
      if (!segment.type) {
        console.warn(`[adaptSmartRouteToIBuiltRoute] Segment ${index} missing type, defaulting to UNKNOWN`)
      }
      const transportType = normalizeTransportType(segment.type || 'unknown')

    // ФАЗА 1 ФИКС: Backend возвращает segment.id, а не segment.segmentId
    // Приоритет: segment.id (из backend) > segment.segmentId (старый формат) > fallback
    const segmentId = segment.id || (segment as any)?.segmentId || `segment-${index}`

    // ФАЗА 1 ФИКС: Валидация и нормализация pathGeometry
    // Проверяем, что pathGeometry валиден перед нормализацией
    let pathGeometry: Array<[number, number]> | undefined
    if (segment.pathGeometry) {
      const normalized = normalizePathGeometry(segment.pathGeometry, index)
      if (normalized && normalized.length >= 2) {
        pathGeometry = normalized
      } else {
        console.warn(`[adaptSmartRouteToIBuiltRoute] Segment ${index} has invalid pathGeometry, will use fallback`)
        pathGeometry = undefined // Будет использован fallback на прямую линию в рендерере карты
      }
    }

    // КРИТИЧЕСКИЙ ФИКС: Backend возвращает viaHubs как массив Hub.toJSON() с полями { id, name, level, ... }
    // Нужно преобразовать в формат { level: 'federal' | 'regional' }
    let viaHubs: Array<{ level: 'federal' | 'regional' }> | undefined
    if (segment.viaHubs && Array.isArray(segment.viaHubs)) {
      viaHubs = segment.viaHubs.map((hub: any) => {
        // Hub.toJSON() возвращает { id, name, level, ... }
        if (typeof hub === 'object' && hub !== null && 'level' in hub) {
          return { level: hub.level as 'federal' | 'regional' }
        }
        // Если hub уже в нужном формате
        return hub as { level: 'federal' | 'regional' }
      }).filter((h): h is { level: 'federal' | 'regional' } => 
        h !== null && h !== undefined && (h.level === 'federal' || h.level === 'regional')
      )
      if (viaHubs.length === 0) {
        viaHubs = undefined
      }
    }

    // ФАЗА 1 ФИКС: Извлечение schedule из metadata или генерация из duration
    // Backend не возвращает schedule в toJSON(), но может быть в metadata
    let departureTime = ''
    let arrivalTime = ''
    
    // Попытка извлечь из metadata.schedule
    if ((segment as any)?.metadata?.schedule) {
      const schedule = (segment as any).metadata.schedule
      if (typeof schedule === 'string') {
        // Если schedule - строка, пытаемся распарсить
        departureTime = schedule
      } else if (typeof schedule === 'object' && schedule !== null) {
        departureTime = schedule.departureTime || ''
        arrivalTime = schedule.arrivalTime || ''
      }
    }
    
    // Если schedule не найден, генерируем из duration (если есть)
    if (!departureTime && segment.duration?.value) {
      // Генерируем примерное время отправления (можно улучшить, используя реальные данные)
      const durationMinutes = segment.duration.value
      // Используем текущее время как базовое (в реальности должно приходить с backend)
      const baseTime = new Date()
      departureTime = baseTime.toISOString()
      const arrivalDate = new Date(baseTime.getTime() + durationMinutes * 60 * 1000)
      arrivalTime = arrivalDate.toISOString()
    }

    // ФАЗА 1 ФИКС: Проверка на отсутствие from/to перед использованием
    // Если from или to отсутствуют, используем координаты из fromCity/toCity как fallback
    const fromStop = segment.from
    const toStop = segment.to
    
    // Проверяем наличие координат в остановках
    const hasFromCoordinates = fromStop?.coordinates?.latitude !== undefined && 
                               fromStop?.coordinates?.longitude !== undefined &&
                               !isNaN(fromStop.coordinates.latitude) && 
                               !isNaN(fromStop.coordinates.longitude)
    const hasToCoordinates = toStop?.coordinates?.latitude !== undefined && 
                             toStop?.coordinates?.longitude !== undefined &&
                             !isNaN(toStop.coordinates.latitude) && 
                             !isNaN(toStop.coordinates.longitude)
    
    // Если координаты отсутствуют, пытаемся использовать координаты из городов
    let fromCoords: { latitude: number; longitude: number } | undefined = fromStop?.coordinates;
    let toCoords: { latitude: number; longitude: number } | undefined = toStop?.coordinates;

    if (!hasFromCoordinates) {
      if (smartRoute.fromCity?.coordinates) {
        fromCoords = smartRoute.fromCity.coordinates;
        console.warn(`[adaptSmartRouteToIBuiltRoute] Segment ${index} missing from coordinates, using fromCity coordinates`);
      } else if (fromStop?.cityId || fromStop?.name) {
        const fallback = getFallbackCityCoordinates(fromStop.cityId || fromStop.name || '');
        if (fallback) {
          fromCoords = { latitude: fallback[0], longitude: fallback[1] };
          console.warn(`[adaptSmartRouteToIBuiltRoute] Segment ${index} missing from coordinates, using fallback for ${fromStop.cityId || fromStop.name}`);
        }
      }
    }

    if (!hasToCoordinates) {
      if (smartRoute.toCity?.coordinates) {
        toCoords = smartRoute.toCity.coordinates;
        console.warn(`[adaptSmartRouteToIBuiltRoute] Segment ${index} missing to coordinates, using toCity coordinates`);
      } else if (toStop?.cityId || toStop?.name) {
        const fallback = getFallbackCityCoordinates(toStop.cityId || toStop.name || '');
        if (fallback) {
          toCoords = { latitude: fallback[0], longitude: fallback[1] };
          console.warn(`[adaptSmartRouteToIBuiltRoute] Segment ${index} missing to coordinates, using fallback for ${toStop.cityId || toStop.name}`);
        }
      }
    }

    // ФАЗА 6 ФИКС: Функция для получения fallback координат городов
    function getFallbackCityCoordinates(cityNameOrId: string): [number, number] | null {
      const cityFallbacks: Record<string, [number, number]> = {
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

      for (const [cityKey, coords] of Object.entries(cityFallbacks)) {
        if (key.includes(cityKey) || cityKey.includes(key)) {
          return coords;
        }
      }

      return null;
    }
    
    // ФАЗА 6 ФИКС: Используем исправленные координаты
    const finalFromCoords = fromCoords || (fromStop?.coordinates ? {
      latitude: fromStop.coordinates.latitude,
      longitude: fromStop.coordinates.longitude
    } : undefined);
    const finalToCoords = toCoords || (toStop?.coordinates ? {
      latitude: toStop.coordinates.latitude,
      longitude: toStop.coordinates.longitude
    } : undefined);

    // Создаем IRouteSegment с поддержкой новых полей
    const routeSegment: IRouteSegment & {
      viaHubs?: Array<{ level: 'federal' | 'regional' }>
      pathGeometry?: Array<[number, number]>
      isHub?: boolean
      hubLevel?: 'federal' | 'regional'
      seasonality?: {
        available: boolean
        season: string
      }
      fromName?: string
      toName?: string
      fromType?: string
      toType?: string
    } = {
      segmentId: segmentId,
      fromStopId: fromStop?.id || '',
      toStopId: toStop?.id || '',
      routeId: smartRoute.id || `route-${Date.now()}`,
      transportType,
      distance: segment.distance?.value ?? 0,
      estimatedDuration: segment.duration?.value ?? 0,
      basePrice: segment.price?.total ?? 0,
      // Новые поля
      viaHubs: viaHubs,
      pathGeometry: pathGeometry,
      isHub: fromStop?.isHub || toStop?.isHub || false,
      hubLevel: fromStop?.hubLevel || toStop?.hubLevel,
      seasonality: segment.seasonality ? {
        available: segment.seasonality.available ?? true,
        season: segment.seasonality.season ?? '',
      } : undefined,
      isDirect: segment.isDirect ?? false,
      // Сохраняем названия и типы остановок для использования в smartRouteSegments
      fromName: fromStop?.name || '',
      toName: toStop?.name || '',
      fromType: fromStop?.type || 'stop',
      toType: toStop?.type || 'stop',
    }

      // Находим валидацию для этого сегмента из segmentValidations
      // КРИТИЧЕСКИЙ ФИКС: Используем правильный segmentId
      const segmentValidation = smartRoute.validation?.segmentValidations?.find(
        (v) => v.segmentId === segmentId
      )

      // КРИТИЧЕСКИЙ ФИКС: Безопасная обработка duration и price для display
      // Backend отдаёт duration = { value, display } и price = { total, display }
      const durationValue = segment.duration?.value ?? 0
      const priceValue = segment.price?.total ?? 0
      
      // Используем display из backend, если есть, иначе генерируем
      let durationDisplay = segment.duration?.display
      if (!durationDisplay && durationValue > 0) {
        const hours = Math.floor(durationValue / 60)
        const minutes = durationValue % 60
        durationDisplay = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`
      } else if (!durationDisplay) {
        durationDisplay = '0м'
      }
      
      let priceDisplay = segment.price?.display
      if (!priceDisplay && priceValue > 0) {
        const currency = segment.price?.currency || '₽'
        priceDisplay = `${priceValue.toFixed(0)}${currency}`
      } else if (!priceDisplay) {
        priceDisplay = '0₽'
      }

      // ФАЗА 1 ФИКС: Используем сгенерированные departureTime и arrivalTime
      // ФАЗА 4: Добавляем riskScore из сегмента, если он есть
      return {
        segment: routeSegment as IRouteSegment,
        departureTime: departureTime,
        arrivalTime: arrivalTime,
        duration: durationValue, // В минутах
        price: priceValue,
        // Дополнительные метаданные для отображения
        transferTime: index > 0 ? 30 : undefined, // Оценочное время пересадки
        // Новые поля SmartRoute
        validation: segmentValidation,
        durationData: {
          display: durationDisplay,
        },
        priceData: {
          display: priceDisplay,
        },
        // ФАЗА 4: Добавляем riskScore из сегмента
        riskScore: segment.riskScore,
      } as IRouteSegmentDetails & {
      viaHubs?: Array<{ level: 'federal' | 'regional' }>
      pathGeometry?: Array<[number, number]>
      isHub?: boolean
      hubLevel?: 'federal' | 'regional'
      seasonality?: {
        available: boolean
        season: string
      }
      validation?: {
        isValid: boolean
        errors: string[]
        warnings: string[]
      }
      durationData?: {
        display: string
      }
      priceData?: {
        display: string
      }
    }
    } catch (err) {
      // КРИТИЧЕСКИЙ ФИКС: Если обработка сегмента не удалась, логируем и возвращаем минимальный сегмент
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[adaptSmartRouteToIBuiltRoute] Error processing segment ${index}:`, errorMessage, {
        segment,
        segmentId: (segment as any).id || (segment as any).segmentId,
        routeId: smartRoute.id,
      })
      
      // ФАЗА 1 ФИКС: Используем segment.id как приоритетный источник
      const fallbackSegmentId = segment.id || (segment as any)?.segmentId || `error-segment-${index}`
      const fallbackDurationValue = segment.duration?.value ?? 0
      const fallbackPriceValue = segment.price?.total ?? 0
      
      // Безопасная генерация display строк
      let fallbackDurationDisplay = segment.duration?.display
      if (!fallbackDurationDisplay && fallbackDurationValue > 0) {
        const hours = Math.floor(fallbackDurationValue / 60)
        const minutes = fallbackDurationValue % 60
        fallbackDurationDisplay = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`
      } else if (!fallbackDurationDisplay) {
        fallbackDurationDisplay = '0м'
      }
      
      let fallbackPriceDisplay = segment.price?.display
      if (!fallbackPriceDisplay && fallbackPriceValue > 0) {
        const currency = segment.price?.currency || '₽'
        fallbackPriceDisplay = `${fallbackPriceValue.toFixed(0)}${currency}`
      } else if (!fallbackPriceDisplay) {
        fallbackPriceDisplay = '0₽'
      }
      
      return {
        segment: {
          segmentId: fallbackSegmentId,
          fromStopId: segment.from?.id || '',
          toStopId: segment.to?.id || '',
          routeId: smartRoute.id || `route-${Date.now()}`,
          transportType: normalizeTransportType(segment.type || 'unknown'),
          distance: segment.distance?.value ?? 0,
          estimatedDuration: fallbackDurationValue,
          basePrice: fallbackPriceValue,
        } as IRouteSegment,
        departureTime: '',
        arrivalTime: '',
        duration: fallbackDurationValue,
        price: fallbackPriceValue,
        transferTime: index > 0 ? 30 : undefined,
        validation: {
          isValid: false,
          errors: [`Ошибка адаптации сегмента: ${errorMessage}`],
          warnings: [],
        },
        durationData: {
          display: fallbackDurationDisplay,
        },
        priceData: {
          display: fallbackPriceDisplay,
        },
        // ФАЗА 4: Сохраняем riskScore даже при ошибке адаптации
        riskScore: segment.riskScore,
      } as IRouteSegmentDetails
    }
  })
  } catch (mapError) {
    // КРИТИЧЕСКИЙ ФИКС: Если весь map упал, логируем и возвращаем пустой массив сегментов
    const errorMessage = mapError instanceof Error ? mapError.message : String(mapError)
    console.error('[adaptSmartRouteToIBuiltRoute] Error mapping segments:', errorMessage, mapError, {
      segmentsCount: segments.length,
      routeId: smartRoute.id,
    })
    adaptedSegments = []
  }

  // Вычисляем departureTime и arrivalTime
  const firstSegment = adaptedSegments[0]
  const lastSegment = adaptedSegments[adaptedSegments.length - 1]
  const departureTime = firstSegment?.departureTime || ''
  const arrivalTime = lastSegment?.arrivalTime || ''

  // Вычисляем transferCount
  const transferCount = Math.max(0, adaptedSegments.length - 1)

  // Собираем уникальные типы транспорта
  // КРИТИЧЕСКИЙ ФИКС: Безопасная обработка transportTypes с fallback
  let transportTypes: TransportType[] = []
  try {
    transportTypes = Array.from(
      new Set(adaptedSegments.map(s => s.segment?.transportType).filter(Boolean))
    ) as TransportType[]
  } catch (err) {
    console.error('[adaptSmartRouteToIBuiltRoute] Error collecting transport types:', err)
    transportTypes = []
  }
  
  // Fallback: если transportTypes пуст, используем UNKNOWN
  if (transportTypes.length === 0) {
    transportTypes = [TransportType.UNKNOWN]
  }

  // Преобразуем дату
  const routeDate = date || new Date().toISOString().split('T')[0]

  // КРИТИЧЕСКИЙ ФИКС: Безопасная обработка totalDuration и totalPrice для display
  // Backend отдаёт totalDuration = { value, display } и totalPrice = { total, display }
  const totalDurationValue = smartRoute.totalDuration?.value ?? 0
  const totalPriceValue = smartRoute.totalPrice?.total ?? 0
  
  let totalDurationDisplay = smartRoute.totalDuration?.display
  if (!totalDurationDisplay && totalDurationValue > 0) {
    const hours = Math.floor(totalDurationValue / 60)
    const minutes = totalDurationValue % 60
    totalDurationDisplay = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`
  } else if (!totalDurationDisplay) {
    totalDurationDisplay = '0м'
  }
  
  let totalPriceDisplay = smartRoute.totalPrice?.display
  if (!totalPriceDisplay && totalPriceValue > 0) {
    const currency = smartRoute.totalPrice?.currency || '₽'
    totalPriceDisplay = `${totalPriceValue.toFixed(0)}${currency}`
  } else if (!totalPriceDisplay) {
    totalPriceDisplay = '0₽'
  }

  // КРИТИЧЕСКИЙ ФИКС: Оборачиваем создание результата в try-catch для предотвращения падения
  try {
    const result: IBuiltRoute & {
      validation?: SmartRoute['validation']
      totalDistance?: number
      totalDurationData?: { display: string }
      totalPriceData?: { display: string }
      fromCityId?: string
      toCityId?: string
      riskAssessment?: IRiskAssessment
    } = {
      routeId: smartRoute.id || `route-${Date.now()}`,
      fromCity: fromCityName,
      toCity: toCityName,
      // КРИТИЧЕСКИЙ ФИКС: Сохраняем cityId для повторного поиска и корректного отображения
      fromCityId: fromCityId,
      toCityId: toCityId,
      date: routeDate,
      passengers,
      segments: adaptedSegments,
      totalDuration: totalDurationValue, // В минутах
      totalPrice: totalPriceValue,
      transferCount,
      transportTypes: transportTypes.length > 0 ? transportTypes : [TransportType.UNKNOWN],
      departureTime: departureTime || '',
      arrivalTime: arrivalTime || '',
      // Новые поля SmartRoute
      validation: smartRoute.validation,
      totalDistance: smartRoute.totalDistance?.value ?? 0,
      totalDurationData: {
        display: totalDurationDisplay,
      },
      totalPriceData: {
        display: totalPriceDisplay,
      },
      // ФАЗА 4: Добавляем riskAssessment из riskScore маршрута
      riskAssessment: smartRoute.riskScore ? {
        routeId: smartRoute.id || `route-${Date.now()}`,
        riskScore: smartRoute.riskScore,
        factors: {
          transferCount,
          transportTypes: transportTypes.map(t => t),
          totalDuration: totalDurationValue,
          historicalDelays: {
            averageDelay30Days: 0,
            averageDelay60Days: 0,
            averageDelay90Days: 0,
            delayFrequency: 0,
          },
          cancellations: {
            cancellationRate30Days: 0,
            cancellationRate60Days: 0,
            cancellationRate90Days: 0,
            totalCancellations: 0,
          },
          occupancy: {
            averageOccupancy: 0,
            highOccupancySegments: 0,
            lowAvailabilitySegments: 0,
          },
          seasonality: {
            month: new Date(routeDate).getMonth() + 1,
            dayOfWeek: new Date(routeDate).getDay(),
            seasonFactor: 1,
          },
          scheduleRegularity: 0,
        },
      } : undefined,
    }
    
    return result
  } catch (resultError) {
    // КРИТИЧЕСКИЙ ФИКС: Если создание результата упало, логируем и возвращаем минимальный маршрут
    const errorMessage = resultError instanceof Error ? resultError.message : String(resultError)
    console.error('[adaptSmartRouteToIBuiltRoute] Error creating result:', errorMessage, resultError, {
      routeId: smartRoute.id,
      segmentsCount: adaptedSegments.length,
    })
    
    // Возвращаем минимальный маршрут с fallback значениями
    return {
      routeId: smartRoute.id || `route-${Date.now()}`,
      fromCity: fromCityName || 'Неизвестно',
      toCity: toCityName || 'Неизвестно',
      fromCityId: fromCityId || '',
      toCityId: toCityId || '',
      date: routeDate,
      passengers,
      segments: adaptedSegments,
      totalDuration: 0,
      totalPrice: 0,
      transferCount: 0,
      transportTypes: [TransportType.UNKNOWN],
      departureTime: '',
      arrivalTime: '',
      validation: {
        isValid: false,
        errors: [`Ошибка адаптации маршрута: ${errorMessage}`],
        warnings: [],
      },
      totalDistance: 0,
      totalDurationData: {
        display: '0м',
      },
      totalPriceData: {
        display: '0₽',
      },
    } as IBuiltRoute
  }
}

/**
 * Преобразует массив SmartRoute в массив IBuiltRoute
 */
export function adaptSmartRoutesToIBuiltRoutes(
  smartRoutes: SmartRoute[],
  date?: string,
  passengers: number = 1
): IBuiltRoute[] {
  return smartRoutes.map(route => adaptSmartRouteToIBuiltRoute(route, date, passengers))
}

