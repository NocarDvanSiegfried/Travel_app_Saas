'use client'

import { useState } from 'react'
import { TaxiOption } from '@/shared/types/transport'
import { taxiMock } from '@/shared/data/transport'

export function TaxiTab() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [passengers, setPassengers] = useState(1)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label htmlFor="taxi-from" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Откуда
            </label>
            <input
              type="text"
              id="taxi-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Адрес отправления"
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="taxi-to" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Куда
            </label>
            <input
              type="text"
              id="taxi-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Адрес назначения"
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
              style={{
                color: 'var(--color-text-light)',
                backgroundColor: 'var(--color-input-bg)',
                borderColor: 'var(--color-input-border)',
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="taxi-date" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Дата поездки
            </label>
            <input
              type="date"
              id="taxi-date"
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
            <label htmlFor="taxi-passengers" className="block text-sm font-medium" style={{ color: 'var(--color-text-light)' }}>
              Пассажиры
            </label>
            <input
              type="number"
              id="taxi-passengers"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
              min="1"
              max="8"
              className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
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
              Найти такси
            </button>
          </div>
        </div>
      </div>

      {/* Результаты поиска */}
      {isSearchActive && from.trim() && to.trim() && (
        <div className="space-y-4 fade-in">
          {taxiMock.map((taxi) => (
            <div key={taxi.id} className="yakutia-card p-[18px]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                      {taxi.price.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-lg font-medium" style={{ color: 'var(--color-text-dark)' }}>
                      {taxi.carType}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                      ~ {taxi.estimatedTime}
                    </span>
                  </div>
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
                  Выбрать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

