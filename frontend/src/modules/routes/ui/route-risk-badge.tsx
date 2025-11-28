'use client';

import { memo } from 'react';
import { IRiskScore } from '../domain/types';

interface RouteRiskBadgeProps {
  riskScore: IRiskScore;
  compact?: boolean;
}

import { RiskLevel } from '../domain/types';

export const RouteRiskBadge = memo(function RouteRiskBadge({ riskScore, compact = false }: RouteRiskBadgeProps) {
  const getRiskClass = (level: RiskLevel | string) => {
    switch (level) {
      case RiskLevel.VERY_LOW:
      case 'very_low':
        return 'badge risk-badge-success badge-risk-very-low';
      case RiskLevel.LOW:
      case 'low':
        return 'badge risk-badge-info badge-risk-low';
      case RiskLevel.MEDIUM:
      case 'medium':
        return 'badge risk-badge-warning badge-risk-medium';
      case RiskLevel.HIGH:
      case 'high':
        return 'badge risk-badge-warning-high badge-risk-high';
      case RiskLevel.VERY_HIGH:
      case 'very_high':
        return 'badge risk-badge-error badge-risk-very-high';
      default:
        // Fallback на основе значения, если level не определен
        if (riskScore.value <= 2) return 'badge risk-badge-success badge-risk-very-low';
        if (riskScore.value <= 4) return 'badge risk-badge-info badge-risk-low';
        if (riskScore.value <= 6) return 'badge risk-badge-warning badge-risk-medium';
        if (riskScore.value <= 8) return 'badge risk-badge-warning-high badge-risk-high';
        return 'badge risk-badge-error badge-risk-very-high';
    }
  };

  const getRiskLabel = (level: RiskLevel | string) => {
    switch (level) {
      case RiskLevel.VERY_LOW:
      case 'very_low':
        return 'Очень низкий';
      case RiskLevel.LOW:
      case 'low':
        return 'Низкий';
      case RiskLevel.MEDIUM:
      case 'medium':
        return 'Средний';
      case RiskLevel.HIGH:
      case 'high':
        return 'Высокий';
      case RiskLevel.VERY_HIGH:
      case 'very_high':
        return 'Очень высокий';
      default:
        // Fallback на основе значения, если level не определен
        if (riskScore.value <= 2) return 'Очень низкий';
        if (riskScore.value <= 4) return 'Низкий';
        if (riskScore.value <= 6) return 'Средний';
        if (riskScore.value <= 8) return 'Высокий';
        return 'Очень высокий';
    }
  };

  const riskClass = getRiskClass(riskScore.level);
  const riskLabel = getRiskLabel(riskScore.level);

  if (compact) {
    return (
      <div
        className={`badge ${riskClass} compact`}
        title={riskScore.description || `${riskLabel} риск (${riskScore.value}/10)`}
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
        <div className="font-medium">{riskLabel}</div>
      </div>
      {riskScore.description && (
        <p className="ml-sm text-sm opacity-75">{riskScore.description}</p>
      )}
    </div>
  );
});

