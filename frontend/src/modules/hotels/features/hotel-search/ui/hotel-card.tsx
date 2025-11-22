'use client'

import { memo } from 'react'
import { Hotel } from '@/modules/hotels/domain'

interface HotelCardProps {
  hotel: Hotel
}

export const HotelCard = memo(function HotelCard({ hotel }: HotelCardProps) {
  return (
    <div className="card p-5 transition-fast">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Фото гостиницы */}
        <div className="w-full md:w-64 h-48 md:h-40 rounded-sm overflow-hidden flex-shrink-0">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: hotel.imageUrl
                ? `url(${hotel.imageUrl})`
                : `linear-gradient(135deg, var(--color-background-subtle), var(--color-surface-hover))`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        {/* Информация о гостинице */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-medium text-primary">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-primary">
                ★
              </span>
              <span className="text-sm font-medium text-primary">
                {hotel.rating.toFixed(1)}
              </span>
            </div>
          </div>

          <p className="text-sm mb-3 flex-1 text-secondary">
            {hotel.description}
          </p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-medium text-primary">
                {hotel.pricePerNight.toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-sm text-secondary">
                / ночь
              </span>
            </div>
            <button
              aria-label={`Посмотреть номера в отеле ${hotel.name}`}
              className="btn-primary"
            >
              Посмотреть номера
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

