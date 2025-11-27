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
    fromId: '', // cityId
    fromName: '', // cityName для отображения
    toId: '', // cityId
    toName: '', // cityName для отображения
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

    // КРИТИЧЕСКИЙ ФИКС: Выносим валидацию и навигацию из setFormData
    // чтобы избежать ошибки "Cannot update a component (Router) while rendering"
    try {
      // Проверяем, что выбраны города с ID
      if (!formData.fromId || !formData.toId) {
        const newErrors: typeof errors = {}
        if (!formData.fromId) {
          newErrors.from = 'Выберите город из списка'
        }
        if (!formData.toId) {
          newErrors.to = 'Выберите город из списка'
        }
        setErrors(newErrors)
        return
      }

      // Проверяем, что города разные
      if (formData.fromId === formData.toId) {
        setErrors({ to: 'Город назначения должен отличаться от города отправления' })
        return
      }

      // Дополнительная проверка: города должны быть в списке доступных
      if (availableCities.length > 0) {
        const fromCity = availableCities.find(c => c.id === formData.fromId)
        const toCity = availableCities.find(c => c.id === formData.toId)
        const newErrors: typeof errors = {}
        if (!fromCity) {
          newErrors.from = 'Выберите город из списка'
        }
        if (!toCity) {
          newErrors.to = 'Выберите город из списка'
        }
        if (newErrors.from || newErrors.to) {
          setErrors(newErrors)
          return
        }
      }

      // Очищаем ошибки
      setErrors({})

      // Формируем параметры для URL
      // Используем cityId для запроса, но сохраняем cityName для отображения
      const params = new URLSearchParams({
        from: formData.fromId, // cityId
        to: formData.toId, // cityId
      })

      // Сохраняем названия для отображения (опционально)
      if (formData.fromName) {
        params.set('fromName', formData.fromName)
      }
      if (formData.toName) {
        params.set('toName', formData.toName)
      }

      // Для date: если не выбрана, подставляем текущую дату в формате YYYY-MM-DD
      const dateValue = formData.date || (() => {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })()
      params.set('date', dateValue)

      // Для passengers: если не выбрано, устанавливаем 1 по умолчанию
      const passengersValue = formData.passengers || '1'
      params.set('passengers', passengersValue)

      // КРИТИЧЕСКИЙ ФИКС: Переход на страницу результатов поиска вынесен из setFormData
      // Используем setTimeout для отложенного вызова, чтобы избежать ошибки рендеринга
      setTimeout(() => {
        router.push(`/routes?${params.toString()}`)
      }, 0)
    } catch (error) {
      // Обработка ошибок
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
    }
  }


  const isFormValid = () => {
    // Кнопка активна только при заполнении "Откуда" и "Куда" с cityId
    // Поля "Пассажиры", "Класс поездки", "Дата" не блокируют кнопку
    if (!formData.fromId || !formData.toId) {
      return false
    }
    
    // Проверяем, что города разные
    if (formData.fromId === formData.toId) {
      return false
    }

    // Если города еще загружаются, можно отправить форму если есть ID
    if (availableCities.length === 0) {
      return formData.fromId !== formData.toId
    }

    // Проверяем, что города есть в списке
    const fromCity = availableCities.find(c => c.id === formData.fromId)
    const toCity = availableCities.find(c => c.id === formData.toId)

    return (
      !!fromCity &&
      !!toCity &&
      formData.fromId !== formData.toId
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
      className="card card-hover p-lg w-full relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md mb-lg">
        {/* Откуда */}
        <div>
          <CityAutocomplete
            id="from"
            name="from"
            label="Откуда"
            placeholder="Город отправления"
            value={formData.fromId}
            displayValue={formData.fromName}
            onChange={(cityId, cityName) => {
              setFormData((prev) => ({ ...prev, fromId: cityId, fromName: cityName }))
              if (errors.from) {
                setErrors((prev) => ({ ...prev, from: undefined }))
              }
            }}
            error={errors.from}
            aria-describedby={errors.from ? 'from-error' : undefined}
          />
        </div>

        {/* Куда */}
        <div>
          <CityAutocomplete
            id="to"
            name="to"
            label="Куда"
            placeholder="Город назначения"
            value={formData.toId}
            displayValue={formData.toName}
            onChange={(cityId, cityName) => {
              setFormData((prev) => ({ ...prev, toId: cityId, toName: cityName }))
              if (errors.to) {
                setErrors((prev) => ({ ...prev, to: undefined }))
              }
            }}
            error={errors.to}
            aria-describedby={errors.to ? 'to-error' : undefined}
          />
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
            error={errors.date}
            aria-describedby={errors.date ? 'date-error' : undefined}
          />
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
        <div className="space-y-xs">
          <label htmlFor="passengers" className="block text-xs font-normal text-left text-secondary">
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
              className="input pr-xl"
            />
            <span id="passengers-description" className="sr-only">
              Введите количество пассажиров от 1 до 9. Используйте кнопки вверх и вниз для изменения значения.
            </span>
            <div className="absolute right-sm top-1/2 -translate-y-1/2 flex flex-col gap-xs">
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
                className="w-sm h-xs flex items-center justify-center rounded text-xs text-secondary hover:bg-surface-hover hover:text-primary transition-fast"
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
                className="w-sm h-xs flex items-center justify-center rounded text-xs text-secondary hover:bg-surface-hover hover:text-primary transition-fast"
                aria-label="Уменьшить количество пассажиров"
                aria-controls="passengers"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Класс поездки */}
        <div className="space-y-xs relative">
          <label htmlFor="class" className="block text-xs font-normal text-left text-secondary">
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
      <div className="flex justify-center md:justify-start relative z-20 mt-sm">
        <button
          type="submit"
          disabled={!isFormValid()}
          aria-label="Найти маршрут"
          aria-disabled={!isFormValid()}
          className="btn-primary w-full md:w-auto px-2xl py-sm"
        >
          Найти маршрут
        </button>
      </div>
    </form>
  )
}

