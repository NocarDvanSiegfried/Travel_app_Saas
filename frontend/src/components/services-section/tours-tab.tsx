'use client'

import { Tour } from '@/shared/types/services'
import { toursMock } from '@/shared/data/services'

export function ToursTab() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {toursMock.map((tour) => (
          <div key={tour.id} className="yakutia-card p-[18px] fade-in">
            <div className="w-full h-48 rounded-yakutia overflow-hidden mb-4">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: tour.imageUrl
                    ? `url(${tour.imageUrl})`
                    : `linear-gradient(135deg, var(--color-background-mid), var(--color-background-end))`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-dark)' }}>
              {tour.name}
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-dark)' }}>
              {tour.description}
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                Длительность: {tour.duration}
              </span>
              <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                {tour.price.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <button
              type="button"
              className="w-full px-6 py-3 rounded-yakutia yakutia-transition font-semibold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              }}
            >
              Подробнее
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

