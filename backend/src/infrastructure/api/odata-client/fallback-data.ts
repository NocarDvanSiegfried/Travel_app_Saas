/**
 * Fallback данные для работы без OData API
 */

import { IODataRoute, IODataStop, IODataSchedule, IODataFlight } from './types';
import { TransportType } from '../../../domain/entities/RouteSegment';

/**
 * Тестовые данные остановок
 */
export const FALLBACK_STOPS: IODataStop[] = [
  {
    Ref_Key: 'stop-1',
    Наименование: 'Москва',
    Код: 'MSK',
    Широта: 55.7558,
    Долгота: 37.6173,
  },
  {
    Ref_Key: 'stop-2',
    Наименование: 'Якутск',
    Код: 'YAK',
    Широта: 62.0278,
    Долгота: 129.7044,
  },
  {
    Ref_Key: 'stop-3',
    Наименование: 'Чурапча',
    Код: 'CHR',
    Широта: 61.9833,
    Долгота: 132.4333,
  },
];

/**
 * Тестовые данные маршрутов
 */
export const FALLBACK_ROUTES: IODataRoute[] = [
  {
    Ref_Key: 'route-1',
    Наименование: 'Москва - Якутск',
    Код: 'MSK-YAK',
    ТипТранспорта: 'air',
  },
  {
    Ref_Key: 'route-2',
    Наименование: 'Якутск - Чурапча',
    Код: 'YAK-CHR',
    ТипТранспорта: 'bus',
  },
];

/**
 * Тестовые данные расписания
 */
export const FALLBACK_SCHEDULES: IODataSchedule[] = [
  {
    Ref_Key: 'schedule-1',
    Маршрут_Key: 'route-1',
    Период: new Date().toISOString(),
    ВремяОтправления: '08:00:00',
    ВремяПрибытия: '14:00:00',
    Регулярность: 'daily',
  },
  {
    Ref_Key: 'schedule-2',
    Маршрут_Key: 'route-2',
    Период: new Date().toISOString(),
    ВремяОтправления: '15:00:00',
    ВремяПрибытия: '17:30:00',
    Регулярность: 'daily',
  },
];

/**
 * Тестовые данные рейсов
 */
export function getFallbackFlights(date: string): IODataFlight[] {
  const flightDate = new Date(date);
  return [
    {
      Ref_Key: 'flight-1',
      Маршрут_Key: 'route-1',
      Дата: flightDate.toISOString(),
      ВремяОтправления: '08:00:00',
      ВремяПрибытия: '14:00:00',
      Статус: 'scheduled',
    },
    {
      Ref_Key: 'flight-2',
      Маршрут_Key: 'route-2',
      Дата: new Date(flightDate.getTime() + 60 * 60 * 1000).toISOString(),
      ВремяОтправления: '15:00:00',
      ВремяПрибытия: '17:30:00',
      Статус: 'scheduled',
    },
  ];
}

/**
 * Создать тестовый маршрут для fallback
 */
export function createFallbackRoute(from: string, to: string, date: string): any {
  const fromStop = FALLBACK_STOPS.find(
    (s) =>
      s.Наименование?.toLowerCase().includes(from.toLowerCase()) ||
      s.Код?.toLowerCase() === from.toLowerCase()
  );
  const toStop = FALLBACK_STOPS.find(
    (s) =>
      s.Наименование?.toLowerCase().includes(to.toLowerCase()) ||
      s.Код?.toLowerCase() === to.toLowerCase()
  );

  if (!fromStop || !toStop) {
    return null;
  }

  const route1 = FALLBACK_ROUTES[0];
  const route2 = FALLBACK_ROUTES[1];
  const flights = getFallbackFlights(date);

  return {
    routeId: `fallback-${fromStop.Ref_Key}-${toStop.Ref_Key}`,
    fromCity: fromStop.Наименование || from,
    toCity: toStop.Наименование || to,
    date,
    passengers: 1,
    segments: [
      {
        segment: {
          segmentId: 'segment-1',
          fromStop: fromStop.Ref_Key,
          toStop: 'stop-2',
          routeId: route1.Ref_Key,
          transportType: 'air' as TransportType,
        },
        selectedFlight: {
          flightId: flights[0].Ref_Key,
          routeId: route1.Ref_Key,
          departureTime: `${date}T08:00:00`,
          arrivalTime: `${date}T14:00:00`,
          price: 15000,
          availableSeats: 50,
        },
        departureTime: `${date}T08:00:00`,
        arrivalTime: `${date}T14:00:00`,
        duration: 360, // 6 hours in minutes
        price: 15000,
        transferTime: 60, // 1 hour
      },
      {
        segment: {
          segmentId: 'segment-2',
          fromStop: 'stop-2',
          toStop: toStop.Ref_Key,
          routeId: route2.Ref_Key,
          transportType: 'bus' as TransportType,
        },
        selectedFlight: {
          flightId: flights[1].Ref_Key,
          routeId: route2.Ref_Key,
          departureTime: `${date}T15:00:00`,
          arrivalTime: `${date}T17:30:00`,
          price: 2000,
          availableSeats: 30,
        },
        departureTime: `${date}T15:00:00`,
        arrivalTime: `${date}T17:30:00`,
        duration: 150, // 2.5 hours in minutes
        price: 2000,
      },
    ],
    totalDuration: 510, // 8.5 hours
    totalPrice: 17000,
    transferCount: 1,
    transportTypes: ['air', 'bus'] as TransportType[],
    departureTime: `${date}T08:00:00`,
    arrivalTime: `${date}T17:30:00`,
  };
}

