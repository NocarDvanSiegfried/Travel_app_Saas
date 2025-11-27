/**
 * Правила визуализации для умных мультимодальных маршрутов
 * 
 * Определяет стили, цвета, иконки и правила отображения
 * для каждого типа транспорта согласно требованиям
 * 
 * @module routes/features/route-map/lib
 */

import { TransportType } from '../../../domain/types';

/**
 * Стиль линии для визуализации
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'wavy';

/**
 * ФАЗА 5 ФИКС: Цвета для типов транспорта (согласно требованиям)
 * Улучшены для лучшей видимости и контраста с фоном карты
 */
export const SMART_TRANSPORT_COLORS: Record<TransportType, string> = {
  [TransportType.AIRPLANE]: '#0066FF', // Яркий синий - для авиа (было #0066CC, улучшен контраст)
  [TransportType.TRAIN]: '#FF5500', // Яркий оранжевый - для ЖД (было #FF6600, улучшен контраст)
  [TransportType.BUS]: '#00AA55', // Яркий зелёный - для автобусов (было #00CC66, улучшен контраст)
  [TransportType.FERRY]: '#0099FF', // Яркий голубой - для паромов (было #00CCFF, улучшен контраст)
  [TransportType.TAXI]: '#FFAA00', // Яркий жёлтый - для такси (было #FFCC00, улучшен контраст)
  [TransportType.WINTER_ROAD]: '#888888', // Средне-серый - для зимников (было #CCCCCC, улучшен контраст)
  [TransportType.UNKNOWN]: '#666666', // Тёмно-серый - для неизвестных (было #95A5A6, улучшен контраст)
};

/**
 * Стили линий для типов транспорта
 */
export const SMART_LINE_STYLES: Record<TransportType, LineStyle> = {
  [TransportType.AIRPLANE]: 'dashed', // Ломаная (dashed) - для авиа (ломаная через хабы)
  [TransportType.TRAIN]: 'solid', // Сплошная - для ЖД (вдоль путей)
  [TransportType.BUS]: 'solid', // Сплошная - для автобусов (вдоль дорог)
  [TransportType.FERRY]: 'wavy', // Волнистая - для паромов (вдоль рек)
  [TransportType.TAXI]: 'solid', // Сплошная - для такси
  [TransportType.WINTER_ROAD]: 'dotted', // Пунктирная - для зимников
  [TransportType.UNKNOWN]: 'solid', // Сплошная - для неизвестных
};

/**
 * ФАЗА 5 ФИКС: Толщина линий для типов транспорта (в пикселях)
 * Увеличена для лучшей видимости на карте
 */
export const SMART_LINE_WEIGHTS: Record<TransportType, number> = {
  [TransportType.AIRPLANE]: 4, // 4px для прямых рейсов, 3px для сегментов через хабы (было 3/2)
  [TransportType.TRAIN]: 4, // 4px для ЖД (было 3)
  [TransportType.BUS]: 3, // 3px для автобусов (было 2)
  [TransportType.FERRY]: 3, // 3px для паромов (было 2)
  [TransportType.TAXI]: 3, // 3px для такси (было 2)
  [TransportType.WINTER_ROAD]: 2, // 2px для зимников (остаётся тонкой)
  [TransportType.UNKNOWN]: 3, // 3px для неизвестных (было 2)
};

/**
 * ФАЗА 5 ФИКС: Прозрачность линий для типов транспорта (0-1)
 * Увеличена для лучшей видимости на карте
 */
export const SMART_LINE_OPACITY: Record<TransportType, number> = {
  [TransportType.AIRPLANE]: 1.0, // Полная непрозрачность для авиа (было 0.9)
  [TransportType.TRAIN]: 0.95, // Почти полная для ЖД (было 0.8)
  [TransportType.BUS]: 0.9, // Высокая для автобусов (было 0.8)
  [TransportType.FERRY]: 0.85, // Высокая для паромов (было 0.7)
  [TransportType.TAXI]: 0.9, // Высокая для такси (было 0.8)
  [TransportType.WINTER_ROAD]: 0.7, // Средняя для зимников (было 0.6)
  [TransportType.UNKNOWN]: 0.85, // Высокая для неизвестных (было 0.7)
};

/**
 * Z-index для типов транспорта (для правильного наложения)
 */
export const SMART_LINE_Z_INDEX: Record<TransportType, number> = {
  [TransportType.AIRPLANE]: 1000, // Самый высокий - авиа поверх всего
  [TransportType.TRAIN]: 800, // Высокий - ЖД
  [TransportType.BUS]: 600, // Средний - автобусы
  [TransportType.FERRY]: 500, // Средний - паромы
  [TransportType.TAXI]: 700, // Средний-высокий - такси
  [TransportType.WINTER_ROAD]: 400, // Низкий - зимники внизу
  [TransportType.UNKNOWN]: 300, // Самый низкий - неизвестные
};

/**
 * Иконки для типов транспорта (emoji)
 */
export const SMART_TRANSPORT_ICONS: Record<TransportType, string> = {
  [TransportType.AIRPLANE]: '✈️',
  [TransportType.TRAIN]: '🚂',
  [TransportType.BUS]: '🚌',
  [TransportType.FERRY]: '⛴️',
  [TransportType.TAXI]: '🚕',
  [TransportType.WINTER_ROAD]: '❄️',
  [TransportType.UNKNOWN]: '❓',
};

/**
 * Иконки для типов остановок
 */
export const SMART_STOP_ICONS: Record<string, string> = {
  airport: '✈️',
  train_station: '🚂',
  bus_station: '🚌',
  ferry_pier: '⛴️',
  winter_road_point: '❄️',
  taxi_stand: '🚕',
  hub: '⭐', // Звезда для хабов
  transfer: '🔄', // Стрелки для пересадок
};

/**
 * Цвета для маркеров остановок
 */
export const SMART_STOP_MARKER_COLORS: Record<string, string> = {
  airport: '#0066CC', // Синий
  train_station: '#FF6600', // Оранжевый
  bus_station: '#00CC66', // Зелёный
  ferry_pier: '#00CCFF', // Голубой
  winter_road_point: '#CCCCCC', // Светло-серый
  taxi_stand: '#FFCC00', // Жёлтый
  hub: '#FF6B6B', // Красный для хабов
  transfer: '#FFCC00', // Жёлтый для пересадок
};

/**
 * Размеры маркеров (в пикселях)
 */
export const SMART_MARKER_SIZES = {
  normal: [32, 32] as [number, number],
  large: [40, 40] as [number, number], // Для хабов
  small: [24, 24] as [number, number], // Для промежуточных остановок
  transfer: [28, 28] as [number, number], // Для пересадок
} as const;

/**
 * Опции стиля для полилинии умного маршрута
 */
export interface SmartPolylineStyle {
  /**
   * Цвет линии
   */
  color: string;

  /**
   * Толщина линии (в пикселях)
   */
  weight: number;

  /**
   * Прозрачность (0-1)
   */
  opacity: number;

  /**
   * Стиль линии (solid, dashed, dotted, wavy)
   */
  lineStyle: LineStyle;

  /**
   * Z-index для наложения
   */
  zIndex: number;

  /**
   * Dash array для пунктирных линий (опционально)
   */
  dashArray?: string;

  /**
   * Опции для волнистых линий (опционально)
   */
  wavyOptions?: {
    amplitude: number; // Амплитуда волны
    frequency: number; // Частота волны
  };
}

/**
 * Опции для маркера остановки
 */
export interface SmartMarkerOptions {
  /**
   * Иконка маркера (emoji или URL)
   */
  icon: string;

  /**
   * Цвет маркера
   */
  color: string;

  /**
   * Размер маркера [ширина, высота]
   */
  size: [number, number];

  /**
   * Является ли хабом
   */
  isHub?: boolean;

  /**
   * Уровень хаба (federal, regional)
   */
  hubLevel?: 'federal' | 'regional';

  /**
   * Является ли пересадкой
   */
  isTransfer?: boolean;

  /**
   * Текст для popup
   */
  popupContent?: string;
}

/**
 * Получает стиль полилинии для типа транспорта
 */
export function getSmartPolylineStyle(
  transportType: TransportType,
  isDirect?: boolean,
  viaHubs?: Array<{ level: 'federal' | 'regional' }>
): SmartPolylineStyle {
  const baseColor = SMART_TRANSPORT_COLORS[transportType];
  const baseWeight = SMART_LINE_WEIGHTS[transportType];
  const baseOpacity = SMART_LINE_OPACITY[transportType];
  const lineStyle = SMART_LINE_STYLES[transportType];
  const zIndex = SMART_LINE_Z_INDEX[transportType];

  // ФАЗА 5 ФИКС: Для авиа: уменьшаем толщину для сегментов через хабы (но не слишком)
  let weight = baseWeight;
  if (transportType === TransportType.AIRPLANE && !isDirect && viaHubs && viaHubs.length > 0) {
    weight = 3; // 3px для сегментов через хабы (было 2, увеличено для видимости)
  }

  // Для авиа: используем ломаную линию (dashed)
  let dashArray: string | undefined;
  if (transportType === TransportType.AIRPLANE) {
    dashArray = '10, 5'; // Ломаная: 10px линия, 5px пробел
  }
  // Для зимников: используем пунктир
  else if (transportType === TransportType.WINTER_ROAD) {
    dashArray = '5, 5'; // Пунктир: 5px линия, 5px пробел
  }

  // Для паромов: волнистая линия (эмулируется через SVG path или специальный плагин)
  let wavyOptions: SmartPolylineStyle['wavyOptions'] | undefined;
  if (transportType === TransportType.FERRY) {
    wavyOptions = {
      amplitude: 0.001, // Амплитуда волны в градусах
      frequency: 10, // Частота волны (количество волн на сегмент)
    };
  }

  return {
    color: baseColor,
    weight,
    opacity: baseOpacity,
    lineStyle,
    zIndex,
    dashArray,
    wavyOptions,
  };
}

/**
 * Получает опции маркера для остановки
 */
export function getSmartMarkerOptions(
  stopType: string,
  isHub?: boolean,
  hubLevel?: 'federal' | 'regional',
  isTransfer?: boolean,
  stopName?: string
): SmartMarkerOptions {
  // Определяем базовые параметры
  let icon = SMART_STOP_ICONS[stopType] || SMART_STOP_ICONS.transfer;
  let color = SMART_STOP_MARKER_COLORS[stopType] || SMART_STOP_MARKER_COLORS.transfer;
  let size: [number, number] = SMART_MARKER_SIZES.normal;

  // Для хабов - специальная обработка
  if (isHub) {
    icon = SMART_STOP_ICONS.hub;
    color = SMART_STOP_MARKER_COLORS.hub;
    size = SMART_MARKER_SIZES.large; // Крупный маркер для хабов
  }

  // Для пересадок
  if (isTransfer && !isHub) {
    icon = SMART_STOP_ICONS.transfer;
    color = SMART_STOP_MARKER_COLORS.transfer;
    size = SMART_MARKER_SIZES.transfer;
  }

  // Формируем popup контент
  let popupContent = stopName || stopType;
  if (isHub) {
    const hubLabel = hubLevel === 'federal' ? 'Федеральный хаб' : 'Региональный хаб';
    popupContent = `${stopName || stopType} (${hubLabel})`;
  } else if (isTransfer) {
    popupContent = `${stopName || stopType} (пересадка)`;
  }

  return {
    icon,
    color,
    size,
    isHub,
    hubLevel,
    isTransfer,
    popupContent,
  };
}

/**
 * Конвертирует стиль умного маршрута в опции Leaflet Polyline
 */
export function convertToLeafletPolylineOptions(
  style: SmartPolylineStyle
): {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  zIndexOffset?: number;
} {
  const options: {
    color: string;
    weight: number;
    opacity: number;
    dashArray?: string;
    zIndexOffset?: number;
  } = {
    color: style.color,
    weight: style.weight,
    opacity: style.opacity,
    zIndexOffset: style.zIndex,
  };

  // Добавляем dashArray для пунктирных и ломаных линий
  if (style.dashArray) {
    options.dashArray = style.dashArray;
  } else if (style.lineStyle === 'dashed') {
    // Для ломаных линий (авиа): используем dashArray
    options.dashArray = '10, 5'; // 10px линия, 5px пробел
  } else if (style.lineStyle === 'dotted') {
    // Для пунктирных линий (зимники): используем dashArray
    options.dashArray = '5, 5'; // 5px линия, 5px пробел
  }

  return options;
}

/**
 * Создаёт волнистую линию для паромов (эмуляция через SVG path)
 * 
 * Примечание: Leaflet не поддерживает волнистые линии напрямую,
 * поэтому используется эмуляция через изогнутый путь или плагин
 */
export function createWavyPath(
  coordinates: Array<[number, number]>,
  amplitude: number = 0.001,
  frequency: number = 10
): Array<[number, number]> {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const wavyPath: Array<[number, number]> = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];

    // Вычисляем направление и расстояние
    const latDiff = end[0] - start[0];
    const lngDiff = end[1] - start[1];
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // Количество точек для волны
    const numPoints = Math.max(2, Math.ceil(distance / frequency));

    // Добавляем начальную точку
    wavyPath.push(start);

    // Создаём волнистые промежуточные точки
    for (let j = 1; j < numPoints; j++) {
      const t = j / numPoints;
      const lat = start[0] + latDiff * t;
      const lng = start[1] + lngDiff * t;

      // Добавляем волну (перпендикулярно к направлению)
      const perpLat = -lngDiff / distance;
      const perpLng = latDiff / distance;
      const waveOffset = Math.sin(t * Math.PI * frequency) * amplitude;

      wavyPath.push([
        lat + perpLat * waveOffset,
        lng + perpLng * waveOffset,
      ]);
    }
  }

  // Добавляем конечную точку
  wavyPath.push(coordinates[coordinates.length - 1]);

  return wavyPath;
}

/**
 * Правила визуализации для каждого типа транспорта
 */
export const SMART_VISUALIZATION_RULES = {
  /**
   * Авиа: Ломаные линии через хабы
   */
  [TransportType.AIRPLANE]: {
    /**
     * Прямые рейсы
     */
    direct: {
      color: '#0066CC',
      weight: 3,
      opacity: 0.9,
      lineStyle: 'solid' as LineStyle,
      description: 'Прямая линия между городами',
    },
    /**
     * Рейсы через один хаб
     */
    viaOneHub: {
      color: '#0066CC',
      weight: 2,
      opacity: 0.9,
      lineStyle: 'solid' as LineStyle,
      description: 'Ломаная линия: город → хаб → город',
    },
    /**
     * Рейсы через два хаба
     */
    viaTwoHubs: {
      color: '#0066CC',
      weight: 2, // Для региональный → федеральный: 3px
      opacity: 0.9,
      lineStyle: 'solid' as LineStyle,
      description: 'Ломаная линия: город → региональный хаб → федеральный хаб → город',
    },
  },

  /**
   * ЖД: Вдоль ЖД-линий
   */
  [TransportType.TRAIN]: {
    color: '#FF6600',
    weight: 3,
    opacity: 0.8,
    lineStyle: 'solid' as LineStyle,
    description: 'Линия вдоль ЖД-линий (не прямая)',
    showIntermediateStations: true,
  },

  /**
   * Автобус: Вдоль дорог
   */
  [TransportType.BUS]: {
    color: '#00CC66',
    weight: 2,
    opacity: 0.8,
    lineStyle: 'solid' as LineStyle,
    description: 'Линия вдоль дорог (не прямая)',
    showIntermediateCities: true,
    winterRoad: {
      color: '#CCCCCC',
      weight: 2,
      opacity: 0.6,
      lineStyle: 'dotted' as LineStyle,
      description: 'Пунктирная линия для зимников',
    },
  },

  /**
   * Паром: Волнистые линии вдоль рек
   */
  [TransportType.FERRY]: {
    color: '#00CCFF',
    weight: 2,
    opacity: 0.7,
    lineStyle: 'wavy' as LineStyle,
    description: 'Волнистая линия вдоль рек (не прямая)',
    seasonal: true, // Показывать только летом
  },

  /**
   * Зимник: Пунктир
   */
  [TransportType.WINTER_ROAD]: {
    color: '#CCCCCC',
    weight: 2,
    opacity: 0.6,
    lineStyle: 'dotted' as LineStyle,
    description: 'Пунктирная линия для зимних дорог',
    seasonal: true, // Показывать только зимой
  },

  /**
   * Такси: Обычная линия
   */
  [TransportType.TAXI]: {
    color: '#FFCC00',
    weight: 2,
    opacity: 0.8,
    lineStyle: 'solid' as LineStyle,
    description: 'Сплошная линия для такси',
  },
} as const;

/**
 * Получает правила визуализации для типа транспорта
 */
export function getVisualizationRules(transportType: TransportType) {
  return SMART_VISUALIZATION_RULES[transportType] || SMART_VISUALIZATION_RULES[TransportType.UNKNOWN];
}

