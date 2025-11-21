'use client';

import { memo } from 'react';
import { IRiskScore } from '../domain/types';

interface RouteRiskBadgeProps {
  riskScore: IRiskScore;
  compact?: boolean;
}

export const RouteRiskBadge = memo(function RouteRiskBadge({ riskScore, compact = false }: RouteRiskBadgeProps) {
  const getRiskColor = (score: number) => {
    if (score <= 2) return 'text-green-600 bg-green-50 border-green-200';
    if (score <= 4) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score <= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score <= 8) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return 'Очень низкий';
    if (score <= 4) return 'Низкий';
    if (score <= 6) return 'Средний';
    if (score <= 8) return 'Высокий';
    return 'Очень высокий';
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${getRiskColor(
          riskScore.value
        )}`}
        title={riskScore.description}
      >
        <span className="text-lg font-bold">{riskScore.value}</span>
        <span className="text-xs opacity-75">/10</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-3 rounded-lg border ${getRiskColor(
        riskScore.value
      )}`}
    >
      <span className="text-3xl font-bold">{riskScore.value}</span>
      <div>
        <div className="text-sm opacity-75">из 10</div>
        <div className="font-semibold">{getRiskLabel(riskScore.value)}</div>
      </div>
      {riskScore.description && (
        <p className="ml-2 text-sm opacity-75">{riskScore.description}</p>
      )}
    </div>
  );
});

