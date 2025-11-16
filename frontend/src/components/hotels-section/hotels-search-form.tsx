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
    <div className="yakutia-card p-[18px] mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Город или отель */}
        <div className="space-y-2">
          <label htmlFor="hotel-search" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
            Город или отель
          </label>
          <input
            type="text"
            id="hotel-search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите город или название отеля"
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
            style={{
              color: 'var(--color-text-light)',
              backgroundColor: 'var(--color-input-bg)',
              borderColor: 'var(--color-input-border)',
            }}
          />
        </div>

        {/* Дата заселения */}
        <div className="space-y-2">
          <label htmlFor="check-in" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
            Дата заселения
          </label>
          <input
            type="date"
            id="check-in"
            value={checkIn || today}
            onChange={(e) => onCheckInChange(e.target.value)}
            min={today}
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border [color-scheme:dark]"
            style={{
              color: 'var(--color-text-light)',
              backgroundColor: 'var(--color-input-bg)',
              borderColor: 'var(--color-input-border)',
            }}
          />
        </div>

        {/* Дата выезда */}
        <div className="space-y-2">
          <label htmlFor="check-out" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
            Дата выезда
          </label>
          <input
            type="date"
            id="check-out"
            value={checkOut || tomorrow}
            onChange={(e) => onCheckOutChange(e.target.value)}
            min={checkIn || tomorrow}
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border [color-scheme:dark]"
            style={{
              color: 'var(--color-text-light)',
              backgroundColor: 'var(--color-input-bg)',
              borderColor: 'var(--color-input-border)',
            }}
          />
        </div>

        {/* Количество гостей */}
        <div className="space-y-2">
          <label htmlFor="guests" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
            Гостей
          </label>
          <input
            type="number"
            id="guests"
            value={guests}
            onChange={(e) => onGuestsChange(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
            style={{
              color: 'var(--color-text-light)',
              backgroundColor: 'var(--color-input-bg)',
              borderColor: 'var(--color-input-border)',
            }}
          />
        </div>

        {/* Кнопка поиска */}
        <div className="space-y-2">
          <label className="block text-sm font-medium opacity-0" style={{ color: 'var(--color-text-light)' }}>
            Поиск
          </label>
          <button
            type="button"
            onClick={onSearch}
            className="w-full px-6 py-3 rounded-yakutia yakutia-transition font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)'
            }}
          >
            Поиск
          </button>
        </div>
      </div>
    </div>
  )
}
