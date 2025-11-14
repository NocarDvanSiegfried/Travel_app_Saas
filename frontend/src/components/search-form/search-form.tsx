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
    console.log('Search:', formData)
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
      className="yakutia-card p-5 md:p-7 lg:p-8 w-full"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-6">
        {/* Откуда */}
        <div className="space-y-2">
          <label htmlFor="from" className="block text-sm font-medium text-white/90 text-left">
            Откуда
          </label>
          <input
            type="text"
            id="from"
            name="from"
            value={formData.from}
            onChange={handleChange}
            placeholder="Город отправления"
            className="w-full px-4 py-3 rounded-yakutia border-[1.5px] border-[#c1eef4] focus:border-[#c1eef4] focus:ring-2 focus:ring-[#c1eef4]/30 outline-none yakutia-transition text-[#102a32] placeholder:text-[#102a32]/60 bg-white/15 shadow-sm"
          />
        </div>

        {/* Куда */}
        <div className="space-y-2">
          <label htmlFor="to" className="block text-sm font-medium text-white/90 text-left">
            Куда
          </label>
          <input
            type="text"
            id="to"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder="Город назначения"
            className="w-full px-4 py-3 rounded-yakutia border-[1.5px] border-[#c1eef4] focus:border-[#c1eef4] focus:ring-2 focus:ring-[#c1eef4]/30 outline-none yakutia-transition text-[#102a32] placeholder:text-[#102a32]/60 bg-white/15 shadow-sm"
          />
        </div>

        {/* Когда */}
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-white/90 text-left">
            Когда
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-yakutia border-[1.5px] border-[#c1eef4] focus:border-[#c1eef4] focus:ring-2 focus:ring-[#c1eef4]/30 outline-none yakutia-transition text-[#102a32] bg-white/15 shadow-sm"
          />
        </div>

        {/* Обратно */}
        <div className="space-y-2">
          <label htmlFor="returnDate" className="block text-sm font-medium text-white/90 text-left">
            Обратно
          </label>
          <input
            type="date"
            id="returnDate"
            name="returnDate"
            value={formData.returnDate}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-yakutia border-[1.5px] border-[#c1eef4] focus:border-[#c1eef4] focus:ring-2 focus:ring-[#c1eef4]/30 outline-none yakutia-transition text-[#102a32] bg-white/15 shadow-sm"
          />
        </div>

        {/* Пассажиры */}
        <div className="space-y-2">
          <label htmlFor="passengers" className="block text-sm font-medium text-white/90 text-left">
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
            className="w-full px-4 py-3 rounded-yakutia border-[1.5px] border-[#c1eef4] focus:border-[#c1eef4] focus:ring-2 focus:ring-[#c1eef4]/30 outline-none yakutia-transition text-[#102a32] bg-white/15 shadow-sm"
          />
        </div>

        {/* Класс поездки */}
        <div className="space-y-2">
          <label htmlFor="class" className="block text-sm font-medium text-white/90 text-left">
            Класс поездки
          </label>
          <select
            id="class"
            name="class"
            value={formData.class}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-yakutia border-[1.5px] border-[#c1eef4] focus:border-[#c1eef4] focus:ring-2 focus:ring-[#c1eef4]/30 outline-none yakutia-transition text-[#102a32] bg-white/15 shadow-sm"
          >
            <option value="economy">Эконом</option>
            <option value="comfort">Комфорт</option>
            <option value="business">Бизнес</option>
          </select>
        </div>
      </div>

      {/* Кнопка поиска */}
      <div className="flex justify-center md:justify-start">
        <button
          type="submit"
          className="w-full md:w-auto px-12 py-6 text-lg font-bold bg-[#13b5c9] text-white rounded-yakutia-lg shadow-lg hover:bg-[#0fa5b8] hover:shadow-xl hover:scale-[1.02] yakutia-transition"
        >
          Найти маршрут
        </button>
      </div>
    </form>
  )
}

