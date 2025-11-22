'use client'

import { useState } from 'react'
import { busRoutesMock } from '@/modules/transport/lib'

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
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="bus-from" className="block text-xs font-normal text-secondary">
              Откуда
            </label>
            <input
              type="text"
              id="bus-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Город отправления"
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bus-to" className="block text-xs font-normal text-secondary">
              Куда
            </label>
            <input
              type="text"
              id="bus-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Город назначения"
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bus-date" className="block text-xs font-normal text-secondary">
              Дата
            </label>
            <input
              type="date"
              id="bus-date"
              value={date || today}
              onChange={(e) => setDate(e.target.value)}
              min={today}
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
              Найти автобусы
            </button>
          </div>
        </div>
      </div>

      {/* Результаты поиска */}
      {isSearchActive && from.trim() && to.trim() && (
        <div className="space-y-4 fade-in">
          {busRoutesMock.map((bus) => (
            <div key={bus.id} className="card p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2 text-primary">
                    {bus.route}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-secondary">Отправление: </span>
                      <span className="text-base font-medium text-primary">
                        {bus.departureTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-secondary">Прибытие: </span>
                      <span className="text-base font-medium text-primary">
                        {bus.arrivalTime}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xl font-medium text-primary">
                    {bus.price.toLocaleString('ru-RU')} ₽
                  </span>
                  <button
                    type="button"
                    className="btn-primary"
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

