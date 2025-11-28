'use client'

import { RouteRiskBadge } from '@/modules/routes/ui/route-risk-badge'
import type { IRiskScore } from '@/modules/routes/domain/types'

/**
 * Расширенный интерфейс сегмента с поддержкой новых полей SmartRoute
 */
interface SmartRouteSegment {
  segmentId: string
  type: string
  from: {
    id: string
    name: string
    type: string
    isHub?: boolean
    hubLevel?: 'federal' | 'regional'
  }
  to: {
    id: string
    name: string
    type: string
    isHub?: boolean
    hubLevel?: 'federal' | 'regional'
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт distance = { value, unit }, duration = { value, display }, price = { total, display }
  distance: {
    value?: number
    unit?: string
  }
  duration: {
    value?: number
    unit?: string
    display?: string
  }
  price: {
    base?: number
    total?: number
    currency?: string
    display?: string
  }
  isDirect?: boolean
  // КРИТИЧЕСКИЙ ФИКС: Backend отдаёт viaHubs как массив полных объектов Hub.toJSON() с полями { id, name, level, ... }
  viaHubs?: Array<{
    id?: string
    name?: string
    level?: 'federal' | 'regional'
    [key: string]: unknown
  }>
  schedule?: {
    departureTime?: string
    arrivalTime?: string
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend может не отдавать seasonality или его поля могут быть необязательными
  seasonality?: {
    available?: boolean
    season?: string
    period?: {
      start?: string
      end?: string
    }
  }
  // КРИТИЧЕСКИЙ ФИКС: Backend может не отдавать validation или его поля могут быть необязательными
  validation?: {
    isValid?: boolean
    errors?: string[]
    warnings?: string[]
  }
  /**
   * Оценка риска для сегмента (опционально)
   */
  riskScore?: IRiskScore
}

interface SmartRouteSegmentsProps {
  segments: SmartRouteSegment[]
  showValidation?: boolean
}

/**
 * Компонент для отображения сегментов умного маршрута с поддержкой новых полей
 */
export function SmartRouteSegments({ segments, showValidation = true }: SmartRouteSegmentsProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">
          Сегменты маршрута
        </h2>
        <p className="text-secondary">Сегменты маршрута не найдены</p>
      </div>
    )
  }

  const getTransportTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      airplane: '✈️ Самолёт',
      train: '🚂 Поезд',
      bus: '🚌 Автобус',
      ferry: '⛴️ Паром',
      taxi: '🚕 Такси',
      winter_road: '❄️ Зимник',
      unknown: '🚌 Транспорт',
    }
    return labels[type.toLowerCase()] || '🚌 Транспорт'
  }

  const getSeasonLabel = (season: string): string => {
    const labels: Record<string, string> = {
      summer: '☀️ Лето',
      winter: '❄️ Зима',
      transition: '🌤️ Переходный',
      all: '✅ Круглый год',
    }
    return labels[season.toLowerCase()] || season
  }

  const getHubLabel = (level?: 'federal' | 'regional'): string => {
    if (!level) return ''
    return level === 'federal' ? '⭐ Федеральный хаб' : '⭐ Региональный хаб'
  }

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">
        Сегменты маршрута
      </h2>
      
      <div className="space-y-md">
        {segments.map((segment, index) => (
          <div
            key={segment.segmentId || index}
            className={`border-l-2 pl-md py-sm ${
              segment.validation && !(segment.validation.isValid ?? true)
                ? 'border-error'
                : segment.validation && (segment.validation.warnings?.length ?? 0) > 0
                ? 'border-warning'
                : 'border-primary'
            }`}
          >
            <div className="flex items-start gap-md">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-inverse flex items-center justify-center font-medium">
                {index + 1}
              </div>
              
              <div className="flex-1">
                {/* Откуда */}
                <div className="flex items-center justify-between mb-sm">
                  <div className="flex items-center gap-sm">
                    <div className="font-medium text-primary">
                      {segment.from.name}
                    </div>
                    {segment.from.isHub && (
                      <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                        {getHubLabel(segment.from.hubLevel)}
                      </span>
                    )}
                  </div>
                  {segment.schedule?.departureTime && (
                    <div className="text-sm text-secondary font-mono">
                      {segment.schedule.departureTime}
                    </div>
                  )}
                </div>
                
                {/* Тип транспорта и путь */}
                <div className="my-sm flex items-center gap-sm">
                  <div className="flex-1 h-px bg-divider"></div>
                  <div className="flex items-center gap-sm">
                    <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                      {getTransportTypeLabel(segment.type)}
                    </span>
                    {!segment.isDirect && segment.viaHubs && segment.viaHubs.length > 0 && (
                      <span className="text-xs text-secondary">
                        через {segment.viaHubs.length} {segment.viaHubs.length === 1 ? 'хаб' : 'хаба'}
                      </span>
                    )}
                    {segment.isDirect && (
                      <span className="text-xs text-secondary">прямой</span>
                    )}
                    <span className="text-xs text-tertiary">↓</span>
                  </div>
                  <div className="flex-1 h-px bg-divider"></div>
                </div>
                
                {/* Куда */}
                <div className="flex items-center justify-between mb-sm">
                  <div className="flex items-center gap-sm">
                    <div className="font-medium text-primary">
                      {segment.to.name}
                    </div>
                    {segment.to.isHub && (
                      <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                        {getHubLabel(segment.to.hubLevel)}
                      </span>
                    )}
                  </div>
                  {segment.schedule?.arrivalTime && (
                    <div className="text-sm text-secondary font-mono">
                      {segment.schedule.arrivalTime}
                    </div>
                  )}
                </div>
                
                {/* Детали сегмента */}
                <div className="text-sm text-secondary space-y-xs">
                  <div className="flex items-center gap-md flex-wrap">
                    <span>
                      Расстояние: {(segment.distance.value ?? 0).toFixed(0)} {segment.distance.unit ?? 'км'}
                    </span>
                    <span>•</span>
                    <span>
                      Время: {segment.duration.display ?? (() => {
                        const durationValue = segment.duration.value ?? 0;
                        const hours = Math.floor(durationValue / 60);
                        const minutes = durationValue % 60;
                        return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
                      })()}
                    </span>
                    <span>•</span>
                    <span>
                      Цена: {segment.price.display ?? (() => {
                        const priceValue = segment.price.total ?? 0;
                        const currency = segment.price.currency ?? '₽';
                        return `${priceValue.toFixed(0)} ${currency}`;
                      })()}
                    </span>
                    {segment.riskScore && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-xs">
                          <span className="text-xs">Риск:</span>
                          <RouteRiskBadge riskScore={segment.riskScore} compact />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Сезонность */}
                  {segment.seasonality && (
                    <div className="flex items-center gap-sm">
                      <span className="text-xs">
                        {getSeasonLabel(segment.seasonality.season ?? '')}
                        {(segment.seasonality.available ?? true) ? ' (доступен)' : ' (недоступен)'}
                      </span>
                      {segment.seasonality.period?.start && segment.seasonality.period?.end && (
                        <span className="text-xs text-tertiary">
                          {new Date(segment.seasonality.period.start).toLocaleDateString('ru-RU')} - {new Date(segment.seasonality.period.end).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Валидация */}
                  {showValidation && segment.validation && (
                    <div className="mt-sm">
                      {!(segment.validation.isValid ?? true) && (segment.validation.errors?.length ?? 0) > 0 && (
                        <div className="text-xs text-error">
                          Ошибки: {(segment.validation.errors ?? []).join(', ')}
                        </div>
                      )}
                      {(segment.validation.warnings?.length ?? 0) > 0 && (
                        <div className="text-xs text-warning">
                          Предупреждения: {(segment.validation.warnings ?? []).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

