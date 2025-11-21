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
}

interface RouteSegmentsProps {
  segments: Segment[];
}

export function RouteSegments({ segments }: RouteSegmentsProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Сегменты маршрута
        </h2>
        <p className="text-gray-600">Сегменты маршрута не найдены</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
        Сегменты маршрута
      </h2>
      
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="border-l-4 border-blue-500 pl-4 py-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                {segment.order + 1}
              </div>
              
              <div className="flex-1">
                <div className="font-semibold">
                  {segment.from?.Наименование || segment.from?.Код || 'Неизвестно'}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  {segment.from?.Адрес}
                </div>
                
                <div className="my-2 flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs text-gray-500">↓</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                
                <div className="font-semibold">
                  {segment.to?.Наименование || segment.to?.Код || 'Неизвестно'}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  {segment.to?.Адрес}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

