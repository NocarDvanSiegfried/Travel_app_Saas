/**
 * Segment Factory
 * 
 * Фабрика для создания тестовых сегментов маршрута.
 * Детерминированные, реалистичные данные без случайности.
 */

import { SmartRouteSegment, type ISmartRouteSegment } from '../../domain/smart-routing/entities/SmartRouteSegment';
import { TransportType } from '../../domain/entities/RouteSegment';
import type { IStop } from '../../domain/smart-routing/entities/Stop';
import type { Hub } from '../../domain/smart-routing/entities/Hub';
import { Coordinates } from '../../domain/smart-routing/value-objects/Coordinates';
import { DistanceModel, createDistanceModel } from '../../domain/smart-routing/value-objects/DistanceModel';
import { PriceModel, createPriceModel } from '../../domain/smart-routing/value-objects/PriceModel';
import { Seasonality, createSeasonality } from '../../domain/smart-routing/value-objects/Seasonality';
import { Season } from '../../domain/smart-routing/enums/Season';
import { DistanceCalculationMethod } from '../../domain/smart-routing/enums/DistanceCalculationMethod';
import { formatDuration } from '../../domain/smart-routing/entities/SmartRouteSegment';

/**
 * Параметры для создания сегмента
 */
export interface SegmentFactoryParams {
  id?: string;
  type: TransportType;
  from: IStop;
  to: IStop;
  distance?: number;
  duration?: number;
  basePrice?: number;
  season?: Season;
  intermediateStops?: IStop[];
  viaHubs?: Hub[];
  isDirect?: boolean;
  pathGeometry?: [number, number][];
  metadata?: ISmartRouteSegment['metadata'];
}

/**
 * Создаёт реалистичную геометрию пути (не прямую линию)
 */
function createRealisticPathGeometry(
  from: IStop,
  to: IStop,
  viaHubs?: Hub[]
): [number, number][] {
  const coordinates: [number, number][] = [];
  
  // Начальная точка
  coordinates.push([from.coordinates.longitude, from.coordinates.latitude]);
  
  // Промежуточные точки через хабы
  if (viaHubs && viaHubs.length > 0) {
    for (const hub of viaHubs) {
      coordinates.push([hub.coordinates.longitude, hub.coordinates.latitude]);
    }
  } else {
    // Если нет хабов, создаём промежуточную точку с отклонением
    const midLat = (from.coordinates.latitude + to.coordinates.latitude) / 2;
    const midLng = (from.coordinates.longitude + to.coordinates.longitude) / 2;
    const offset = 0.01; // ~1 км отклонение
    coordinates.push([midLng + offset, midLat + offset * 0.5]);
  }
  
  // Конечная точка
  coordinates.push([to.coordinates.longitude, to.coordinates.latitude]);
  
  return coordinates;
}

/**
 * Создаёт mock сегмент маршрута
 */
export function generateMockSegment(params: SegmentFactoryParams): SmartRouteSegment {
  const id = params.id || `segment-${params.from.id}-${params.to.id}`;
  
  // Расстояние по умолчанию (Haversine между остановками)
  const distance = params.distance || params.from.coordinates.distanceTo(params.to.coordinates);
  
  // Время в пути по умолчанию (зависит от типа транспорта)
  let defaultDuration: number;
  switch (params.type) {
    case TransportType.AIRPLANE:
      defaultDuration = Math.round(distance / 800 * 60); // ~800 км/ч
      break;
    case TransportType.TRAIN:
      defaultDuration = Math.round(distance / 60 * 60); // ~60 км/ч
      break;
    case TransportType.BUS:
      defaultDuration = Math.round(distance / 70 * 60); // ~70 км/ч
      break;
    case TransportType.FERRY:
      defaultDuration = Math.round(distance / 30 * 60); // ~30 км/ч
      break;
    case TransportType.WINTER_ROAD:
      defaultDuration = Math.round(distance / 50 * 60); // ~50 км/ч
      break;
    default:
      defaultDuration = Math.round(distance / 60 * 60);
  }
  const durationMinutes = params.duration || defaultDuration;
  
  // Базовая цена по умолчанию
  let defaultPrice: number;
  switch (params.type) {
    case TransportType.AIRPLANE:
      defaultPrice = Math.round(distance * 25);
      break;
    case TransportType.TRAIN:
      defaultPrice = Math.round(distance * 2);
      break;
    case TransportType.BUS:
      defaultPrice = Math.round(distance * 1.5);
      break;
    case TransportType.FERRY:
      defaultPrice = Math.round(distance * 3);
      break;
    case TransportType.WINTER_ROAD:
      defaultPrice = Math.round(distance * 2.5);
      break;
    default:
      defaultPrice = Math.round(distance * 2);
  }
  const basePrice = params.basePrice || defaultPrice;
  
  // Модель расстояния
  const distanceModel = createDistanceModel(
    distance,
    DistanceCalculationMethod.HAVERSINE,
    {
      [params.type]: distance,
    }
  );
  
  // Модель цены
  const priceModel = createPriceModel(basePrice);
  
  // Сезонность
  const season = params.season || (params.type === TransportType.WINTER_ROAD ? Season.WINTER : Season.ALL);
  const seasonality = createSeasonality(season);
  
  // Геометрия пути
  const pathGeometry = params.pathGeometry || createRealisticPathGeometry(params.from, params.to, params.viaHubs);
  
  // Прямой сегмент
  const isDirect = params.isDirect ?? (params.viaHubs === undefined && params.intermediateStops === undefined);
  
  return new SmartRouteSegment(
    id,
    params.type,
    params.from,
    params.to,
    distanceModel,
    {
      value: durationMinutes,
      unit: 'minutes',
      display: formatDuration(durationMinutes),
    },
    priceModel,
    seasonality,
    {
      type: 'LineString',
      coordinates: pathGeometry,
    },
    isDirect,
    params.intermediateStops,
    params.viaHubs,
    params.metadata
  );
}

/**
 * Создаёт авиационный сегмент (через хабы)
 */
export function generateAirplaneSegment(
  from: IStop,
  to: IStop,
  viaHubs: Hub[] = [],
  params: Partial<SegmentFactoryParams> = {}
): SmartRouteSegment {
  return generateMockSegment({
    type: TransportType.AIRPLANE,
    from,
    to,
    viaHubs: viaHubs.length > 0 ? viaHubs : undefined,
    isDirect: viaHubs.length === 0,
    season: Season.ALL,
    ...params,
  });
}

/**
 * Создаёт автобусный сегмент
 */
export function generateBusSegment(
  from: IStop,
  to: IStop,
  intermediateStops?: IStop[],
  params: Partial<SegmentFactoryParams> = {}
): SmartRouteSegment {
  return generateMockSegment({
    type: TransportType.BUS,
    from,
    to,
    intermediateStops,
    isDirect: !intermediateStops || intermediateStops.length === 0,
    season: Season.ALL,
    ...params,
  });
}

/**
 * Создаёт ЖД сегмент
 */
export function generateTrainSegment(
  from: IStop,
  to: IStop,
  intermediateStops?: IStop[],
  params: Partial<SegmentFactoryParams> = {}
): SmartRouteSegment {
  return generateMockSegment({
    type: TransportType.TRAIN,
    from,
    to,
    intermediateStops,
    isDirect: !intermediateStops || intermediateStops.length === 0,
    season: Season.ALL,
    ...params,
  });
}

/**
 * Создаёт паромный сегмент
 */
export function generateFerrySegment(
  from: IStop,
  to: IStop,
  params: Partial<SegmentFactoryParams> = {}
): SmartRouteSegment {
  return generateMockSegment({
    type: TransportType.FERRY,
    from,
    to,
    isDirect: true,
    season: Season.SUMMER,
    ...params,
  });
}

/**
 * Создаёт сегмент по зимнику
 */
export function generateWinterRoadSegment(
  from: IStop,
  to: IStop,
  params: Partial<SegmentFactoryParams> = {}
): SmartRouteSegment {
  return generateMockSegment({
    type: TransportType.WINTER_ROAD,
    from,
    to,
    isDirect: true,
    season: Season.WINTER,
    ...params,
  });
}





