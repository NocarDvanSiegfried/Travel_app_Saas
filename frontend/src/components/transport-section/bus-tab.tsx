'use client'

import { useState } from 'react'
import { BusRoute } from '@/shared/types/transport'
import { busRoutesMock } from '@/shared/data/transport'

export function BusTab() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const handleSearch = () => {
    if (from.trim() && to.trim()) {
      setIsSearchActive(true)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="w-full">
      {/* Форма поиска */}
      <div className="yakutia-card p-[18px] mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label htmlFor="bus-from" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Откуда
            </label>
            <input
              type="text"
              id="bus-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Город отправления"
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bus-to" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Куда
            </label>
            <input
              type="text"
              id="bus-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Город назначения"
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bus-date" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Дата
            </label>
            <input
              type="date"
              id="bus-date"
              value={date || today}
              onChange={(e) => setDate(e.target.value)}
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
              Найти автобусы
            </button>
          </div>
        </div>
      </div>

      {/* Результаты поиска */}
      {isSearchActive && from.trim() && to.trim() && (
        <div className="space-y-4 fade-in">
          {busRoutesMock.map((bus) => (
            <div key={bus.id} className="yakutia-card p-[18px]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-dark)' }}>
                    {bus.route}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>Отправление: </span>
                      <span className="text-lg font-medium" style={{ color: 'var(--color-primary)' }}>
                        {bus.departureTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>Прибытие: </span>
                      <span className="text-lg font-medium" style={{ color: 'var(--color-primary)' }}>
                        {bus.arrivalTime}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    {bus.price.toLocaleString('ru-RU')} ₽
                  </span>
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
                    Купить билет
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

