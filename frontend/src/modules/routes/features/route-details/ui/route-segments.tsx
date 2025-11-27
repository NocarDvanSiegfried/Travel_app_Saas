'use client';

/**
 * TODO: Этот компонент использует старый формат данных.
 * Для новых маршрутов SmartRoute используйте SmartRouteSegments.
 * 
 * Этот компонент оставлен для обратной совместимости со старым форматом OData.
 */

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
  
  // Новые поля SmartRoute (если доступны)
  viaHubs?: Array<{ level: 'federal' | 'regional' }>;
  isHub?: boolean;
  hubLevel?: 'federal' | 'regional';
  seasonality?: {
    available: boolean;
    season: string;
  };
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  schedule?: {
    departureTime?: string;
    arrivalTime?: string;
  };
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

  const getTransportTypeLabel = (type?: string): string => {
    if (!type) return '🚌 Транспорт';
    const labels: Record<string, string> = {
      airplane: '✈️ Самолёт',
      bus: '🚌 Автобус',
      train: '🚂 Поезд',
      ferry: '⛴️ Паром',
      taxi: '🚕 Такси',
      winter_road: '❄️ Зимник',
    };
    return labels[type.toLowerCase()] || '🚌 Транспорт';
  };

  const getSeasonLabel = (season?: string): string => {
    if (!season) return '';
    const labels: Record<string, string> = {
      summer: '☀️ Лето',
      winter: '❄️ Зима',
      transition: '🌤️ Переходный',
      all: '✅ Круглый год',
    };
    return labels[season.toLowerCase()] || season;
  };

  const getHubLabel = (level?: 'federal' | 'regional'): string => {
    if (!level) return '';
    return level === 'federal' ? '⭐ Федеральный хаб' : '⭐ Региональный хаб';
  };

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Сегменты маршрута
      </h2>
      
      <div className="space-y-md">
        {segments.map((segment, index) => {
          const departureTime = segment.schedule?.departureTime || segment.departureTime;
          const arrivalTime = segment.schedule?.arrivalTime || segment.arrivalTime;
          
          return (
            <div
              key={index}
              className={`border-l-2 pl-md py-sm ${
                segment.validation && !segment.validation.isValid
                  ? 'border-error'
                  : segment.validation && segment.validation.warnings.length > 0
                  ? 'border-warning'
                  : 'border-primary'
              }`}
            >
              <div className="flex items-start gap-md">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-inverse flex items-center justify-center font-medium">
                  {segment.order + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-sm">
                    <div className="flex items-center gap-sm flex-wrap">
                      <div className="font-medium text-primary">
                        {segment.from?.Наименование || segment.from?.Код || 'Неизвестно'}
                      </div>
                      {segment.isHub && segment.hubLevel && (
                        <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                          {getHubLabel(segment.hubLevel)}
                        </span>
                      )}
                    </div>
                    {departureTime && (
                      <div className="text-sm text-secondary font-mono">
                        {departureTime}
                      </div>
                    )}
                  </div>
                  <div className="text-secondary text-sm mt-sm">
                    {segment.from?.Адрес}
                  </div>
                  
                  <div className="my-sm flex items-center gap-sm">
                    <div className="flex-1 h-px bg-divider"></div>
                    <div className="flex items-center gap-sm flex-wrap">
                      {segment.transportType && (
                        <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                          {getTransportTypeLabel(segment.transportType)}
                        </span>
                      )}
                      {segment.viaHubs && segment.viaHubs.length > 0 && (
                        <span className="text-xs text-secondary">
                          через {segment.viaHubs.length} {segment.viaHubs.length === 1 ? 'хаб' : 'хаба'}
                        </span>
                      )}
                      <span className="text-xs text-tertiary">↓</span>
                    </div>
                    <div className="flex-1 h-px bg-divider"></div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-sm">
                    <div className="flex items-center gap-sm flex-wrap">
                      <div className="font-medium text-primary">
                        {segment.to?.Наименование || segment.to?.Код || 'Неизвестно'}
                      </div>
                      {segment.isHub && segment.hubLevel && (
                        <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                          {getHubLabel(segment.hubLevel)}
                        </span>
                      )}
                    </div>
                    {arrivalTime && (
                      <div className="text-sm text-secondary font-mono">
                        {arrivalTime}
                      </div>
                    )}
                  </div>
                  <div className="text-secondary text-sm mt-sm space-y-xs">
                    <div>
                      {segment.to?.Адрес}
                      {segment.duration && (
                        <span className="ml-sm text-xs">
                          ({Math.floor(segment.duration / 60)}ч {segment.duration % 60}м)
                        </span>
                      )}
                    </div>
                    
                    {/* Сезонность */}
                    {segment.seasonality && (
                      <div className="text-xs">
                        {segment.seasonality.available ? '✅' : '❌'} {getSeasonLabel(segment.seasonality.season)}
                        {segment.seasonality.available ? ' (доступен)' : ' (недоступен)'}
                      </div>
                    )}
                    
                    {/* Валидация */}
                    {segment.validation && (
                      <div className="text-xs">
                        {!segment.validation.isValid && segment.validation.errors.length > 0 && (
                          <div className="text-error">
                            ⚠️ Ошибки: {segment.validation.errors.join(', ')}
                          </div>
                        )}
                        {segment.validation.warnings.length > 0 && (
                          <div className="text-warning">
                            ⚠️ Предупреждения: {segment.validation.warnings.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

