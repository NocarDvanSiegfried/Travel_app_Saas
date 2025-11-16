'use client'

import { HotelFilters } from '@/shared/types/hotel'

interface HotelsFiltersProps {
  filters: HotelFilters
  onFiltersChange: (filters: HotelFilters) => void
  isOpen: boolean
  onToggle: () => void
}

export function HotelsFilters({ filters, onFiltersChange, isOpen, onToggle }: HotelsFiltersProps) {
  const handleFilterChange = (key: keyof HotelFilters, value: boolean | number | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onToggle}
          className="px-6 py-2 rounded-yakutia yakutia-transition font-medium text-sm border"
          style={{
            backgroundColor: isOpen ? 'var(--color-primary)' : 'var(--color-input-bg)',
            color: isOpen ? '#FFFFFF' : 'var(--color-text-light)',
            borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-input-border)',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'var(--color-card-bg)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'var(--color-input-bg)'
            }
          }}
        >
          Фильтр {isOpen ? '▼' : '▶'}
        </button>
      </div>

      {isOpen && (
        <div className="yakutia-card p-[18px] fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ближе к центру */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.closeToCenter}
                onChange={(e) => handleFilterChange('closeToCenter', e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                Ближе к центру
              </span>
            </label>

            {/* Отели с завтраком */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasBreakfast}
                onChange={(e) => handleFilterChange('hasBreakfast', e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                С завтраком
              </span>
            </label>

            {/* Парковка */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasParking}
                onChange={(e) => handleFilterChange('hasParking', e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                Парковка
              </span>
            </label>

            {/* Высокий рейтинг */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.highRating}
                onChange={(e) => handleFilterChange('highRating', e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                Высокий рейтинг (4.5+)
              </span>
            </label>

            {/* Цена от */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                Цена от (₽)
              </label>
              <input
                type="number"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
                style={{
                  color: 'var(--color-text-light)',
                  backgroundColor: 'var(--color-input-bg)',
                  borderColor: 'var(--color-input-border)',
                }}
              />
            </div>

            {/* Цена до */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                Цена до (₽)
              </label>
              <input
                type="number"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="100000"
                min="0"
                className="w-full px-4 py-2 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
                style={{
                  color: 'var(--color-text-light)',
                  backgroundColor: 'var(--color-input-bg)',
                  borderColor: 'var(--color-input-border)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

