'use client';

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

export function RoutePricing({ flights }: RoutePricingProps) {
  const allTariffs = flights.flatMap((flight) =>
    flight.tariffs.map((tariff) => ({
      ...tariff,
      flightNumber: flight.НомерРейса,
      flightId: flight.Ref_Key,
    }))
  );

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

  const minPrice = Math.min(
    ...allTariffs.map((t) => t.Цена || Infinity).filter((p) => p !== Infinity)
  );
  const maxPrice = Math.max(
    ...allTariffs.map((t) => t.Цена || 0).filter((p) => p > 0)
  );

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
                от {minPrice.toLocaleString('ru-RU')} ₽
              </span>
            )}
            {maxPrice > 0 && maxPrice !== minPrice && (
              <span className="text-xl text-gray-600">
                до {maxPrice.toLocaleString('ru-RU')} ₽
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
                      {tariff.Цена?.toLocaleString('ru-RU') || '—'} ₽
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
}


