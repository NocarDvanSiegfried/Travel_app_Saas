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
    <div className="card p-5">
      <h1 className="text-2xl font-medium mb-2" style={{ color: 'var(--color-text-heading)' }}>
        Маршрут: {from.Наименование || from.Код} → {to.Наименование || to.Код}
      </h1>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">Дата:</span>
          <span className="text-primary">{formatDate(date, { full: true })}</span>
        </div>
        
        {route.Наименование && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">Маршрут:</span>
            <span className="text-primary">{route.Наименование}</span>
          </div>
        )}

        {route.Description && (
          <div className="text-secondary mt-2">
            {route.Description}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="border-l-4 border-primary pl-4">
            <div className="font-medium text-primary">Отправление</div>
            <div className="text-primary">{from.Наименование || from.Код}</div>
            {from.Адрес && (
              <div className="text-sm text-secondary">{from.Адрес}</div>
            )}
          </div>
          
          <div className="border-l-4 border-accent pl-4">
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

