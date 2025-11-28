'use client'

import { Suspense, useMemo, useCallback, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header, ErrorBoundary } from '@/shared/ui'
import { RouteRiskBadge, useRoutesSearch, InsuranceOptions } from '@/modules/routes'
import { IBuiltRoute, IRiskAssessment, TransportType, RiskLevel, IRiskScore, IInsuranceOffer } from '@/modules/routes/domain'
import { safeLocalStorage } from '@/shared/utils/storage'
import { formatDuration, formatTime, formatDate, formatPrice } from '@/shared/utils/format'

interface Route extends IBuiltRoute {
  riskAssessment?: IRiskAssessment
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Проверяет, должен ли маршрут быть заблокирован на основе риска
 * 
 * @param route - Маршрут для проверки
 * @returns Объект с информацией о блокировке
 */
function checkRouteRiskBlock(route: Route): {
  isBlocked: boolean;
  reason: string | null;
  riskScore: IRiskScore | null;
} {
  // Проверяем риск маршрута (из riskAssessment или напрямую из route.riskScore)
  const routeRiskScore = route.riskAssessment?.riskScore || (route as any).riskScore;
  if (routeRiskScore) {
    const riskValue = routeRiskScore.value;
    const riskLevel = routeRiskScore.level;

    // Блокируем при высоком (7-8) или очень высоком (9-10) риске
    if (riskValue >= 7 || riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      return {
        isBlocked: true,
        reason: riskValue >= 9
          ? 'Маршрут заблокирован из-за очень высокого риска задержек и отмен'
          : 'Маршрут заблокирован из-за высокого риска задержек и отмен',
        riskScore: routeRiskScore,
      };
    }
  }

  // Проверяем риск сегментов
  if (route.segments && Array.isArray(route.segments)) {
    const highRiskSegments = route.segments.filter((segment) => {
      const segmentRisk = segment.riskScore;
      if (!segmentRisk) return false;
      
      return segmentRisk.value >= 7 || 
             segmentRisk.level === RiskLevel.HIGH || 
             segmentRisk.level === RiskLevel.VERY_HIGH;
    });

    if (highRiskSegments.length > 0) {
      const maxSegmentRisk = highRiskSegments.reduce((max, seg) => {
        return (seg.riskScore?.value ?? 0) > (max?.value ?? 0) ? seg.riskScore! : max;
      }, null as IRiskScore | null);

      return {
        isBlocked: true,
        reason: maxSegmentRisk && maxSegmentRisk.value >= 9
          ? 'Маршрут заблокирован: один или несколько сегментов имеют очень высокий риск'
          : 'Маршрут заблокирован: один или несколько сегментов имеют высокий риск',
        riskScore: maxSegmentRisk,
      };
    }
  }

  return {
    isBlocked: false,
    reason: null,
    riskScore: null,
  };
}

/**
 * Компонент содержимого страницы результатов поиска маршрутов
 * 
 * Отображает результаты поиска маршрутов на основе параметров из URL.
 * Использует React Query для загрузки данных и кеширования.
 * 
 * @returns JSX элемент с результатами поиска маршрутов
 */
function RoutesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const date = searchParams.get('date') || ''
  const passengers = searchParams.get('passengers') || '1'

  const { routes, alternatives, isLoading, error, errorCode } = useRoutesSearch({
    from,
    to,
    date,
    passengers,
  })

  // Обработка случая, когда не указаны обязательные параметры
  const hasRequiredParams = Boolean(from && to)
  
  // Определяем тип ошибки и сообщение для пользователя
  const errorMessage = useMemo(() => {
    if (!hasRequiredParams) {
      return 'Не указаны параметры поиска'
    }
    
    if (!error) {
      return null
    }
    
    // Различаем типы ошибок по коду
    if (errorCode === 'STOPS_NOT_FOUND') {
      return `Города "${from}" или "${to}" не найдены в базе данных. Проверьте правильность написания.`
    }
    
    if (errorCode === 'GRAPH_OUT_OF_SYNC') {
      return 'Данные временно недоступны. Пожалуйста, попробуйте позже.'
    }
    
    if (errorCode === 'ROUTES_NOT_FOUND') {
      // Для ROUTES_NOT_FOUND не показываем ошибку, показываем заглушку "маршруты не найдены"
      return null
    }
    
    // Общая ошибка
    return error.message || 'Произошла ошибка при поиске маршрутов'
  }, [error, errorCode, hasRequiredParams, from, to])

  // Мемоизация функции выбора маршрута
  const handleSelectRoute = useCallback((route: Route) => {
    // КРИТИЧЕСКИЙ ФИКС ФАЗА 1: Генерируем routeId, если он отсутствует
    if (!route) {
      console.error('[RoutesContent] Cannot select route: route is null')
      // Показываем сообщение пользователю через alert (можно заменить на toast)
      if (typeof window !== 'undefined') {
        alert('Ошибка: маршрут не найден. Пожалуйста, попробуйте выбрать другой маршрут.')
      }
      return
    }
    
    // Генерируем routeId, если он отсутствует
    const routeId = route.routeId || `route-${route.fromCity}-${route.toCity}-${Date.now()}`
    
    // Обновляем route с routeId
    const routeWithId: Route = {
      ...route,
      routeId,
    }
    
    try {
      // Проверяем, что localStorage доступен
      if (typeof window === 'undefined' || !safeLocalStorage) {
        throw new Error('localStorage недоступен')
      }
      
      // ФАЗА 2: Безопасная сериализация данных (удаляем функции и undefined)
      const routeData = {
        route: {
          ...routeWithId,
          // Убеждаемся, что все поля сериализуемы
          segments: routeWithId.segments?.map(seg => ({
            ...seg,
            // Удаляем функции, если есть
          })) || [],
        },
        riskAssessment: routeWithId.riskAssessment ? {
          ...routeWithId.riskAssessment,
          // Удаляем функции, если есть
        } : undefined,
      }
      
      // Используем безопасную сериализацию с обработкой циклических ссылок
      let serialized: string
      try {
        serialized = JSON.stringify(routeData, (key, value) => {
          // Пропускаем функции и undefined
          if (typeof value === 'function' || value === undefined) {
            return null
          }
          // Обрабатываем циклические ссылки
          if (typeof value === 'object' && value !== null) {
            // Проверяем на циклические ссылки через WeakSet
            const seen = new WeakSet()
            if (seen.has(value)) {
              return '[Circular]'
            }
            seen.add(value)
          }
          return value
        })
      } catch (serializationError) {
        // Если сериализация не удалась, пробуем упрощённый вариант
        console.warn('[RoutesContent] Serialization failed, using simplified version:', serializationError)
        const simplifiedData = {
          route: {
            routeId: routeWithId.routeId,
            fromCity: routeWithId.fromCity,
            toCity: routeWithId.toCity,
            date: routeWithId.date,
            passengers: routeWithId.passengers,
            segments: routeWithId.segments?.map(seg => ({
              segmentId: seg.segment?.segmentId,
              fromStopId: seg.segment?.fromStopId,
              toStopId: seg.segment?.toStopId,
              transportType: seg.segment?.transportType,
              departureTime: seg.departureTime,
              arrivalTime: seg.arrivalTime,
              duration: seg.duration,
              price: seg.price,
            })) || [],
            totalDuration: routeWithId.totalDuration,
            totalPrice: routeWithId.totalPrice,
            transferCount: routeWithId.transferCount,
            transportTypes: routeWithId.transportTypes,
            departureTime: routeWithId.departureTime,
            arrivalTime: routeWithId.arrivalTime,
          },
          riskAssessment: routeWithId.riskAssessment,
        }
        serialized = JSON.stringify(simplifiedData)
      }
      
      // ФАЗА 2: Сохраняем основной маршрут
      safeLocalStorage.setItem(`route-${routeId}`, serialized)
      
      // Проверяем, что данные действительно сохранились
      const saved = safeLocalStorage.getItem(`route-${routeId}`)
      if (!saved) {
        throw new Error('Данные не сохранились в localStorage')
      }
      
      // ФАЗА 2: Сохраняем альтернативные маршруты, если они есть
      if (alternatives && Array.isArray(alternatives) && alternatives.length > 0) {
        try {
          // Безопасная сериализация альтернатив
          const alternativesData = {
            routes: alternatives.map((altRoute, index) => {
              const altRouteId = altRoute.routeId || `${routeId}-alt-${index + 1}`
              return {
                ...altRoute,
                routeId: altRouteId,
                segments: altRoute.segments?.map(seg => ({
                  segmentId: seg.segment?.segmentId,
                  fromStopId: seg.segment?.fromStopId,
                  toStopId: seg.segment?.toStopId,
                  transportType: seg.segment?.transportType,
                  departureTime: seg.departureTime,
                  arrivalTime: seg.arrivalTime,
                  duration: seg.duration,
                  price: seg.price,
                })) || [],
              }
            }),
          }
          
          const alternativesSerialized = JSON.stringify(alternativesData, (key, value) => {
            if (typeof value === 'function' || value === undefined) {
              return null
            }
            return value
          })
          
          const alternativesKey = `route-${routeId}-alternatives`
          safeLocalStorage.setItem(alternativesKey, alternativesSerialized)
          
          // Проверяем, что альтернативы сохранились
          const savedAlternatives = safeLocalStorage.getItem(alternativesKey)
          if (!savedAlternatives) {
            console.warn('[RoutesContent] Alternatives not saved, but continuing')
          } else {
            console.log('[RoutesContent] Alternatives saved:', {
              routeId,
              alternativesCount: alternatives.length,
            })
          }
        } catch (alternativesError) {
          // Не прерываем выполнение, если сохранение альтернатив не удалось
          console.warn('[RoutesContent] Error saving alternatives, but continuing:', alternativesError)
        }
      }
      
      console.log('[RoutesContent] Route saved to localStorage:', {
        routeId,
        fromCity: routeWithId.fromCity,
        toCity: routeWithId.toCity,
        wasGenerated: !route.routeId,
        hasAlternatives: alternatives && alternatives.length > 0,
      })
      
      // Переходим на страницу деталей только после успешного сохранения
      router.push(`/routes/details?routeId=${routeId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('[RoutesContent] Error saving route to localStorage:', {
        routeId,
        error: err,
        errorMessage,
      })
      
      // Показываем сообщение пользователю
      if (typeof window !== 'undefined') {
        alert(`Ошибка при сохранении маршрута: ${errorMessage}. Попробуйте ещё раз.`)
      }
      
      // НЕ переходим на страницу деталей, если сохранение не удалось
      // Это предотвратит ошибку "Маршрут не найден" на странице деталей
    }
  }, [router, alternatives])

  // Мемоизация функции получения метки типа транспорта
  const getTransportTypeLabel = useCallback((type: string): string => {
    const labels: Record<string, string> = {
      'airplane': 'Самолёт',
      'bus': 'Автобус',
      'train': 'Поезд',
      'ferry': 'Паром',
      'taxi': 'Такси',
      'AIR': 'Самолёт',
      'BUS': 'Автобус',
      'TRAIN': 'Поезд',
      'FERRY': 'Паром',
      'TAXI': 'Такси',
    }
    return labels[type] || type
  }, [])

  return (
    <div className="bg-background">
      <Header />

      <main className="container-main section-spacing-compact" aria-label="Результаты поиска маршрутов">
        {/* Заголовок */}
        <div className="text-center mb-lg">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-sm leading-tight text-balance text-heading">
            Результаты поиска маршрутов
          </h1>
          {from && to && (
            <div className="text-md md:text-lg text-secondary">
              <span className="font-medium">{from}</span>
              <span className="mx-sm">→</span>
              <span className="font-medium">{to}</span>
              {date && (
                <>
                  <span className="mx-sm">•</span>
                  <span>{formatDate(date)}</span>
                </>
              )}
              {passengers && passengers !== '1' && (
                <>
                  <span className="mx-sm">•</span>
                  <span>{passengers} {passengers === '1' ? 'пассажир' : 'пассажиров'}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="text-center py-2xl">
            <div className="inline-block animate-spin rounded-full h-lg w-lg border border-primary border-t-transparent"></div>
            <p className="mt-md text-md text-secondary">Поиск маршрутов...</p>
          </div>
        )}

        {/* Ошибка (только для критичных ошибок, не для ROUTES_NOT_FOUND) */}
        {errorMessage && !isLoading && errorCode !== 'ROUTES_NOT_FOUND' && (
          <div className="card p-lg text-center" role="alert" aria-live="assertive" data-testid="routes-search-error">
            <p className="text-md text-primary">{errorMessage}</p>
          </div>
        )}

        {/* Результаты поиска */}
        {!isLoading && (!errorMessage || errorCode === 'ROUTES_NOT_FOUND') && (
          <div aria-live="polite" aria-atomic="true">
            <>
            {/* Основные маршруты */}
            {routes && routes.length > 0 ? (
              <div className="space-y-md mb-xl">
                <h2 className="text-xl font-medium mb-md text-heading">
                  Найденные маршруты
                </h2>
                {routes.map((route) => {
                  // Безопасная проверка наличия всех необходимых полей
                  if (!route || !route.routeId) {
                    return null
                  }
                  
                  // Используем названия из route или fallback на from/to из URL
                  const routeFromCity = route.fromCity || from
                  const routeToCity = route.toCity || to
                  
                  return (
                    <div key={route.routeId} className="card card-hover p-lg transition-fast">
                      <div className="flex flex-col gap-md">
                        {/* Заголовок маршрута */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-sm mb-sm">
                              <span className="text-lg font-medium text-primary">
                                {routeFromCity}
                              </span>
                              <span className="text-lg text-primary">→</span>
                              <span className="text-lg font-medium text-primary">
                                {routeToCity}
                              </span>
                            </div>
                            <div className="text-sm text-secondary">
                              {route.departureTime && formatTime(route.departureTime)} - {route.arrivalTime && formatTime(route.arrivalTime)}
                              {route.transferCount !== undefined && route.transferCount > 0 && (
                                <span className="ml-sm">
                                  • {route.transferCount} {route.transferCount === 1 ? 'пересадка' : 'пересадки'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-md mb-sm">
                              {/* TODO: Использовать новые поля SmartRoute (totalPriceData.display) вместо totalPrice */}
                              {/* Приоритет: totalPriceData.display > totalPrice */}
                              {((route as any).totalPriceData?.display || route.totalPrice !== undefined) && (
                                <div className="text-xl font-medium text-primary">
                                  {(route as any).totalPriceData?.display || formatPrice(route.totalPrice || 0)}
                                </div>
                              )}
                              {route.riskAssessment && route.riskAssessment.riskScore && (
                                <RouteRiskBadge riskScore={route.riskAssessment.riskScore} compact />
                              )}
                            </div>
                            {/* TODO: Использовать новые поля SmartRoute (totalDurationData.display) вместо totalDuration */}
                            {/* Приоритет: totalDurationData.display > totalDuration */}
                            {((route as any).totalDurationData?.display || route.totalDuration !== undefined) && (
                              <div className="text-sm text-secondary">
                                {(route as any).totalDurationData?.display || formatDuration(route.totalDuration || 0)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Сегменты маршрута */}
                        {route.segments && Array.isArray(route.segments) && route.segments.length > 0 && (
                          <div className="border-t pt-md border-border">
                            <div className="space-y-md">
                              {route.segments.map((segment, index) => {
                                // Безопасная проверка наличия segment
                                if (!segment) {
                                  return null
                                }
                                
                                // Если segment.segment отсутствует, не отображаем сегмент (невалидные данные)
                                if (!segment.segment) {
                                  return null
                                }
                                
                                // Если segment.segment отсутствует, используем значения напрямую из segment
                                const transportType = segment.segment?.transportType || TransportType.BUS
                                // TODO: Использовать новые поля SmartRoute (duration.display) вместо duration
                                // Приоритет: durationData.display > duration
                                const segmentDuration = (segment as any).durationData?.display 
                                  || (segment.duration ?? 0)
                                // TODO: Использовать новые поля SmartRoute (price.display) вместо price
                                // Приоритет: priceData.display > price
                                const segmentPrice = (segment as any).priceData?.display 
                                  || (segment.price ?? 0)
                                
                                // Новые поля SmartRoute (если доступны)
                                const viaHubs = (segment.segment as any)?.viaHubs
                                const isHub = (segment.segment as any)?.isHub
                                const hubLevel = (segment.segment as any)?.hubLevel
                                const seasonality = (segment.segment as any)?.seasonality
                                const validation = (route as any)?.validation?.segmentValidations?.find(
                                  (v: any) => v.segmentId === segment.segment?.segmentId
                                )
                                
                                return (
                                  <div key={index} className="flex items-center gap-md" data-testid={`route-segment-${index}`}>
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-inverse">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-sm mb-xs flex-wrap">
                                        <span className="text-sm font-medium text-primary">
                                          {getTransportTypeLabel(String(transportType))}
                                        </span>
                                        {viaHubs && viaHubs.length > 0 && (
                                          <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                                            через {viaHubs.length} {viaHubs.length === 1 ? 'хаб' : 'хаба'}
                                          </span>
                                        )}
                                        {isHub && hubLevel && (
                                          <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                                            {hubLevel === 'federal' ? '⭐ Федеральный хаб' : '⭐ Региональный хаб'}
                                          </span>
                                        )}
                                        {segment.departureTime && segment.arrivalTime && (
                                          <span className="text-xs text-secondary">
                                            {formatTime(segment.departureTime)} - {formatTime(segment.arrivalTime)}
                                          </span>
                                        )}
                                      </div>
                                      {(segmentDuration > 0 || segmentPrice > 0) && (
                                        <div className="text-xs text-secondary">
                                          {typeof segmentDuration === 'string' ? segmentDuration : segmentDuration > 0 && formatDuration(segmentDuration)}
                                          {segmentDuration > 0 && segmentPrice > 0 && ' • '}
                                          {typeof segmentPrice === 'string' ? segmentPrice : segmentPrice > 0 && formatPrice(segmentPrice)}
                                        </div>
                                      )}
                                      {seasonality && (
                                        <div className="text-xs text-secondary mt-xs">
                                          {seasonality.available ? '✅' : '❌'} {seasonality.season === 'summer' ? 'Лето' : seasonality.season === 'winter' ? 'Зима' : seasonality.season}
                                        </div>
                                      )}
                                      {/* Отображение риска сегмента */}
                                      {segment.riskScore && (
                                        <div className="mt-xs">
                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения сегмента */}
                                      {segment.warnings && segment.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Ошибки валидации сегмента */}
                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
                                        <div className="text-xs text-error mt-xs">
                                          {segment.segmentValidation.errors.map((error, eIdx) => (
                                            <div key={eIdx} className="flex items-start gap-xs">
                                              <span>❌</span>
                                              <span>{error}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения валидации сегмента */}
                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Интерактивный блок "Почему это риск?" */}
                                      {segment.riskScore && segment.riskScore.factors && (
                                        <details className="mt-xs text-xs">
                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
                                            Почему такой риск?
                                          </summary>
                                          <div className="mt-xs pl-md space-y-xs">
                                            {segment.riskScore.factors.weather && (
                                              <div>
                                                <strong>Погода:</strong>{' '}
                                                {segment.riskScore.factors.weather.temperature !== undefined && `Температура: ${segment.riskScore.factors.weather.temperature}°C`}
                                                {segment.riskScore.factors.weather.visibility !== undefined && `, Видимость: ${segment.riskScore.factors.weather.visibility}м`}
                                                {segment.riskScore.factors.weather.wind !== undefined && `, Ветер: ${segment.riskScore.factors.weather.wind}м/с`}
                                                {segment.riskScore.factors.weather.storms && ', Штормы'}
                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.delays && (
                                              <div>
                                                <strong>Задержки:</strong>{' '}
                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
                                                  ? `Средние: 30д=${segment.riskScore.factors.delays.avg30}м, 60д=${segment.riskScore.factors.delays.avg60}м, 90д=${segment.riskScore.factors.delays.avg90}м, Частота: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.occupancy && (
                                              <div>
                                                <strong>Загруженность:</strong>{' '}
                                                {segment.riskScore.factors.occupancy.avg > 0
                                                  ? `Средняя: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, Высокая загрузка: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.schedule && (
                                              <div>
                                                <strong>Регулярность расписания:</strong>{' '}
                                                {segment.riskScore.factors.schedule.regularityScore > 0
                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.seasonality && (
                                              <div>
                                                <strong>Сезонность:</strong>{' '}
                                                Месяц: {segment.riskScore.factors.seasonality.month}, Фактор риска: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.cancellations && (
                                              <div>
                                                <strong>Отмены:</strong>{' '}
                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
                                                  ? `30д=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60д=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90д=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, Всего: ${segment.riskScore.factors.cancellations.total}`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      )}
                                      
                                      {/* Старая валидация (для обратной совместимости) */}
                                      {/* Отображение риска сегмента */}
                                      {segment.riskScore && (
                                        <div className="mt-xs">
                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения сегмента */}
                                      {segment.warnings && segment.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Ошибки валидации сегмента */}
                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
                                        <div className="text-xs text-error mt-xs">
                                          {segment.segmentValidation.errors.map((error, eIdx) => (
                                            <div key={eIdx} className="flex items-start gap-xs">
                                              <span>❌</span>
                                              <span>{error}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения валидации сегмента */}
                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Интерактивный блок "Почему это риск?" */}
                                      {segment.riskScore && segment.riskScore.factors && (
                                        <details className="mt-xs text-xs">
                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
                                            Почему такой риск?
                                          </summary>
                                          <div className="mt-xs pl-md space-y-xs">
                                            {segment.riskScore.factors.weather && (
                                              <div>
                                                <strong>Погода:</strong>{' '}
                                                {segment.riskScore.factors.weather.temperature !== undefined && `Температура: ${segment.riskScore.factors.weather.temperature}°C`}
                                                {segment.riskScore.factors.weather.visibility !== undefined && `, Видимость: ${segment.riskScore.factors.weather.visibility}м`}
                                                {segment.riskScore.factors.weather.wind !== undefined && `, Ветер: ${segment.riskScore.factors.weather.wind}м/с`}
                                                {segment.riskScore.factors.weather.storms && ', Штормы'}
                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.delays && (
                                              <div>
                                                <strong>Задержки:</strong>{' '}
                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
                                                  ? `Средние: 30д=${segment.riskScore.factors.delays.avg30}м, 60д=${segment.riskScore.factors.delays.avg60}м, 90д=${segment.riskScore.factors.delays.avg90}м, Частота: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.occupancy && (
                                              <div>
                                                <strong>Загруженность:</strong>{' '}
                                                {segment.riskScore.factors.occupancy.avg > 0
                                                  ? `Средняя: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, Высокая загрузка: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.schedule && (
                                              <div>
                                                <strong>Регулярность расписания:</strong>{' '}
                                                {segment.riskScore.factors.schedule.regularityScore > 0
                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.seasonality && (
                                              <div>
                                                <strong>Сезонность:</strong>{' '}
                                                Месяц: {segment.riskScore.factors.seasonality.month}, Фактор риска: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.cancellations && (
                                              <div>
                                                <strong>Отмены:</strong>{' '}
                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
                                                  ? `30д=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60д=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90д=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, Всего: ${segment.riskScore.factors.cancellations.total}`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      )}
                                      
                                      {/* Старая валидация (для обратной совместимости) */}
                                      {validation && !validation.isValid && validation.errors.length > 0 && (
                                        <div className="text-xs text-error mt-xs">
                                          ⚠️ {validation.errors[0]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Предупреждение перед покупкой (если риск >= 5) */}
                        {(() => {
                          const routeRisk = route.riskAssessment?.riskScore || (route as any).riskScore;
                          const hasHighRisk = routeRisk && routeRisk.value >= 5;
                          const hasHighSegmentRisk = route.segments?.some(
                            (seg) => seg.riskScore && seg.riskScore.value >= 5
                          );
                          
                          if (hasHighRisk || hasHighSegmentRisk) {
                            return (
                              <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
                                <div className="flex items-center gap-xs text-sm">
                                  <span>⚠️</span>
                                  <span className="text-warning font-medium">
                                    Повышенный риск задержек/отмен
                                  </span>
                                </div>
                                <p className="text-xs text-secondary mt-xs">
                                  Рекомендуем внимательно проверить сегменты поездки и рассмотреть страховку.
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Информация о страховке (если риск высокий) */}
                        {route.riskAssessment?.riskScore && route.riskAssessment.riskScore.value >= 5 && (
                          <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
                            <div className="flex items-center gap-xs text-sm">
                              <span>🛡️</span>
                              <span className="text-warning font-medium">
                                Рекомендуем оформить страховку
                              </span>
                            </div>
                            <p className="text-xs text-secondary mt-xs">
                              При выборе маршрута вы сможете выбрать подходящие страховые продукты
                            </p>
                            <InsuranceOptions
                              riskScore={route.riskAssessment.riskScore}
                            />
                          </div>
                        )}
                        
                        {/* Общие предупреждения маршрута */}
                        {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.length > 0 && (
                          <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
                            <div className="flex items-center gap-xs text-sm mb-xs">
                              <span>⚠️</span>
                              <span className="text-warning font-medium">
                                Предупреждения по маршруту
                              </span>
                            </div>
                            <div className="space-y-xs">
                              {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.map((warning: string, idx: number) => (
                                <div key={idx} className="text-xs text-secondary">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Кнопка выбора */}
                        {(() => {
                          const riskBlock = checkRouteRiskBlock(route);
                          return (
                            <div className="flex flex-col items-end gap-sm pt-sm">
                              {riskBlock.isBlocked && riskBlock.reason && (
                                <div className="text-xs text-error text-right max-w-md">
                                  <span className="inline-flex items-center gap-xs">
                                    <span>⚠️</span>
                                    <span>{riskBlock.reason}</span>
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={() => !riskBlock.isBlocked && handleSelectRoute(route)}
                                aria-label={
                                  riskBlock.isBlocked
                                    ? `Маршрут заблокирован: ${riskBlock.reason}`
                                    : `Выбрать маршрут из ${route.fromCity} в ${route.toCity}`
                                }
                                disabled={riskBlock.isBlocked}
                                className={`px-xl py-sm transition-fast ${
                                  riskBlock.isBlocked
                                    ? 'btn-secondary opacity-50 cursor-not-allowed'
                                    : 'btn-primary'
                                }`}
                                data-testid={`select-route-${route.routeId}`}
                                title={riskBlock.isBlocked ? riskBlock.reason || undefined : undefined}
                              >
                                {riskBlock.isBlocked ? 'Маршрут недоступен' : 'Выбрать маршрут'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="card p-lg text-center">
                <p className="text-lg font-medium mb-sm text-heading">
                  {errorCode === 'ROUTES_NOT_FOUND' 
                    ? `Маршрутов между ${from} и ${to}${date ? ` на ${formatDate(date)}` : ''} не найдено`
                    : 'Маршруты не найдены'
                  }
                </p>
                <p className="text-sm text-secondary">
                  Попробуйте изменить параметры поиска или выберите другую дату
                </p>
              </div>
            )}

            {/* Альтернативные маршруты */}
            {alternatives && Array.isArray(alternatives) && alternatives.length > 0 && (
              <div className="space-y-md mt-xl">
                <h2 className="text-xl font-medium mb-md text-heading">
                  Альтернативные маршруты
                </h2>
                {alternatives.map((route) => {
                  // Безопасная проверка наличия всех необходимых полей
                  if (!route || !route.routeId || !route.fromCity || !route.toCity) {
                    return null
                  }
                  
                  return (
                    <div key={route.routeId} className="card card-hover p-lg transition-fast">
                      <div className="flex flex-col gap-md">
                        {/* Заголовок маршрута */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-sm mb-sm">
                              <span className="text-lg font-medium text-primary">
                                {route.fromCity}
                              </span>
                              <span className="text-lg text-primary">→</span>
                              <span className="text-lg font-medium text-primary">
                                {route.toCity}
                              </span>
                            </div>
                            <div className="text-sm text-secondary">
                              {route.departureTime && formatTime(route.departureTime)} - {route.arrivalTime && formatTime(route.arrivalTime)}
                              {route.transferCount !== undefined && route.transferCount > 0 && (
                                <span className="ml-sm">
                                  • {route.transferCount} {route.transferCount === 1 ? 'пересадка' : 'пересадки'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-md mb-sm">
                              {/* TODO: Использовать новые поля SmartRoute (totalPriceData.display) вместо totalPrice */}
                              {/* Приоритет: totalPriceData.display > totalPrice */}
                              {((route as any).totalPriceData?.display || route.totalPrice !== undefined) && (
                                <div className="text-xl font-medium text-primary">
                                  {(route as any).totalPriceData?.display || formatPrice(route.totalPrice || 0)}
                                </div>
                              )}
                              {route.riskAssessment && route.riskAssessment.riskScore && (
                                <RouteRiskBadge riskScore={route.riskAssessment.riskScore} compact />
                              )}
                            </div>
                            {/* TODO: Использовать новые поля SmartRoute (totalDurationData.display) вместо totalDuration */}
                            {/* Приоритет: totalDurationData.display > totalDuration */}
                            {((route as any).totalDurationData?.display || route.totalDuration !== undefined) && (
                              <div className="text-sm text-secondary">
                                {(route as any).totalDurationData?.display || formatDuration(route.totalDuration || 0)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Сегменты маршрута */}
                        {route.segments && Array.isArray(route.segments) && route.segments.length > 0 && (
                          <div className="border-t pt-md border-border">
                            <div className="space-y-md">
                              {route.segments.map((segment, index) => {
                                // Безопасная проверка наличия segment
                                if (!segment) {
                                  return null
                                }
                                
                                // Если segment.segment отсутствует, не отображаем сегмент (невалидные данные)
                                if (!segment.segment) {
                                  return null
                                }
                                
                                // Если segment.segment отсутствует, используем значения напрямую из segment
                                const transportType = segment.segment?.transportType || TransportType.BUS
                                // TODO: Использовать новые поля SmartRoute (duration.display) вместо duration
                                // Приоритет: durationData.display > duration
                                const segmentDuration = (segment as any).durationData?.display 
                                  || (segment.duration ?? 0)
                                // TODO: Использовать новые поля SmartRoute (price.display) вместо price
                                // Приоритет: priceData.display > price
                                const segmentPrice = (segment as any).priceData?.display 
                                  || (segment.price ?? 0)
                                
                                // Новые поля SmartRoute (если доступны)
                                const viaHubs = (segment.segment as any)?.viaHubs
                                const isHub = (segment.segment as any)?.isHub
                                const hubLevel = (segment.segment as any)?.hubLevel
                                const seasonality = (segment.segment as any)?.seasonality
                                const validation = (route as any)?.validation?.segmentValidations?.find(
                                  (v: any) => v.segmentId === segment.segment?.segmentId
                                )
                                
                                return (
                                  <div key={index} className="flex items-center gap-md" data-testid={`route-segment-${index}`}>
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-inverse">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-sm mb-xs flex-wrap">
                                        <span className="text-sm font-medium text-primary">
                                          {getTransportTypeLabel(String(transportType))}
                                        </span>
                                        {viaHubs && viaHubs.length > 0 && (
                                          <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                                            через {viaHubs.length} {viaHubs.length === 1 ? 'хаб' : 'хаба'}
                                          </span>
                                        )}
                                        {isHub && hubLevel && (
                                          <span className="text-xs px-sm py-xs rounded-sm bg-primary-light text-primary">
                                            {hubLevel === 'federal' ? '⭐ Федеральный хаб' : '⭐ Региональный хаб'}
                                          </span>
                                        )}
                                        {segment.departureTime && segment.arrivalTime && (
                                          <span className="text-xs text-secondary">
                                            {formatTime(segment.departureTime)} - {formatTime(segment.arrivalTime)}
                                          </span>
                                        )}
                                      </div>
                                      {(segmentDuration > 0 || segmentPrice > 0) && (
                                        <div className="text-xs text-secondary">
                                          {typeof segmentDuration === 'string' ? segmentDuration : segmentDuration > 0 && formatDuration(segmentDuration)}
                                          {segmentDuration > 0 && segmentPrice > 0 && ' • '}
                                          {typeof segmentPrice === 'string' ? segmentPrice : segmentPrice > 0 && formatPrice(segmentPrice)}
                                        </div>
                                      )}
                                      {seasonality && (
                                        <div className="text-xs text-secondary mt-xs">
                                          {seasonality.available ? '✅' : '❌'} {seasonality.season === 'summer' ? 'Лето' : seasonality.season === 'winter' ? 'Зима' : seasonality.season}
                                        </div>
                                      )}
                                      {/* Отображение риска сегмента */}
                                      {segment.riskScore && (
                                        <div className="mt-xs">
                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения сегмента */}
                                      {segment.warnings && segment.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Ошибки валидации сегмента */}
                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
                                        <div className="text-xs text-error mt-xs">
                                          {segment.segmentValidation.errors.map((error, eIdx) => (
                                            <div key={eIdx} className="flex items-start gap-xs">
                                              <span>❌</span>
                                              <span>{error}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения валидации сегмента */}
                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Интерактивный блок "Почему это риск?" */}
                                      {segment.riskScore && segment.riskScore.factors && (
                                        <details className="mt-xs text-xs">
                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
                                            Почему такой риск?
                                          </summary>
                                          <div className="mt-xs pl-md space-y-xs">
                                            {segment.riskScore.factors.weather && (
                                              <div>
                                                <strong>Погода:</strong>{' '}
                                                {segment.riskScore.factors.weather.temperature !== undefined && `Температура: ${segment.riskScore.factors.weather.temperature}°C`}
                                                {segment.riskScore.factors.weather.visibility !== undefined && `, Видимость: ${segment.riskScore.factors.weather.visibility}м`}
                                                {segment.riskScore.factors.weather.wind !== undefined && `, Ветер: ${segment.riskScore.factors.weather.wind}м/с`}
                                                {segment.riskScore.factors.weather.storms && ', Штормы'}
                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.delays && (
                                              <div>
                                                <strong>Задержки:</strong>{' '}
                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
                                                  ? `Средние: 30д=${segment.riskScore.factors.delays.avg30}м, 60д=${segment.riskScore.factors.delays.avg60}м, 90д=${segment.riskScore.factors.delays.avg90}м, Частота: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.occupancy && (
                                              <div>
                                                <strong>Загруженность:</strong>{' '}
                                                {segment.riskScore.factors.occupancy.avg > 0
                                                  ? `Средняя: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, Высокая загрузка: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.schedule && (
                                              <div>
                                                <strong>Регулярность расписания:</strong>{' '}
                                                {segment.riskScore.factors.schedule.regularityScore > 0
                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.seasonality && (
                                              <div>
                                                <strong>Сезонность:</strong>{' '}
                                                Месяц: {segment.riskScore.factors.seasonality.month}, Фактор риска: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.cancellations && (
                                              <div>
                                                <strong>Отмены:</strong>{' '}
                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
                                                  ? `30д=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60д=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90д=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, Всего: ${segment.riskScore.factors.cancellations.total}`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      )}
                                      
                                      {/* Старая валидация (для обратной совместимости) */}
                                      {/* Отображение риска сегмента */}
                                      {segment.riskScore && (
                                        <div className="mt-xs">
                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения сегмента */}
                                      {segment.warnings && segment.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Ошибки валидации сегмента */}
                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
                                        <div className="text-xs text-error mt-xs">
                                          {segment.segmentValidation.errors.map((error, eIdx) => (
                                            <div key={eIdx} className="flex items-start gap-xs">
                                              <span>❌</span>
                                              <span>{error}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Предупреждения валидации сегмента */}
                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
                                        <div className="text-xs text-warning mt-xs">
                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
                                            <div key={wIdx} className="flex items-start gap-xs">
                                              <span>⚠️</span>
                                              <span>{warning}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Интерактивный блок "Почему это риск?" */}
                                      {segment.riskScore && segment.riskScore.factors && (
                                        <details className="mt-xs text-xs">
                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
                                            Почему такой риск?
                                          </summary>
                                          <div className="mt-xs pl-md space-y-xs">
                                            {segment.riskScore.factors.weather && (
                                              <div>
                                                <strong>Погода:</strong>{' '}
                                                {segment.riskScore.factors.weather.temperature !== undefined && `Температура: ${segment.riskScore.factors.weather.temperature}°C`}
                                                {segment.riskScore.factors.weather.visibility !== undefined && `, Видимость: ${segment.riskScore.factors.weather.visibility}м`}
                                                {segment.riskScore.factors.weather.wind !== undefined && `, Ветер: ${segment.riskScore.factors.weather.wind}м/с`}
                                                {segment.riskScore.factors.weather.storms && ', Штормы'}
                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.delays && (
                                              <div>
                                                <strong>Задержки:</strong>{' '}
                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
                                                  ? `Средние: 30д=${segment.riskScore.factors.delays.avg30}м, 60д=${segment.riskScore.factors.delays.avg60}м, 90д=${segment.riskScore.factors.delays.avg90}м, Частота: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.occupancy && (
                                              <div>
                                                <strong>Загруженность:</strong>{' '}
                                                {segment.riskScore.factors.occupancy.avg > 0
                                                  ? `Средняя: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, Высокая загрузка: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.schedule && (
                                              <div>
                                                <strong>Регулярность расписания:</strong>{' '}
                                                {segment.riskScore.factors.schedule.regularityScore > 0
                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.seasonality && (
                                              <div>
                                                <strong>Сезонность:</strong>{' '}
                                                Месяц: {segment.riskScore.factors.seasonality.month}, Фактор риска: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
                                              </div>
                                            )}
                                            {segment.riskScore.factors.cancellations && (
                                              <div>
                                                <strong>Отмены:</strong>{' '}
                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
                                                  ? `30д=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60д=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90д=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, Всего: ${segment.riskScore.factors.cancellations.total}`
                                                  : 'Данные отсутствуют'}
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      )}
                                      
                                      {/* Старая валидация (для обратной совместимости) */}
                                      {validation && !validation.isValid && validation.errors.length > 0 && (
                                        <div className="text-xs text-error mt-xs">
                                          ⚠️ {validation.errors[0]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Предупреждение перед покупкой (если риск >= 5) */}
                        {(() => {
                          const routeRisk = route.riskAssessment?.riskScore || (route as any).riskScore;
                          const hasHighRisk = routeRisk && routeRisk.value >= 5;
                          const hasHighSegmentRisk = route.segments?.some(
                            (seg) => seg.riskScore && seg.riskScore.value >= 5
                          );
                          
                          if (hasHighRisk || hasHighSegmentRisk) {
                            return (
                              <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
                                <div className="flex items-center gap-xs text-sm">
                                  <span>⚠️</span>
                                  <span className="text-warning font-medium">
                                    Повышенный риск задержек/отмен
                                  </span>
                                </div>
                                <p className="text-xs text-secondary mt-xs">
                                  Рекомендуем внимательно проверить сегменты поездки и рассмотреть страховку.
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Информация о страховке (если риск высокий) */}
                        {route.riskAssessment?.riskScore && route.riskAssessment.riskScore.value >= 5 && (
                          <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
                            <div className="flex items-center gap-xs text-sm">
                              <span>🛡️</span>
                              <span className="text-warning font-medium">
                                Рекомендуем оформить страховку
                              </span>
                            </div>
                            <p className="text-xs text-secondary mt-xs">
                              При выборе маршрута вы сможете выбрать подходящие страховые продукты
                            </p>
                            <InsuranceOptions
                              riskScore={route.riskAssessment.riskScore}
                            />
                          </div>
                        )}
                        
                        {/* Общие предупреждения маршрута */}
                        {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.length > 0 && (
                          <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
                            <div className="flex items-center gap-xs text-sm mb-xs">
                              <span>⚠️</span>
                              <span className="text-warning font-medium">
                                Предупреждения по маршруту
                              </span>
                            </div>
                            <div className="space-y-xs">
                              {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.map((warning: string, idx: number) => (
                                <div key={idx} className="text-xs text-secondary">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Кнопка выбора */}
                        {(() => {
                          const riskBlock = checkRouteRiskBlock(route);
                          return (
                            <div className="flex flex-col items-end gap-sm pt-sm">
                              {riskBlock.isBlocked && riskBlock.reason && (
                                <div className="text-xs text-error text-right max-w-md">
                                  <span className="inline-flex items-center gap-xs">
                                    <span>⚠️</span>
                                    <span>{riskBlock.reason}</span>
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={() => !riskBlock.isBlocked && handleSelectRoute(route)}
                                aria-label={
                                  riskBlock.isBlocked
                                    ? `Маршрут заблокирован: ${riskBlock.reason}`
                                    : `Выбрать маршрут из ${route.fromCity} в ${route.toCity}`
                                }
                                disabled={riskBlock.isBlocked}
                                className={`px-xl py-sm transition-fast ${
                                  riskBlock.isBlocked
                                    ? 'btn-secondary opacity-50 cursor-not-allowed'
                                    : 'btn-primary'
                                }`}
                                data-testid={`select-route-${route.routeId}`}
                                title={riskBlock.isBlocked ? riskBlock.reason || undefined : undefined}
                              >
                                {riskBlock.isBlocked ? 'Маршрут недоступен' : 'Выбрать маршрут'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
                )}
              </>
            </div>
            )}
          </main>
    </div>
  )
}

export default function RoutesPage() {
  return (
    <Suspense fallback={
      <div className="bg-background">
        <Header />
        <main className="container-main section-spacing-compact">
          <div className="text-center py-2xl">
            <div className="inline-block animate-spin rounded-full h-lg w-lg border border-primary border-t-transparent"></div>
            <p className="mt-md text-md text-secondary">Загрузка...</p>
          </div>
        </main>
      </div>
    }>
      <ErrorBoundary>
        <RoutesContent />
      </ErrorBoundary>
    </Suspense>
  )
}

