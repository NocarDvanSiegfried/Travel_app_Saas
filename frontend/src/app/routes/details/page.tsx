'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, Footer, ErrorBoundary } from '@/shared/ui';
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
        setError('Маршрут не найден');
        setLoading(false);
        return;
      }

      const parsedData: StoredRouteData = JSON.parse(storedData);
      const adaptedData = adaptRouteToDetailsFormat(
        parsedData.route,
        parsedData.riskAssessment
      );
      setRouteData(adaptedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке маршрута');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative flex flex-col">
        <Header />
        <main className="container-main section-spacing-compact relative z-10 flex-1" aria-label="Детали маршрута">
          <RouteDetailsSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div className="min-h-screen bg-background relative flex flex-col">
        <Header />
        <main className="container-main section-spacing-compact relative z-10 flex-1" aria-label="Детали маршрута">
          <RouteDetailsError error={error || 'Маршрут не найден'} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <Header />
      <main className="container-main section-spacing-compact relative z-10 flex-1">
        <RouteDetailsView data={routeData} />
      </main>
      <Footer />
    </div>
  );
}

export default function RouteDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background relative flex flex-col">
          <Header />
          <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1" aria-label="Детали маршрута">
            <RouteDetailsSkeleton />
          </main>
          <Footer />
        </div>
      }
    >
      <ErrorBoundary>
        <RouteDetailsContent />
      </ErrorBoundary>
    </Suspense>
  );
}
