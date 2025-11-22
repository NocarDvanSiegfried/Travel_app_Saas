'use client'

import { useState, useMemo, useEffect } from 'react'
import { SortOption, HotelFilters } from '@/modules/hotels/domain'
import { hotelsMock } from '@/modules/hotels/lib'
import { HotelCard } from '../ui/hotel-card'
import { HotelsSearchForm } from '../ui/hotels-search-form'
import { HotelsFilters } from '../ui/hotels-filters'
import { HotelsSortDropdown } from '../ui/hotels-sort-dropdown'

export function HotelsSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('rating')
  const [isAnimating, setIsAnimating] = useState(false)
  const [isContentAnimating, setIsContentAnimating] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<HotelFilters>({
    closeToCenter: false,
    hasBreakfast: false,
    hasParking: false,
    highRating: false,
    priceMin: undefined,
    priceMax: undefined,
  })

  const filteredAndSortedHotels = useMemo(() => {
    if (!isSearchActive || !searchQuery.trim()) return []

    let filtered = [...hotelsMock]

    // Поиск по городу или названию отеля
    const query = searchQuery.toLowerCase().trim()
    filtered = filtered.filter(
      (hotel) =>
        hotel.city.toLowerCase().includes(query) || hotel.name.toLowerCase().includes(query)
    )

    // Применение фильтров
    if (filters.closeToCenter) {
      filtered = filtered.filter((hotel) => (hotel.distanceFromCenter || Infinity) <= 1.0)
    }

    if (filters.hasBreakfast) {
      filtered = filtered.filter((hotel) => hotel.hasBreakfast === true)
    }

    if (filters.hasParking) {
      filtered = filtered.filter((hotel) => hotel.hasParking === true)
    }

    if (filters.highRating) {
      filtered = filtered.filter((hotel) => hotel.rating >= 4.5)
    }

    if (filters.priceMin !== undefined) {
      filtered = filtered.filter((hotel) => hotel.pricePerNight >= filters.priceMin!)
    }

    if (filters.priceMax !== undefined) {
      filtered = filtered.filter((hotel) => hotel.pricePerNight <= filters.priceMax!)
    }

    // Сортировка
    const sorted = [...filtered]

    switch (sortOption) {
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating)
        break
      case 'price-asc':
        sorted.sort((a, b) => a.pricePerNight - b.pricePerNight)
        break
      case 'price-desc':
        sorted.sort((a, b) => b.pricePerNight - a.pricePerNight)
        break
    }

    return sorted
  }, [isSearchActive, searchQuery, filters, sortOption])

  useEffect(() => {
    if (isSearchActive && searchQuery.trim()) {
      setIsContentAnimating(true)
      setTimeout(() => {
        setIsContentAnimating(false)
      }, 300)
    }
  }, [isSearchActive, searchQuery, filters])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearchActive(true)
    }
  }

  const handleSortChange = (option: SortOption) => {
    if (option === sortOption) return
    setIsAnimating(true)
    setTimeout(() => {
      setSortOption(option)
      setTimeout(() => {
        setIsAnimating(false)
      }, 50)
    }, 200)
  }

  const hasResults = filteredAndSortedHotels.length > 0
  const showNoResults = isSearchActive && searchQuery.trim() && !hasResults

  return (
    <section className="w-full">
      {/* Расширенный поисковый блок */}
      <HotelsSearchForm
        searchQuery={searchQuery}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        onSearchChange={setSearchQuery}
        onCheckInChange={setCheckIn}
        onCheckOutChange={setCheckOut}
        onGuestsChange={setGuests}
        onSearch={handleSearch}
      />

      {/* Фильтры и сортировка - показываем только если поиск активен */}
      {isSearchActive && searchQuery.trim() && (
        <div className="mb-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-md">
            <HotelsFilters
              filters={filters}
              onFiltersChange={setFilters}
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen(!filtersOpen)}
            />

            {/* Выпадающий список сортировки */}
            {hasResults && <HotelsSortDropdown sortOption={sortOption} onSortChange={handleSortChange} />}
          </div>
        </div>
      )}

      {/* Карточки гостиниц */}
      {isSearchActive && searchQuery.trim() && (
        <div
          className={`space-y-md transition-opacity-slow ${isAnimating || isContentAnimating ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        >
          {showNoResults ? (
            // Сообщение "не найдено"
            <div className="card p-lg text-center fade-in">
              <p className="text-md text-secondary">
                Гостиницы не найдены
              </p>
            </div>
          ) : (
            // Реальные карточки с анимацией
            <>
              {filteredAndSortedHotels.map((hotel, index) => (
                <div
                  key={hotel.id}
                  className="fade-in"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                  // animationDelay - динамическое значение, оставляем inline
                >
                  <HotelCard hotel={hotel} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  )
}

