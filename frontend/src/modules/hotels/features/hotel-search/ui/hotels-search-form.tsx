'use client'

interface HotelsSearchFormProps {
  searchQuery: string
  checkIn: string
  checkOut: string
  guests: number
  onSearchChange: (value: string) => void
  onCheckInChange: (value: string) => void
  onCheckOutChange: (value: string) => void
  onGuestsChange: (value: number) => void
  onSearch: () => void
}

export function HotelsSearchForm({
  searchQuery,
  checkIn,
  checkOut,
  guests,
  onSearchChange,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onSearch,
}: HotelsSearchFormProps) {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch()
    }
  }

  return (
    <div className="card p-lg mb-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-md">
        {/* Город или отель */}
        <div className="space-y-xs">
          <label htmlFor="hotel-search" className="block text-xs font-normal text-secondary">
            Город или отель
          </label>
          <input
            type="text"
            id="hotel-search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите город или название отеля"
            className="input"
          />
        </div>

        {/* Дата заселения */}
          <div className="space-y-xs">
          <label htmlFor="check-in" className="block text-xs font-normal text-secondary">
            Дата заселения
          </label>
          <input
            type="date"
            id="check-in"
            value={checkIn || today}
            onChange={(e) => onCheckInChange(e.target.value)}
            min={today}
            className="input"
          />
        </div>

        {/* Дата выезда */}
          <div className="space-y-xs">
          <label htmlFor="check-out" className="block text-xs font-normal text-secondary">
            Дата выезда
          </label>
          <input
            type="date"
            id="check-out"
            value={checkOut || tomorrow}
            onChange={(e) => onCheckOutChange(e.target.value)}
            min={checkIn || tomorrow}
            className="input"
          />
        </div>

        {/* Количество гостей */}
          <div className="space-y-xs">
          <label htmlFor="guests" className="block text-xs font-normal text-secondary">
            Гостей
          </label>
          <input
            type="number"
            id="guests"
            value={guests}
            onChange={(e) => onGuestsChange(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
            className="input"
          />
        </div>

        {/* Кнопка поиска */}
          <div className="space-y-xs">
          <div className="block text-xs font-normal opacity-0 text-secondary">
            Поиск
          </div>
          <button
            type="button"
            onClick={onSearch}
            className="btn-primary w-full"
          >
            Поиск
          </button>
        </div>
      </div>
    </div>
  )
}

