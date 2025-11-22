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
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Сегменты маршрута
        </h2>
        <p className="text-secondary">Сегменты маршрута не найдены</p>
      </div>
    );
  }

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Сегменты маршрута
      </h2>
      
      <div className="space-y-md">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="border-l-primary pl-md py-sm"
          >
            <div className="flex items-start gap-md">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-inverse flex items-center justify-center font-medium">
                {segment.order + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-sm">
                  <div className="font-medium text-primary">
                    {segment.from?.Наименование || segment.from?.Код || 'Неизвестно'}
                  </div>
                  {segment.departureTime && (
                    <div className="text-sm text-secondary font-mono">
                      {segment.departureTime}
                    </div>
                  )}
                </div>
                <div className="text-secondary text-sm mt-sm">
                  {segment.from?.Адрес}
                </div>
                
                <div className="my-sm flex items-center gap-sm">
                  <div className="flex-1 h-px bg-divider"></div>
                  <div className="flex items-center gap-sm">
                    {segment.transportType && (
                      <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
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
                  <div className="flex-1 h-px bg-divider"></div>
                </div>
                
                <div className="flex items-center justify-between mb-sm">
                  <div className="font-medium text-primary">
                    {segment.to?.Наименование || segment.to?.Код || 'Неизвестно'}
                  </div>
                  {segment.arrivalTime && (
                    <div className="text-sm text-secondary font-mono">
                      {segment.arrivalTime}
                    </div>
                  )}
                </div>
                <div className="text-secondary text-sm mt-sm">
                  {segment.to?.Адрес}
                  {segment.duration && (
                    <span className="ml-sm text-xs">
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

