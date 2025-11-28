/**
 * Fixtures: Федеральные города (хабы)
 * 
 * Детерминированные данные для тестов.
 * Основаны на реальных федеральных хабах.
 */

import { City } from '../../../domain/smart-routing/entities/City';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../domain/smart-routing/enums/HubLevel';
import { createAdministrativeStructure } from '../../../domain/smart-routing/entities/AdministrativeStructure';
import { Stop } from '../../../domain/smart-routing/entities/Stop';

/**
 * Москва - федеральный хаб
 */
export const MOSCOW: City = new City(
  'moscow',
  'Москва',
  'москва',
  createAdministrativeStructure(
    {
      type: 'federal_city',
      name: 'г. Москва',
      shortName: 'Москва',
      code: 'MSK',
    },
    {
      type: 'city',
      name: 'Москва',
      normalizedName: 'москва',
    }
  ),
  new Coordinates(55.7558, 37.6173),
  'Europe/Moscow',
  false,
  true,
  HubLevel.FEDERAL,
  {
    hasAirport: true,
    airportClass: 'A',
    hasTrainStation: true,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'moscow-airport-svo',
      'Аэропорт Шереметьево',
      'airport',
      new Coordinates(55.9736, 37.4147),
      'moscow',
      true,
      HubLevel.FEDERAL,
      'SVO'
    ),
    new Stop(
      'moscow-train-station',
      'ЖД вокзал Москва',
      'train_station',
      new Coordinates(55.7558, 37.6173),
      'moscow',
      false,
      undefined,
      undefined,
      'MOSKVA'
    ),
    new Stop(
      'moscow-bus-station',
      'Автовокзал Москва',
      'bus_station',
      new Coordinates(55.7558, 37.6173),
      'moscow',
      false
    ),
  ],
  ['МСК', 'Moscow', 'MSK'],
  12600000
);

/**
 * Новосибирск - федеральный хаб
 */
export const NOVOSIBIRSK: City = new City(
  'novosibirsk',
  'Новосибирск',
  'новосибирск',
  createAdministrativeStructure(
    {
      type: 'oblast',
      name: 'Новосибирская область',
      shortName: 'Новосибирская обл.',
      code: 'NVS',
    },
    {
      type: 'city',
      name: 'Новосибирск',
      normalizedName: 'новосибирск',
    }
  ),
  new Coordinates(55.0084, 82.9357),
  'Asia/Novosibirsk',
  false,
  true,
  HubLevel.FEDERAL,
  {
    hasAirport: true,
    airportClass: 'A',
    hasTrainStation: true,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'novosibirsk-airport',
      'Аэропорт Новосибирск (Толмачёво)',
      'airport',
      new Coordinates(55.0126, 82.6507),
      'novosibirsk',
      true,
      HubLevel.FEDERAL,
      'OVB'
    ),
    new Stop(
      'novosibirsk-train-station',
      'ЖД вокзал Новосибирск',
      'train_station',
      new Coordinates(55.0084, 82.9357),
      'novosibirsk',
      false,
      undefined,
      undefined,
      'NOVOSIBIRSK'
    ),
    new Stop(
      'novosibirsk-bus-station',
      'Автовокзал Новосибирск',
      'bus_station',
      new Coordinates(55.0084, 82.9357),
      'novosibirsk',
      false
    ),
  ],
  ['Новосибирск', 'Novosibirsk', 'OVB'],
  1600000
);

/**
 * Красноярск - федеральный хаб
 */
export const KRASNOYARSK: City = new City(
  'krasnoyarsk',
  'Красноярск',
  'красноярск',
  createAdministrativeStructure(
    {
      type: 'kray',
      name: 'Красноярский край',
      shortName: 'Красноярский кр.',
      code: 'KYA',
    },
    {
      type: 'city',
      name: 'Красноярск',
      normalizedName: 'красноярск',
    }
  ),
  new Coordinates(56.0089, 92.8529),
  'Asia/Krasnoyarsk',
  false,
  true,
  HubLevel.FEDERAL,
  {
    hasAirport: true,
    airportClass: 'A',
    hasTrainStation: true,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'krasnoyarsk-airport',
      'Аэропорт Красноярск (Емельяново)',
      'airport',
      new Coordinates(56.1729, 92.4933),
      'krasnoyarsk',
      true,
      HubLevel.FEDERAL,
      'KJA'
    ),
    new Stop(
      'krasnoyarsk-train-station',
      'ЖД вокзал Красноярск',
      'train_station',
      new Coordinates(56.0089, 92.8529),
      'krasnoyarsk',
      false,
      undefined,
      undefined,
      'KRASNOYARSK'
    ),
    new Stop(
      'krasnoyarsk-bus-station',
      'Автовокзал Красноярск',
      'bus_station',
      new Coordinates(56.0089, 92.8529),
      'krasnoyarsk',
      false
    ),
  ],
  ['Красноярск', 'Krasnoyarsk', 'KJA'],
  1100000
);

/**
 * Все федеральные города для тестов
 */
export const FEDERAL_CITIES: City[] = [
  MOSCOW,
  NOVOSIBIRSK,
  KRASNOYARSK,
];

/**
 * Получить федеральный город по ID
 */
export function getFederalCityById(id: string): City | undefined {
  return FEDERAL_CITIES.find((city) => city.id === id);
}





