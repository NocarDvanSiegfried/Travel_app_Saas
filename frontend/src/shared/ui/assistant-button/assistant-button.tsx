'use client'

import { memo, useState } from 'react'
import { MammothIcon } from '@/shared/icons'

export const AssistantButton = memo(function AssistantButton() {
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        className="fixed bottom-lg right-lg z-50 w-3xl h-3xl rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-fast btn-icon btn-assistant"
        aria-label="Помощник мамонтёнок"
        onClick={handleClick}
      >
        <MammothIcon
          className="w-logo h-logo"
          color="var(--color-text-inverse)"
        />
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border border-light p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-header-text">Мамонтёнок-помощник</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>

          <div className="space-y-3 text-sm text-secondary">
            <p>👋 Привет! Я ваш персональный помощник для путешествий по Якутии.</p>
            <div className="space-y-2">
              <p><strong>Чем могу помочь:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Подобрать оптимальный маршрут</li>
                <li>Оценить риски путешествия</li>
                <li>Рекомендовать лучшие отели</li>
                <li>Дать советы по погоде</li>
                <li>Рассказать интересные факты о городах</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-light">
              <p className="text-xs text-gray-500">
                Для полноценной поддержки напишите нам: support@travelapp.ru
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

