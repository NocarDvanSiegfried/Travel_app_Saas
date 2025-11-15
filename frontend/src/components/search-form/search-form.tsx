'use client'

import { useState } from 'react'

export function SearchForm() {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: '',
    returnDate: '',
    passengers: '1',
    class: 'economy',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search logic
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="yakutia-card p-[18px] w-full"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {/* Откуда */}
        <div className="space-y-2">
          <label htmlFor="from" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Откуда
          </label>
          <input
            type="text"
            id="from"
            name="from"
            value={formData.from}
            onChange={handleChange}
            placeholder="Город отправления"
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm"
            style={{ 
              color: 'var(--color-text-light)', 
              backgroundColor: 'var(--color-input-bg)', 
              borderColor: 'var(--color-input-border)' 
            }}
          />
        </div>

        {/* Куда */}
        <div className="space-y-2">
          <label htmlFor="to" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Куда
          </label>
          <input
            type="text"
            id="to"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder="Город назначения"
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition placeholder:text-white/60 shadow-sm border"
            style={{ 
              color: 'var(--color-text-light)', 
              backgroundColor: 'var(--color-input-bg)', 
              borderColor: 'var(--color-input-border)' 
            }}
          />
        </div>

        {/* Когда */}
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Когда
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border [color-scheme:dark]"
            style={{ 
              color: 'var(--color-text-light)', 
              backgroundColor: 'var(--color-input-bg)', 
              borderColor: 'var(--color-input-border)' 
            }}
          />
        </div>

        {/* Обратно */}
        <div className="space-y-2">
          <label htmlFor="returnDate" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Обратно
          </label>
          <input
            type="date"
            id="returnDate"
            name="returnDate"
            value={formData.returnDate}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border [color-scheme:dark]"
            style={{ 
              color: 'var(--color-text-light)', 
              backgroundColor: 'var(--color-input-bg)', 
              borderColor: 'var(--color-input-border)' 
            }}
          />
        </div>

        {/* Пассажиры */}
        <div className="space-y-2">
          <label htmlFor="passengers" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Пассажиры
          </label>
          <input
            type="number"
            id="passengers"
            name="passengers"
            value={formData.passengers}
            onChange={handleChange}
            min="1"
            max="9"
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
            style={{ 
              color: 'var(--color-text-light)', 
              backgroundColor: 'var(--color-input-bg)', 
              borderColor: 'var(--color-input-border)' 
            }}
          />
        </div>

        {/* Класс поездки */}
        <div className="space-y-2">
          <label htmlFor="class" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Класс поездки
          </label>
          <select
            id="class"
            name="class"
            value={formData.class}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
            style={{ 
              color: 'var(--color-text-light)', 
              backgroundColor: 'var(--color-input-bg)', 
              borderColor: 'var(--color-input-border)' 
            }}
          >
            <option value="economy" style={{ color: 'var(--color-text-dark)' }}>Эконом</option>
            <option value="comfort" style={{ color: 'var(--color-text-dark)' }}>Комфорт</option>
            <option value="business" style={{ color: 'var(--color-text-dark)' }}>Бизнес</option>
          </select>
        </div>
      </div>

      {/* Кнопка поиска */}
      <div className="flex justify-center md:justify-start">
        <button
          type="submit"
          className="w-full md:w-auto px-12 py-4 text-lg font-bold text-white rounded-yakutia-lg shadow-lg hover:shadow-xl hover:scale-[1.02] yakutia-transition"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
        >
          Найти маршрут
        </button>
      </div>
    </form>
  )
}

