'use client'

import { Suspense, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header, ErrorBoundary } from '@/shared/ui'
import { RouteRiskBadge, useRoutesSearch } from '@/modules/routes'
import { IBuiltRoute, IRiskAssessment, TransportType } from '@/modules/routes/domain'
import { safeLocalStorage } from '@/shared/utils/storage'
import { formatDuration, formatTime, formatDate, formatPrice } from '@/shared/utils/format'

interface Route extends IBuiltRoute {
  riskAssessment?: IRiskAssessment
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

                        {/* Кнопка выбора */}
                        <div className="flex justify-end pt-sm">
                          <button
                            onClick={() => handleSelectRoute(route)}
                            aria-label={`Выбрать маршрут из ${route.fromCity} в ${route.toCity}`}
                            className="btn-primary px-xl py-sm transition-fast"
                            data-testid={`select-route-${route.routeId}`}
                          >
                            Выбрать маршрут
                          </button>
                        </div>
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

                        {/* Кнопка выбора */}
                        <div className="flex justify-end pt-sm">
                          <button
                            onClick={() => handleSelectRoute(route)}
                            aria-label={`Выбрать маршрут из ${route.fromCity} в ${route.toCity}`}
                            className="btn-primary px-xl py-sm transition-fast"
                            data-testid={`select-route-${route.routeId}`}
                          >
                            Выбрать маршрут
                          </button>
                        </div>
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

