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

export function RouteSchedule({ schedule, flights }: RouteScheduleProps) {
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '—';
    try {
      const time = timeStr.split('T')[1]?.split('.')[0] || timeStr;
      return time.substring(0, 5);
    } catch {
      return timeStr;
    }
  };

  if (!flights || flights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Расписание рейсов
        </h2>
        <p className="text-gray-600">Нет доступных рейсов на выбранную дату</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
        Расписание рейсов
      </h2>
      
      <div className="space-y-3">
        {flights.map((flight) => (
          <div
            key={flight.Ref_Key}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-bold text-lg">
                    {flight.НомерРейса || 'Без номера'}
                  </span>
                  {flight.Статус && (
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        flight.Статус === 'Отправлен'
                          ? 'bg-green-100 text-green-800'
                          : flight.Статус === 'Задержан'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {flight.Статус}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">Отправление:</span>
                    <span className="ml-2 font-semibold">
                      {formatTime(flight.ВремяОтправления)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Прибытие:</span>
                    <span className="ml-2 font-semibold">
                      {formatTime(flight.ВремяПрибытия)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Свободных мест:</span>
                    <span className="ml-2 font-semibold">
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


