'use client';

interface RiskAssessment {
  riskScore: {
    value: number;
    level: string;
    description: string;
  };
  factors?: {
    transferCount: number;
    historicalDelays?: {
      averageDelay90Days: number;
      delayFrequency: number;
    };
    cancellations?: {
      cancellationRate90Days: number;
    };
    occupancy?: {
      averageOccupancy: number;
    };
  };
  recommendations?: string[];
}

interface RouteRiskAssessmentProps {
  routeId?: string;
  riskAssessment?: RiskAssessment;
}

export function RouteRiskAssessment({
  routeId,
  riskAssessment,
}: RouteRiskAssessmentProps) {
  if (!riskAssessment) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Оценка рисков маршрута
        </h2>
        <div className="text-gray-600">
          <p>Оценка рисков находится в разработке.</p>
        </div>
      </div>
    );
  }

  const { riskScore, factors, recommendations } = riskAssessment;

  const getRiskColor = (score: number) => {
    if (score <= 2) return 'text-green-600 bg-green-50';
    if (score <= 4) return 'text-blue-600 bg-blue-50';
    if (score <= 6) return 'text-yellow-600 bg-yellow-50';
    if (score <= 8) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return 'Очень низкий';
    if (score <= 4) return 'Низкий';
    if (score <= 6) return 'Средний';
    if (score <= 8) return 'Высокий';
    return 'Очень высокий';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
        Оценка рисков маршрута
      </h2>

      <div className="mb-6">
        <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-lg ${getRiskColor(riskScore.value)}`}>
          <span className="text-3xl font-bold">{riskScore.value}</span>
          <div>
            <div className="text-sm opacity-75">из 10</div>
            <div className="font-semibold">{getRiskLabel(riskScore.value)}</div>
          </div>
        </div>
        <p className="mt-2 text-gray-600">{riskScore.description}</p>
      </div>

      {factors && (
        <div className="mb-6 space-y-3">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-dark)' }}>
            Факторы риска
          </h3>

          {factors.transferCount !== undefined && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Количество пересадок:</span>
              <span className="font-semibold">{factors.transferCount}</span>
            </div>
          )}

          {factors.historicalDelays && (
            <div className="space-y-2 py-2 border-b">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Средняя задержка (90 дней):</span>
                <span className="font-semibold">
                  {factors.historicalDelays.averageDelay90Days} мин
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Частота задержек:</span>
                <span className="font-semibold">
                  {(factors.historicalDelays.delayFrequency * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {factors.cancellations && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Процент отмен (90 дней):</span>
              <span className="font-semibold">
                {(factors.cancellations.cancellationRate90Days * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {factors.occupancy && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Средняя загруженность:</span>
              <span className="font-semibold">
                {(factors.occupancy.averageOccupancy * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text-dark)' }}>
            Рекомендации
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
