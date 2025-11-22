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
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Расписание рейсов
        </h2>
        <p className="text-secondary">Нет доступных рейсов на выбранную дату</p>
      </div>
    );
  }

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Расписание рейсов
      </h2>
      
      <div className="space-y-md">
        {flights.map((flight) => (
          <div
            key={flight.Ref_Key}
            className="border border-divider rounded-sm p-md transition-fast hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-md mb-sm">
                  <span className="font-medium text-md text-primary">
                    {flight.НомерРейса || 'Без номера'}
                  </span>
                  {flight.Статус && (
                    <span
                      className={`px-sm py-xs rounded-sm text-xs ${
                        flight.Статус === 'Отправлен'
                          ? 'bg-success-light text-success'
                          : flight.Статус === 'Задержан'
                          ? 'bg-warning-light text-warning'
                          : 'bg-background-subtle text-secondary'
                      }`}
                    >
                      {flight.Статус}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-lg text-sm">
                  <div>
                    <span className="text-secondary">Отправление:</span>
                    <span className="ml-sm font-medium text-primary">
                      {formatTime(flight.ВремяОтправления)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-secondary">Прибытие:</span>
                    <span className="ml-sm font-medium text-primary">
                      {formatTime(flight.ВремяПрибытия)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-secondary">Свободных мест:</span>
                    <span className="ml-sm font-medium text-primary">
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

