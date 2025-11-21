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
          bgColor: '#10b981',
          textColor: '#FFFFFF',
          label: 'Актуальные данные',
          icon: '✓',
          tooltip: `Данные получены из реального источника${
            dataQuality ? `, качество: ${Math.round(dataQuality)}%` : ''
          }`,
        }
      case DataSourceMode.RECOVERY:
      case 'recovery':
        return {
          bgColor: '#f59e0b',
          textColor: '#FFFFFF',
          label: 'Восстановленные данные',
          icon: '⚠',
          tooltip: `Некоторые данные восстановлены автоматически${
            dataQuality ? `, качество: ${Math.round(dataQuality)}%` : ''
          }`,
        }
      case DataSourceMode.MOCK:
      case 'mock':
        return {
          bgColor: '#6b7280',
          textColor: '#FFFFFF',
          label: 'Демонстрационные данные',
          icon: 'ℹ',
          tooltip: 'Реальный источник недоступен, используются демонстрационные данные',
        }
      default:
        return {
          bgColor: '#6b7280',
          textColor: '#FFFFFF',
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-yakutia text-sm font-medium shadow-sm ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
      title={config.tooltip}
    >
      <span className="text-base leading-none">{config.icon}</span>
      <span>{config.label}</span>
      {dataQuality !== undefined && (
        <span className="ml-1 opacity-90">
          ({Math.round(dataQuality)}%)
        </span>
      )}
    </div>
  )
})

