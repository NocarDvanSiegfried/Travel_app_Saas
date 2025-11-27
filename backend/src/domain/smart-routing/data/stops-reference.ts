/**
 * Справочник остановок
 * 
 * Содержит все остановки (аэропорты, вокзалы, автовокзалы, пристани)
 * с их координатами, типами и связью с городами
 */

import type { IStop } from '../entities/Stop';
import { Stop } from '../entities/Stop';
import { HubLevel } from '../enums/HubLevel';
import { Coordinates } from '../value-objects/Coordinates';
import { ALL_CITIES } from './cities-reference';
import { ALL_HUBS } from './hubs-reference';

/**
 * Создаёт остановки для всех городов на основе их инфраструктуры
 */
export function generateStopsForCities(): IStop[] {
  const stops: IStop[] = [];

  for (const city of ALL_CITIES) {
    const cityCoords = new Coordinates(city.coordinates.latitude, city.coordinates.longitude);
    const hub = ALL_HUBS.find((h) => h.id === `${city.id}-hub`);

    // Аэропорты
    if (city.infrastructure.hasAirport) {
      const airportCode = hub?.airportCode || getAirportCodeForCity(city.id);
      stops.push(
        new Stop(
          `${city.id}-airport`,
          `Аэропорт ${city.name}${airportCode ? ` (${airportCode})` : ''}`,
          'airport',
          cityCoords,
          city.id,
          city.isHub || false,
          city.hubLevel === 'federal' ? HubLevel.FEDERAL : city.hubLevel === 'regional' ? HubLevel.REGIONAL : undefined,
          airportCode
        )
      );
    }

    // ЖД-станции
    if (city.infrastructure.hasTrainStation) {
      const stationCode = getTrainStationCodeForCity(city.id);
      stops.push(
        new Stop(
          `${city.id}-train-station`,
          `Вокзал ${city.name}${stationCode ? ` (${stationCode})` : ''}`,
          'train_station',
          cityCoords,
          city.id,
          false,
          undefined,
          undefined,
          stationCode
        )
      );
    }

    // Автовокзалы
    if (city.infrastructure.hasBusStation) {
      stops.push(
        new Stop(
          `${city.id}-bus-station`,
          `Автостанция ${city.name}`,
          'bus_station',
          cityCoords,
          city.id
        )
      );
    }

    // Паромные пристани
    if (city.infrastructure.hasFerryPier) {
      stops.push(
        new Stop(
          `${city.id}-ferry-pier`,
          `Пристань ${city.name}`,
          'ferry_pier',
          cityCoords,
          city.id,
          undefined,
          undefined,
          undefined,
          undefined,
          `Пристань ${city.name}`
        )
      );
    }

    // Зимники (точки зимних дорог)
    if (city.infrastructure.hasWinterRoad) {
      stops.push(
        new Stop(
          `${city.id}-winter-road`,
          `Зимник ${city.name}`,
          'winter_road_point',
          cityCoords,
          city.id
        )
      );
    }
  }

  // Специальные остановки

  // Нижний Бестях - ЖД-вокзал (конечная станция АЯМ)
  const nizhnyBestyakh = ALL_CITIES.find((c) => c.id === 'nizhny-bestyakh');
  if (nizhnyBestyakh) {
    stops.push(
      new Stop(
        'nizhny-bestyakh-train-station',
        'Вокзал Нижний Бестях (АЯМ)',
        'train_station',
        new Coordinates(61.9500, 129.6000),
        'nizhny-bestyakh',
        false,
        undefined,
        undefined,
        'NIZHNY_BESTYAKH'
      )
    );
  }

  // Тында - узловая станция (связь АЯМ с Транссибом)
  stops.push(
    new Stop(
      'tynda-train-station',
      'Вокзал Тында (АЯМ ↔ Транссиб)',
      'train_station',
      new Coordinates(55.1500, 124.7000),
      'tynda',
      false,
      undefined,
      undefined,
      'TYNDA'
    )
  );

  // Сковородино - узловая станция Транссиба
  stops.push(
    new Stop(
      'skovorodino-train-station',
      'Вокзал Сковородино (Транссиб)',
      'train_station',
      new Coordinates(53.9800, 123.9300),
      'skovorodino',
      false,
      undefined,
      undefined,
      'SKOVORODINO'
    )
  );

  return stops;
}

/**
 * Получить код аэропорта для города
 */
function getAirportCodeForCity(cityId: string): string | undefined {
  const codes: Record<string, string> = {
    moscow: 'SVO',
    novosibirsk: 'OVB',
    krasnoyarsk: 'KJA',
    khabarovsk: 'KHV',
    irkutsk: 'IKT',
    yakutsk: 'YAK',
    mirny: 'MJZ',
    neryungri: 'NER',
    tiksi: 'IKS',
    srednekolymsk: 'SRK',
    chokurdakh: 'CHK',
    verkhoyansk: 'VRH',
  };
  return codes[cityId];
}

/**
 * Получить код ЖД-станции для города
 */
function getTrainStationCodeForCity(cityId: string): string | undefined {
  const codes: Record<string, string> = {
    moscow: 'MOSCOW',
    novosibirsk: 'NOVOSIBIRSK',
    krasnoyarsk: 'KRASNOYARSK',
    khabarovsk: 'KHABAROVSK',
    irkutsk: 'IRKUTSK',
    aldan: 'ALDAN',
    tommot: 'TOMMOT',
    'nizhny-bestyakh': 'NIZHNY_BESTYAKH',
    tynda: 'TYNDA',
    skovorodino: 'SKOVORODINO',
  };
  return codes[cityId];
}

/**
 * Все остановки (генерируются автоматически)
 */
export const ALL_STOPS: IStop[] = generateStopsForCities();

/**
 * Получить остановку по ID
 */
export function getStopById(id: string): IStop | undefined {
  return ALL_STOPS.find((stop) => stop.id === id);
}

/**
 * Получить остановки по городу
 */
export function getStopsByCity(cityId: string): IStop[] {
  return ALL_STOPS.filter((stop) => stop.cityId === cityId);
}

/**
 * Получить остановки по типу
 */
export function getStopsByType(type: IStop['type']): IStop[] {
  return ALL_STOPS.filter((stop) => stop.type === type);
}

/**
 * Получить остановки-хабы
 */
export function getHubStops(): IStop[] {
  return ALL_STOPS.filter((stop) => stop.isHub === true);
}




