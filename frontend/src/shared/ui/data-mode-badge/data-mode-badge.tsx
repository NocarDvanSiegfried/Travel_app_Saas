'use client'

import { memo, useMemo } from 'react'
import { DataSourceMode } from '@/modules/routes/domain/types'

interface DataModeBadgeProps {
  dataMode?: DataSourceMode | string
  dataQuality?: number
  className?: string
}

export const DataModeBadge = memo(function DataModeBadge({ dataMode, dataQuality, className = '' }: DataModeBadgeProps) {
  const config = useMemo(() => {
    if (!dataMode) {
      return null
    }
    const mode = (dataMode as string).toLowerCase()

    switch (mode) {
      case DataSourceMode.REAL:
      case 'real':
        return {
          bgClass: 'bg-success',
          textClass: 'text-inverse',
          label: 'Актуальные данные',
          icon: '✓',
          tooltip: `Данные получены из реального источника${
            dataQuality ? `, качество: ${Math.round(dataQuality)}%` : ''
          }`,
        }
      case DataSourceMode.RECOVERY:
      case 'recovery':
        return {
          bgClass: 'bg-warning',
          textClass: 'text-inverse',
          label: 'Восстановленные данные',
          icon: '⚠',
          tooltip: `Некоторые данные восстановлены автоматически${
            dataQuality ? `, качество: ${Math.round(dataQuality)}%` : ''
          }`,
        }
      case DataSourceMode.MOCK:
      case 'mock':
        return {
          bgClass: 'bg-text-tertiary',
          textClass: 'text-inverse',
          label: 'Демонстрационные данные',
          icon: 'ℹ',
          tooltip: 'Реальный источник недоступен, используются демонстрационные данные',
        }
      default:
        return {
          bgClass: 'bg-text-tertiary',
          textClass: 'text-inverse',
          label: 'Данные загружены',
          icon: '●',
          tooltip: 'Данные успешно загружены',
        }
    }
  }, [dataMode, dataQuality])

  if (!config) {
    return null
  }

  return (
    <div
      className={`badge ${config.bgClass === 'bg-success' ? 'badge-success' : config.bgClass === 'bg-warning' ? 'badge-warning' : 'badge-neutral'} ${config.textClass} ${className}`}
      title={config.tooltip}
    >
      <span className="text-md leading-none">{config.icon}</span>
      <span>{config.label}</span>
      {dataQuality !== undefined && (
        <span className="ml-1 opacity-90">
          ({Math.round(dataQuality)}%)
        </span>
      )}
    </div>
  )
})

