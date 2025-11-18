'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { RouteDetailsView } from '@/components/route-details/route-details-view';
import { RouteDetailsSkeleton } from '@/components/route-details/route-details-skeleton';
import { RouteDetailsError } from '@/components/route-details/route-details-error';
import { adaptRouteToDetailsFormat } from '@/shared/utils/route-adapter';
import { IBuiltRoute, IRiskAssessment } from '@/shared/types/route-adapter';

interface StoredRouteData {
  route: IBuiltRoute;
  riskAssessment?: IRiskAssessment;
}

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
      const storedData = localStorage.getItem(`route-${routeId}`);
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
      <div className="min-h-screen yakutia-pattern relative flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
          <RouteDetailsSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div className="min-h-screen yakutia-pattern relative flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
          <RouteDetailsError error={error || 'Маршрут не найден'} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen yakutia-pattern relative flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
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
        <div className="min-h-screen yakutia-pattern relative flex flex-col">
          <Header />
          <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
            <RouteDetailsSkeleton />
          </main>
          <Footer />
        </div>
      }
    >
      <RouteDetailsContent />
    </Suspense>
  );
}
