/**
 * Справочник транспортных хабов
 * 
 * Содержит федеральные и региональные хабы с их связями
 */

import { Hub } from '../entities/Hub';
import { HubLevel } from '../enums/HubLevel';
import { Coordinates } from '../value-objects/Coordinates';
import { ALL_CITIES } from './cities-reference';

/**
 * Федеральные хабы
 */
export const FEDERAL_HUBS_DATA: Hub[] = [
  new Hub(
    'moscow-hub',
    'Москва',
    HubLevel.FEDERAL,
    new Coordinates(55.7558, 37.6173),
    {
      federal: ['novosibirsk-hub', 'krasnoyarsk-hub', 'khabarovsk-hub', 'irkutsk-hub'],
      regional: ['yakutsk-hub'],
      local: [],
    },
    {
      frequency: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7],
    },
    'SVO' // Шереметьево
  ),
  new Hub(
    'novosibirsk-hub',
    'Новосибирск',
    HubLevel.FEDERAL,
    new Coordinates(55.0084, 82.9357),
    {
      federal: ['moscow-hub', 'krasnoyarsk-hub', 'khabarovsk-hub'],
      regional: ['yakutsk-hub', 'neryungri-hub'],
      local: [],
    },
    {
      frequency: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7],
    },
    'OVB'
  ),
  new Hub(
    'krasnoyarsk-hub',
    'Красноярск',
    HubLevel.FEDERAL,
    new Coordinates(56.0089, 92.8529),
    {
      federal: ['moscow-hub', 'novosibirsk-hub'],
      regional: ['yakutsk-hub'],
      local: [],
    },
    {
      frequency: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7],
    },
    'KJA'
  ),
  new Hub(
    'khabarovsk-hub',
    'Хабаровск',
    HubLevel.FEDERAL,
    new Coordinates(48.4802, 135.0719),
    {
      federal: ['moscow-hub', 'novosibirsk-hub'],
      regional: ['yakutsk-hub', 'neryungri-hub'],
      local: [],
    },
    {
      frequency: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7],
    },
    'KHV'
  ),
  new Hub(
    'irkutsk-hub',
    'Иркутск',
    HubLevel.FEDERAL,
    new Coordinates(52.2680, 104.3889),
    {
      federal: ['moscow-hub', 'novosibirsk-hub'],
      regional: ['yakutsk-hub'],
      local: [],
    },
    {
      frequency: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7],
    },
    'IKT'
  ),
];

/**
 * Региональные хабы Якутии
 */
export const REGIONAL_HUBS_DATA: Hub[] = [
  new Hub(
    'yakutsk-hub',
    'Якутск',
    HubLevel.REGIONAL,
    new Coordinates(62.0278, 129.7042),
    {
      federal: ['moscow-hub', 'novosibirsk-hub', 'krasnoyarsk-hub', 'khabarovsk-hub', 'irkutsk-hub'],
      regional: ['mirny-hub', 'neryungri-hub', 'tiksi-hub'],
      local: [
        'srednekolymsk-airport',
        'chokurdakh-airport',
        'verkhoyansk-airport',
        'udachny-airport',
      ],
    },
    {
      frequency: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7],
    },
    'YAK'
  ),
  new Hub(
    'mirny-hub',
    'Мирный',
    HubLevel.REGIONAL,
    new Coordinates(62.5353, 113.9611),
    {
      federal: [],
      regional: ['yakutsk-hub'],
      local: ['udachny-airport'],
    },
    {
      frequency: 'weekly',
      days: [1, 3, 5, 7], // Понедельник, среда, пятница, воскресенье
    },
    'MJZ'
  ),
  new Hub(
    'neryungri-hub',
    'Нерюнгри',
    HubLevel.REGIONAL,
    new Coordinates(56.6583, 124.7250),
    {
      federal: ['novosibirsk-hub', 'khabarovsk-hub'],
      regional: ['yakutsk-hub'],
      local: [],
    },
    {
      frequency: 'weekly',
      days: [1, 3, 5, 7],
    },
    'NER'
  ),
  new Hub(
    'tiksi-hub',
    'Тикси',
    HubLevel.REGIONAL,
    new Coordinates(71.6333, 128.8667),
    {
      federal: [],
      regional: ['yakutsk-hub'],
      local: ['chokurdakh-airport'],
    },
    {
      frequency: 'seasonal',
      season: {
        start: '2024-06-01',
        end: '2024-09-30',
      },
    },
    'IKS'
  ),
];

/**
 * Все хабы (объединённый список)
 */
export const ALL_HUBS: Hub[] = [...FEDERAL_HUBS_DATA, ...REGIONAL_HUBS_DATA];

/**
 * Получить хаб по ID
 */
export function getHubById(id: string): Hub | undefined {
  return ALL_HUBS.find((hub) => hub.id === id);
}

/**
 * Получить хаб по коду аэропорта
 */
export function getHubByAirportCode(code: string): Hub | undefined {
  return ALL_HUBS.find((hub) => hub.airportCode === code);
}

/**
 * Получить хабы по уровню
 */
export function getHubsByLevel(level: HubLevel): Hub[] {
  return ALL_HUBS.filter((hub) => hub.level === level);
}

/**
 * Получить ближайший региональный хаб для города
 */
export function getNearestRegionalHub(cityId: string): Hub | undefined {
  const city = ALL_CITIES.find((c) => c.id === cityId);
  if (!city) {
    return undefined;
  }

  const cityCoords = new Coordinates(city.coordinates.latitude, city.coordinates.longitude);
  const regionalHubs = getHubsByLevel(HubLevel.REGIONAL);

  let nearestHub: Hub | undefined;
  let minDistance = Infinity;

  for (const hub of regionalHubs) {
    const distance = cityCoords.distanceTo(hub.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearestHub = hub;
    }
  }

  return nearestHub;
}


