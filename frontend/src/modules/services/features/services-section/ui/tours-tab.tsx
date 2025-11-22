'use client'

import { toursMock } from '@/modules/services/lib'

export function ToursTab() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {toursMock.map((tour) => (
          <div key={tour.id} className="card p-5 fade-in">
            <div className="w-full h-48 rounded-sm overflow-hidden mb-3">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: tour.imageUrl
                    ? `url(${tour.imageUrl})`
                    : `linear-gradient(135deg, var(--color-background-subtle), var(--color-surface-hover))`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
            <h3 className="text-lg font-medium mb-2 text-primary">
              {tour.name}
            </h3>
            <p className="text-sm mb-3 text-secondary">
              {tour.description}
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-secondary">
                Длительность: {tour.duration}
              </span>
              <span className="text-base font-medium text-primary">
                {tour.price.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <button
              type="button"
              className="btn-primary w-full"
            >
              Подробнее
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

