'use client'

import { BestPrice, OptimalRoute, PopularPlace } from '@/shared/types/favorites'
import { bestPricesMock, optimalRoutesMock, popularPlacesMock } from '@/shared/data/favorites'

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
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Лучшие цены
        </h2>
        <div className="space-y-3">
          {bestPricesMock.map((route) => (
            <div key={route.id} className="yakutia-card p-[18px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg font-semibold" style={{ color: 'var(--color-text-dark)' }}>
                    {route.from}
                  </span>
                  <span className="text-lg" style={{ color: 'var(--color-primary)' }}>
                    →
                  </span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--color-text-dark)' }}>
                    {route.to}
                  </span>
                  {route.isLowestPrice && (
                    <span className="text-xs px-2 py-1 rounded-yakutia" style={{ backgroundColor: 'var(--color-primary)', color: '#FFFFFF' }}>
                      Самая низкая цена
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {route.date && (
                    <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                      {route.date}
                    </span>
                  )}
                  <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
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
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Оптимальные маршруты
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {optimalRoutesMock.map((route) => (
            <div key={route.id} className="yakutia-card p-[18px] fade-in">
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
                {getRouteTypeLabel(route.type)}
              </h3>
              <p className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-dark)' }}>
                {route.route}
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                    Цена:
                  </span>
                  <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                    {route.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                    Время:
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                    {route.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                    Пересадки:
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                    {route.transfers}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 rounded-yakutia yakutia-transition font-medium text-white text-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                }}
              >
                Выбрать
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Блок 3: Популярные места */}
      <div>
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
          Популярные места
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {popularPlacesMock.map((place) => (
            <div key={place.id} className="yakutia-card p-[18px] fade-in">
              <div className="w-full h-40 rounded-yakutia overflow-hidden mb-3">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: place.imageUrl
                      ? `url(${place.imageUrl})`
                      : `linear-gradient(135deg, var(--color-background-mid), var(--color-background-end))`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-dark)' }}>
                {place.name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                {place.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

