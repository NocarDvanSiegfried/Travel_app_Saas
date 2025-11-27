/**
 * Справочник городов России и Якутии
 * 
 * Содержит полную административную структуру для всех городов
 * Используется как источник правды для создания остановок и маршрутов
 */

import type { AdministrativeStructure } from '../entities/AdministrativeStructure';
import { createAdministrativeStructure } from '../entities/AdministrativeStructure';

/**
 * Базовая информация о городе
 */
export interface CityReference {
  /**
   * ID города
   */
  id: string;

  /**
   * Название города
   */
  name: string;

  /**
   * Нормализованное название (для поиска)
   */
  normalizedName: string;

  /**
   * Координаты
   */
  coordinates: {
    latitude: number;
    longitude: number;
  };

  /**
   * Часовой пояс
   */
  timezone: string;

  /**
   * Население (опционально)
   */
  population?: number;

  /**
   * Является ли ключевым городом Якутии
   */
  isKeyCity: boolean;

  /**
   * Является ли хабом
   */
  isHub: boolean;

  /**
   * Уровень хаба (если isHub = true)
   */
  hubLevel?: 'federal' | 'regional';

  /**
   * Административная структура
   */
  administrative: AdministrativeStructure;

  /**
   * Инфраструктура
   */
  infrastructure: {
    hasAirport: boolean;
    airportClass?: 'A' | 'B' | 'C' | 'D';
    hasTrainStation: boolean;
    hasBusStation: boolean;
    hasFerryPier: boolean;
    hasWinterRoad: boolean;
  };

  /**
   * Синонимы для поиска
   */
  synonyms: string[];
}

/**
 * Федеральные хабы (крупные транспортные узлы России)
 */
export const FEDERAL_HUBS: CityReference[] = [
  {
    id: 'moscow',
    name: 'Москва',
    normalizedName: 'москва',
    coordinates: { latitude: 55.7558, longitude: 37.6173 },
    timezone: 'Europe/Moscow',
    population: 12600000,
    isKeyCity: false,
    isHub: true,
    hubLevel: 'federal',
    administrative: createAdministrativeStructure(
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
    infrastructure: {
      hasAirport: true,
      airportClass: 'A',
      hasTrainStation: true,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['МСК', 'Moscow'],
  },
  {
    id: 'novosibirsk',
    name: 'Новосибирск',
    normalizedName: 'новосибирск',
    coordinates: { latitude: 55.0084, longitude: 82.9357 },
    timezone: 'Asia/Novosibirsk',
    population: 1600000,
    isKeyCity: false,
    isHub: true,
    hubLevel: 'federal',
    administrative: createAdministrativeStructure(
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
    infrastructure: {
      hasAirport: true,
      airportClass: 'A',
      hasTrainStation: true,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['НВС', 'Novosibirsk'],
  },
  {
    id: 'krasnoyarsk',
    name: 'Красноярск',
    normalizedName: 'красноярск',
    coordinates: { latitude: 56.0089, longitude: 92.8529 },
    timezone: 'Asia/Krasnoyarsk',
    population: 1100000,
    isKeyCity: false,
    isHub: true,
    hubLevel: 'federal',
    administrative: createAdministrativeStructure(
      {
        type: 'kray',
        name: 'Красноярский край',
        shortName: 'Красноярский край',
        code: 'KYA',
      },
      {
        type: 'city',
        name: 'Красноярск',
        normalizedName: 'красноярск',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'A',
      hasTrainStation: true,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['КЯР', 'Krasnoyarsk'],
  },
  {
    id: 'khabarovsk',
    name: 'Хабаровск',
    normalizedName: 'хабаровск',
    coordinates: { latitude: 48.4802, longitude: 135.0719 },
    timezone: 'Asia/Vladivostok',
    population: 610000,
    isKeyCity: false,
    isHub: true,
    hubLevel: 'federal',
    administrative: createAdministrativeStructure(
      {
        type: 'kray',
        name: 'Хабаровский край',
        shortName: 'Хабаровский край',
        code: 'KHA',
      },
      {
        type: 'city',
        name: 'Хабаровск',
        normalizedName: 'хабаровск',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'A',
      hasTrainStation: true,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['ХБР', 'Khabarovsk'],
  },
  {
    id: 'irkutsk',
    name: 'Иркутск',
    normalizedName: 'иркутск',
    coordinates: { latitude: 52.2680, longitude: 104.3889 },
    timezone: 'Asia/Irkutsk',
    population: 620000,
    isKeyCity: false,
    isHub: true,
    hubLevel: 'federal',
    administrative: createAdministrativeStructure(
      {
        type: 'oblast',
        name: 'Иркутская область',
        shortName: 'Иркутская обл.',
        code: 'IRK',
      },
      {
        type: 'city',
        name: 'Иркутск',
        normalizedName: 'иркутск',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'B',
      hasTrainStation: true,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['ИРК', 'Irkutsk'],
  },
];

/**
 * Региональные хабы Якутии
 */
export const REGIONAL_HUBS_YAKUTIA: CityReference[] = [
  {
    id: 'yakutsk',
    name: 'Якутск',
    normalizedName: 'якутск',
    coordinates: { latitude: 62.0278, longitude: 129.7042 },
    timezone: 'Asia/Yakutsk',
    population: 330000,
    isKeyCity: true,
    isHub: true,
    hubLevel: 'regional',
    administrative: createAdministrativeStructure(
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
    infrastructure: {
      hasAirport: true,
      airportClass: 'B',
      hasTrainStation: false, // ЖД-вокзал в Нижнем Бестяхе
      hasBusStation: true,
      hasFerryPier: true,
      hasWinterRoad: true,
    },
    synonyms: ['Дьокуускай', 'Yakutsk', 'YAK'],
  },
  {
    id: 'mirny',
    name: 'Мирный',
    normalizedName: 'мирный',
    coordinates: { latitude: 62.5353, longitude: 113.9611 },
    timezone: 'Asia/Yakutsk',
    population: 35000,
    isKeyCity: true,
    isHub: true,
    hubLevel: 'regional',
    administrative: createAdministrativeStructure(
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
    infrastructure: {
      hasAirport: true,
      airportClass: 'C',
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Mirny', 'MJZ'],
  },
  {
    id: 'neryungri',
    name: 'Нерюнгри',
    normalizedName: 'нерюнгри',
    coordinates: { latitude: 56.6583, longitude: 124.7250 },
    timezone: 'Asia/Yakutsk',
    population: 58000,
    isKeyCity: true,
    isHub: true,
    hubLevel: 'regional',
    administrative: createAdministrativeStructure(
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
    infrastructure: {
      hasAirport: true,
      airportClass: 'C',
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Neryungri', 'NER'],
  },
  {
    id: 'tiksi',
    name: 'Тикси',
    normalizedName: 'тикси',
    coordinates: { latitude: 71.6333, longitude: 128.8667 },
    timezone: 'Asia/Yakutsk',
    population: 5000,
    isKeyCity: true,
    isHub: true,
    hubLevel: 'regional',
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'town',
        name: 'Тикси',
        normalizedName: 'тикси',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'C',
      hasTrainStation: false,
      hasBusStation: false,
      hasFerryPier: true,
      hasWinterRoad: false,
    },
    synonyms: ['Tiksi', 'IKS'],
  },
];

/**
 * Ключевые города Якутии (не хабы)
 */
export const KEY_CITIES_YAKUTIA: CityReference[] = [
  {
    id: 'lensk',
    name: 'Ленск',
    normalizedName: 'ленск',
    coordinates: { latitude: 60.7167, longitude: 114.9167 },
    timezone: 'Asia/Yakutsk',
    population: 24000,
    isKeyCity: true,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Ленск',
        normalizedName: 'ленск',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: true,
      hasWinterRoad: false,
    },
    synonyms: ['Lensk'],
  },
  {
    id: 'olekminsk',
    name: 'Олёкминск',
    normalizedName: 'олекминск',
    coordinates: { latitude: 60.3733, longitude: 120.4264 },
    timezone: 'Asia/Yakutsk',
    population: 9000,
    isKeyCity: true,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Олёкминск',
        normalizedName: 'олекминск',
      },
      {
        type: 'rayon',
        name: 'Олёкминский район',
        code: 'OLK',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: true,
      hasWinterRoad: false,
    },
    synonyms: ['Olyokminsk', 'Olekminsk'],
  },
  {
    id: 'vilyuisk',
    name: 'Вилюйск',
    normalizedName: 'вилюйск',
    coordinates: { latitude: 63.7553, longitude: 121.6244 },
    timezone: 'Asia/Yakutsk',
    population: 11000,
    isKeyCity: true,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Вилюйск',
        normalizedName: 'вилюйск',
      },
      {
        type: 'rayon',
        name: 'Вилюйский район',
        code: 'VIL',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: true,
      hasWinterRoad: false,
    },
    synonyms: ['Vilyuisk'],
  },
];

/**
 * Малые города Якутии (локальные аэропорты)
 */
export const LOCAL_CITIES_YAKUTIA: CityReference[] = [
  {
    id: 'srednekolymsk',
    name: 'Среднеколымск',
    normalizedName: 'среднеколымск',
    coordinates: { latitude: 67.4500, longitude: 153.7000 },
    timezone: 'Asia/Yakutsk',
    population: 3500,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'town',
        name: 'Среднеколымск',
        normalizedName: 'среднеколымск',
      },
      {
        type: 'rayon',
        name: 'Среднеколымский район',
        code: 'SRK',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'D',
      hasTrainStation: false,
      hasBusStation: false,
      hasFerryPier: false,
      hasWinterRoad: true,
    },
    synonyms: ['Srednekolymsk'],
  },
  {
    id: 'chokurdakh',
    name: 'Чокурдах',
    normalizedName: 'чокурдах',
    coordinates: { latitude: 70.6167, longitude: 147.9000 },
    timezone: 'Asia/Yakutsk',
    population: 2100,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'town',
        name: 'Чокурдах',
        normalizedName: 'чокурдах',
      },
      {
        type: 'rayon',
        name: 'Абыйский район',
        code: 'ABY',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'D',
      hasTrainStation: false,
      hasBusStation: false,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Chokurdakh'],
  },
  {
    id: 'verkhoyansk',
    name: 'Верхоянск',
    normalizedName: 'верхоянск',
    coordinates: { latitude: 67.5500, longitude: 133.3833 },
    timezone: 'Asia/Yakutsk',
    population: 1100,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'town',
        name: 'Верхоянск',
        normalizedName: 'верхоянск',
      },
      {
        type: 'rayon',
        name: 'Верхоянский район',
        code: 'VRH',
      }
    ),
    infrastructure: {
      hasAirport: true,
      airportClass: 'D',
      hasTrainStation: false,
      hasBusStation: false,
      hasFerryPier: false,
      hasWinterRoad: true,
    },
    synonyms: ['Verkhoyansk'],
  },
  {
    id: 'zhigansk',
    name: 'Жиганск',
    normalizedName: 'жиганск',
    coordinates: { latitude: 66.7667, longitude: 123.4000 },
    timezone: 'Asia/Yakutsk',
    population: 3400,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'town',
        name: 'Жиганск',
        normalizedName: 'жиганск',
      },
      {
        type: 'rayon',
        name: 'Жиганский район',
        code: 'ZHG',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: false,
      hasFerryPier: true,
      hasWinterRoad: true,
    },
    synonyms: ['Zhigansk'],
  },
  {
    id: 'aldan',
    name: 'Алдан',
    normalizedName: 'алдан',
    coordinates: { latitude: 58.6000, longitude: 125.4000 },
    timezone: 'Asia/Yakutsk',
    population: 21000,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Алдан',
        normalizedName: 'алдан',
      },
      {
        type: 'rayon',
        name: 'Алданский район',
        code: 'ALD',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: true, // На АЯМ
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Aldan'],
  },
  {
    id: 'tommot',
    name: 'Томмот',
    normalizedName: 'томмот',
    coordinates: { latitude: 58.9564, longitude: 126.2925 },
    timezone: 'Asia/Yakutsk',
    population: 8000,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Томмот',
        normalizedName: 'томмот',
      },
      {
        type: 'rayon',
        name: 'Алданский район',
        code: 'ALD',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: true, // На АЯМ
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Tommot'],
  },
  {
    id: 'nizhny-bestyakh',
    name: 'Нижний Бестях',
    normalizedName: 'нижний бестях',
    coordinates: { latitude: 61.9500, longitude: 129.6000 },
    timezone: 'Asia/Yakutsk',
    population: 3500,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'urban_settlement',
        name: 'Нижний Бестях',
        normalizedName: 'нижний бестях',
      },
      {
        type: 'rayon',
        name: 'Мегино-Кангаласский район',
        code: 'MKG',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: true, // Конечная станция АЯМ
      hasBusStation: true,
      hasFerryPier: true, // Паромная переправа в Якутск
      hasWinterRoad: true, // Зимняя дорога в Якутск
    },
    synonyms: ['Nizhny Bestyakh', 'Бестях'],
  },
  {
    id: 'pokrovsk',
    name: 'Покровск',
    normalizedName: 'покровск',
    coordinates: { latitude: 61.4833, longitude: 129.1500 },
    timezone: 'Asia/Yakutsk',
    population: 9000,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Покровск',
        normalizedName: 'покровск',
      },
      {
        type: 'rayon',
        name: 'Хангаласский район',
        code: 'HNG',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Pokrovsk'],
  },
  {
    id: 'udachny',
    name: 'Удачный',
    normalizedName: 'удачный',
    coordinates: { latitude: 66.4167, longitude: 112.4000 },
    timezone: 'Asia/Yakutsk',
    population: 12000,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'city',
        name: 'Удачный',
        normalizedName: 'удачный',
      },
      {
        type: 'rayon',
        name: 'Мирнинский район',
        code: 'MRN',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Udachny'],
  },
  {
    id: 'khandyga',
    name: 'Хандыга',
    normalizedName: 'хандыга',
    coordinates: { latitude: 62.6542, longitude: 135.5900 },
    timezone: 'Asia/Yakutsk',
    population: 6500,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'republic',
        name: 'Республика Саха (Якутия)',
        shortName: 'Якутия',
        code: 'SA',
      },
      {
        type: 'urban_settlement',
        name: 'Хандыга',
        normalizedName: 'хандыга',
      },
      {
        type: 'rayon',
        name: 'Томпонский район',
        code: 'TMP',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: true, // На реке Алдан
      hasWinterRoad: false,
    },
    synonyms: ['Khandyga'],
  },
];

/**
 * ЖД-станции (АЯМ и Транссиб)
 */
export const RAILWAY_STATIONS: CityReference[] = [
  {
    id: 'tynda',
    name: 'Тында',
    normalizedName: 'тында',
    coordinates: { latitude: 55.1500, longitude: 124.7000 },
    timezone: 'Asia/Yakutsk',
    population: 35000,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'oblast',
        name: 'Амурская область',
        shortName: 'Амурская обл.',
        code: 'AMU',
      },
      {
        type: 'city',
        name: 'Тында',
        normalizedName: 'тында',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: true, // Узловая станция АЯМ ↔ Транссиб
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Tynda', 'TYNDA'],
  },
  {
    id: 'skovorodino',
    name: 'Сковородино',
    normalizedName: 'сковородино',
    coordinates: { latitude: 53.9800, longitude: 123.9300 },
    timezone: 'Asia/Yakutsk',
    population: 10000,
    isKeyCity: false,
    isHub: false,
    administrative: createAdministrativeStructure(
      {
        type: 'oblast',
        name: 'Амурская область',
        shortName: 'Амурская обл.',
        code: 'AMU',
      },
      {
        type: 'city',
        name: 'Сковородино',
        normalizedName: 'сковородино',
      }
    ),
    infrastructure: {
      hasAirport: false,
      hasTrainStation: true, // Узловая станция Транссиба
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    synonyms: ['Skovorodino', 'SKOVORODINO'],
  },
];

/**
 * Все города (объединённый список)
 */
export const ALL_CITIES: CityReference[] = [
  ...FEDERAL_HUBS,
  ...REGIONAL_HUBS_YAKUTIA,
  ...KEY_CITIES_YAKUTIA,
  ...LOCAL_CITIES_YAKUTIA,
  ...RAILWAY_STATIONS,
];

/**
 * Получить город по ID
 */
export function getCityById(id: string): CityReference | undefined {
  return ALL_CITIES.find((city) => city.id === id);
}

/**
 * Получить город по нормализованному названию
 */
export function getCityByNormalizedName(normalizedName: string): CityReference | undefined {
  return ALL_CITIES.find(
    (city) => city.normalizedName === normalizedName.toLowerCase()
  );
}

/**
 * Поиск городов по запросу (нечёткий поиск)
 */
/**
 * Результат поиска города с приоритетом
 */
export interface CitySearchResult {
  /**
   * Город
   */
  city: CityReference;

  /**
   * Приоритет совпадения (1 - высший, 4 - низший)
   */
  priority: number;

  /**
   * Тип совпадения
   */
  matchType: 'exact' | 'district' | 'region' | 'fuzzy';

  /**
   * Релевантность (0-1)
   */
  relevance: number;
}

/**
 * Поиск городов по запросу с многоуровневой поддержкой административной структуры
 * 
 * Поддерживает поиск в формате "Регион → Район → Город"
 * 
 * @example
 * ```typescript
 * // Поиск по городу
 * searchCities('Олёкминск') // Найдёт Олёкминск
 * 
 * // Поиск по району
 * searchCities('Олёкминский район') // Найдёт все города в Олёкминском районе
 * 
 * // Поиск по региону
 * searchCities('Якутия') // Найдёт все города в Якутии
 * 
 * // Полный формат
 * searchCities('Республика Саха (Якутия), Олёкминский район, Олёкминск')
 * ```
 */
export function searchCities(query: string): CityReference[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return [];
  }

  // Многоуровневый поиск с приоритетами
  const results: CitySearchResult[] = [];

  for (const city of ALL_CITIES) {
    let priority = 4; // По умолчанию - низший приоритет
    let matchType: CitySearchResult['matchType'] = 'fuzzy';
    let relevance = 0;

    // Уровень 1: Точное совпадение по нормализованному названию
    if (city.normalizedName === normalizedQuery) {
      priority = 1;
      matchType = 'exact';
      relevance = 1.0;
    }
    // Уровень 1: Точное совпадение по полному формату административной структуры
    else if (city.administrative.formats.full.toLowerCase() === normalizedQuery) {
      priority = 1;
      matchType = 'exact';
      relevance = 1.0;
    }
    // Уровень 1: Точное совпадение по формату с контекстом
    else if (city.administrative.formats.withContext.toLowerCase() === normalizedQuery) {
      priority = 1;
      matchType = 'exact';
      relevance = 0.95;
    }
    // Уровень 2: Поиск по району
    else if (city.administrative.district) {
      const districtName = city.administrative.district.name.toLowerCase();
      if (districtName === normalizedQuery || districtName.includes(normalizedQuery)) {
        priority = 2;
        matchType = 'district';
        relevance = 0.8;
      }
      // Поиск "район + город"
      else if (normalizedQuery.includes(districtName) && normalizedQuery.includes(city.normalizedName)) {
        priority = 1;
        matchType = 'exact';
        relevance = 0.9;
      }
    }
    // Уровень 3: Поиск по региону
    else {
      const subjectName = city.administrative.subject.name.toLowerCase();
      const subjectShortName = city.administrative.subject.shortName.toLowerCase();
      
      if (subjectName === normalizedQuery || subjectShortName === normalizedQuery) {
        priority = 3;
        matchType = 'region';
        relevance = 0.6;
      }
      // Поиск "регион + город"
      else if ((normalizedQuery.includes(subjectName) || normalizedQuery.includes(subjectShortName)) 
               && normalizedQuery.includes(city.normalizedName)) {
        priority = 2;
        matchType = 'district';
        relevance = 0.7;
      }
    }

    // Если не найдено точное совпадение, проверяем частичные совпадения
    if (priority === 4) {
      // Частичное совпадение по названию города
      if (city.normalizedName.includes(normalizedQuery) || normalizedQuery.includes(city.normalizedName)) {
        priority = 2;
        matchType = 'fuzzy';
        relevance = 0.5;
      }
      // Поиск по синонимам
      else if (city.synonyms.some((synonym) => synonym.toLowerCase().includes(normalizedQuery))) {
        priority = 2;
        matchType = 'fuzzy';
        relevance = 0.5;
      }
      // Поиск по административной структуре (частичное совпадение)
      else if (city.administrative.formats.full.toLowerCase().includes(normalizedQuery) ||
               city.administrative.formats.withContext.toLowerCase().includes(normalizedQuery) ||
               city.administrative.formats.medium.toLowerCase().includes(normalizedQuery)) {
        priority = 3;
        matchType = 'fuzzy';
        relevance = 0.4;
      }
      // Поиск по району (частичное совпадение)
      else if (city.administrative.district && 
               city.administrative.district.name.toLowerCase().includes(normalizedQuery)) {
        priority = 3;
        matchType = 'district';
        relevance = 0.5;
      }
      // Поиск по региону (частичное совпадение)
      else if (city.administrative.subject.name.toLowerCase().includes(normalizedQuery) ||
               city.administrative.subject.shortName.toLowerCase().includes(normalizedQuery)) {
        priority = 4;
        matchType = 'region';
        relevance = 0.3;
      }
    }

    // Добавляем результат, если найдено совпадение
    if (priority < 4 || relevance > 0) {
      results.push({
        city,
        priority,
        matchType,
        relevance,
      });
    }
  }

  // Сортируем по приоритету и релевантности
  results.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority; // Меньший приоритет = выше
    }
    return b.relevance - a.relevance; // Большая релевантность = выше
  });

  // Возвращаем только города (без метаданных)
  return results.map((result) => result.city);
}

