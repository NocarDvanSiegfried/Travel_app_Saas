'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountBalance, useQuickStats, useB2BUser, useNotificationsActions } from '@/stores/b2bPortalStore';
import { cn } from '@/lib/utils';

interface FinancialIndicatorProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'card' | 'header';
  showTrend?: boolean;
  showProgress?: boolean;
  refreshInterval?: number;
}

interface BalanceTrend {
  amount: number;
  percentage: number;
  period: 'day' | 'week' | 'month';
  trend: 'up' | 'down' | 'stable';
}

export const FinancialIndicator: React.FC<FinancialIndicatorProps> = ({
  className = '',
  variant = 'card',
  showTrend = true,
  showProgress = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { balance, lastUpdate } = useAccountBalance();
  const quickStats = useQuickStats();
  const user = useB2BUser();
  const { add } = useNotificationsActions();

  const [trend, setTrend] = useState<BalanceTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate spending percentage
  const getSpendingPercentage = (): number => {
    if (!quickStats || quickStats.accountBalance <= 0) return 0;
    const totalSpent = quickStats.monthlyExpenses;
    const totalBalance = quickStats.accountBalance + totalSpent;
    return (totalSpent / totalBalance) * 100;
  };

  // Get balance status
  const getBalanceStatus = (): {
    status: 'healthy' | 'warning' | 'critical';
    color: string;
    bgColor: string;
    message: string;
  } => {
    const percentage = getSpendingPercentage();

    if (percentage < 50) {
      return {
        status: 'healthy',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        message: 'Хороший баланс'
      };
    } else if (percentage < 80) {
      return {
        status: 'warning',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        message: 'Рекомендуется пополнить'
      };
    } else {
      return {
        status: 'critical',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        message: 'Требуется пополнение'
      };
    }
  };

  // Fetch trend data
  const fetchTrend = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/b2b/finance/trends', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trend data');
      }

      const data = await response.json();
      setTrend(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends');

      // Show error notification for admin users
      if (user?.role === 'company_admin' || user?.role === 'super_admin') {
        add({
          type: 'warning',
          title: 'Ошибка загрузки трендов',
          message: 'Не удалось загрузить данные о трендах баланса',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh balance data
  const refreshBalance = async () => {
    try {
      const response = await fetch('/api/b2b/finance/balance', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to refresh balance');
      }

      const data = await response.json();
      // Update store with new balance
      // This would be handled by the store actions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh balance');
    }
  };

  // Auto-refresh data
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshBalance();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Load trend data on mount if needed
  useEffect(() => {
    if (showTrend) {
      fetchTrend();
    }
  }, [showTrend]);

  const balanceStatus = getBalanceStatus();
  const hasPermission = user && ['company_admin', 'super_admin', 'accountant'].includes(user.role);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Compact variant for headers
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <div className="flex-shrink-0">
          <DollarSign className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">Баланс</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(balance)}
          </p>
        </div>
        {showTrend && trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={cn(
              'text-sm font-medium',
              trend.trend === 'up' ? 'text-green-600' :
              trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            )}>
              {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
            </span>
          </div>
        )}
      </div>
    );
  }

  // Header variant for top navigation
  if (variant === 'header') {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        <div className="text-right">
          <p className="text-sm text-gray-600">Текущий Депозит</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(balance)}
          </p>
        </div>

        {hasPermission && (
          <Link href="/finance/deposit">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Пополнить
            </Button>
          </Link>
        )}

        {balanceStatus.status === 'critical' && (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Status indicator */}
        <div className={cn(
          'absolute top-0 right-0 w-1 h-full',
          balanceStatus.status === 'healthy' ? 'bg-green-500' :
          balanceStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
        )} />

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-lg',
                balanceStatus.bgColor
              )}>
                <DollarSign className={cn(
                  'h-6 w-6',
                  balanceStatus.color
                )} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Текущий Депозит
                </h3>
                <p className="text-sm text-gray-500">
                  {balanceStatus.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            {hasPermission && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshBalance}
                  disabled={loading}
                >
                  Обновить
                </Button>
                <Link href="/finance/deposit">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Пополнить
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Balance Amount */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {loading ? <Skeleton className="h-9 w-48" /> : formatCurrency(balance)}
            </div>

            {/* Trend */}
            {showTrend && !loading && (
              <div className="flex items-center space-x-2">
                {trend ? (
                  <>
                    {getTrendIcon()}
                    <span className="text-sm text-gray-600">
                      {trend.period === 'day' ? 'За день' :
                       trend.period === 'week' ? 'За неделю' : 'За месяц'}:
                    </span>
                    <span className={cn(
                      'text-sm font-medium',
                      trend.trend === 'up' ? 'text-green-600' :
                      trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
                      ({formatCurrency(trend.amount)})
                    </span>
                  </>
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
              </div>
            )}
          </div>

          {/* Progress bar for spending */}
          {showProgress && quickStats && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Расходы за месяц</span>
                <span className="font-medium">
                  {formatCurrency(quickStats.monthlyExpenses)}
                </span>
              </div>
              <Progress
                value={getSpendingPercentage()}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatCurrency(quickStats.monthlyExpenses)}</span>
                <span>{formatCurrency(quickStats.accountBalance + quickStats.monthlyExpenses)}</span>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                balanceStatus.status === 'healthy' ? 'bg-green-100 text-green-700' :
                balanceStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}
            >
              {balanceStatus.status === 'healthy' ? '✓ Нормальный баланс' :
               balanceStatus.status === 'warning' ? '⚠ Требуется внимание' :
               '🔒 Критический уровень'}
            </Badge>

            <span className="text-xs text-gray-400">
              {new Date(lastUpdate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border-t border-red-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}
    </Card>
  );
};

// Minus icon component (for stable trend)
const Minus: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 12H4"
    />
  </svg>
);

export default FinancialIndicator;