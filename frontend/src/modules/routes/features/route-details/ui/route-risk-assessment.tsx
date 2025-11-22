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
  routeId: _routeId,
  riskAssessment,
}: RouteRiskAssessmentProps) {
  if (!riskAssessment) {
    return (
      <div className="card p-5">
        <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
          Оценка рисков маршрута
        </h2>
        <div className="text-secondary">
          <p>Оценка рисков находится в разработке.</p>
        </div>
      </div>
    );
  }

  const { riskScore, factors, recommendations } = riskAssessment;

  const getRiskColor = (score: number) => {
    if (score <= 2) return { color: 'var(--color-success)', bg: 'var(--color-success)' };
    if (score <= 4) return { color: 'var(--color-info)', bg: 'var(--color-info)' };
    if (score <= 6) return { color: 'var(--color-warning)', bg: 'var(--color-warning)' };
    if (score <= 8) return { color: 'var(--color-warning)', bg: 'var(--color-warning)' };
    return { color: 'var(--color-error)', bg: 'var(--color-error)' };
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return 'Очень низкий';
    if (score <= 4) return 'Низкий';
    if (score <= 6) return 'Средний';
    if (score <= 8) return 'Высокий';
    return 'Очень высокий';
  };

  const riskColor = getRiskColor(riskScore.value);

  return (
    <div className="card p-5">
      <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
        Оценка рисков маршрута
      </h2>

      <div className="mb-6">
        <div 
          className="inline-flex items-center gap-3 px-4 py-3 rounded-sm"
          style={{ 
            color: riskColor.color,
            backgroundColor: riskColor.bg,
            opacity: 0.15,
          }}
        >
          <span className="text-2xl font-medium" style={{ color: riskColor.color, opacity: 1 }}>{riskScore.value}</span>
          <div>
            <div className="text-sm opacity-75" style={{ color: riskColor.color, opacity: 1 }}>из 10</div>
            <div className="font-medium" style={{ color: riskColor.color, opacity: 1 }}>{getRiskLabel(riskScore.value)}</div>
          </div>
        </div>
        <p className="mt-2 text-secondary">{riskScore.description}</p>
      </div>

      {factors && (
        <div className="mb-6 space-y-3">
          <h3 className="font-medium text-lg text-primary">
            Факторы риска
          </h3>

          {factors.transferCount !== undefined && (
            <div className="flex justify-between items-center py-2 border-b border-divider">
              <span className="text-secondary">Количество пересадок:</span>
              <span className="font-medium text-primary">{factors.transferCount}</span>
            </div>
          )}

          {factors.historicalDelays && (
            <div className="space-y-2 py-2 border-b border-divider">
              <div className="flex justify-between items-center">
                <span className="text-secondary">Средняя задержка (90 дней):</span>
                <span className="font-medium text-primary">
                  {factors.historicalDelays.averageDelay90Days} мин
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary">Частота задержек:</span>
                <span className="font-medium text-primary">
                  {(factors.historicalDelays.delayFrequency * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {factors.cancellations && (
            <div className="flex justify-between items-center py-2 border-b border-divider">
              <span className="text-secondary">Процент отмен (90 дней):</span>
              <span className="font-medium text-primary">
                {(factors.cancellations.cancellationRate90Days * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {factors.occupancy && (
            <div className="flex justify-between items-center py-2 border-b border-divider">
              <span className="text-secondary">Средняя загруженность:</span>
              <span className="font-medium text-primary">
                {(factors.occupancy.averageOccupancy * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div>
          <h3 className="font-medium text-lg mb-3 text-primary">
            Рекомендации
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-primary">
                <span className="text-primary mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

