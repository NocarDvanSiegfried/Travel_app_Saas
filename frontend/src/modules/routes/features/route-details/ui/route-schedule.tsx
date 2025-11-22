'use client';

interface Flight {
  Ref_Key: string;
  НомерРейса?: string;
  ВремяОтправления?: string;
  ВремяПрибытия?: string;
  Статус?: string;
  availableSeats: number;
}

interface ScheduleEvent {
  type: 'departure' | 'arrival';
  time: string;
  stop: string;
}

interface RouteScheduleProps {
  schedule: ScheduleEvent[];
  flights: Flight[];
}

import { formatTime } from '@/shared/utils/format';

export function RouteSchedule({ schedule: _schedule, flights }: RouteScheduleProps) {

  if (!flights || flights.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
          Расписание рейсов
        </h2>
        <p className="text-secondary">Нет доступных рейсов на выбранную дату</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
        Расписание рейсов
      </h2>
      
      <div className="space-y-3">
        {flights.map((flight) => (
          <div
            key={flight.Ref_Key}
            className="border border-divider rounded-sm p-4 hover:shadow-sm transition-fast"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-medium text-base text-primary">
                    {flight.НомерРейса || 'Без номера'}
                  </span>
                  {flight.Статус && (
                    <span
                      className="px-2 py-1 rounded-sm text-xs"
                      style={{
                        backgroundColor: flight.Статус === 'Отправлен'
                          ? 'var(--color-success)'
                          : flight.Статус === 'Задержан'
                          ? 'var(--color-warning)'
                          : 'var(--color-background-subtle)',
                        color: flight.Статус === 'Отправлен'
                          ? 'var(--color-success)'
                          : flight.Статус === 'Задержан'
                          ? 'var(--color-warning)'
                          : 'var(--color-text-secondary)',
                        opacity: flight.Статус === 'Отправлен' || flight.Статус === 'Задержан' ? 0.15 : 1,
                      }}
                    >
                      {flight.Статус}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-secondary">Отправление:</span>
                    <span className="ml-2 font-medium text-primary">
                      {formatTime(flight.ВремяОтправления)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-secondary">Прибытие:</span>
                    <span className="ml-2 font-medium text-primary">
                      {formatTime(flight.ВремяПрибытия)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-secondary">Свободных мест:</span>
                    <span className="ml-2 font-medium text-primary">
                      {flight.availableSeats}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

