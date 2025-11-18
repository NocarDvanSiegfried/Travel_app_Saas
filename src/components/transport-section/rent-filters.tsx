'use client'

import { CarRentalFilters, CarType } from '@/shared/types/transport'

interface RentFiltersProps {
  filters: CarRentalFilters
  onFiltersChange: (filters: CarRentalFilters) => void
  isOpen: boolean
  onToggle: () => void
}

export function RentFilters({ filters, onFiltersChange, isOpen, onToggle }: RentFiltersProps) {
  const handleFilterChange = (key: keyof CarRentalFilters, value: boolean | number | CarType | 'Автомат' | 'Механика' | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const carTypes: CarType[] = ['Эконом', 'Комфорт', 'Бизнес', 'SUV']

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
            {/* Возраст водителя */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                Возраст водителя
              </label>
              <input
                type="number"
                value={filters.driverAge || ''}
                onChange={(e) => handleFilterChange('driverAge', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="25"
                min="18"
                max="80"
                className="w-full px-4 py-2 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
                style={{
                  color: 'var(--color-text-light)',
                  backgroundColor: 'var(--color-input-bg)',
                  borderColor: 'var(--color-input-border)',
                }}
              />
            </div>

            {/* Тип авто */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                Тип авто
              </label>
              <select
                value={filters.carType || ''}
                onChange={(e) => handleFilterChange('carType', e.target.value as CarType | undefined)}
                className="w-full px-4 py-2 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
                style={{
                  color: 'var(--color-text-light)',
                  backgroundColor: 'var(--color-input-bg)',
                  borderColor: 'var(--color-input-border)',
                }}
              >
                <option value="" style={{ color: 'var(--color-text-dark)' }}>Все типы</option>
                {carTypes.map((type) => (
                  <option key={type} value={type} style={{ color: 'var(--color-text-dark)' }}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Коробка передач */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                Коробка передач
              </label>
              <select
                value={filters.transmission || ''}
                onChange={(e) => handleFilterChange('transmission', e.target.value as 'Автомат' | 'Механика' | undefined)}
                className="w-full px-4 py-2 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
                style={{
                  color: 'var(--color-text-light)',
                  backgroundColor: 'var(--color-input-bg)',
                  borderColor: 'var(--color-input-border)',
                }}
              >
                <option value="" style={{ color: 'var(--color-text-dark)' }}>Любая</option>
                <option value="Автомат" style={{ color: 'var(--color-text-dark)' }}>Автомат</option>
                <option value="Механика" style={{ color: 'var(--color-text-dark)' }}>Механика</option>
              </select>
            </div>

            {/* Кондиционер */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAirConditioning}
                onChange={(e) => handleFilterChange('hasAirConditioning', e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
                style={{
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                Кондиционер
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

