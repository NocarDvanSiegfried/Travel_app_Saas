/**
 * Адаптер данных маршрутов
 * Преобразует IBuiltRoute в RouteDetailsData (формат OData)
 */

import {
  IBuiltRoute,
  IRiskAssessment,
  RouteDetailsData,
} from '../domain/types';
import { getStopName, setStopName } from './stop-names-cache';

/**
 * Преобразует данные маршрута из формата IBuiltRoute в формат RouteDetailsData (OData)
 * 
 * Адаптирует структуру данных маршрута для отображения в компоненте RouteDetailsView.
 * Преобразует сегменты маршрута, добавляет информацию о городах и рисках.
 * 
 * @param route - Данные маршрута в формате IBuiltRoute
 * @param riskAssessment - Оценка рисков маршрута (опционально)
 * @returns Данные маршрута в формате RouteDetailsData
 */
export function adaptRouteToDetailsFormat(
  route: IBuiltRoute,
  riskAssessment?: IRiskAssessment
): RouteDetailsData {
  // ФАЗА 5: КРИТИЧЕСКИЙ ФИКС - Исправляем генерацию routeId
  // routeId должен быть уникальным идентификатором маршрута, а не города
  // Используем routeId из маршрута, если он есть, иначе генерируем правильный формат
  const routeId = route.routeId || `route-${route.fromCity}-${route.toCity}-${Date.now()}`;
  
  // fromCityKey и toCityKey должны быть идентификаторами городов, а не маршрута
  const fromCityKey = `city-${route.fromCity}`;
  const toCityKey = `city-${route.toCity}`;

  const fromCityCode = route.fromCity?.substring(0, 3).toUpperCase() || 'FROM';
  const toCityCode = route.toCity?.substring(0, 3).toUpperCase() || 'TO';

  // ФАЗА 5: Безопасная обработка totalDurationData с множественными fallback
  const totalDurationData = (route as any)?.totalDurationData;
  const totalDurationDisplay = 
    totalDurationData?.display || 
    (totalDurationData?.value 
      ? `${Math.floor(totalDurationData.value / 60)}ч ${totalDurationData.value % 60}м`
      : route.totalDuration 
        ? `${Math.floor(route.totalDuration / 60)}ч ${route.totalDuration % 60}м`
        : 'Неизвестно');
  
  const routeDescription = `Маршрут с ${route.transferCount || 0} пересадками, длительность ${totalDurationDisplay}`;

  // Извлекаем названия остановок из сегментов и сохраняем в кэш
  // Используем city name из fromCity/toCity как fallback
  const segments = route.segments.map((segment, index) => {
    // Пытаемся извлечь название города из stopId
    // Если stopId содержит название города, используем его
    const fromStopId = segment.segment.fromStopId;
    const toStopId = segment.segment.toStopId;
    
    // Пытаемся извлечь название из stopId (например, "stop-yakutsk-airport" -> "Якутск, Аэропорт")
    const extractCityName = (stopId: string, fallbackCity: string): string => {
      // Если stopId уже в кэше, используем его
      const cached = getStopName(stopId);
      if (cached !== stopId) {
        return cached;
      }
      
      // Пытаемся извлечь название из stopId
      // Формат может быть: "stop-011", "yakutsk-airport", "Якутск Аэропорт" и т.д.
      const lowerStopId = stopId.toLowerCase();
      
      // Если stopId содержит название города, извлекаем его
      if (lowerStopId.includes('якутск')) {
        const name = stopId.includes('аэропорт') || stopId.includes('airport') 
          ? 'Якутск, Аэропорт' 
          : stopId.includes('вокзал') || stopId.includes('station')
          ? 'Якутск, Вокзал'
          : stopId.includes('автостанция') || stopId.includes('bus')
          ? 'Якутск, Автостанция'
          : 'Якутск';
        setStopName(stopId, name);
        return name;
      }
      
      // Аналогично для других городов
      const cityPatterns: Record<string, string> = {
        'нерюнгри': 'Нерюнгри',
        'мирный': 'Мирный',
        'алдан': 'Алдан',
        'олекминск': 'Олёкминск',
        'ленск': 'Ленск',
        'вилюйск': 'Вилюйск',
        'удачный': 'Удачный',
      };
      
      for (const [pattern, cityName] of Object.entries(cityPatterns)) {
        if (lowerStopId.includes(pattern)) {
          const stopType = stopId.includes('аэропорт') || stopId.includes('airport') 
            ? ', Аэропорт' 
            : stopId.includes('вокзал') || stopId.includes('station')
            ? ', Вокзал'
            : stopId.includes('автостанция') || stopId.includes('bus')
            ? ', Автостанция'
            : '';
          const name = `${cityName}${stopType}`;
          setStopName(stopId, name);
          return name;
        }
      }
      
      // Если ничего не найдено, используем fallback
      setStopName(stopId, fallbackCity);
      return fallbackCity;
    };
    
    const fromCityName = index === 0 ? route.fromCity : extractCityName(fromStopId, route.fromCity);
    const toCityName = index === route.segments.length - 1 ? route.toCity : extractCityName(toStopId, route.toCity);
    
    return {
      from: {
        Наименование: fromCityName,
        Код: fromStopId,
        Адрес: undefined,
      } as { Наименование?: string; Код?: string; Адрес?: string } | null,
      to: {
        Наименование: toCityName,
        Код: toStopId,
        Адрес: undefined,
      } as { Наименование?: string; Код?: string; Адрес?: string } | null,
      order: index,
      transportType: segment.segment.transportType,
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
      duration: segment.duration,
      
      // Новые поля SmartRoute (если доступны)
      viaHubs: (segment.segment as any)?.viaHubs,
      isHub: (segment.segment as any)?.isHub,
      hubLevel: (segment.segment as any)?.hubLevel,
      seasonality: (segment.segment as any)?.seasonality,
      schedule: (segment as any)?.schedule,
      validation: (route as any)?.validation?.segmentValidations?.find(
        (v: any) => v.segmentId === segment.segment.segmentId
      ),
    };
  });

  const schedule = route.segments.flatMap((segment) => [
    {
      type: 'departure' as const,
      time: segment.departureTime,
      stop: segment.segment.fromStopId,
    },
    {
      type: 'arrival' as const,
      time: segment.arrivalTime,
      stop: segment.segment.toStopId,
    },
  ]);

  const flights = route.segments
    .filter((segment) => segment.selectedFlight)
    .map((segment) => {
      const flight = segment.selectedFlight!;
      return {
        Ref_Key: flight.flightId,
        НомерРейса: flight.flightNumber || 'Без номера',
        ВремяОтправления: flight.departureTime,
        ВремяПрибытия: flight.arrivalTime,
        Статус: flight.status || 'Доступен',
        tariffs: [
          {
            Цена: flight.price || segment.price,
            Наименование: 'Базовый тариф',
            Код: 'BASIC',
          },
        ],
        occupancy: [],
        availableSeats: flight.availableSeats,
      };
    });

  const adaptedRiskAssessment = riskAssessment
    ? {
        riskScore: {
          value: riskAssessment.riskScore.value,
          level: riskAssessment.riskScore.level,
          description: riskAssessment.riskScore.description,
        },
        factors: {
          transferCount: riskAssessment.factors.transferCount,
          historicalDelays: {
            averageDelay90Days: riskAssessment.factors.historicalDelays.averageDelay90Days,
            delayFrequency: riskAssessment.factors.historicalDelays.delayFrequency,
          },
          cancellations: {
            cancellationRate90Days: riskAssessment.factors.cancellations.cancellationRate90Days,
          },
          occupancy: {
            averageOccupancy: riskAssessment.factors.occupancy.averageOccupancy,
          },
        },
        recommendations: riskAssessment.recommendations,
      }
    : undefined;

  // Преобразуем сегменты SmartRoute в формат для SmartRouteSegments
  // Если route содержит новые поля SmartRoute (через adaptSmartRouteToIBuiltRoute), создаем smartRouteSegments
  const routeWithSmartRouteFields = route as IBuiltRoute & {
    validation?: {
      isValid: boolean
      errors: string[]
      warnings: string[]
      segmentValidations?: Array<{
        segmentId: string
        isValid: boolean
        errors: string[]
        warnings: string[]
      }>
    }
    totalDistance?: number
    totalDurationData?: { display: string }
    totalPriceData?: { display: string }
  }
  
  // КРИТИЧЕСКИЙ ФИКС: Проверяем, является ли маршрут SmartRoute (на уровне маршрута)
  // Если маршрут содержит хотя бы одно новое поле SmartRoute, создаём smartRouteSegments для всех сегментов
  const isSmartRoute = Boolean(
    routeWithSmartRouteFields.validation ||
    routeWithSmartRouteFields.totalDistance !== undefined ||
    routeWithSmartRouteFields.totalDurationData ||
    routeWithSmartRouteFields.totalPriceData ||
    routeWithSmartRouteFields.segments?.some(seg => 
      (seg.segment as any)?.pathGeometry || 
      (seg.segment as any)?.viaHubs || 
      (seg.segment as any)?.isHub ||
      (seg.segment as any)?.hubLevel ||
      (seg.segment as any)?.isDirect !== undefined ||
      (seg as any)?.seasonality ||
      (seg as any)?.validation
    )
  )
  
  // Если маршрут SmartRoute, создаём smartRouteSegments для всех сегментов
  const smartRouteSegments = isSmartRoute && routeWithSmartRouteFields.segments ? routeWithSmartRouteFields.segments.map((segment) => {
    const segmentWithFields = segment.segment as IRouteSegment & {
      viaHubs?: Array<{ level: 'federal' | 'regional' }>
      pathGeometry?: Array<[number, number]>
      isHub?: boolean
      hubLevel?: 'federal' | 'regional'
      isDirect?: boolean
      seasonality?: {
        available: boolean
        season: string
      }
    }
    
    const segmentDetails = segment as IRouteSegmentDetails & {
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
    }
    
    // КРИТИЧЕСКИЙ ФИКС: Если маршрут SmartRoute, создаём smartRouteSegment для каждого сегмента
    // Используем новые поля, если доступны, иначе fallback на старые
    // Находим соответствующий сегмент в segments для получения названий остановок
    const segmentIndex = routeWithSmartRouteFields.segments.indexOf(segment)
    const segmentData = segments[segmentIndex]
    
    // Извлекаем названия остановок из SmartRoute данных, если доступны
    // Приоритет: данные из SmartRoute (если есть в IBuiltRoute) > segmentData > fallback
    const fromName = (segment.segment as any)?.fromName 
      || segmentData?.from?.Наименование 
      || segmentWithFields.fromStopId
    const toName = (segment.segment as any)?.toName
      || segmentData?.to?.Наименование
      || segmentWithFields.toStopId
    
    // Извлекаем тип остановки из SmartRoute, если доступен
    // segmentData не содержит type, используем только из SmartRoute
    const fromType = (segment.segment as any)?.fromType || 'stop'
    const toType = (segment.segment as any)?.toType || 'stop'
    
    return {
      segmentId: segmentWithFields.segmentId,
      type: segmentWithFields.transportType,
      from: {
        id: segmentWithFields.fromStopId,
        name: fromName,
        type: fromType,
        isHub: segmentWithFields?.isHub,
        hubLevel: segmentWithFields?.hubLevel,
      },
      to: {
        id: segmentWithFields.toStopId,
        name: toName,
        type: toType,
        isHub: segmentWithFields?.isHub,
        hubLevel: segmentWithFields?.hubLevel,
      },
      distance: {
        // КРИТИЧЕСКИЙ ФИКС: Используем distance.value из SmartRoute, если доступно
        // Используем ?? вместо || для безопасной обработки 0
        value: (segment as any).distanceData?.value ?? segmentWithFields.distance ?? 0,
        unit: 'km',
      },
      duration: {
        // КРИТИЧЕСКИЙ ФИКС: Используем duration.value из SmartRoute, если доступно
        // Backend отдаёт duration = { value, display }
        value: (segment as any).durationData?.value ?? segment.duration ?? 0,
        unit: 'minutes',
        // Используем durationData.display из SmartRoute, если доступно
        display: (segment as any).durationData?.display ?? (() => {
          const durationValue = (segment as any).durationData?.value ?? segment.duration ?? 0;
          const hours = Math.floor(durationValue / 60);
          const minutes = durationValue % 60;
          return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
        })(),
      },
      price: {
        base: segment.price ?? 0,
        // КРИТИЧЕСКИЙ ФИКС: Используем price.total из SmartRoute, если доступно
        // Backend отдаёт price = { total, display }
        total: (segment as any).priceData?.total ?? segment.price ?? 0,
        currency: 'RUB',
        // Используем priceData.display из SmartRoute, если доступно
        display: (segment as any).priceData?.display ?? (() => {
          const priceValue = (segment as any).priceData?.total ?? segment.price ?? 0;
          return `${priceValue.toFixed(0)}₽`;
        })(),
      },
      isDirect: segmentWithFields?.isDirect,
      viaHubs: segmentWithFields?.viaHubs,
      pathGeometry: segmentWithFields?.pathGeometry,
      schedule: {
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
      },
      seasonality: segmentDetails?.seasonality || segmentWithFields?.seasonality,
      validation: segmentDetails?.validation || routeWithSmartRouteFields.validation?.segmentValidations?.find(
        (v) => v.segmentId === segmentWithFields.segmentId
      ),
    };
  }) : undefined;

  return {
    from: {
      Ref_Key: fromCityKey,
      Наименование: route.fromCity,
      Код: fromCityCode,
      Адрес: undefined,
      Координаты: undefined,
    },
    to: {
      Ref_Key: toCityKey,
      Наименование: route.toCity,
      Код: toCityCode,
      Адрес: undefined,
      Координаты: undefined,
    },
    date: route.date,
    routes: [
      {
        route: {
          Ref_Key: routeId, // ФАЗА 5: Используем исправленный routeId
          Наименование: `${route.fromCity} → ${route.toCity}`,
          Код: routeId, // ФАЗА 5: Используем исправленный routeId
          Description: routeDescription,
        },
        segments,
        schedule,
        flights,
      },
    ],
    riskAssessment: adaptedRiskAssessment,
    // Новые поля SmartRoute
    smartRouteSegments: smartRouteSegments && smartRouteSegments.length > 0 ? smartRouteSegments : undefined,
    validation: (route as any)?.validation,
  };
}

