'use client';

import { memo } from 'react';
import { IRiskScore } from '../domain/types';

interface RouteRiskBadgeProps {
  riskScore: IRiskScore;
  compact?: boolean;
}

export const RouteRiskBadge = memo(function RouteRiskBadge({ riskScore, compact = false }: RouteRiskBadgeProps) {
  const getRiskColor = (score: number) => {
    if (score <= 2) return { color: 'var(--color-success)', bg: 'var(--color-success)', border: 'var(--color-success)' };
    if (score <= 4) return { color: 'var(--color-info)', bg: 'var(--color-info)', border: 'var(--color-info)' };
    if (score <= 6) return { color: 'var(--color-warning)', bg: 'var(--color-warning)', border: 'var(--color-warning)' };
    if (score <= 8) return { color: 'var(--color-warning)', bg: 'var(--color-warning)', border: 'var(--color-warning)' };
    return { color: 'var(--color-error)', bg: 'var(--color-error)', border: 'var(--color-error)' };
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return 'Очень низкий';
    if (score <= 4) return 'Низкий';
    if (score <= 6) return 'Средний';
    if (score <= 8) return 'Высокий';
    return 'Очень высокий';
  };

  const riskColor = getRiskColor(riskScore.value);

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border"
        style={{
          color: riskColor.color,
          backgroundColor: riskColor.bg,
          borderColor: riskColor.border,
          opacity: 0.15,
        }}
        title={riskScore.description}
      >
        <span className="text-base font-medium" style={{ color: riskColor.color, opacity: 1 }}>{riskScore.value}</span>
        <span className="text-xs" style={{ color: riskColor.color, opacity: 0.75 }}>/10</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-3 px-4 py-3 rounded-sm border"
      style={{
        color: riskColor.color,
        backgroundColor: riskColor.bg,
        borderColor: riskColor.border,
        opacity: 0.15,
      }}
    >
      <span className="text-2xl font-medium" style={{ color: riskColor.color, opacity: 1 }}>{riskScore.value}</span>
      <div>
        <div className="text-sm" style={{ color: riskColor.color, opacity: 0.75 }}>из 10</div>
        <div className="font-medium" style={{ color: riskColor.color, opacity: 1 }}>{getRiskLabel(riskScore.value)}</div>
      </div>
      {riskScore.description && (
        <p className="ml-2 text-sm" style={{ color: riskColor.color, opacity: 0.75 }}>{riskScore.description}</p>
      )}
    </div>
  );
});

