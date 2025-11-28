'use client'

import { useState } from 'react'

interface InsuranceOption {
  id: string
  type: 'stage' | 'comprehensive'
  name: string
  price: string
  description: string
  selected: boolean
}

export function TravelInsuranceOptions({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
  const [showOptions, setShowOptions] = useState(false)
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOption[]>([
    {
      id: 'stage-train',
      type: 'stage',
      name: 'Страховка поезда',
      price: 150,
      description: 'Задержка, отмена, багаж',
      selected: false
    },
    {
      id: 'stage-bus',
      type: 'stage',
      name: 'Страховка автобуса',
      price: 100,
      description: 'Дорожные происшествия, отмена',
      selected: false
    },
    {
      id: 'comprehensive',
      type: 'comprehensive',
      name: 'Сквозная страховка "Гарант маршрута"',
      price: 3500,
      description: 'Невыезд, прерывание, помощь 24/7',
      selected: false
    }
  ])

  const toggleOption = (id: string) => {
    setInsuranceOptions(prev => {
      const updated = prev.map(option =>
        option.id === id ? { ...option, selected: !option.selected } : option
      )

      // Рассчитываем общую стоимость
      const total = updated.filter(o => o.selected).reduce((sum, o) => sum + o.price, 0)
      onTotalChange?.(total)

      return updated
    })
  }

  const calculateTotal = () => {
    return insuranceOptions.filter(o => o.selected).reduce((sum, o) => sum + o.price, 0)
  }

  const totalCost = calculateTotal()

  if (!showOptions && totalCost === 0) {
    return (
      <div className="text-center mb-lg">
        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className="btn-secondary text-sm"
        >
          🛡️ Добавить страховку
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Информационная панель */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-md border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">Дополнительная защита</h3>
            <p className="text-sm text-secondary">
              Добавьте страховку для спокойствия в путешествии
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="btn-secondary text-sm"
          >
            {showOptions ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      </div>

      {/* Опции страхования */}
      {showOptions && (
        <div className="space-y-3">
          {insuranceOptions.map(option => (
            <div
              key={option.id}
              className={`card p-sm fade-in border-2 transition-fast ${
                option.selected
                  ? 'border-primary bg-blue-50'
                  : 'border-light hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="mr-xs">🛡️</span>
                    <div>
                      <div className="font-medium text-primary">
                        {option.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-primary">
                    +{option.price} ₽
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`btn-sm px-xs py-xs ${
                      option.selected
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    {option.selected ? '✓' : 'Добавить'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Общая стоимость */}
          {totalCost > 0 && (
            <div className="bg-white rounded-lg p-md border border-light mt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">
                  Итого по страховке:
                </span>
                <span className="text-xl font-bold text-primary">
                  {totalCost} ₽
                </span>
              </div>

              {/* Рекомендация */}
              {insuranceOptions.filter(o => o.selected).length === 2 && (
                <div className="mt-2 text-sm text-green-600">
                  ✅ Выбрана максимальная защита
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}