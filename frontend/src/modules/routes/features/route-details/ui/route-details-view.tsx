'use client';

import { RouteSummary } from './route-summary';
import { RouteSegments } from './route-segments';
import { SmartRouteSegments } from './smart-route-segments';
import { RouteValidation } from './route-validation';
import { RouteSchedule } from './route-schedule';
import { RoutePricing } from './route-pricing';
import { RouteAlternatives } from './route-alternatives';
import { RouteRiskAssessment } from './route-risk-assessment';
import { RouteMapWithAlternatives } from '@/modules/routes/features/route-map/ui';
import { OccupancyData } from '@/modules/routes/domain/types';

/**
 * Данные для отображения детальной информации о маршруте
 * 
 * Поддерживает как старый формат OData, так и новый формат SmartRoute
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
  
  // Новые поля SmartRoute
  smartRouteSegments?: Array<{
    segmentId: string;
    type: string;
    from: {
      id: string;
      name: string;
      type: string;
      isHub?: boolean;
      hubLevel?: 'federal' | 'regional';
    };
    to: {
      id: string;
      name: string;
      type: string;
      isHub?: boolean;
      hubLevel?: 'federal' | 'regional';
    };
    distance: {
      value: number;
      unit: string;
    };
    duration: {
      value: number;
      unit: string;
      display: string;
    };
    price: {
      base: number;
      total: number;
      currency: string;
    };
    isDirect?: boolean;
    viaHubs?: Array<{
      level: 'federal' | 'regional';
    }>;
    schedule?: {
      departureTime?: string;
      arrivalTime?: string;
    };
    seasonality?: {
      available: boolean;
      season: string;
      period?: {
        start: string;
        end: string;
      };
    };
    validation?: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  }>;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    segmentValidations?: Array<{
      segmentId: string;
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>;
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

  // Определяем, используем ли мы новый формат SmartRoute
  const isSmartRoute = Boolean(data.smartRouteSegments && data.smartRouteSegments.length > 0);

  // ФАЗА 4: КРИТИЧЕСКИЙ ФИКС - Получаем routeId с множественными fallback
  // adaptRouteToDetailsFormat создаёт Ref_Key из route.routeId (строка 356 в route-adapter.ts)
  // Но маршрут сохранён в localStorage с ключом route-${route.routeId}
  // Поэтому используем primaryRoute.route.Ref_Key, который равен route.routeId
  // Или получаем routeId из data, если он там есть
  const routeId = 
    primaryRoute.route.Ref_Key || 
    primaryRoute.route.Код || 
    (data as any)?.routeId ||
    (data as any)?.primaryRoute?.route?.Ref_Key ||
    (data as any)?.primaryRoute?.route?.Код ||
    `route-${Date.now()}`; // Fallback
  
  if (!routeId) {
    console.error('[RouteDetailsView] Cannot determine routeId:', {
      primaryRoute,
      data,
    });
    return (
      <div className="card p-lg">
        <div className="text-error">
          Ошибка: не удалось определить ID маршрута
        </div>
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

      <RouteMapWithAlternatives primaryRouteId={routeId} height="500px" providerType="leaflet" />

      {/* Валидация маршрута (только для SmartRoute) */}
      {isSmartRoute && data.validation && (
        <RouteValidation validation={data.validation} />
      )}

      {/* Сегменты маршрута */}
      {isSmartRoute && data.smartRouteSegments ? (
        <SmartRouteSegments segments={data.smartRouteSegments} showValidation={true} />
      ) : (
        <RouteSegments segments={primaryRoute.segments} />
      )}

      <RouteSchedule
        schedule={primaryRoute.schedule}
        flights={primaryRoute.flights}
      />

      <RoutePricing flights={primaryRoute.flights} />

      <RouteAlternatives routes={data.routes} routeId={routeId} />

      <RouteRiskAssessment
        routeId={routeId}
        riskAssessment={data.riskAssessment}
      />
    </div>
  );
}

