'use client'

import { useState, useMemo, useEffect } from 'react'
import { CarRental, CarRentalFilters, CarType } from '@/shared/types/transport'
import { carRentalsMock } from '@/shared/data/transport'
import { RentFilters } from './rent-filters'

export function RentTab() {
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [carType, setCarType] = useState<CarType | ''>('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isContentAnimating, setIsContentAnimating] = useState(false)
  const [filters, setFilters] = useState<CarRentalFilters>({
    hasAirConditioning: false,
  })

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const filteredCars = useMemo(() => {
    if (!isSearchActive || !city.trim() || !startDate || !endDate) return []

    let filtered = [...carRentalsMock]

    // Фильтр по типу авто из формы
    if (carType) {
      filtered = filtered.filter((car) => car.carType === carType)
    }

    // Фильтры из панели фильтров
    if (filters.driverAge !== undefined) {
      // В реальном приложении здесь была бы проверка возраста водителя
      // Для мок-данных просто пропускаем все
    }

    if (filters.carType) {
      filtered = filtered.filter((car) => car.carType === filters.carType)
    }

    if (filters.transmission) {
      filtered = filtered.filter((car) => car.transmission === filters.transmission)
    }

    if (filters.hasAirConditioning) {
      filtered = filtered.filter((car) => car.hasAirConditioning === true)
    }

    if (filters.priceMin !== undefined) {
      filtered = filtered.filter((car) => car.pricePerDay >= filters.priceMin!)
    }

    if (filters.priceMax !== undefined) {
      filtered = filtered.filter((car) => car.pricePerDay <= filters.priceMax!)
    }

    return filtered
  }, [isSearchActive, city, startDate, endDate, carType, filters])

  useEffect(() => {
    if (isSearchActive && city.trim() && startDate && endDate) {
      setIsContentAnimating(true)
      setTimeout(() => {
        setIsContentAnimating(false)
      }, 300)
    }
  }, [isSearchActive, city, startDate, endDate, carType, filters])

  const handleSearch = () => {
    if (city.trim() && startDate && endDate) {
      setIsSearchActive(true)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const carTypes: CarType[] = ['Эконом', 'Комфорт', 'Бизнес', 'SUV']

  return (
    <div className="w-full">
      {/* Форма поиска */}
      <div className="yakutia-card p-[18px] mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label htmlFor="rent-city" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Город
            </label>
            <input
              type="text"
              id="rent-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Город аренды"
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rent-start" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Дата начала
            </label>
            <input
              type="date"
              id="rent-start"
              value={startDate || today}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border [color-scheme:dark]"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rent-end" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Дата окончания
            </label>
            <input
              type="date"
              id="rent-end"
              value={endDate || tomorrow}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || tomorrow}
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border [color-scheme:dark]"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rent-car-type" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Тип авто
            </label>
            <select
              id="rent-car-type"
              value={carType}
              onChange={(e) => setCarType(e.target.value as CarType | '')}
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
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

          <div className="space-y-2">
            <label className="block text-sm font-medium opacity-0" style={{ color: 'var(--color-text-light)' }}>
              Поиск
            </label>
            <button
              type="button"
              onClick={handleSearch}
              className="w-full px-6 py-3 rounded-yakutia yakutia-transition font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              }}
            >
              Найти авто
            </button>
          </div>
        </div>
      </div>

      {/* Фильтры - показываем только если поиск активен */}
      {isSearchActive && city.trim() && startDate && endDate && (
        <div className="mb-3">
          <RentFilters
            filters={filters}
            onFiltersChange={setFilters}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />
        </div>
      )}

      {/* Результаты поиска */}
      {isSearchActive && city.trim() && startDate && endDate && (
        <div
          className="space-y-4"
          style={{
            opacity: isContentAnimating ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          {filteredCars.length > 0 ? (
            filteredCars.map((car) => (
              <div key={car.id} className="yakutia-card p-[18px] fade-in">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-64 h-48 md:h-40 rounded-yakutia overflow-hidden flex-shrink-0">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: car.imageUrl
                          ? `url(${car.imageUrl})`
                          : `linear-gradient(135deg, var(--color-background-mid), var(--color-background-end))`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-dark)' }}>
                          {car.brand} {car.model}
                        </h3>
                        <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                          {car.carType}
                        </span>
                      </div>
                      <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                        {car.transmission}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                          {car.pricePerDay.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="text-sm ml-1" style={{ color: 'var(--color-text-dark)' }}>
                          / сутки
                        </span>
                      </div>
                      <button
                        type="button"
                        className="px-6 py-2 rounded-yakutia yakutia-transition font-semibold text-white"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                        }}
                      >
                        Забронировать
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="yakutia-card p-[18px] text-center fade-in">
              <p className="text-lg" style={{ color: 'var(--color-text-dark)' }}>
                Автомобили не найдены
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

