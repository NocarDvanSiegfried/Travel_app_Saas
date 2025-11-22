'use client'

import { OptimalRoute } from '@/modules/favorites/domain'
import { bestPricesMock, optimalRoutesMock, popularPlacesMock } from '@/modules/favorites/lib'

export function FavoritesSection() {
  const getRouteTypeLabel = (type: OptimalRoute['type']) => {
    switch (type) {
      case 'cheapest':
        return 'Самый дешёвый'
      case 'fastest':
        return 'Самый быстрый'
      case 'optimal':
        return 'Оптимальный'
    }
  }

  return (
    <section className="w-full space-y-6 fade-in">
      {/* Блок 1: Лучшие цены */}
      <div>
        <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
          Лучшие цены
        </h2>
        <div className="space-y-3">
          {bestPricesMock.map((route) => (
            <div key={route.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-base font-medium text-primary">
                    {route.from}
                  </span>
                  <span className="text-base text-primary">
                    →
                  </span>
                  <span className="text-base font-medium text-primary">
                    {route.to}
                  </span>
                  {route.isLowestPrice && (
                    <span className="text-xs px-2 py-1 rounded-sm text-inverse" style={{ backgroundColor: 'var(--color-primary)' }}>
                      Самая низкая цена
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {route.date && (
                    <span className="text-sm text-secondary">
                      {route.date}
                    </span>
                  )}
                  <span className="text-lg font-medium text-primary">
                    от {route.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Блок 2: Оптимальные маршруты */}
      <div>
        <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
          Оптимальные маршруты
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {optimalRoutesMock.map((route) => (
            <div key={route.id} className="card p-5 fade-in">
              <h3 className="text-sm font-medium mb-2 text-primary">
                {getRouteTypeLabel(route.type)}
              </h3>
              <p className="text-base font-medium mb-3 text-primary">
                {route.route}
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">
                    Цена:
                  </span>
                  <span className="text-base font-medium text-primary">
                    {route.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">
                    Время:
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {route.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">
                    Пересадки:
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {route.transfers}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary w-full text-sm"
              >
                Выбрать
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Блок 3: Популярные места */}
      <div>
        <h2 className="text-xl font-medium mb-3" style={{ color: 'var(--color-text-heading)' }}>
          Популярные места
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {popularPlacesMock.map((place) => (
            <div key={place.id} className="card p-5 fade-in">
              <div className="w-full h-40 rounded-sm overflow-hidden mb-3">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: place.imageUrl
                      ? `url(${place.imageUrl})`
                      : `linear-gradient(135deg, var(--color-background-subtle), var(--color-surface-hover))`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              </div>
              <h3 className="text-lg font-medium mb-2 text-primary">
                {place.name}
              </h3>
              <p className="text-sm text-secondary">
                {place.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

