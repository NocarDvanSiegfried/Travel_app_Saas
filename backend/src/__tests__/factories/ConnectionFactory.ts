/**
 * Connection Factory
 * 
 * Фабрика для создания тестовых соединений между городами.
 * Детерминированные, реалистичные данные без случайности.
 */

import type { CityConnection } from '../../domain/smart-routing/data/connections-model';
import type { ConnectionType } from '../../domain/smart-routing/data/connections-model';
import { Coordinates } from '../../domain/smart-routing/value-objects/Coordinates';

/**
 * Параметры для создания соединения
 */
export interface ConnectionFactoryParams {
  id?: string;
  type?: ConnectionType;
  fromCityId: string;
  toCityId: string;
  distance?: number;
  duration?: number;
  basePrice?: number;
  season?: 'summer' | 'winter' | 'transition' | 'all';
  intermediateCities?: (string | { latitude: number; longitude: number })[];
  viaHubs?: string[];
  isDirect?: boolean;
  metadata?: CityConnection['metadata'];
}

/**
 * Создаёт mock соединение между городами
 */
export function generateMockConnection(params: ConnectionFactoryParams): CityConnection {
  const type = params.type || 'bus';
  const id = params.id || `${type}-${params.fromCityId}-${params.toCityId}`;
  
  // Расстояние по умолчанию (будет пересчитано, если нужно)
  const distance = params.distance || 100;
  
  // Время в пути по умолчанию (зависит от типа транспорта)
  let defaultDuration: number;
  switch (type) {
    case 'airplane':
      defaultDuration = Math.round(distance / 800 * 60); // ~800 км/ч средняя скорость
      break;
    case 'train':
      defaultDuration = Math.round(distance / 60 * 60); // ~60 км/ч средняя скорость
      break;
    case 'bus':
      defaultDuration = Math.round(distance / 70 * 60); // ~70 км/ч средняя скорость
      break;
    case 'ferry':
      defaultDuration = Math.round(distance / 30 * 60); // ~30 км/ч средняя скорость
      break;
    case 'winter_road':
      defaultDuration = Math.round(distance / 50 * 60); // ~50 км/ч средняя скорость
      break;
    default:
      defaultDuration = Math.round(distance / 60 * 60);
  }
  const duration = params.duration || defaultDuration;
  
  // Базовая цена по умолчанию (зависит от типа транспорта)
  let defaultPrice: number;
  switch (type) {
    case 'airplane':
      defaultPrice = Math.round(distance * 25); // ~25₽ за км
      break;
    case 'train':
      defaultPrice = Math.round(distance * 2); // ~2₽ за км
      break;
    case 'bus':
      defaultPrice = Math.round(distance * 1.5); // ~1.5₽ за км
      break;
    case 'ferry':
      defaultPrice = Math.round(distance * 3); // ~3₽ за км
      break;
    case 'winter_road':
      defaultPrice = Math.round(distance * 2.5); // ~2.5₽ за км
      break;
    default:
      defaultPrice = Math.round(distance * 2);
  }
  const basePrice = params.basePrice || defaultPrice;
  
  // Сезонность по умолчанию
  const season = params.season || (type === 'winter_road' ? 'winter' : type === 'ferry' ? 'summer' : 'all');
  
  // Прямое соединение по умолчанию
  const isDirect = params.isDirect ?? (params.viaHubs === undefined && params.intermediateCities === undefined);
  
  return {
    id,
    type,
    fromCityId: params.fromCityId,
    toCityId: params.toCityId,
    distance,
    duration,
    basePrice,
    season,
    intermediateCities: params.intermediateCities,
    viaHubs: params.viaHubs,
    isDirect,
    metadata: params.metadata,
  };
}

/**
 * Создаёт авиационное соединение (через хабы)
 */
export function generateAirplaneConnection(
  fromCityId: string,
  toCityId: string,
  distance: number,
  viaHubs: string[] = [],
  params: Partial<ConnectionFactoryParams> = {}
): CityConnection {
  return generateMockConnection({
    type: 'airplane',
    fromCityId,
    toCityId,
    distance,
    viaHubs: viaHubs.length > 0 ? viaHubs : undefined,
    isDirect: viaHubs.length === 0,
    season: 'all',
    ...params,
  });
}

/**
 * Создаёт автобусное соединение
 */
export function generateBusConnection(
  fromCityId: string,
  toCityId: string,
  distance: number,
  intermediateCities?: string[],
  params: Partial<ConnectionFactoryParams> = {}
): CityConnection {
  return generateMockConnection({
    type: 'bus',
    fromCityId,
    toCityId,
    distance,
    intermediateCities,
    isDirect: !intermediateCities || intermediateCities.length === 0,
    season: 'all',
    ...params,
  });
}

/**
 * Создаёт ЖД соединение
 */
export function generateTrainConnection(
  fromCityId: string,
  toCityId: string,
  distance: number,
  intermediateCities?: string[],
  params: Partial<ConnectionFactoryParams> = {}
): CityConnection {
  return generateMockConnection({
    type: 'train',
    fromCityId,
    toCityId,
    distance,
    intermediateCities,
    isDirect: !intermediateCities || intermediateCities.length === 0,
    season: 'all',
    ...params,
  });
}

/**
 * Создаёт паромное соединение
 */
export function generateFerryConnection(
  fromCityId: string,
  toCityId: string,
  distance: number,
  intermediatePoints?: { latitude: number; longitude: number }[],
  params: Partial<ConnectionFactoryParams> = {}
): CityConnection {
  return generateMockConnection({
    type: 'ferry',
    fromCityId,
    toCityId,
    distance,
    intermediateCities: intermediatePoints,
    isDirect: !intermediatePoints || intermediatePoints.length === 0,
    season: 'summer',
    ...params,
  });
}

/**
 * Создаёт соединение по зимнику
 */
export function generateWinterRoadConnection(
  fromCityId: string,
  toCityId: string,
  distance: number,
  params: Partial<ConnectionFactoryParams> = {}
): CityConnection {
  return generateMockConnection({
    type: 'winter_road',
    fromCityId,
    toCityId,
    distance,
    isDirect: true,
    season: 'winter',
    ...params,
  });
}






