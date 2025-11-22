'use client';

interface Segment {
  from: {
    Наименование?: string;
    Код?: string;
    Адрес?: string;
  } | null;
  to: {
    Наименование?: string;
    Код?: string;
    Адрес?: string;
  } | null;
  order: number;
  transportType?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: number;
}

interface RouteSegmentsProps {
  segments: Segment[];
}

export function RouteSegments({ segments }: RouteSegmentsProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
          Сегменты маршрута
        </h2>
        <p className="text-secondary">Сегменты маршрута не найдены</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
        Сегменты маршрута
      </h2>
      
      <div className="space-y-3">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="border-l-4 border-primary pl-4 py-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-inverse flex items-center justify-center font-medium">
                {segment.order + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-primary">
                    {segment.from?.Наименование || segment.from?.Код || 'Неизвестно'}
                  </div>
                  {segment.departureTime && (
                    <div className="text-sm text-secondary font-mono">
                      {segment.departureTime}
                    </div>
                  )}
                </div>
                <div className="text-secondary text-sm mt-1">
                  {segment.from?.Адрес}
                </div>
                
                <div className="my-2 flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-divider)' }}></div>
                  <div className="flex items-center gap-2">
                    {segment.transportType && (
                      <span className="text-xs px-2 py-1 rounded-sm" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {segment.transportType === 'airplane' ? '✈️ Самолёт' :
                         segment.transportType === 'bus' ? '🚌 Автобус' :
                         segment.transportType === 'train' ? '🚂 Поезд' :
                         segment.transportType === 'ferry' ? '⛴️ Паром' :
                         segment.transportType === 'taxi' ? '🚕 Такси' :
                         '🚌 Транспорт'}
                      </span>
                    )}
                    <span className="text-xs text-tertiary">↓</span>
                  </div>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-divider)' }}></div>
                </div>
                
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-primary">
                    {segment.to?.Наименование || segment.to?.Код || 'Неизвестно'}
                  </div>
                  {segment.arrivalTime && (
                    <div className="text-sm text-secondary font-mono">
                      {segment.arrivalTime}
                    </div>
                  )}
                </div>
                <div className="text-secondary text-sm mt-1">
                  {segment.to?.Адрес}
                  {segment.duration && (
                    <span className="ml-2 text-xs">
                      ({Math.floor(segment.duration / 60)}ч {segment.duration % 60}м)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

