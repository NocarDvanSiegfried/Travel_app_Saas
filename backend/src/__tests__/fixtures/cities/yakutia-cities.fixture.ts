/**
 * Fixtures: Реалистичные города Якутии
 * 
 * Детерминированные данные для тестов.
 * Основаны на реальных городах Якутии из cities-reference.
 */

import { City } from '../../../domain/smart-routing/entities/City';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../domain/smart-routing/enums/HubLevel';
import { createAdministrativeStructure } from '../../../domain/smart-routing/entities/AdministrativeStructure';
import { Stop } from '../../../domain/smart-routing/entities/Stop';

/**
 * Якутск - региональный хаб
 */
export const YAKUTSK: City = new City(
  'yakutsk',
  'Якутск',
  'якутск',
  createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Якутия',
      code: 'SA',
    },
    {
      type: 'city',
      name: 'Якутск',
      normalizedName: 'якутск',
    }
  ),
  new Coordinates(62.0278, 129.7042),
  'Asia/Yakutsk',
  true, // isKeyCity
  true, // isHub
  HubLevel.REGIONAL,
  {
    hasAirport: true,
    airportClass: 'B',
    hasTrainStation: false,
    hasBusStation: true,
    hasFerryPier: true,
    hasWinterRoad: true,
  },
  [
    new Stop(
      'yakutsk-airport',
      'Аэропорт Якутск (Туймаада)',
      'airport',
      new Coordinates(62.0933, 129.7706),
      'yakutsk',
      true,
      HubLevel.REGIONAL,
      'YAK'
    ),
    new Stop(
      'yakutsk-bus-station',
      'Автовокзал Якутск',
      'bus_station',
      new Coordinates(62.0278, 129.7042),
      'yakutsk',
      false
    ),
    new Stop(
      'yakutsk-ferry-pier',
      'Пристань Якутск',
      'ferry_pier',
      new Coordinates(62.0278, 129.7042),
      'yakutsk',
      false,
      undefined,
      undefined,
      undefined,
      'Пристань Якутск'
    ),
  ],
  ['Дьокуускай', 'Yakutsk', 'YAK'],
  330000
);

/**
 * Мирный - региональный хаб
 */
export const MIRNY: City = new City(
  'mirny',
  'Мирный',
  'мирный',
  createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Якутия',
      code: 'SA',
    },
    {
      type: 'city',
      name: 'Мирный',
      normalizedName: 'мирный',
    }
  ),
  new Coordinates(62.5353, 113.9611),
  'Asia/Yakutsk',
  true,
  true,
  HubLevel.REGIONAL,
  {
    hasAirport: true,
    airportClass: 'C',
    hasTrainStation: false,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'mirny-airport',
      'Аэропорт Мирный',
      'airport',
      new Coordinates(62.5353, 113.9611),
      'mirny',
      true,
      HubLevel.REGIONAL,
      'MJZ'
    ),
    new Stop(
      'mirny-bus-station',
      'Автовокзал Мирный',
      'bus_station',
      new Coordinates(62.5353, 113.9611),
      'mirny',
      false
    ),
  ],
  ['Mirny', 'MJZ'],
  35000
);

/**
 * Нерюнгри - региональный хаб
 */
export const NERYUNGRI: City = new City(
  'neryungri',
  'Нерюнгри',
  'нерюнгри',
  createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Якутия',
      code: 'SA',
    },
    {
      type: 'city',
      name: 'Нерюнгри',
      normalizedName: 'нерюнгри',
    }
  ),
  new Coordinates(56.6583, 124.7250),
  'Asia/Yakutsk',
  true,
  true,
  HubLevel.REGIONAL,
  {
    hasAirport: true,
    airportClass: 'C',
    hasTrainStation: false,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'neryungri-airport',
      'Аэропорт Нерюнгри',
      'airport',
      new Coordinates(56.6583, 124.7250),
      'neryungri',
      true,
      HubLevel.REGIONAL,
      'NER'
    ),
    new Stop(
      'neryungri-bus-station',
      'Автовокзал Нерюнгри',
      'bus_station',
      new Coordinates(56.6583, 124.7250),
      'neryungri',
      false
    ),
  ],
  ['Neryungri', 'NER'],
  58000
);

/**
 * Среднеколымск - локальный город
 */
export const SREDNEKOLYMSK: City = new City(
  'srednekolymsk',
  'Среднеколымск',
  'среднеколымск',
  createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Якутия',
      code: 'SA',
    },
    {
      type: 'rayon',
      name: 'Среднеколымский район',
      code: 'SRK',
    },
    {
      type: 'city',
      name: 'Среднеколымск',
      normalizedName: 'среднеколымск',
    }
  ),
  new Coordinates(67.4500, 153.7000),
  'Asia/Yakutsk',
  false,
  false,
  undefined,
  {
    hasAirport: true,
    airportClass: 'D',
    hasTrainStation: false,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: true,
  },
  [
    new Stop(
      'srednekolymsk-airport',
      'Аэропорт Среднеколымск',
      'airport',
      new Coordinates(67.4500, 153.7000),
      'srednekolymsk',
      false,
      undefined,
      'SEK'
    ),
    new Stop(
      'srednekolymsk-bus-station',
      'Автовокзал Среднеколымск',
      'bus_station',
      new Coordinates(67.4500, 153.7000),
      'srednekolymsk',
      false
    ),
  ],
  ['Srednekolymsk', 'SEK'],
  3500
);

/**
 * Чокурдах - локальный город
 */
export const CHOKURDAKH: City = new City(
  'chokurdakh',
  'Чокурдах',
  'чокурдах',
  createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Якутия',
      code: 'SA',
    },
    {
      type: 'rayon',
      name: 'Абыйский район',
      code: 'ABY',
    },
    {
      type: 'town',
      name: 'Чокурдах',
      normalizedName: 'чокурдах',
    }
  ),
  new Coordinates(70.6167, 147.9000),
  'Asia/Yakutsk',
  false,
  false,
  undefined,
  {
    hasAirport: true,
    airportClass: 'D',
    hasTrainStation: false,
    hasBusStation: false,
    hasFerryPier: false,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'chokurdakh-airport',
      'Аэропорт Чокурдах',
      'airport',
      new Coordinates(70.6167, 147.9000),
      'chokurdakh',
      false,
      undefined,
      'CKH'
    ),
  ],
  ['Chokurdakh', 'CKH'],
  2100
);

/**
 * Олёкминск - ключевой город
 */
export const OLEKMINSK: City = new City(
  'olekminsk',
  'Олёкминск',
  'олекминск',
  createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Якутия',
      code: 'SA',
    },
    {
      type: 'rayon',
      name: 'Олёкминский район',
      code: 'OLK',
    },
    {
      type: 'city',
      name: 'Олёкминск',
      normalizedName: 'олекминск',
    }
  ),
  new Coordinates(60.3733, 120.4267),
  'Asia/Yakutsk',
  true,
  false,
  undefined,
  {
    hasAirport: false,
    hasTrainStation: false,
    hasBusStation: true,
    hasFerryPier: true,
    hasWinterRoad: false,
  },
  [
    new Stop(
      'olekminsk-bus-station',
      'Автовокзал Олёкминск',
      'bus_station',
      new Coordinates(60.3733, 120.4267),
      'olekminsk',
      false
    ),
    new Stop(
      'olekminsk-ferry-pier',
      'Пристань Олёкминск',
      'ferry_pier',
      new Coordinates(60.3733, 120.4267),
      'olekminsk',
      false,
      undefined,
      undefined,
      undefined,
      'Пристань Олёкминск'
    ),
  ],
  ['Olekminsk', 'OLK'],
  9000
);

/**
 * Все города Якутии для тестов
 */
export const YAKUTIA_CITIES: City[] = [
  YAKUTSK,
  MIRNY,
  NERYUNGRI,
  SREDNEKOLYMSK,
  CHOKURDAKH,
  OLEKMINSK,
];

/**
 * Получить город по ID
 */
export function getYakutiaCityById(id: string): City | undefined {
  return YAKUTIA_CITIES.find((city) => city.id === id);
}






