'use client';

import { memo, useMemo } from 'react';
import { formatPrice } from '@/shared/utils/format';

interface Tariff {
  Цена?: number;
  Наименование?: string;
  Код?: string;
}

interface Flight {
  Ref_Key: string;
  НомерРейса?: string;
  tariffs: Tariff[];
}

interface RoutePricingProps {
  flights: Flight[];
}

export const RoutePricing = memo(function RoutePricing({ flights }: RoutePricingProps) {
  const allTariffs = useMemo(
    () =>
      flights.flatMap((flight) =>
        flight.tariffs.map((tariff) => ({
          ...tariff,
          flightNumber: flight.НомерРейса,
          flightId: flight.Ref_Key,
        }))
      ),
    [flights]
  );

  const { minPrice, maxPrice } = useMemo(() => {
    if (allTariffs.length === 0) {
      return { minPrice: Infinity, maxPrice: 0 };
    }
    const prices = allTariffs.map((t) => t.Цена).filter((p): p is number => p !== undefined && p > 0);
    return {
      minPrice: prices.length > 0 ? Math.min(...prices) : Infinity,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    };
  }, [allTariffs]);

  if (allTariffs.length === 0) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Стоимость и тарифы
        </h2>
        <p className="text-secondary">Тарифы не найдены</p>
      </div>
    );
  }

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Стоимость и тарифы
      </h2>
      
      <div className="mb-md p-md rounded-sm bg-primary-light">
        <div className="flex items-center justify-between">
          <span className="text-secondary">Диапазон цен:</span>
          <div className="flex items-center gap-md">
            {minPrice !== Infinity && (
              <span className="text-xl font-medium text-success">
                от {formatPrice(minPrice)}
              </span>
            )}
            {maxPrice > 0 && maxPrice !== minPrice && (
              <span className="text-xl text-secondary">
                до {formatPrice(maxPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-md">
        {flights.map((flight) => (
          <div key={flight.Ref_Key} className="border border-divider rounded-sm p-md">
            <div className="font-medium mb-sm text-primary">
              Рейс {flight.НомерРейса || 'Без номера'}
            </div>
            
            {flight.tariffs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {flight.tariffs.map((tariff, index) => (
                  <div
                    key={index}
                    className="border border-divider rounded-sm p-md transition-fast hover:shadow-sm"
                  >
                    <div className="font-medium mb-sm text-primary">
                      {tariff.Наименование || tariff.Код || 'Тариф'}
                    </div>
                    <div className="text-xl font-medium text-success">
                      {tariff.Цена ? formatPrice(tariff.Цена) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-sm">Тарифы не указаны</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

