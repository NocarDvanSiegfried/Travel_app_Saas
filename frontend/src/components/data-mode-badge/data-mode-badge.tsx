'use client'

import { DataSourceMode } from '@/shared/types/route-adapter'

interface DataModeBadgeProps {
  dataMode?: DataSourceMode | string
  dataQuality?: number
  className?: string
}

export function DataModeBadge({ dataMode, dataQuality, className = '' }: DataModeBadgeProps) {
  if (!dataMode) {
    return null
  }

  const getBadgeConfig = () => {
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
  }

  const config = getBadgeConfig()

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
}




