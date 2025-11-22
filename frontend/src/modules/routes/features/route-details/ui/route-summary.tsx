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
    <div className="card p-lg">
      <h1 className="text-2xl font-medium mb-sm text-heading">
        Маршрут: {from.Наименование || from.Код} → {to.Наименование || to.Код}
      </h1>
      
      <div className="space-y-sm">
        <div className="flex items-center gap-sm">
          <span className="font-medium text-primary">Дата:</span>
          <span className="text-primary">{formatDate(date, { full: true })}</span>
        </div>
        
        {route.Наименование && (
          <div className="flex items-center gap-sm">
            <span className="font-medium text-primary">Маршрут:</span>
            <span className="text-primary">{route.Наименование}</span>
          </div>
        )}

        {route.Description && (
          <div className="text-secondary mt-sm">
            {route.Description}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-md">
          <div className="border-l-primary pl-md">
            <div className="font-medium text-primary">Отправление</div>
            <div className="text-primary">{from.Наименование || from.Код}</div>
            {from.Адрес && (
              <div className="text-sm text-secondary">{from.Адрес}</div>
            )}
          </div>
          
          <div className="border-l-accent pl-md">
            <div className="font-medium text-primary">Прибытие</div>
            <div className="text-primary">{to.Наименование || to.Код}</div>
            {to.Адрес && (
              <div className="text-sm text-secondary">{to.Адрес}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

