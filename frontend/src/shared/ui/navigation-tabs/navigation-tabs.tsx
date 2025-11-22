'use client'

import { memo, useCallback } from 'react'
import { RouteIcon, HotelIcon, CarIcon, ServicesIcon, HeartIcon } from '@/shared/icons'

type ActiveSection = 'routes' | 'hotels' | 'transport' | 'services' | 'favorites'

const tabs = [
  { id: 'routes' as ActiveSection, label: 'Маршруты', Icon: RouteIcon },
  { id: 'hotels' as ActiveSection, label: 'Гостиницы', Icon: HotelIcon },
  { id: 'transport' as ActiveSection, label: 'Транспорт', Icon: CarIcon },
  { id: 'services' as ActiveSection, label: 'Услуги', Icon: ServicesIcon },
  { id: 'favorites' as ActiveSection, label: 'Путешествуйте выгодно', Icon: HeartIcon },
]

interface NavigationTabsProps {
  onSectionChange: (section: ActiveSection) => void
  activeSection: ActiveSection
}

export const NavigationTabs = memo(function NavigationTabs({ onSectionChange, activeSection }: NavigationTabsProps) {
  const handleTabClick = useCallback((tab: typeof tabs[0], e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSectionChange) {
      onSectionChange(tab.id)
    }
  }, [onSectionChange])

  return (
    <nav className="p-sm w-full bg-transparent" aria-label="Основная навигация">
      <div className="flex items-center justify-center overflow-x-auto w-full" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => handleTabClick(tab, e)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              aria-label={tab.label}
              className={`tab tab-dark ${isActive ? 'tab-dark-active' : ''}`}
            >
              <Icon
                className="w-4 h-4 transition-fast"
                color={isActive ? 'var(--color-primary)' : 'currentColor'}
              />
              <span className="text-sm whitespace-nowrap font-normal">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
})

