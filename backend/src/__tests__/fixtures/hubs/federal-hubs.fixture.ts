/**
 * Fixtures: Федеральные хабы
 * 
 * Детерминированные данные для тестов.
 * Основаны на реальных федеральных хабах.
 */

import { Hub } from '../../../domain/smart-routing/entities/Hub';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../domain/smart-routing/enums/HubLevel';

/**
 * Москва - федеральный хаб
 */
export const MOSCOW_HUB: Hub = new Hub(
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
);

/**
 * Новосибирск - федеральный хаб
 */
export const NOVOSIBIRSK_HUB: Hub = new Hub(
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
);

/**
 * Красноярск - федеральный хаб
 */
export const KRASNOYARSK_HUB: Hub = new Hub(
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
);

/**
 * Все федеральные хабы для тестов
 */
export const FEDERAL_HUBS: Hub[] = [
  MOSCOW_HUB,
  NOVOSIBIRSK_HUB,
  KRASNOYARSK_HUB,
];

/**
 * Получить федеральный хаб по ID
 */
export function getFederalHubById(id: string): Hub | undefined {
  return FEDERAL_HUBS.find((hub) => hub.id === id);
}





