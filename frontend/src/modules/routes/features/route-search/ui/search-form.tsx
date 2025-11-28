'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ZodError } from 'zod'
import { CityAutocomplete } from '@/shared/ui/city-autocomplete'
import { DatePicker } from '@/shared/ui/date-picker'
import { TripClassSelect } from './trip-class-select'
import { TravelInsuranceOptions } from './travel-insurance-options'
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
  const [insuranceTotal, setInsuranceTotal] = useState(0)

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
        // Всегда включаем все обязательные параметры: from, to, date, passengers
        const params = new URLSearchParams({
          from: validatedData.from,
          to: validatedData.to,
        })

        // Для date: если не выбрана, подставляем текущую дату в формате YYYY-MM-DD
        const dateValue = validatedData.date || (() => {
          const today = new Date()
          const year = today.getFullYear()
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const day = String(today.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        })()
        params.set('date', dateValue)

        // Для passengers: если не выбрано, устанавливаем 1 по умолчанию
        const passengersValue = validatedData.passengers || '1'
        params.set('passengers', passengersValue)

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
            value={formData.from}
            onChange={(value) => {
              const trimmedValue = value?.trim() || ''
              setFormData((prev) => ({ ...prev, from: trimmedValue }))
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
            value={formData.to}
            onChange={(value) => {
              const trimmedValue = value?.trim() || ''
              setFormData((prev) => ({ ...prev, to: trimmedValue }))
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

      {/* Страховые опции */}
      <div className="mt-lg pt-lg border-t border-light">
        <TravelInsuranceOptions onTotalChange={setInsuranceTotal} />
      </div>

      {/* Кнопка поиска с общей стоимостью */}
      <div className="flex flex-col sm:flex-row gap-sm items-center justify-between mt-lg">
        {insuranceTotal > 0 && (
          <div className="text-sm text-secondary order-2 sm:order-1">
            Страховка: <span className="font-semibold text-primary">{insuranceTotal} ₽</span>
          </div>
        )}
        <div className="flex justify-center md:justify-start relative z-20 order-1 sm:order-2 w-full sm:w-auto">
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
      </div>
    </form>
  )
}

