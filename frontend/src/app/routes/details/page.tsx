'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, ErrorBoundary } from '@/shared/ui';
import { RouteDetailsView, RouteDetailsSkeleton, RouteDetailsError } from '@/modules/routes';
import { adaptRouteToDetailsFormat } from '@/modules/routes/lib';
import { IBuiltRoute, IRiskAssessment } from '@/modules/routes/domain';
import { safeLocalStorage } from '@/shared/utils/storage';

interface StoredRouteData {
  route: IBuiltRoute;
  riskAssessment?: IRiskAssessment;
}

/**
 * Компонент содержимого страницы детальной информации о маршруте
 * 
 * Загружает данные маршрута из localStorage и отображает детальную информацию.
 * Использует адаптер для преобразования данных в формат компонента RouteDetailsView.
 * 
 * @returns JSX элемент с детальной информацией о маршруте
 */
function RouteDetailsContent() {
  const searchParams = useSearchParams();
  const [routeData, setRouteData] = useState<ReturnType<typeof adaptRouteToDetailsFormat> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const routeId = searchParams.get('routeId');

  useEffect(() => {
    if (!routeId) {
      setError('Не указан ID маршрута');
      setLoading(false);
      return;
    }

    try {
      const storedData = safeLocalStorage.getItem(`route-${routeId}`);
      if (!storedData) {
        console.error('[RouteDetailsContent] Route not found in localStorage:', {
          routeId,
          storageKey: `route-${routeId}`,
        })
        setError('Маршрут не найден');
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Валидация и безопасный парсинг данных
      let parsedData: StoredRouteData | null = null;
      try {
        parsedData = JSON.parse(storedData);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('[RouteDetailsContent] Failed to parse route data from localStorage:', {
          routeId,
          storageKey: `route-${routeId}`,
          error: parseError,
          errorMessage,
          dataLength: storedData.length,
          dataPreview: storedData.substring(0, 100),
        });
        setError('Данные маршрута повреждены и не могут быть прочитаны');
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Валидация структуры данных
      if (!parsedData || typeof parsedData !== 'object') {
        console.error('[RouteDetailsContent] Invalid route data structure: not an object:', {
          routeId,
          parsedType: typeof parsedData,
        });
        setError('Данные маршрута имеют неверный формат');
        setLoading(false);
        return;
      }
      
      // ФАЗА 6 ФИКС: Проверяем, что route существует и имеет необходимые поля
      if (!parsedData.route || typeof parsedData.route !== 'object') {
        console.error('[RouteDetailsContent] Route data is missing or invalid:', {
          routeId,
          hasRoute: !!parsedData.route,
          routeType: typeof parsedData.route,
        });
        setError('Данные маршрута повреждены');
        setLoading(false);
        return;
      }

      // ФАЗА 6 ФИКС: Убеждаемся, что segments - это массив
      if (!Array.isArray(parsedData.route.segments)) {
        console.warn('[RouteDetailsContent] Route segments is not an array, setting to empty array:', {
          routeId,
          segmentsType: typeof parsedData.route.segments,
        });
        parsedData.route.segments = [];
      }
      
      // ФАЗА 3: КРИТИЧЕСКИЙ ФИКС - Используем routeId из URL как приоритетный
      if (!parsedData.route.routeId) {
        console.warn('[RouteDetailsContent] Route missing routeId, using URL routeId:', {
          routeId,
          route: parsedData.route,
        })
        parsedData.route.routeId = routeId || `route-${Date.now()}`
      } else if (parsedData.route.routeId !== routeId) {
        // Если routeId из данных не совпадает с URL, обновляем данные
        console.warn('[RouteDetailsContent] RouteId mismatch, updating:', {
          urlRouteId: routeId,
          dataRouteId: parsedData.route.routeId,
        })
        parsedData.route.routeId = routeId
      }
      
      // ФАЗА 3: Адаптация данных с fallback
      let adaptedData = adaptRouteToDetailsFormat(
        parsedData.route,
        parsedData.riskAssessment
      );
      
      // КРИТИЧЕСКИЙ ФИКС: Если адаптация вернула null, создаём минимальный формат данных
      if (!adaptedData) {
        console.warn('[RouteDetailsContent] Route adaptation failed, creating fallback:', {
          routeId,
          route: parsedData.route,
        })
        
        // Создаём минимальный формат данных для отображения
        const fromCityCode = parsedData.route.fromCity?.substring(0, 3).toUpperCase() || 'FROM'
        const toCityCode = parsedData.route.toCity?.substring(0, 3).toUpperCase() || 'TO'
        
        adaptedData = {
          from: {
            Ref_Key: `city-${parsedData.route.fromCity || routeId}`,
            Наименование: parsedData.route.fromCity || 'Неизвестно',
            Код: fromCityCode,
            Адрес: undefined,
          },
          to: {
            Ref_Key: `city-${parsedData.route.toCity || routeId}`,
            Наименование: parsedData.route.toCity || 'Неизвестно',
            Код: toCityCode,
            Адрес: undefined,
          },
          date: parsedData.route.date || new Date().toISOString(),
          routes: [{
            route: {
              Ref_Key: routeId,
              Наименование: `${parsedData.route.fromCity || 'От'} → ${parsedData.route.toCity || 'До'}`,
              Код: routeId,
              Description: `Маршрут с ${parsedData.route.transferCount || 0} пересадками`,
            },
            segments: parsedData.route.segments?.map((seg, index) => ({
              from: seg.segment?.fromStopId ? {
                Наименование: seg.segment.fromStopId,
                Код: seg.segment.fromStopId,
                Адрес: undefined,
              } : null,
              to: seg.segment?.toStopId ? {
                Наименование: seg.segment.toStopId,
                Код: seg.segment.toStopId,
                Адрес: undefined,
              } : null,
              order: index,
              transportType: seg.segment?.transportType || 'unknown',
              departureTime: seg.departureTime,
              arrivalTime: seg.arrivalTime,
              duration: seg.duration,
            })) || [],
            schedule: [],
            flights: [],
          }],
        } as any
      }
      
      setRouteData(adaptedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при загрузке маршрута'
      console.error('[RouteDetailsContent] Error loading route:', {
        routeId,
        error: err,
        errorMessage,
      })
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  if (loading) {
    return (
      <div className="bg-background relative">
        <Header />
        <main className="container-main section-spacing-compact relative z-10" aria-label="Детали маршрута">
          <RouteDetailsSkeleton />
        </main>
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div className="bg-background relative">
        <Header />
        <main className="container-main section-spacing-compact relative z-10" aria-label="Детали маршрута">
          <RouteDetailsError error={error || 'Маршрут не найден'} />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background relative">
      <Header />
      <main className="container-main section-spacing-compact relative z-10">
        <RouteDetailsView data={routeData} />
      </main>
    </div>
  );
}

export default function RouteDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background relative">
          <Header />
          <main className="container-main section-spacing-compact relative z-10" aria-label="Детали маршрута">
            <RouteDetailsSkeleton />
          </main>
        </div>
      }
    >
      <ErrorBoundary>
        <RouteDetailsContent />
      </ErrorBoundary>
    </Suspense>
  );
}
