/**
 * Модель соединений для всех типов транспорта
 * 
 * Определяет реальные маршруты между городами:
 * - Авиа: через хабы
 * - ЖД: по АЯМ и Транссибу
 * - Автобус: по дорогам
 * - Паром: по рекам
 * - Зимники: только зимой
 * 
 * ВАЖНО: Все соединения автоматически валидируются при загрузке модуля.
 * Нереалистичные маршруты (автобусы > 1500 км, прямые авиарейсы между малыми аэропортами)
 * автоматически удаляются из ALL_CONNECTIONS.
 */

import type { CityReference } from './cities-reference';
import { ALL_CITIES } from './cities-reference';
import { ALL_HUBS } from './hubs-reference';
import { ConnectionsValidator } from './connections-validator';

/**
 * Тип соединения
 * 
 * Синхронизирован с TransportType из RouteSegment
 * Не включает 'taxi' и 'unknown', так как они не используются в соединениях
 */
export type ConnectionType = 'airplane' | 'train' | 'bus' | 'ferry' | 'winter_road' | 'taxi';

/**
 * Соединение между городами
 */
export interface CityConnection {
  /**
   * ID соединения
   */
  id: string;

  /**
   * Тип транспорта
   */
  type: ConnectionType;

  /**
   * ID города отправления
   */
  fromCityId: string;

  /**
   * ID города назначения
   */
  toCityId: string;

  /**
   * Расстояние (в км)
   */
  distance: number;

  /**
   * Время в пути (в минутах)
   */
  duration: number;

  /**
   * Базовая цена (в рублях)
   */
  basePrice: number;

  /**
   * Сезонность
   */
  season: 'summer' | 'winter' | 'transition' | 'all';

  /**
   * Промежуточные города или точки (для автобусов, ЖД, паромов)
   * Может содержать:
   * - ID городов (строки) - для автобусов и ЖД
   * - Объекты с координатами {latitude, longitude} - для устьев рек (паромы)
   */
  intermediateCities?: (string | { latitude: number; longitude: number })[];

  /**
   * Хабы, через которые проходит маршрут (для авиа)
   */
  viaHubs?: string[];

  /**
   * Является ли прямым маршрутом
   */
  isDirect: boolean;

  /**
   * Метаданные
   */
  metadata?: {
    routeNumber?: string;
    carrier?: string;
    river?: string;
    line?: string;
    [key: string]: unknown;
  };
}

/**
 * Авиационные соединения (через хабы)
 */
export const AIRPLANE_CONNECTIONS: CityConnection[] = [
  // Федеральные хабы между собой
  {
    id: 'air-moscow-novosibirsk',
    type: 'airplane',
    fromCityId: 'moscow',
    toCityId: 'novosibirsk',
    distance: 2810,
    duration: 240, // 4 часа
    basePrice: 15000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'SU-1001', carrier: 'Аэрофлот' },
  },
  {
    id: 'air-moscow-krasnoyarsk',
    type: 'airplane',
    fromCityId: 'moscow',
    toCityId: 'krasnoyarsk',
    distance: 3350,
    duration: 270, // 4.5 часа
    basePrice: 18000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'SU-1002', carrier: 'Аэрофлот' },
  },
  {
    id: 'air-moscow-yakutsk',
    type: 'airplane',
    fromCityId: 'moscow',
    toCityId: 'yakutsk',
    distance: 4900,
    duration: 390, // 6.5 часов
    basePrice: 25000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'SU-1003', carrier: 'Аэрофлот' },
  },
  {
    id: 'air-novosibirsk-yakutsk',
    type: 'airplane',
    fromCityId: 'novosibirsk',
    toCityId: 'yakutsk',
    distance: 2800,
    duration: 240, // 4 часа
    basePrice: 18000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'S7-2001', carrier: 'S7 Airlines' },
  },
  {
    id: 'air-krasnoyarsk-yakutsk',
    type: 'airplane',
    fromCityId: 'krasnoyarsk',
    toCityId: 'yakutsk',
    distance: 2100,
    duration: 180, // 3 часа
    basePrice: 15000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'S7-2002', carrier: 'S7 Airlines' },
  },
  {
    id: 'air-khabarovsk-yakutsk',
    type: 'airplane',
    fromCityId: 'khabarovsk',
    toCityId: 'yakutsk',
    distance: 1800,
    duration: 150, // 2.5 часа
    basePrice: 14000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'S7-2003', carrier: 'S7 Airlines' },
  },
  {
    id: 'air-irkutsk-yakutsk',
    type: 'airplane',
    fromCityId: 'irkutsk',
    toCityId: 'yakutsk',
    distance: 1600,
    duration: 120, // 2 часа
    basePrice: 12000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: 'S7-2004', carrier: 'S7 Airlines' },
  },

  // Региональные хабы Якутии
  {
    id: 'air-yakutsk-mirny',
    type: 'airplane',
    fromCityId: 'yakutsk',
    toCityId: 'mirny',
    distance: 1000,
    duration: 90, // 1.5 часа
    basePrice: 8000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: '6R-3001', carrier: 'Якутия' },
  },
  {
    id: 'air-yakutsk-neryungri',
    type: 'airplane',
    fromCityId: 'yakutsk',
    toCityId: 'neryungri',
    distance: 800,
    duration: 75, // 1.25 часа
    basePrice: 7000,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: '6R-3002', carrier: 'Якутия' },
  },
  {
    id: 'air-yakutsk-tiksi',
    type: 'airplane',
    fromCityId: 'yakutsk',
    toCityId: 'tiksi',
    distance: 1200,
    duration: 150, // 2.5 часа
    basePrice: 15000,
    season: 'summer', // Сезонный
    isDirect: true,
    metadata: { routeNumber: '6R-3003', carrier: 'Якутия' },
  },

  // Локальные аэропорты через региональные хабы
  {
    id: 'air-yakutsk-srednekolymsk',
    type: 'airplane',
    fromCityId: 'yakutsk',
    toCityId: 'srednekolymsk',
    distance: 1200,
    duration: 120, // 2 часа
    basePrice: 18000,
    season: 'all',
    isDirect: true, // Прямой рейс из регионального хаба
    viaHubs: ['yakutsk-hub'],
    metadata: { routeNumber: '6R-4001', carrier: 'Якутия' },
  },
  {
    id: 'air-tiksi-chokurdakh',
    type: 'airplane',
    fromCityId: 'tiksi',
    toCityId: 'chokurdakh',
    distance: 600,
    duration: 60, // 1 час
    basePrice: 12000,
    season: 'summer', // Только летом
    isDirect: true,
    viaHubs: ['tiksi-hub'],
    metadata: { routeNumber: '6R-4002', carrier: 'Якутия' },
  },
  {
    id: 'air-yakutsk-verkhoyansk',
    type: 'airplane',
    fromCityId: 'yakutsk',
    toCityId: 'verkhoyansk',
    distance: 700,
    duration: 90, // 1.5 часа
    basePrice: 14000,
    season: 'all',
    isDirect: true,
    viaHubs: ['yakutsk-hub'],
    metadata: { routeNumber: '6R-4003', carrier: 'Якутия' },
  },
];

/**
 * ЖД соединения (АЯМ и Транссиб)
 * 
 * АЯМ (Амуро-Якутская магистраль): Нижний Бестях → Томмот → Алдан → Тында
 * Транссиб: Сковородино → Москва, Новосибирск, Иркутск, Хабаровск, Владивосток
 * 
 * ВАЖНО: Все ЖД-маршруты должны визуализироваться как ломаные линии вдоль существующих трасс
 */
export const TRAIN_CONNECTIONS: CityConnection[] = [
  // ========== АЯМ: Нижний Бестях → Тында ==========
  // Сегмент 1: Нижний Бестях → Томмот
  {
    id: 'train-nizhny-bestyakh-tommot',
    type: 'train',
    fromCityId: 'nizhny-bestyakh',
    toCityId: 'tommot',
    distance: 200,
    duration: 180, // 3 часа
    basePrice: 1500,
    season: 'all',
    isDirect: false,
    intermediateCities: [], // Прямой участок АЯМ
    metadata: { routeNumber: '327', carrier: 'РЖД', line: 'АЯМ' },
  },
  // Сегмент 2: Томмот → Алдан
  {
    id: 'train-tommot-aldan',
    type: 'train',
    fromCityId: 'tommot',
    toCityId: 'aldan',
    distance: 100,
    duration: 90, // 1.5 часа
    basePrice: 800,
    season: 'all',
    isDirect: true,
    intermediateCities: [],
    metadata: { routeNumber: '327', carrier: 'РЖД', line: 'АЯМ' },
  },
  // Сегмент 3: Алдан → Тында
  {
    id: 'train-aldan-tynda',
    type: 'train',
    fromCityId: 'aldan',
    toCityId: 'tynda',
    distance: 500,
    duration: 480, // 8 часов
    basePrice: 3000,
    season: 'all',
    isDirect: false,
    intermediateCities: [], // Прямой участок АЯМ
    metadata: { routeNumber: '327', carrier: 'РЖД', line: 'АЯМ' },
  },
  // ========== Связь АЯМ с Транссибом ==========
  // Пересадка: Тында → Сковородино (200 км, пересадка на Транссиб)
  {
    id: 'train-tynda-skovorodino',
    type: 'train',
    fromCityId: 'tynda',
    toCityId: 'skovorodino',
    distance: 200,
    duration: 180, // 3 часа (пересадка)
    basePrice: 1500,
    season: 'all',
    isDirect: false,
    intermediateCities: [],
    metadata: { routeNumber: 'Пересадка', carrier: 'РЖД', line: 'АЯМ → Транссиб' },
  },
  // ========== Транссиб: Сковородино → Запад ==========
  // Сковородино → Москва
  {
    id: 'train-skovorodino-moscow',
    type: 'train',
    fromCityId: 'skovorodino',
    toCityId: 'moscow',
    distance: 5500,
    duration: 4320, // 72 часа
    basePrice: 8000,
    season: 'all',
    isDirect: true,
    intermediateCities: [], // Прямой поезд по Транссибу
    metadata: { routeNumber: '002М', carrier: 'РЖД', line: 'Транссиб' },
  },
  // Сковородино → Новосибирск
  {
    id: 'train-skovorodino-novosibirsk',
    type: 'train',
    fromCityId: 'skovorodino',
    toCityId: 'novosibirsk',
    distance: 3000,
    duration: 2160, // 36 часов
    basePrice: 5000,
    season: 'all',
    isDirect: true,
    intermediateCities: [],
    metadata: { routeNumber: '100Н', carrier: 'РЖД', line: 'Транссиб' },
  },
  // Сковородино → Иркутск
  {
    id: 'train-skovorodino-irkutsk',
    type: 'train',
    fromCityId: 'skovorodino',
    toCityId: 'irkutsk',
    distance: 2000,
    duration: 1440, // 24 часа
    basePrice: 4000,
    season: 'all',
    isDirect: true,
    intermediateCities: [],
    metadata: { routeNumber: '100Н', carrier: 'РЖД', line: 'Транссиб' },
  },
  // Сковородино → Красноярск
  {
    id: 'train-skovorodino-krasnoyarsk',
    type: 'train',
    fromCityId: 'skovorodino',
    toCityId: 'krasnoyarsk',
    distance: 2500,
    duration: 1800, // 30 часов
    basePrice: 4500,
    season: 'all',
    isDirect: true,
    intermediateCities: [],
    metadata: { routeNumber: '100Н', carrier: 'РЖД', line: 'Транссиб' },
  },
  // ========== Транссиб: Сковородино → Восток ==========
  // Сковородино → Хабаровск
  {
    id: 'train-skovorodino-khabarovsk',
    type: 'train',
    fromCityId: 'skovorodino',
    toCityId: 'khabarovsk',
    distance: 1500,
    duration: 1080, // 18 часов
    basePrice: 3500,
    season: 'all',
    isDirect: true,
    intermediateCities: [],
    metadata: { routeNumber: '100Н', carrier: 'РЖД', line: 'Транссиб' },
  },
];

/**
 * Автобусные соединения (по дорогам)
 */
export const BUS_CONNECTIONS: CityConnection[] = [
  // Якутск → Мирный (1000 км по трассе А-360)
  {
    id: 'bus-yakutsk-mirny',
    type: 'bus',
    fromCityId: 'yakutsk',
    toCityId: 'mirny',
    distance: 1000,
    duration: 720, // 12 часов
    basePrice: 3500,
    season: 'all',
    isDirect: false,
    intermediateCities: ['pokrovsk', 'khandyga'],
    metadata: { routeNumber: '101', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Нерюнгри (800 км)
  {
    id: 'bus-yakutsk-neryungri',
    type: 'bus',
    fromCityId: 'yakutsk',
    toCityId: 'neryungri',
    distance: 800,
    duration: 600, // 10 часов
    basePrice: 3000,
    season: 'all',
    isDirect: false,
    intermediateCities: ['pokrovsk', 'aldan'],
    metadata: { routeNumber: '102', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Ленск (600 км)
  {
    id: 'bus-yakutsk-lensk',
    type: 'bus',
    fromCityId: 'yakutsk',
    toCityId: 'lensk',
    distance: 600,
    duration: 480, // 8 часов
    basePrice: 2500,
    season: 'all',
    isDirect: false,
    intermediateCities: ['pokrovsk', 'olekminsk'],
    metadata: { routeNumber: '103', carrier: 'ЯкутАвтоТранс' },
  },
  // Мирный → Ленск (прямая региональная дорога)
  {
    id: 'bus-mirny-lensk',
    type: 'bus',
    fromCityId: 'mirny',
    toCityId: 'lensk',
    distance: 300,
    duration: 240, // 4 часа
    basePrice: 1500,
    season: 'all',
    isDirect: true,
    metadata: { routeNumber: '104', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Нижний Бестях (зимняя дорога)
  {
    id: 'bus-yakutsk-nizhny-bestyakh',
    type: 'bus',
    fromCityId: 'yakutsk',
    toCityId: 'nizhny-bestyakh',
    distance: 15,
    duration: 30, // 30 минут
    basePrice: 500,
    season: 'winter', // Только зимой (ледовая переправа)
    isDirect: true,
    metadata: { routeNumber: '105', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Вилюйск (зимняя дорога, альтернатива парому)
  {
    id: 'bus-yakutsk-vilyuisk',
    type: 'bus',
    fromCityId: 'yakutsk',
    toCityId: 'vilyuisk',
    distance: 300,
    duration: 360, // 6 часов
    basePrice: 2000,
    season: 'winter', // Только зимой (когда паром не работает)
    isDirect: true,
    metadata: { routeNumber: '106', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Олёкминск (зимняя дорога, альтернатива парому)
  {
    id: 'bus-yakutsk-olekminsk',
    type: 'bus',
    fromCityId: 'yakutsk',
    toCityId: 'olekminsk',
    distance: 280,
    duration: 300, // 5 часов
    basePrice: 1800,
    season: 'winter', // Только зимой (когда паром не работает)
    isDirect: true,
    metadata: { routeNumber: '107', carrier: 'ЯкутАвтоТранс' },
  },
];

/**
 * Паромные соединения (по рекам)
 * 
 * Реки:
 * - Лена: от Усть-Кута до Тикси (3000+ км)
 * - Алдан: от Томмота до устья (1000+ км), впадает в Лену
 * - Вилюй: от Мирного до устья (800+ км), впадает в Лену
 * 
 * ВАЖНО: Все паромные маршруты должны визуализироваться волнистой линией вдоль рек
 * Расстояние учитывает извилистость реки (коэффициент 1.15-1.3)
 */
export const FERRY_CONNECTIONS: CityConnection[] = [
  // ========== Река Лена ==========
  // Якутск ↔ Нижний Бестях (12 км по реке Лена)
  {
    id: 'ferry-yakutsk-nizhny-bestyakh',
    type: 'ferry',
    fromCityId: 'yakutsk',
    toCityId: 'nizhny-bestyakh',
    distance: 12,
    duration: 45, // 45 минут
    basePrice: 600,
    season: 'summer', // Летом - теплоход, зимой - автобус по льду
    isDirect: true,
    metadata: { routeNumber: 'Паром Якутск-Бестях', carrier: 'Ленское пароходство', river: 'Лена' },
  },
  // Якутск → Ленск (350 км по реке Лена)
  {
    id: 'ferry-yakutsk-lensk',
    type: 'ferry',
    fromCityId: 'yakutsk',
    toCityId: 'lensk',
    distance: 350,
    duration: 600, // 10 часов
    basePrice: 2000,
    season: 'summer', // Только летом
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Якутск-Ленск', carrier: 'Ленское пароходство', river: 'Лена' },
  },
  // Якутск → Олёкминск (300 км по реке Лена)
  {
    id: 'ferry-yakutsk-olekminsk',
    type: 'ferry',
    fromCityId: 'yakutsk',
    toCityId: 'olekminsk',
    distance: 300,
    duration: 540, // 9 часов
    basePrice: 2000,
    season: 'summer', // Только летом
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Якутск-Олёкминск', carrier: 'Ленское пароходство', river: 'Лена' },
  },
  // Якутск → Жиганск (600 км по реке Лена)
  {
    id: 'ferry-yakutsk-zhigansk',
    type: 'ferry',
    fromCityId: 'yakutsk',
    toCityId: 'zhigansk',
    distance: 600,
    duration: 960, // 16 часов
    basePrice: 3500,
    season: 'summer', // Только летом
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Якутск-Жиганск', carrier: 'Ленское пароходство', river: 'Лена' },
  },
  // Якутск → Тикси (1500 км по реке Лена)
  {
    id: 'ferry-yakutsk-tiksi',
    type: 'ferry',
    fromCityId: 'yakutsk',
    toCityId: 'tiksi',
    distance: 1500,
    duration: 4320, // 72 часа (3 дня)
    basePrice: 6000,
    season: 'summer', // Только летом
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Якутск-Тикси', carrier: 'Ленское пароходство', river: 'Лена' },
  },
  // Ленск → Олёкминск (50 км по реке Лена)
  {
    id: 'ferry-lensk-olekminsk',
    type: 'ferry',
    fromCityId: 'lensk',
    toCityId: 'olekminsk',
    distance: 50,
    duration: 90, // 1.5 часа
    basePrice: 500,
    season: 'summer',
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Ленск-Олёкминск', carrier: 'Ленское пароходство', river: 'Лена' },
  },
  // ========== Река Алдан ==========
  // Томмот → Хандыга (150 км по реке Алдан)
  {
    id: 'ferry-tommot-khandyga',
    type: 'ferry',
    fromCityId: 'tommot',
    toCityId: 'khandyga',
    distance: 150,
    duration: 300, // 5 часов
    basePrice: 1000,
    season: 'summer', // Только летом
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Томмот-Хандыга', carrier: 'Ленское пароходство', river: 'Алдан' },
  },
  // Хандыга → Якутск (через устье Алдана в Лену, 500 км)
  {
    id: 'ferry-khandyga-yakutsk',
    type: 'ferry',
    fromCityId: 'khandyga',
    toCityId: 'yakutsk',
    distance: 500,
    duration: 720, // 12 часов
    basePrice: 3000,
    season: 'summer', // Только летом
    isDirect: false, // Через устье Алдана
    intermediateCities: [], // Устье Алдана (63.44°N, 129.15°E) - будет обработано в алгоритме
    metadata: { routeNumber: 'Теплоход Хандыга-Якутск', carrier: 'Ленское пароходство', river: 'Алдан → Лена' },
  },
  // ========== Река Вилюй ==========
  // Мирный → Вилюйск (200 км по реке Вилюй)
  {
    id: 'ferry-mirny-vilyuisk',
    type: 'ferry',
    fromCityId: 'mirny',
    toCityId: 'vilyuisk',
    distance: 200,
    duration: 360, // 6 часов
    basePrice: 1500,
    season: 'summer', // Только летом
    isDirect: true,
    metadata: { routeNumber: 'Теплоход Мирный-Вилюйск', carrier: 'Ленское пароходство', river: 'Вилюй' },
  },
  // Вилюйск → Якутск (через устье Вилюя в Лену, 300 км)
  {
    id: 'ferry-vilyuisk-yakutsk',
    type: 'ferry',
    fromCityId: 'vilyuisk',
    toCityId: 'yakutsk',
    distance: 300,
    duration: 480, // 8 часов
    basePrice: 2000,
    season: 'summer', // Только летом
    isDirect: false, // Через устье Вилюя
    intermediateCities: [], // Устье Вилюя (64.37°N, 126.40°E) - будет обработано в алгоритме
    metadata: { routeNumber: 'Теплоход Вилюйск-Якутск', carrier: 'Ленское пароходство', river: 'Вилюй → Лена' },
  },
];

/**
 * Зимники (только зимой)
 */
export const WINTER_ROAD_CONNECTIONS: CityConnection[] = [
  // Якутск → Верхоянск (700 км)
  {
    id: 'winter-yakutsk-verkhoyansk',
    type: 'winter_road',
    fromCityId: 'yakutsk',
    toCityId: 'verkhoyansk',
    distance: 700,
    duration: 720, // 12 часов
    basePrice: 4500,
    season: 'winter', // Только зимой (декабрь - апрель)
    isDirect: true,
    metadata: { routeNumber: 'Зимник Якутск-Верхоянск', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Жиганск (600 км)
  {
    id: 'winter-yakutsk-zhigansk',
    type: 'winter_road',
    fromCityId: 'yakutsk',
    toCityId: 'zhigansk',
    distance: 600,
    duration: 600, // 10 часов
    basePrice: 4000,
    season: 'winter', // Только зимой
    isDirect: true,
    metadata: { routeNumber: 'Зимник Якутск-Жиганск', carrier: 'ЯкутАвтоТранс' },
  },
  // Верхоянск → Среднеколымск (500 км)
  {
    id: 'winter-verkhoyansk-srednekolymsk',
    type: 'winter_road',
    fromCityId: 'verkhoyansk',
    toCityId: 'srednekolymsk',
    distance: 500,
    duration: 480, // 8 часов
    basePrice: 3500,
    season: 'winter', // Только зимой
    isDirect: true,
    metadata: { routeNumber: 'Зимник Верхоянск-Среднеколымск', carrier: 'ЯкутАвтоТранс' },
  },
  // Жиганск → Среднеколымск (400 км)
  {
    id: 'winter-zhigansk-srednekolymsk',
    type: 'winter_road',
    fromCityId: 'zhigansk',
    toCityId: 'srednekolymsk',
    distance: 400,
    duration: 360, // 6 часов
    basePrice: 3000,
    season: 'winter', // Только зимой
    isDirect: true,
    metadata: { routeNumber: 'Зимник Жиганск-Среднеколымск', carrier: 'ЯкутАвтоТранс' },
  },
  // Якутск → Среднеколымск (1200 км, через тундру)
  {
    id: 'winter-yakutsk-srednekolymsk',
    type: 'winter_road',
    fromCityId: 'yakutsk',
    toCityId: 'srednekolymsk',
    distance: 1200,
    duration: 1080, // 18 часов
    basePrice: 5500,
    season: 'winter', // Только зимой
    isDirect: true,
    metadata: { routeNumber: 'Зимник Якутск-Среднеколымск', carrier: 'ЯкутАвтоТранс' },
  },
];

/**
 * Все соединения (объединённый список)
 * 
 * ВАЖНО: Соединения автоматически валидируются при загрузке модуля
 * Нереалистичные маршруты удаляются из списка
 */

// Создаём исходный список всех соединений
const RAW_CONNECTIONS: CityConnection[] = [
  ...AIRPLANE_CONNECTIONS,
  ...TRAIN_CONNECTIONS,
  ...BUS_CONNECTIONS,
  ...FERRY_CONNECTIONS,
  ...WINTER_ROAD_CONNECTIONS,
];

// Валидируем и фильтруем соединения
const validationResult = ConnectionsValidator.validateAndFilterConnections(RAW_CONNECTIONS);

// Экспортируем только валидные соединения
export const ALL_CONNECTIONS: CityConnection[] = validationResult.valid;

// ФАЗА 3 ФИКС: Логируем статистику соединений при загрузке
// Логирование выполняется через ConnectionsValidator.validateAndFilterConnections

/**
 * Получить соединения по типу транспорта
 */
export function getConnectionsByType(type: ConnectionType): CityConnection[] {
  return ALL_CONNECTIONS.filter((conn) => conn.type === type);
}

/**
 * Получить соединения из города
 */
export function getConnectionsFromCity(cityId: string): CityConnection[] {
  return ALL_CONNECTIONS.filter((conn) => conn.fromCityId === cityId);
}

/**
 * Получить соединения в город
 */
export function getConnectionsToCity(cityId: string): CityConnection[] {
  return ALL_CONNECTIONS.filter((conn) => conn.toCityId === cityId);
}

/**
 * Получить соединение между двумя городами
 */
export function getConnectionBetweenCities(
  fromCityId: string,
  toCityId: string,
  type?: ConnectionType
): CityConnection[] {
  let connections = ALL_CONNECTIONS.filter(
    (conn) => conn.fromCityId === fromCityId && conn.toCityId === toCityId
  );

  if (type) {
    connections = connections.filter((conn) => conn.type === type);
  }

  return connections;
}

/**
 * Проверить наличие соединения между городами
 */
export function hasConnection(
  fromCityId: string,
  toCityId: string,
  type?: ConnectionType
): boolean {
  return getConnectionBetweenCities(fromCityId, toCityId, type).length > 0;
}

