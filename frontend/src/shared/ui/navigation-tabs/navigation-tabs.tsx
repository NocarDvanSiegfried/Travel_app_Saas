'use client'

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

export function NavigationTabs({ onSectionChange, activeSection }: NavigationTabsProps) {
  const handleTabClick = (tab: typeof tabs[0], e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSectionChange) {
      onSectionChange(tab.id)
    }
  }

  return (
    <nav className="card p-2 w-full" aria-label="Основная навигация">
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
              className={`
                flex items-center space-x-2 px-4 py-2 transition-fast cursor-pointer h-9
                ${isActive
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'border-b border-transparent text-secondary hover:text-primary hover:border-divider'
                }
              `}
            >
              <Icon
                className="w-4 h-4 transition-fast"
                color={isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)'}
              />
              <span className="text-sm whitespace-nowrap font-normal">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

