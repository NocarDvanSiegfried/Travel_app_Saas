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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Стоимость и тарифы
        </h2>
        <p className="text-gray-600">Тарифы не найдены</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
        Стоимость и тарифы
      </h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Диапазон цен:</span>
          <div className="flex items-center gap-4">
            {minPrice !== Infinity && (
              <span className="text-2xl font-bold text-green-600">
                от {formatPrice(minPrice)}
              </span>
            )}
            {maxPrice > 0 && maxPrice !== minPrice && (
              <span className="text-xl text-gray-600">
                до {formatPrice(maxPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {flights.map((flight) => (
          <div key={flight.Ref_Key} className="border rounded-lg p-4">
            <div className="font-semibold mb-2">
              Рейс {flight.НомерРейса || 'Без номера'}
            </div>
            
            {flight.tariffs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {flight.tariffs.map((tariff, index) => (
                  <div
                    key={index}
                    className="border rounded p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="font-semibold mb-1">
                      {tariff.Наименование || tariff.Код || 'Тариф'}
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {tariff.Цена ? formatPrice(tariff.Цена) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Тарифы не указаны</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

