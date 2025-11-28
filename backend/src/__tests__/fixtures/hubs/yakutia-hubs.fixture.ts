/**
 * Fixtures: Реалистичные хабы Якутии
 * 
 * Детерминированные данные для тестов.
 * Основаны на реальных хабах из hubs-reference.
 */

import { Hub } from '../../../domain/smart-routing/entities/Hub';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../../domain/smart-routing/enums/HubLevel';

/**
 * Якутск - региональный хаб
 */
export const YAKUTSK_HUB: Hub = new Hub(
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
);

/**
 * Мирный - региональный хаб
 */
export const MIRNY_HUB: Hub = new Hub(
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
);

/**
 * Нерюнгри - региональный хаб
 */
export const NERYUNGRI_HUB: Hub = new Hub(
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
);

/**
 * Тикси - региональный хаб (сезонный)
 */
export const TIKSI_HUB: Hub = new Hub(
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
);

/**
 * Все региональные хабы Якутии для тестов
 */
export const YAKUTIA_HUBS: Hub[] = [
  YAKUTSK_HUB,
  MIRNY_HUB,
  NERYUNGRI_HUB,
  TIKSI_HUB,
];

/**
 * Получить хаб по ID
 */
export function getYakutiaHubById(id: string): Hub | undefined {
  return YAKUTIA_HUBS.find((hub) => hub.id === id);
}





