'use client'

import { CarRentalFilters, CarType } from '@/modules/transport/domain'

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
      <div className="flex items-center justify-between mb-sm">
        <button
          type="button"
          onClick={onToggle}
          className={`px-xl py-sm rounded-sm font-medium text-sm border transition-fast ${
            isOpen 
              ? 'btn-primary border-primary' 
              : 'bg-input-bg text-secondary border-divider hover:bg-surface-hover'
          }`}
        >
          Фильтр {isOpen ? '▼' : '▶'}
        </button>
      </div>

      {isOpen && (
        <div className="card p-lg fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {/* Возраст водителя */}
            <div className="space-y-sm">
              <label htmlFor="driver-age" className="block text-xs font-normal text-secondary">
                Возраст водителя
              </label>
              <input
                type="number"
                id="driver-age"
                value={filters.driverAge || ''}
                onChange={(e) => handleFilterChange('driverAge', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="25"
                min="18"
                max="80"
              className="input"
              />
            </div>

            {/* Тип авто */}
            <div className="space-y-sm">
              <label htmlFor="car-type" className="block text-xs font-normal text-secondary">
                Тип авто
              </label>
              <select
                id="car-type"
                value={filters.carType || ''}
                onChange={(e) => handleFilterChange('carType', e.target.value as CarType | undefined)}
              className="input"
              >
                <option value="">Все типы</option>
                {carTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Коробка передач */}
            <div className="space-y-sm">
              <label htmlFor="transmission" className="block text-xs font-normal text-secondary">
                Коробка передач
              </label>
              <select
                id="transmission"
                value={filters.transmission || ''}
                onChange={(e) => handleFilterChange('transmission', e.target.value as 'Автомат' | 'Механика' | undefined)}
              className="input"
              >
                <option value="">Любая</option>
                <option value="Автомат">Автомат</option>
                <option value="Механика">Механика</option>
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
              <span className="text-sm text-primary">
                Кондиционер
              </span>
            </label>

            {/* Цена от */}
            <div className="space-y-sm">
              <label htmlFor="price-min-rent" className="block text-xs font-normal text-secondary">
                Цена от (₽)
              </label>
              <input
                type="number"
                id="price-min-rent"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
                min="0"
              className="input"
              />
            </div>

            {/* Цена до */}
            <div className="space-y-sm">
              <label htmlFor="price-max-rent" className="block text-xs font-normal text-secondary">
                Цена до (₽)
              </label>
              <input
                type="number"
                id="price-max-rent"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="100000"
                min="0"
              className="input"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

