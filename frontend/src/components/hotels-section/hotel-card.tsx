'use client'

import { Hotel } from '@/shared/types/hotel'

interface HotelCardProps {
  hotel: Hotel
}

export function HotelCard({ hotel }: HotelCardProps) {
  return (
    <div className="yakutia-card p-[18px] yakutia-transition">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Фото гостиницы */}
        <div className="w-full md:w-64 h-48 md:h-40 rounded-yakutia overflow-hidden flex-shrink-0">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: hotel.imageUrl
                ? `url(${hotel.imageUrl})`
                : `linear-gradient(135deg, var(--color-background-mid), var(--color-background-end))`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        {/* Информация о гостинице */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-dark)' }}>
              {hotel.name}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                ★
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                {hotel.rating.toFixed(1)}
              </span>
            </div>
          </div>

          <p className="text-sm mb-3 flex-1" style={{ color: 'var(--color-text-dark)' }}>
            {hotel.description}
          </p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {hotel.pricePerNight.toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-sm ml-1" style={{ color: 'var(--color-text-dark)' }}>
                / ночь
              </span>
            </div>
            <button
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
              Посмотреть номера
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
