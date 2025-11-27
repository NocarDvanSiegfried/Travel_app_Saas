'use client';

import { useState, useEffect } from 'react';
import { safeLocalStorage } from '@/shared/utils/storage';

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
  // ФАЗА 4: Пытаемся загрузить riskAssessment из localStorage, если он не передан
  const [loadedRiskAssessment, setLoadedRiskAssessment] = useState(riskAssessment);
  const [loadingRisk, setLoadingRisk] = useState(!riskAssessment && !!_routeId);
  
  useEffect(() => {
    if (!riskAssessment && _routeId) {
      // Пытаемся загрузить из localStorage
      try {
        const routeData = safeLocalStorage.getItem(`route-${_routeId}`);
        if (routeData) {
          const parsed = JSON.parse(routeData);
          if (parsed.riskAssessment) {
            setLoadedRiskAssessment(parsed.riskAssessment);
            setLoadingRisk(false);
            return;
          }
        }
        
        // Если в localStorage нет, можно загрузить из API (закомментировано, т.к. API может быть не готов)
        // fetch(`/api/v1/risk-assessment/${_routeId}`)
        //   .then(res => res.json())
        //   .then(data => {
        //     if (data.riskAssessment) {
        //       setLoadedRiskAssessment(data.riskAssessment);
        //     }
        //   })
        //   .catch(err => {
        //     console.error('[RouteRiskAssessment] Error loading risk assessment:', err);
        //   })
        //   .finally(() => {
        //     setLoadingRisk(false);
        //   });
      } catch (err) {
        console.error('[RouteRiskAssessment] Error loading risk assessment:', err);
      } finally {
        setLoadingRisk(false);
      }
    }
  }, [riskAssessment, _routeId]);
  
  const finalRiskAssessment = riskAssessment || loadedRiskAssessment;
  
  if (loadingRisk) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Оценка рисков маршрута
        </h2>
        <div className="text-secondary">
          <p>Загрузка оценки рисков...</p>
        </div>
      </div>
    );
  }
  
  if (!finalRiskAssessment) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Оценка рисков маршрута
        </h2>
        <div className="text-secondary">
          <p>Оценка рисков находится в разработке.</p>
        </div>
      </div>
    );
  }

  const { riskScore, factors, recommendations } = finalRiskAssessment;

  const getRiskClass = (score: number) => {
    if (score <= 2) return 'risk-badge-success';
    if (score <= 4) return 'risk-badge-info';
    if (score <= 6) return 'risk-badge-warning';
    if (score <= 8) return 'risk-badge-warning';
    return 'risk-badge-error';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return 'Очень низкий';
    if (score <= 4) return 'Низкий';
    if (score <= 6) return 'Средний';
    if (score <= 8) return 'Высокий';
    return 'Очень высокий';
  };

  const riskClass = getRiskClass(riskScore.value);

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Оценка рисков маршрута
      </h2>

      <div className="mb-lg">
        <div className={`inline-flex items-center gap-md px-md py-md rounded-sm border ${riskClass}`}>
          <span className="text-2xl font-medium">{riskScore.value}</span>
          <div>
            <div className="text-sm opacity-75">из 10</div>
            <div className="font-medium">{getRiskLabel(riskScore.value)}</div>
          </div>
        </div>
        <p className="mt-sm text-secondary">{riskScore.description}</p>
      </div>

      {factors && (
        <div className="mb-lg space-y-md">
          <h3 className="font-medium text-lg text-primary">
            Факторы риска
          </h3>

          {factors.transferCount !== undefined && (
            <div className="flex justify-between items-center py-sm border-b border-divider">
              <span className="text-secondary">Количество пересадок:</span>
              <span className="font-medium text-primary">{factors.transferCount}</span>
            </div>
          )}

          {factors.historicalDelays && (
            <div className="space-y-sm py-sm border-b border-divider">
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
            <div className="flex justify-between items-center py-sm border-b border-divider">
              <span className="text-secondary">Процент отмен (90 дней):</span>
              <span className="font-medium text-primary">
                {(factors.cancellations.cancellationRate90Days * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {factors.occupancy && (
            <div className="flex justify-between items-center py-sm border-b border-divider">
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
          <h3 className="font-medium text-lg mb-md text-primary">
            Рекомендации
          </h3>
          <ul className="space-y-sm">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-sm text-primary">
                <span className="text-primary mt-sm">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

