'use client'

import { useEffect, useState } from 'react'
import { RouteIcon, HotelIcon, CarIcon, ServicesIcon, HeartIcon } from '@/shared/icons'

type ActiveSection = 'routes' | 'hotels' | 'cars' | 'services' | 'favorites'

const tabs = [
  { id: 'routes' as ActiveSection, label: 'Маршруты', Icon: RouteIcon },
  { id: 'hotels' as ActiveSection, label: 'Гостиницы', Icon: HotelIcon },
  { id: 'cars' as ActiveSection, label: 'Авто', Icon: CarIcon },
  { id: 'services' as ActiveSection, label: 'Услуги', Icon: ServicesIcon },
  { id: 'favorites' as ActiveSection, label: 'Путешествуйте выгодно', Icon: HeartIcon },
]

interface NavigationTabsProps {
  onSectionChange: (section: ActiveSection) => void
  activeSection: ActiveSection
}

export function NavigationTabs({ onSectionChange, activeSection }: NavigationTabsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (onSectionChange) {
      onSectionChange(tab.id)
    }
  }

  return (
    <nav className="yakutia-card p-[18px] w-full">
      <div className="flex items-center justify-center overflow-x-auto w-full">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`
                flex items-center space-x-3 px-6 py-3 border-b-2 yakutia-smooth cursor-pointer
                ${isActive
                  ? 'border-[#13c1d8] text-[#0f2d33] font-semibold'
                  : 'border-transparent text-[#e7fafd]/80 hover:text-[#e7fafd] hover:border-white/30'
                }
              `}
            >
              <Icon
                className="w-5 h-5 yakutia-smooth"
                color={isActive ? '#13c1d8' : '#e7fafd'}
              />
              <span className="text-sm whitespace-nowrap">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
