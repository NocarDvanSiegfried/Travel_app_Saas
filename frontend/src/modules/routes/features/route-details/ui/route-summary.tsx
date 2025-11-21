'use client';

import { memo } from 'react';
import { formatDate } from '@/shared/utils/format';

interface RouteSummaryProps {
  from: {
    Наименование?: string;
    Код?: string;
    Адрес?: string;
  };
  to: {
    Наименование?: string;
    Код?: string;
    Адрес?: string;
  };
  date: string;
  route: {
    Наименование?: string;
    Description?: string;
  };
}

export const RouteSummary = memo(function RouteSummary({ from, to, date, route }: RouteSummaryProps) {

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
        Маршрут: {from.Наименование || from.Код} → {to.Наименование || to.Код}
      </h1>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Дата:</span>
          <span>{formatDate(date, { full: true })}</span>
        </div>
        
        {route.Наименование && (
          <div className="flex items-center gap-2">
            <span className="font-semibold">Маршрут:</span>
            <span>{route.Наименование}</span>
          </div>
        )}

        {route.Description && (
          <div className="text-gray-600 mt-2">
            {route.Description}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="font-semibold">Отправление</div>
            <div>{from.Наименование || from.Код}</div>
            {from.Адрес && (
              <div className="text-sm text-gray-600">{from.Адрес}</div>
            )}
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <div className="font-semibold">Прибытие</div>
            <div>{to.Наименование || to.Код}</div>
            {to.Адрес && (
              <div className="text-sm text-gray-600">{to.Адрес}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

