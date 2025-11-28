'use client'

import { useState } from 'react'

interface InsuranceProduct {
  id: string
  type: 'stage' | 'comprehensive'
  name: string
  description: string
  price: string
  coverage: string[]
  features: string[]
  isSelected: boolean
}

export function InsuranceTab() {
  const [products, setProducts] = useState<InsuranceProduct[]>([
    {
      id: 'insurance-stage',
      type: 'stage',
      name: 'Этапная страховка',
      description: 'Защита для каждого отдельного этапа путешествия',
      price: 'от 1-5% от стоимости билета',
      coverage: [
        'Задержка рейса/поезда (оплата за каждый час)',
        'Отмена рейса/поезда',
        'Несчастный случай в пути',
        'Утрата багажа на конкретном транспорте'
      ],
      features: [
        'Низкая стоимость',
        'Быстрая онлайн-оформление',
        'Мгновенное покрытие',
        'Защита на каждый этап отдельно'
      ],
      isSelected: false
    },
    {
      id: 'insurance-comprehensive',
      type: 'comprehensive',
      name: 'Сквозная страховка "Гарант маршрута"',
      description: 'Комплексная защита всего путешествия от начала до конца',
      price: '5-10% от общей стоимости маршрута',
      coverage: [
        'Не доехал (болезнь, несчастный случай)',
        'Прерывание поездки (травма, ЧС дома)',
        'Потеря багажа в течение всей поездки',
        'Юридическая и медицинская помощь 24/7'
      ],
      features: [
        'Защита крупных финансовых вложений',
        'Помощь в сложных ситуациях',
        'Комплексное покрытие',
        'Спасательный круг для всего путешествия'
      ],
      isSelected: false
    }
  ])

  const [showComparison, setShowComparison] = useState(false)

  const toggleProduct = (id: string) => {
    setProducts(products.map(p =>
      p.id === id ? { ...p, isSelected: !p.isSelected } : p
    ))
  }

  const calculateTotalPrice = () => {
    const selectedProducts = products.filter(p => p.isSelected)
    if (selectedProducts.length === 0) return '0 ₽'
    if (selectedProducts.length === 1) return products.find(p => p.isSelected)?.price || '0 ₽'

    const stagePrice = 300 // Средняя цена для этапной страховки
    const comprehensivePrice = 3500 // Средняя цена для сквозной

    if (selectedProducts.length === 2) {
      return `${stagePrice + comprehensivePrice} ₽`
    }
    return '0 ₽'
  }

  const getRiskLevel = (type: 'stage' | 'comprehensive') => {
    return type === 'comprehensive' ? '10/10' : '4/10'
  }

  const getRiskColor = (level: string) => {
    const num = parseInt(level.split('/')[0])
    if (num <= 3) return 'text-green-600'
    if (num <= 6) return 'text-yellow-600'
    if (num <= 8) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="w-full">
      {/* Заголовок и описание */}
      <div className="text-center mb-xl">
        <h2 className="text-2xl font-medium mb-md text-header-text">
          Страхование путешественников
        </h2>
        <p className="text-lg text-secondary max-w-3xl mx-auto">
          Выберите идеальную защиту для вашего путешествия. Два типа страхования для максимальной безопасности.
        </p>
      </div>

      {/* Предложение полной защиты */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-lg mb-xl border border-blue-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-sm text-primary">
            💡 Рекомендация: Полная защита
          </h3>
          <p className="text-sm text-secondary mb-md">
            Максимальная безопасность при выборе обоих типов страхования
          </p>
          <div className="text-lg font-bold text-primary">
            Экономия: 15% при комплексной покупке
          </div>
        </div>
      </div>

      {/* Страховые продукты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {products.map((product) => (
          <div
            key={product.id}
            className={`card p-lg fade-in border-2 transition-fast ${
              product.isSelected
                ? 'border-primary bg-blue-50'
                : 'border-light hover:border-primary/30'
            }`}
          >
            <div className="flex justify-between items-start mb-md">
              <div className="flex-1">
                <h3 className="text-xl font-medium mb-xs text-header-text">
                  {product.name}
                </h3>
                <p className="text-sm text-secondary">
                  {product.description}
                </p>
              </div>
              <div className="ml-md text-right">
                <div className="text-sm text-gray-600">Оценка риска</div>
                <div className={`text-lg font-bold ${getRiskColor(getRiskLevel(product.type))}`}>
                  {getRiskLevel(product.type)}
                </div>
              </div>
            </div>

            {/* Покрытие */}
            <div className="mb-md">
              <h4 className="font-semibold mb-sm text-primary">Что покрывает:</h4>
              <ul className="space-y-xs">
                {product.coverage.map((item, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="mr-xs text-primary">🛡️</span>
                    <span className="text-primary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Преимущества */}
            <div className="mb-md">
              <h4 className="font-semibold mb-sm text-primary">Преимущества:</h4>
              <ul className="space-y-xs">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="mr-xs text-primary">✓</span>
                    <span className="text-primary">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Цена и выбор */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Стоимость:</div>
                <div className="text-lg font-bold text-primary">{product.price}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleProduct(product.id)}
                className={`px-md py-sm rounded-lg font-medium transition-fast ${
                  product.isSelected
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {product.isSelected ? 'Выбрано ✓' : 'Выбрать'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Сравнение и итоговая цена */}
      {products.some(p => p.isSelected) && (
        <div className="mt-xl bg-white rounded-lg p-lg border border-light">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-lg font-semibold text-header-text">
              Ваш выбор
            </h3>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="btn-secondary text-sm"
            >
              {showComparison ? 'Скрыть' : 'Сравнить'} ▼
            </button>
          </div>

          {/* Выбранные продукты */}
          <div className="space-y-md mb-md">
            {products.filter(p => p.isSelected).map(product => (
              <div key={product.id} className="flex items-center justify-between p-md bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-primary">{product.name}</div>
                  <div className="text-sm text-secondary">{product.price}</div>
                </div>
                <button
                  onClick={() => toggleProduct(product.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          {/* Общая цена */}
          <div className="border-t border-light pt-md">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Итоговая стоимость:</span>
              <span className="text-xl font-bold text-primary">
                {calculateTotalPrice()}
              </span>
            </div>
            {products.filter(p => p.isSelected).length === 2 && (
              <div className="mt-sm text-sm text-green-600">
                ✓ Выбрана полная защита - экономия 15%
              </div>
            )}
          </div>

          {/* Кнопка покупки */}
          <button
            type="button"
            className="btn-primary w-full mt-lg"
          >
            Оформить страховку
          </button>
        </div>
      )}

      {/* Сравнение продуктов */}
      {showComparison && (
        <div className="mt-xl bg-white rounded-lg p-lg border border-light">
          <h3 className="text-lg font-semibold mb-md text-header-text">Сравнение продуктов</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light">
                  <th className="text-left p-sm">Параметр</th>
                  <th className="text-center p-sm">Этапная</th>
                  <th className="text-center p-sm">Сквозная</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-light">
                  <td className="p-sm">Тип защиты</td>
                  <td className="text-center p-sm">Точечная</td>
                  <td className="text-center p-sm">Комплексная</td>
                </tr>
                <tr className="border-b border-light">
                  <td className="p-sm">Целевая аудитория</td>
                  <td className="text-center p-sm">Экономные</td>
                  <td className="text-center p-sm">Осторожные</td>
                </tr>
                <tr className="border-b border-light">
                  <td className="p-sm">Комиссия</td>
                  <td className="text-center p-sm">Низкая × много</td>
                  <td className="text-center p-sm">Высокая</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}