'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ZodError } from 'zod'
import { CityAutocomplete } from '@/shared/ui/city-autocomplete'
import { DatePicker } from '@/shared/ui/date-picker'
import { TripClassSelect } from './trip-class-select'
import { useCities } from '@/shared/hooks/use-cities'
import { RouteSearchParamsWithValidationSchema } from '@/modules/routes/schemas/route.schema'

/**
 * Форма поиска маршрутов
 * 
 * Позволяет пользователю указать параметры поиска:
 * - Город отправления и назначения
 * - Дата поездки (опционально)
 * - Дата обратного пути (опционально)
 * - Количество пассажиров
 * - Класс поездки
 * 
 * Валидирует данные через Zod и перенаправляет на страницу результатов поиска
 * 
 * @returns JSX элемент формы поиска
 */
export function SearchForm() {
  const router = useRouter()
  const { cities: availableCities } = useCities()
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: '',
    returnDate: '',
    passengers: '1',
    class: 'economy',
  })
  const [errors, setErrors] = useState<{
    from?: string
    to?: string
    date?: string
  }>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Используем актуальные значения из состояния
    setFormData((currentFormData) => {
      try {
        // Валидация через Zod
        const validatedData = RouteSearchParamsWithValidationSchema.parse({
          from: currentFormData.from.trim(),
          to: currentFormData.to.trim(),
          date: currentFormData.date || undefined,
          passengers: currentFormData.passengers || undefined,
        })

        // Дополнительная проверка: города должны быть в списке доступных
        if (availableCities.length > 0) {
          if (!availableCities.includes(validatedData.from)) {
            setErrors({ from: 'Выберите город из списка' })
            return currentFormData
          }
          if (!availableCities.includes(validatedData.to)) {
            setErrors({ to: 'Выберите город из списка' })
            return currentFormData
          }
        }

        // Очищаем ошибки
        setErrors({})

        // Формируем параметры для URL
        const params = new URLSearchParams({
          from: validatedData.from,
          to: validatedData.to,
        })

        // Добавляем дату, если она указана
        if (validatedData.date) {
          params.set('date', validatedData.date)
        }

        // Добавляем количество пассажиров, если указано
        if (validatedData.passengers) {
          params.set('passengers', validatedData.passengers)
        }

        // Переход на страницу результатов поиска
        router.push(`/routes?${params.toString()}`)

        return currentFormData
      } catch (error) {
        // Обработка ошибок Zod валидации
        const newErrors: typeof errors = {}
        if (error instanceof ZodError) {
          error.issues.forEach((issue) => {
            const field = issue.path[0] as keyof typeof errors
            if (field && (field === 'from' || field === 'to' || field === 'date')) {
              newErrors[field] = issue.message
            }
          })
        }
        setErrors(newErrors)
        return currentFormData
      }
    })
  }


  const isFormValid = () => {
    // Кнопка активна только при заполнении "Откуда" и "Куда"
    // Поля "Пассажиры", "Класс поездки", "Дата" не блокируют кнопку
    if (!formData.from.trim() || !formData.to.trim()) {
      return false
    }
    
    // Если города еще загружаются, можно отправить форму
    if (availableCities.length === 0) {
      return formData.from !== formData.to
    }

    return (
      availableCities.includes(formData.from) &&
      availableCities.includes(formData.to) &&
      formData.from !== formData.to
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    // Очищаем ошибку при изменении поля
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: undefined,
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="yakutia-card p-[18px] w-full relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {/* Откуда */}
        <div>
          <CityAutocomplete
            id="from"
            name="from"
            label="Откуда"
            placeholder="Город отправления"
            value={formData.from}
            onChange={(value) => {
              const trimmedValue = value?.trim() || ''
              setFormData((prev) => ({ ...prev, from: trimmedValue }))
              if (errors.from) {
                setErrors((prev) => ({ ...prev, from: undefined }))
              }
            }}
          />
          {errors.from && (
            <p className="text-sm mt-1" style={{ color: '#ff6b6b' }}>
              {errors.from}
            </p>
          )}
        </div>

        {/* Куда */}
        <div>
          <CityAutocomplete
            id="to"
            name="to"
            label="Куда"
            placeholder="Город назначения"
            value={formData.to}
            onChange={(value) => {
              const trimmedValue = value?.trim() || ''
              setFormData((prev) => ({ ...prev, to: trimmedValue }))
              if (errors.to) {
                setErrors((prev) => ({ ...prev, to: undefined }))
              }
            }}
          />
          {errors.to && (
            <p className="text-sm mt-1" style={{ color: '#ff6b6b' }}>
              {errors.to}
            </p>
          )}
        </div>

        {/* Когда */}
        <div>
          <DatePicker
            id="date"
            name="date"
            label="Когда"
            value={formData.date}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, date: value }))
              if (errors.date) {
                setErrors((prev) => ({ ...prev, date: undefined }))
              }
            }}
          />
          {errors.date && (
            <p className="text-sm mt-1" style={{ color: '#ff6b6b' }}>
              {errors.date}
            </p>
          )}
        </div>

        {/* Обратно */}
        <div>
          <DatePicker
            id="returnDate"
            name="returnDate"
            label="Обратно"
            value={formData.returnDate}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, returnDate: value }))
            }}
          />
        </div>

        {/* Пассажиры */}
        <div className="space-y-2">
          <label htmlFor="passengers" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Пассажиры
          </label>
          <div className="relative">
            <input
              type="number"
              id="passengers"
              name="passengers"
              value={formData.passengers}
              onChange={handleChange}
              min="1"
              max="9"
              aria-label="Количество пассажиров"
              aria-describedby="passengers-description"
              className="w-full px-4 py-3 pr-12 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border"
              style={{ 
                color: 'var(--color-text-light)', 
                backgroundColor: 'var(--color-input-bg)', 
                borderColor: 'var(--color-input-border)',
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => {
                    const current = parseInt(prev.passengers) || 1
                    if (current < 9) {
                      return { ...prev, passengers: String(current + 1) }
                    }
                    return prev
                  })
                }}
                className="w-6 h-4 flex items-center justify-center rounded text-xs yakutia-transition hover:opacity-80"
                style={{ color: 'var(--color-text-light)' }}
                aria-label="Увеличить количество пассажиров"
                aria-controls="passengers"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => {
                    const current = parseInt(prev.passengers) || 1
                    if (current > 1) {
                      return { ...prev, passengers: String(current - 1) }
                    }
                    return prev
                  })
                }}
                className="w-6 h-4 flex items-center justify-center rounded text-xs yakutia-transition hover:opacity-80"
                style={{ color: 'var(--color-text-light)' }}
                aria-label="Уменьшить количество пассажиров"
                aria-controls="passengers"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Класс поездки */}
        <div className="space-y-2 relative">
          <label htmlFor="class" className="block text-sm font-medium text-left" style={{ color: 'var(--color-text-light)' }}>
            Класс поездки
          </label>
          <TripClassSelect
            id="class"
            name="class"
            value={formData.class}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, class: value }))
            }}
          />
        </div>
      </div>

      {/* Кнопка поиска */}
      <div className="flex justify-center md:justify-start relative z-20">
        <button
          type="submit"
          disabled={!isFormValid()}
          aria-label="Найти маршрут"
          aria-disabled={!isFormValid()}
          className={`w-full md:w-auto px-12 py-4 text-lg font-bold text-white rounded-yakutia-lg shadow-lg yakutia-transition ${
            isFormValid()
              ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }`}
          style={{
            backgroundColor: 'var(--color-primary)',
          }}
          onMouseEnter={(e) => {
            if (isFormValid()) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (isFormValid()) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)'
            }
          }}
        >
          Найти маршрут
        </button>
      </div>
    </form>
  )
}

