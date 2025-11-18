/**
 * Адаптер данных маршрутов
 * Преобразует IBuiltRoute в RouteDetailsData (формат OData)
 */

import {
  IBuiltRoute,
  IRiskAssessment,
  RouteDetailsData,
  IRouteSegmentDetails,
} from '../types/route-adapter';
import { getStopName } from './stop-names-cache';

export function adaptRouteToDetailsFormat(
  route: IBuiltRoute,
  riskAssessment?: IRiskAssessment
): RouteDetailsData {
  const fromCityKey = route.routeId || `city-${route.fromCity}`;
  const toCityKey = route.routeId || `city-${route.toCity}`;

  const fromCityCode = route.fromCity.substring(0, 3).toUpperCase();
  const toCityCode = route.toCity.substring(0, 3).toUpperCase();

  const routeDescription = `Маршрут с ${route.transferCount} пересадками, длительность ${route.totalDuration} мин`;

  const segments = route.segments.map((segment, index) => ({
    from: {
      Наименование: getStopName(segment.segment.fromStopId),
      Код: segment.segment.fromStopId,
      Адрес: undefined,
    } as { Наименование?: string; Код?: string; Адрес?: string } | null,
    to: {
      Наименование: getStopName(segment.segment.toStopId),
      Код: segment.segment.toStopId,
      Адрес: undefined,
    } as { Наименование?: string; Код?: string; Адрес?: string } | null,
    order: index,
  }));

  const schedule = route.segments.flatMap((segment) => [
    {
      type: 'departure' as const,
      time: segment.departureTime,
      stop: segment.segment.fromStopId,
    },
    {
      type: 'arrival' as const,
      time: segment.arrivalTime,
      stop: segment.segment.toStopId,
    },
  ]);

  const flights = route.segments
    .filter((segment) => segment.selectedFlight)
    .map((segment) => {
      const flight = segment.selectedFlight!;
      return {
        Ref_Key: flight.flightId,
        НомерРейса: flight.flightNumber || 'Без номера',
        ВремяОтправления: flight.departureTime,
        ВремяПрибытия: flight.arrivalTime,
        Статус: flight.status || 'Доступен',
        tariffs: [
          {
            Цена: flight.price || segment.price,
            Наименование: 'Базовый тариф',
            Код: 'BASIC',
          },
        ],
        occupancy: [],
        availableSeats: flight.availableSeats,
      };
    });

  const adaptedRiskAssessment = riskAssessment
    ? {
        riskScore: {
          value: riskAssessment.riskScore.value,
          level: riskAssessment.riskScore.level,
          description: riskAssessment.riskScore.description,
        },
        factors: {
          transferCount: riskAssessment.factors.transferCount,
          historicalDelays: {
            averageDelay90Days: riskAssessment.factors.historicalDelays.averageDelay90Days,
            delayFrequency: riskAssessment.factors.historicalDelays.delayFrequency,
          },
          cancellations: {
            cancellationRate90Days: riskAssessment.factors.cancellations.cancellationRate90Days,
          },
          occupancy: {
            averageOccupancy: riskAssessment.factors.occupancy.averageOccupancy,
          },
        },
        recommendations: riskAssessment.recommendations,
      }
    : undefined;

  return {
    from: {
      Ref_Key: fromCityKey,
      Наименование: route.fromCity,
      Код: fromCityCode,
      Адрес: undefined,
      Координаты: undefined,
    },
    to: {
      Ref_Key: toCityKey,
      Наименование: route.toCity,
      Код: toCityCode,
      Адрес: undefined,
      Координаты: undefined,
    },
    date: route.date,
    routes: [
      {
        route: {
          Ref_Key: route.routeId,
          Наименование: `${route.fromCity} → ${route.toCity}`,
          Код: route.routeId,
          Description: routeDescription,
        },
        segments,
        schedule,
        flights,
      },
    ],
    riskAssessment: adaptedRiskAssessment,
  };
}
