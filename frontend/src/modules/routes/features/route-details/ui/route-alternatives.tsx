'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '@/shared/utils/format';
import { safeLocalStorage } from '@/shared/utils/storage';
import type { IBuiltRoute } from '@/modules/routes/domain';

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
  routeId?: string; // Добавляем routeId для загрузки альтернатив
}

export function RouteAlternatives({ routes, routeId }: RouteAlternativesProps) {
  // ФАЗА 4: Загружаем альтернативы из localStorage или API, если routes пуст
  const [loadedAlternatives, setLoadedAlternatives] = useState<Route[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  
  useEffect(() => {
    if ((!routes || routes.length <= 1) && routeId) {
      setLoadingAlternatives(true);
      
      // Пытаемся загрузить альтернативы из localStorage
      try {
        const alternativesKey = `route-${routeId}-alternatives`;
        const alternativesData = safeLocalStorage.getItem(alternativesKey);
        
        if (alternativesData) {
          try {
            const parsed = JSON.parse(alternativesData);
            if (parsed.routes && Array.isArray(parsed.routes)) {
              // Преобразуем IBuiltRoute в Route формат
              const convertedRoutes: Route[] = parsed.routes.map((altRoute: IBuiltRoute) => ({
                route: {
                  Ref_Key: altRoute.routeId || `route-${Date.now()}`,
                  Наименование: `${altRoute.fromCity} → ${altRoute.toCity}`,
                  Код: altRoute.routeId || '',
                },
                flights: altRoute.segments?.map(seg => ({
                  Ref_Key: seg.segment?.segmentId || `flight-${Date.now()}`,
                  НомерРейса: seg.segment?.transportType || 'UNKNOWN',
                  ВремяОтправления: seg.departureTime,
                  ВремяПрибытия: seg.arrivalTime,
                  tariffs: [{
                    Цена: seg.price || 0,
                  }],
                })) || [],
              }));
              setLoadedAlternatives(convertedRoutes);
              setLoadingAlternatives(false);
              return;
            }
          } catch (parseError) {
            console.error('[RouteAlternatives] Error parsing alternatives:', parseError);
          }
        }
        
        // Если в localStorage нет, можно загрузить из API (закомментировано)
        // fetch(`/api/v1/routes/alternatives/${routeId}`)
        //   .then(res => res.json())
        //   .then(data => {
        //     if (data.routes && Array.isArray(data.routes)) {
        //       setLoadedAlternatives(data.routes);
        //     }
        //   })
        //   .catch(err => {
        //     console.error('[RouteAlternatives] Error loading alternatives:', err);
        //   })
        //   .finally(() => {
        //     setLoadingAlternatives(false);
        //   });
      } catch (err) {
        console.error('[RouteAlternatives] Error loading alternatives:', err);
      } finally {
        setLoadingAlternatives(false);
      }
    }
  }, [routes, routeId]);
  
  // Используем переданные routes или загруженные альтернативы
  const finalRoutes = (routes && routes.length > 1) ? routes : loadedAlternatives;
  
  if (loadingAlternatives) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Альтернативные варианты
        </h2>
        <p className="text-secondary">Загрузка альтернативных маршрутов...</p>
      </div>
    );
  }
  
  if (!finalRoutes || finalRoutes.length <= 1) {
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

  const alternatives = finalRoutes.slice(1).map((route) => {
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

