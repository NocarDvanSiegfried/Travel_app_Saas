'use client';

import { formatPrice } from '@/shared/utils/format';

interface Route {
  route: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
  };
  flights: Array<{
    Ref_Key: string;
    ВремяОтправления?: string;
    ВремяПрибытия?: string;
    tariffs: Array<{ Цена?: number }>;
  }>;
}

interface RouteAlternativesProps {
  routes: Route[];
}

export function RouteAlternatives({ routes }: RouteAlternativesProps) {
  if (!routes || routes.length <= 1) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Альтернативные варианты
        </h2>
        <p className="text-secondary">Альтернативные маршруты не найдены</p>
      </div>
    );
  }

  const calculateDuration = (departure?: string, arrival?: string) => {
    if (!departure || !arrival) return null;
    try {
      const dep = new Date(departure);
      const arr = new Date(arrival);
      const diff = arr.getTime() - dep.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return { hours, minutes };
    } catch {
      return null;
    }
  };

  const getMinPrice = (flights: Route['flights']) => {
    const prices = flights.flatMap((f) =>
      f.tariffs.map((t) => t.Цена || Infinity)
    );
    return Math.min(...prices.filter((p) => p !== Infinity));
  };

  const alternatives = routes.slice(1).map((route) => {
    const firstFlight = route.flights[0];
    const duration = calculateDuration(
      firstFlight?.ВремяОтправления,
      firstFlight?.ВремяПрибытия
    );
    const price = getMinPrice(route.flights);

    return {
      route,
      duration,
      price,
    };
  });

  const fastest = alternatives
    .filter((a) => a.duration)
    .sort((a, b) => {
      if (!a.duration || !b.duration) return 0;
      return (
        a.duration.hours * 60 +
        a.duration.minutes -
        (b.duration.hours * 60 + b.duration.minutes)
      );
    })[0];

  const cheapest = alternatives
    .filter((a) => a.price !== Infinity)
    .sort((a, b) => a.price - b.price)[0];

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Альтернативные варианты
      </h2>
      
      <div className="space-y-md">
        {fastest && (
          <div className="border-l-primary pl-md py-sm rounded-sm bg-primary-light">
            <div className="font-medium mb-sm text-primary">
              ⚡ Быстрее
            </div>
            <div className="text-sm text-primary">
              {fastest.route.route.Наименование || fastest.route.route.Код}
            </div>
            {fastest.duration && (
              <div className="text-sm text-secondary">
                Время в пути: {fastest.duration.hours}ч {fastest.duration.minutes}м
              </div>
            )}
          </div>
        )}

        {cheapest && (
          <div className="border-l-accent pl-md py-sm rounded-sm bg-accent-light">
            <div className="font-medium mb-sm text-accent">
              💰 Дешевле
            </div>
            <div className="text-sm text-primary">
              {cheapest.route.route.Наименование || cheapest.route.route.Код}
            </div>
            {cheapest.price !== Infinity && (
              <div className="text-sm text-secondary">
                Цена: от {formatPrice(cheapest.price)}
              </div>
            )}
          </div>
        )}

        {alternatives.length > 2 && (
          <div className="text-sm text-secondary mt-md">
            Всего альтернативных маршрутов: {alternatives.length}
          </div>
        )}
      </div>
    </div>
  );
}

