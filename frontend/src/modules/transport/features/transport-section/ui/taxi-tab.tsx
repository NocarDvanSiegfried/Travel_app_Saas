'use client'

import { useState } from 'react'
import { taxiMock } from '@/modules/transport/lib'

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
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="taxi-from" className="block text-xs font-normal text-secondary">
              Откуда
            </label>
            <input
              type="text"
              id="taxi-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Адрес отправления"
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="taxi-to" className="block text-xs font-normal text-secondary">
              Куда
            </label>
            <input
              type="text"
              id="taxi-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Адрес назначения"
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="taxi-date" className="block text-xs font-normal text-secondary">
              Дата поездки
            </label>
            <input
              type="date"
              id="taxi-date"
              value={date || today}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="taxi-passengers" className="block text-xs font-normal text-secondary">
              Пассажиры
            </label>
            <input
              type="number"
              id="taxi-passengers"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
              min="1"
              max="8"
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <div className="block text-xs font-normal opacity-0 text-secondary">
              Поиск
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="btn-primary w-full"
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
            <div key={taxi.id} className="card p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-xl font-medium text-primary">
                      {taxi.price.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-base font-medium text-primary">
                      {taxi.carType}
                    </span>
                    <span className="text-sm text-secondary">
                      ~ {taxi.estimatedTime}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
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

