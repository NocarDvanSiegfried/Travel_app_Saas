'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { fetchApi } from '@/shared/utils/api'
import { RouteRiskBadge } from '@/components/route-risk-badge'
import { IBuiltRoute, IRiskAssessment, IRouteBuilderResult } from '@/shared/types/route-adapter'

interface RouteSegment {
  segment: {
    routeId: string
    fromStopId: string
    toStopId: string
    transportType: string
    duration: number
    cost: number
  }
  selectedFlight?: {
    flightId: string
    departureTime: string
    arrivalTime: string
    price: number
  }
  departureTime: string
  arrivalTime: string
  duration: number
  price: number
  transferTime?: number
}

interface Route extends IBuiltRoute {
  riskAssessment?: IRiskAssessment
}

interface RouteSearchResult extends IRouteBuilderResult {
  fallback?: boolean
  error?: {
    code: string
    message: string
  }
}

function RoutesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [routes, setRoutes] = useState<Route[]>([])
  const [alternatives, setAlternatives] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)

  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const date = searchParams.get('date') || ''
  const passengers = searchParams.get('passengers') || '1'

  useEffect(() => {
    const searchRoutes = async () => {
      if (!from || !to || !date) {
        setLoading(false)
        setError('Не указаны параметры поиска')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          from,
          to,
          date,
          passengers,
        })

        const result = await fetchApi<RouteSearchResult>(`/routes/search?${params.toString()}`)
        
        if (result.error) {
          setError(result.error.message || 'Ошибка при поиске маршрутов')
          setRoutes([])
          setAlternatives([])
        } else {
          const routesWithRisk = (result.routes || []).map((route) => ({
            ...route,
            riskAssessment: result.riskAssessment,
          }))
          const alternativesWithRisk = (result.alternatives || []).map((route) => ({
            ...route,
            riskAssessment: result.riskAssessment,
          }))
          setRoutes(routesWithRisk)
          setAlternatives(alternativesWithRisk)
          setIsFallback(result.fallback || false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при поиске маршрутов')
        setRoutes([])
        setAlternatives([])
      } finally {
        setLoading(false)
      }
    }

    searchRoutes()
  }, [from, to, date, passengers])

  const handleSelectRoute = (route: Route) => {
    localStorage.setItem(`route-${route.routeId}`, JSON.stringify({
      route,
      riskAssessment: route.riskAssessment,
    }))
    router.push(`/routes/details?routeId=${route.routeId}`)
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}ч ${mins}м`
    }
    return `${mins}м`
  }

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timeString
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getTransportTypeLabel = (type: string): string => {
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
  }

  return (
    <div className="min-h-screen yakutia-pattern relative flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight text-balance" style={{ color: 'var(--color-text-dark)' }}>
            Результаты поиска маршрутов
          </h1>
          {from && to && date && (
            <div className="text-lg md:text-xl" style={{ color: 'var(--color-text-dark)' }}>
              <span className="font-semibold">{from}</span>
              <span className="mx-2">→</span>
              <span className="font-semibold">{to}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(date)}</span>
              {passengers && passengers !== '1' && (
                <>
                  <span className="mx-2">•</span>
                  <span>{passengers} {passengers === '1' ? 'пассажир' : 'пассажиров'}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Индикатор загрузки */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-text-dark)' }}>Поиск маршрутов...</p>
          </div>
        )}

        {/* Ошибка */}
        {error && !loading && (
          <div className="yakutia-card p-6 text-center">
            <p className="text-lg" style={{ color: 'var(--color-text-dark)' }}>{error}</p>
          </div>
        )}

        {/* Результаты поиска */}
        {!loading && !error && (
          <>
            {/* Основные маршруты */}
            {routes.length > 0 ? (
              <div className="space-y-4 mb-8">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-dark)' }}>
                  Найденные маршруты {isFallback && <span className="text-sm font-normal">(тестовые данные)</span>}
                </h2>
                {routes.map((route) => (
                  <div key={route.routeId} className="yakutia-card p-[18px] yakutia-transition">
                    <div className="flex flex-col gap-4">
                      {/* Заголовок маршрута */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl font-bold" style={{ color: 'var(--color-text-dark)' }}>
                              {route.fromCity}
                            </span>
                            <span className="text-lg" style={{ color: 'var(--color-primary)' }}>→</span>
                            <span className="text-xl font-bold" style={{ color: 'var(--color-text-dark)' }}>
                              {route.toCity}
                            </span>
                          </div>
                          <div className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                            {formatTime(route.departureTime)} - {formatTime(route.arrivalTime)}
                            {route.transferCount > 0 && (
                              <span className="ml-2">
                                • {route.transferCount} {route.transferCount === 1 ? 'пересадка' : 'пересадки'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-3 mb-2">
                            <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                              {route.totalPrice.toLocaleString('ru-RU')} ₽
                            </div>
                            {route.riskAssessment && (
                              <RouteRiskBadge riskScore={route.riskAssessment.riskScore} compact />
                            )}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                            {formatDuration(route.totalDuration)}
                          </div>
                        </div>
                      </div>

                      {/* Сегменты маршрута */}
                      {route.segments && route.segments.length > 0 && (
                        <div className="border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
                          <div className="space-y-3">
                            {route.segments.map((segment, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--color-primary)', color: '#FFFFFF' }}>
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                                      {getTransportTypeLabel(segment.segment.transportType)}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--color-text-dark)' }}>
                                      {formatTime(segment.departureTime)} - {formatTime(segment.arrivalTime)}
                                    </span>
                                  </div>
                                  <div className="text-xs" style={{ color: 'var(--color-text-dark)' }}>
                                    {formatDuration(segment.duration)} • {segment.price.toLocaleString('ru-RU')} ₽
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Кнопка выбора */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleSelectRoute(route)}
                          className="px-6 py-2 rounded-yakutia yakutia-transition font-semibold"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: '#FFFFFF',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                          }}
                        >
                          Выбрать маршрут
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="yakutia-card p-12 text-center">
                <p className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-dark)' }}>
                  Маршруты не найдены
                </p>
                <p className="text-base" style={{ color: 'var(--color-text-dark)' }}>
                  Попробуйте изменить параметры поиска или выберите другую дату
                </p>
              </div>
            )}

            {/* Альтернативные маршруты */}
            {alternatives && alternatives.length > 0 && (
              <div className="space-y-4 mt-8">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-dark)' }}>
                  Альтернативные маршруты
                </h2>
                {alternatives.map((route) => (
                  <div key={route.routeId} className="yakutia-card p-[18px] yakutia-transition">
                    <div className="flex flex-col gap-4">
                      {/* Заголовок маршрута */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl font-bold" style={{ color: 'var(--color-text-dark)' }}>
                              {route.fromCity}
                            </span>
                            <span className="text-lg" style={{ color: 'var(--color-primary)' }}>→</span>
                            <span className="text-xl font-bold" style={{ color: 'var(--color-text-dark)' }}>
                              {route.toCity}
                            </span>
                          </div>
                          <div className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                            {formatTime(route.departureTime)} - {formatTime(route.arrivalTime)}
                            {route.transferCount > 0 && (
                              <span className="ml-2">
                                • {route.transferCount} {route.transferCount === 1 ? 'пересадка' : 'пересадки'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-3 mb-2">
                            <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                              {route.totalPrice.toLocaleString('ru-RU')} ₽
                            </div>
                            {route.riskAssessment && (
                              <RouteRiskBadge riskScore={route.riskAssessment.riskScore} compact />
                            )}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                            {formatDuration(route.totalDuration)}
                          </div>
                        </div>
                      </div>

                      {/* Сегменты маршрута */}
                      {route.segments && route.segments.length > 0 && (
                        <div className="border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
                          <div className="space-y-3">
                            {route.segments.map((segment, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--color-primary)', color: '#FFFFFF' }}>
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                                      {getTransportTypeLabel(segment.segment.transportType)}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--color-text-dark)' }}>
                                      {formatTime(segment.departureTime)} - {formatTime(segment.arrivalTime)}
                                    </span>
                                  </div>
                                  <div className="text-xs" style={{ color: 'var(--color-text-dark)' }}>
                                    {formatDuration(segment.duration)} • {segment.price.toLocaleString('ru-RU')} ₽
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Кнопка выбора */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleSelectRoute(route)}
                          className="px-6 py-2 rounded-yakutia yakutia-transition font-semibold"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: '#FFFFFF',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                          }}
                        >
                          Выбрать маршрут
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function RoutesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen yakutia-pattern relative flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-text-dark)' }}>Загрузка...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <RoutesContent />
    </Suspense>
  )
}

