'use client';

import { memo } from 'react';
import { IRiskScore } from '../domain/types';

interface RouteRiskBadgeProps {
  riskScore: IRiskScore;
  compact?: boolean;
}

export const RouteRiskBadge = memo(function RouteRiskBadge({ riskScore, compact = false }: RouteRiskBadgeProps) {
  const getRiskClass = (score: number) => {
    if (score <= 2) return 'badge-success';
    if (score <= 4) return 'badge-primary';
    if (score <= 6) return 'badge-warning';
    if (score <= 8) return 'badge-warning';
    return 'badge-danger';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return 'Очень низкий';
    if (score <= 4) return 'Низкий';
    if (score <= 6) return 'Средний';
    if (score <= 8) return 'Высокий';
    return 'Очень высокий';
  };

  const riskClass = getRiskClass(riskScore.value);

  if (compact) {
    return (
      <div
        className={`badge ${riskClass}`}
        title={riskScore.description}
      >
        <span className="text-md font-medium">{riskScore.value}</span>
        <span className="text-xs opacity-75">/10</span>
      </div>
    );
  }

  return (
    <div className={`badge ${riskClass} gap-md py-md`}>
      <span className="text-2xl font-medium">{riskScore.value}</span>
      <div>
        <div className="text-sm opacity-75">из 10</div>
        <div className="font-medium">{getRiskLabel(riskScore.value)}</div>
      </div>
      {riskScore.description && (
        <p className="ml-sm text-sm opacity-75">{riskScore.description}</p>
      )}
    </div>
  );
});

