'use client';

import { RouteSummary } from './route-summary';
import { RouteSegments } from './route-segments';
import { RouteSchedule } from './route-schedule';
import { RoutePricing } from './route-pricing';
import { RouteAlternatives } from './route-alternatives';
import { RouteRiskAssessment } from './route-risk-assessment';
import { RouteMapWithAlternatives } from '@/modules/routes/features/route-map/ui';
import { OccupancyData } from '@/modules/routes/domain/types';

/**
 * Данные для отображения детальной информации о маршруте
 */
interface RouteDetailsData {
  from: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
    Адрес?: string;
    Координаты?: string;
  };
  to: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
    Адрес?: string;
    Координаты?: string;
  };
  date: string;
  routes: Array<{
    route: {
      Ref_Key: string;
      Наименование?: string;
      Код?: string;
      Description?: string;
    };
    segments: Array<{
      from: {
        Наименование?: string;
        Код?: string;
        Адрес?: string;
      } | null;
      to: {
        Наименование?: string;
        Код?: string;
        Адрес?: string;
      } | null;
      order: number;
    }>;
    schedule: Array<{
      type: 'departure' | 'arrival';
      time: string;
      stop: string;
    }>;
    flights: Array<{
      Ref_Key: string;
      НомерРейса?: string;
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
      Статус?: string;
      tariffs: Array<{
        Цена?: number;
        Наименование?: string;
        Код?: string;
      }>;
      /**
       * Данные о занятости по сегментам рейса
       */
      occupancy: Array<OccupancyData>
      availableSeats: number
    }>;
  }>;
  riskAssessment?: {
    riskScore: {
      value: number;
      level: string;
      description: string;
    };
    factors?: {
      transferCount: number;
      historicalDelays?: {
        averageDelay90Days: number;
        delayFrequency: number;
      };
      cancellations?: {
        cancellationRate90Days: number;
      };
      occupancy?: {
        averageOccupancy: number;
      };
    };
    recommendations?: string[];
  };
}

interface RouteDetailsViewProps {
  data: RouteDetailsData;
}

/**
 * Компонент для отображения детальной информации о маршруте
 * 
 * Отображает полную информацию о выбранном маршруте, включая:
 * - Сводку маршрута (откуда, куда, дата)
 * - Сегменты маршрута
 * - Расписание рейсов
 * - Цены и тарифы
 * - Альтернативные маршруты
 * - Оценку рисков
 * 
 * @param props - Пропсы компонента
 * @param props.data - Данные маршрута для отображения
 * @returns JSX элемент с детальной информацией о маршруте
 */
export function RouteDetailsView({ data }: RouteDetailsViewProps) {
  const primaryRoute = data.routes[0];

  if (!primaryRoute) {
    return (
      <div className="text-center py-2xl">
        <p className="text-md text-secondary">Маршруты не найдены</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <RouteSummary
        from={data.from}
        to={data.to}
        date={data.date}
        route={primaryRoute.route}
      />

      <RouteMapWithAlternatives primaryRouteId={primaryRoute.route.Ref_Key} height="500px" />

      <RouteSegments segments={primaryRoute.segments} />

      <RouteSchedule
        schedule={primaryRoute.schedule}
        flights={primaryRoute.flights}
      />

      <RoutePricing flights={primaryRoute.flights} />

      <RouteAlternatives routes={data.routes} />

      <RouteRiskAssessment
        routeId={primaryRoute.route.Ref_Key}
        riskAssessment={data.riskAssessment}
      />
    </div>
  );
}

