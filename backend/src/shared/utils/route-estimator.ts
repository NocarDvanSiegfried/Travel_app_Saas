/**
 * Route Estimator
 * 
 * Утилиты для расчета реалистичных оценок маршрутов на основе расстояний и типов транспорта.
 * Используется для генерации виртуальных маршрутов с реалистичными данными.
 * 
 * @module shared/utils
 */

/**
 * Расчет расстояния между двумя точками по формуле Haversine
 * 
 * @param lat1 - Широта первой точки
 * @param lon1 - Долгота первой точки
 * @param lat2 - Широта второй точки
 * @param lon2 - Долгота второй точки
 * @returns Расстояние в километрах
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Радиус Земли в километрах
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Преобразование градусов в радианы
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Тип транспорта для расчета оценок
 */
export type TransportType = 'PLANE' | 'BUS' | 'TRAIN' | 'FERRY';

/**
 * Параметры расчета для разных типов транспорта
 */
interface TransportParams {
  averageSpeed: number; // км/ч
  pricePerKm: { min: number; max: number }; // руб/км
  overheadTime: number; // минуты (взлет/посадка, остановки)
}

const TRANSPORT_PARAMS: Record<TransportType, TransportParams> = {
  PLANE: {
    averageSpeed: 550, // Средняя скорость региональных рейсов
    pricePerKm: { min: 10, max: 15 }, // Региональные рейсы дороже
    overheadTime: 30, // Взлет, посадка, руление
  },
  BUS: {
    averageSpeed: 65, // С учетом остановок и дорожных условий
    pricePerKm: { min: 3, max: 4 }, // Типичная цена для автобусов Якутии
    overheadTime: 0, // Остановки уже учтены в скорости
  },
  TRAIN: {
    averageSpeed: 80, // Средняя скорость для региональных поездов
    pricePerKm: { min: 2, max: 3 }, // Поезда обычно дешевле
    overheadTime: 5, // Остановки на станциях
  },
  FERRY: {
    averageSpeed: 22, // Речной транспорт медленнее
    pricePerKm: { min: 2, max: 3 }, // Схоже с поездами
    overheadTime: 10, // Погрузка/разгрузка
  },
};

/**
 * Оценка времени в пути для маршрута
 * 
 * @param distance - Расстояние в километрах
 * @param transportType - Тип транспорта
 * @returns Время в минутах
 */
export function estimateRouteDuration(
  distance: number,
  transportType: TransportType
): number {
  const params = TRANSPORT_PARAMS[transportType];
  const travelTime = (distance / params.averageSpeed) * 60; // минуты
  return Math.round(travelTime + params.overheadTime);
}

/**
 * Оценка цены маршрута
 * 
 * @param distance - Расстояние в километрах
 * @param transportType - Тип транспорта
 * @returns Объект с минимальной, максимальной и средней ценой
 */
export function estimateRoutePrice(
  distance: number,
  transportType: TransportType
): { min: number; max: number; average: number } {
  const params = TRANSPORT_PARAMS[transportType];
  const minPrice = Math.round(distance * params.pricePerKm.min);
  const maxPrice = Math.round(distance * params.pricePerKm.max);
  const averagePrice = Math.round((minPrice + maxPrice) / 2);

  return {
    min: minPrice,
    max: maxPrice,
    average: averagePrice,
  };
}

/**
 * Определение оптимального типа транспорта для маршрута
 * 
 * @param distance - Расстояние в километрах
 * @returns Рекомендуемый тип транспорта
 */
export function getOptimalTransportType(distance: number): TransportType {
  // Для коротких расстояний (< 200 км) - автобус
  if (distance < 200) {
    return 'BUS';
  }

  // Для средних расстояний (200-500 км) - автобус или самолет (зависит от доступности)
  if (distance < 500) {
    // В Якутии для средних расстояний часто используется автобус
    return 'BUS';
  }

  // Для длинных расстояний (> 500 км) - самолет (в Якутии это основной вид транспорта)
  return 'PLANE';
}

/**
 * Генерация типичных времен отправления для маршрута
 * 
 * @param transportType - Тип транспорта
 * @param frequency - Частота рейсов
 * @returns Массив времен отправления (HH:MM)
 */
export function generateTypicalDepartureTimes(
  transportType: TransportType,
  frequency: 'daily' | 'weekly' | 'seasonal' = 'daily'
): string[] {
  if (transportType === 'PLANE') {
    // Авиарейсы обычно утром и днем
    return ['06:00', '10:30', '14:00', '18:00'];
  }

  if (transportType === 'BUS') {
    // Автобусы обычно рано утром
    return ['07:00', '08:30', '12:00', '16:00'];
  }

  if (transportType === 'TRAIN') {
    // Поезда обычно вечером
    return ['18:00', '20:00', '22:00'];
  }

  // FERRY - обычно утром
  return ['08:00', '12:00', '16:00'];
}

/**
 * Полная оценка маршрута
 * 
 * @param lat1 - Широта точки отправления
 * @param lon1 - Долгота точки отправления
 * @param lat2 - Широта точки назначения
 * @param lon2 - Долгота точки назначения
 * @param transportType - Тип транспорта (опционально, будет определен автоматически)
 * @returns Полная оценка маршрута
 */
export function estimateRoute(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  transportType?: TransportType
): {
  distance: number;
  duration: number;
  price: { min: number; max: number; average: number };
  transportType: TransportType;
  typicalDepartureTimes: string[];
} {
  const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  const optimalTransport = transportType || getOptimalTransportType(distance);
  const duration = estimateRouteDuration(distance, optimalTransport);
  const price = estimateRoutePrice(distance, optimalTransport);
  const typicalDepartureTimes = generateTypicalDepartureTimes(optimalTransport);

  return {
    distance: Math.round(distance),
    duration,
    price,
    transportType: optimalTransport,
    typicalDepartureTimes,
  };
}






