/**
 * Fixtures: Реалистичные соединения Якутии
 * 
 * Детерминированные данные для тестов.
 * Основаны на реальных соединениях из connections-model.
 */

import type { CityConnection } from '../../../domain/smart-routing/data/connections-model';
import {
  generateAirplaneConnection,
  generateBusConnection,
  generateFerryConnection,
  generateTrainConnection,
  generateWinterRoadConnection,
} from '../../factories/ConnectionFactory';

/**
 * Авиационное соединение: Якутск → Москва (через хаб)
 */
export const YAKUTSK_TO_MOSCOW_AIRPLANE: CityConnection = generateAirplaneConnection(
  'yakutsk',
  'moscow',
  4900, // км
  ['yakutsk-hub'], // через региональный хаб
  {
    id: 'airplane-yakutsk-moscow',
    duration: 390, // минут (~6.5 часов)
    basePrice: 25000,
    season: 'all',
    metadata: {
      routeNumber: 'SU-1234',
      carrier: 'Аэрофлот',
    },
  }
);

/**
 * Авиационное соединение: Среднеколымск → Якутск (через хаб)
 */
export const SREDNEKOLYMSK_TO_YAKUTSK_AIRPLANE: CityConnection = generateAirplaneConnection(
  'srednekolymsk',
  'yakutsk',
  1200, // км
  ['yakutsk-hub'],
  {
    id: 'airplane-srednekolymsk-yakutsk',
    duration: 90, // минут (~1.5 часа)
    basePrice: 8000,
    season: 'all',
    isDirect: false,
  }
);

/**
 * Автобусное соединение: Якутск → Олёкминск
 */
export const YAKUTSK_TO_OLEKMINSK_BUS: CityConnection = generateBusConnection(
  'yakutsk',
  'olekminsk',
  650, // км
  ['lensk'], // через Ленск
  {
    id: 'bus-yakutsk-olekminsk',
    duration: 600, // минут (~10 часов)
    basePrice: 2000,
    season: 'all',
    isDirect: false,
    metadata: {
      routeNumber: 'ЯК-123',
      carrier: 'ЯкутАвтоТранс',
    },
  }
);

/**
 * Паромное соединение: Якутск → Олёкминск (по Лене)
 */
export const YAKUTSK_TO_OLEKMINSK_FERRY: CityConnection = generateFerryConnection(
  'yakutsk',
  'olekminsk',
  800, // км (по реке больше, чем по прямой)
  [
    { latitude: 60.5, longitude: 120.0 }, // Промежуточная точка на реке
  ],
  {
    id: 'ferry-yakutsk-olekminsk',
    duration: 1440, // минут (~24 часа)
    basePrice: 3000,
    season: 'summer',
    isDirect: false,
    metadata: {
      routeNumber: 'ЛЕНА-1',
      carrier: 'Ленское пароходство',
    },
  }
);

/**
 * ЖД соединение: Нерюнгри → Тында (АЯМ)
 */
export const NERYUNGRI_TO_TYNDA_TRAIN: CityConnection = generateTrainConnection(
  'neryungri',
  'tynda',
  500, // км
  ['aldan', 'tommot'], // Промежуточные станции
  {
    id: 'train-neryungri-tynda',
    duration: 600, // минут (~10 часов)
    basePrice: 1500,
    season: 'all',
    isDirect: false,
    metadata: {
      routeNumber: '123А',
      carrier: 'РЖД',
    },
  }
);

/**
 * Зимник: Среднеколымск → Верхоянск
 */
export const SREDNEKOLYMSK_TO_VERKHOYANSK_WINTER_ROAD: CityConnection = generateWinterRoadConnection(
  'srednekolymsk',
  'verkhoyansk',
  400, // км
  {
    id: 'winter-road-srednekolymsk-verkhoyansk',
    duration: 480, // минут (~8 часов)
    basePrice: 2000,
    season: 'winter',
    isDirect: true,
    metadata: {
      routeNumber: 'ЗИМ-1',
      carrier: 'Местные перевозчики',
    },
  }
);

/**
 * Все соединения Якутии для тестов
 */
export const YAKUTIA_CONNECTIONS: CityConnection[] = [
  YAKUTSK_TO_MOSCOW_AIRPLANE,
  SREDNEKOLYMSK_TO_YAKUTSK_AIRPLANE,
  YAKUTSK_TO_OLEKMINSK_BUS,
  YAKUTSK_TO_OLEKMINSK_FERRY,
  NERYUNGRI_TO_TYNDA_TRAIN,
  SREDNEKOLYMSK_TO_VERKHOYANSK_WINTER_ROAD,
];

/**
 * Получить соединение по ID
 */
export function getYakutiaConnectionById(id: string): CityConnection | undefined {
  return YAKUTIA_CONNECTIONS.find((conn) => conn.id === id);
}

/**
 * Получить соединения от города
 */
export function getYakutiaConnectionsFromCity(cityId: string): CityConnection[] {
  return YAKUTIA_CONNECTIONS.filter((conn) => conn.fromCityId === cityId);
}

/**
 * Получить соединения до города
 */
export function getYakutiaConnectionsToCity(cityId: string): CityConnection[] {
  return YAKUTIA_CONNECTIONS.filter((conn) => conn.toCityId === cityId);
}

