'use client'

import { useState, useEffect } from 'react'
import { PackagesTab } from './packages-tab'
import { IndividualServicesTab } from './individual-services-tab'
import { ToursTab } from './tours-tab'

type ServicesTab = 'packages' | 'individual' | 'tours'

export function ServicesSection() {
  const [activeTab, setActiveTab] = useState<ServicesTab>('packages')
  const [displayTab, setDisplayTab] = useState<ServicesTab>('packages')
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (activeTab !== displayTab) {
      setIsTransitioning(true)
      setTimeout(() => {
        setDisplayTab(activeTab)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 220)
    }
  }, [activeTab, displayTab])

  const tabs = [
    { id: 'packages' as ServicesTab, label: 'Пакеты услуг' },
    { id: 'individual' as ServicesTab, label: 'Отдельные услуги' },
    { id: 'tours' as ServicesTab, label: 'Туры' },
  ]

  const renderTabContent = () => {
    switch (displayTab) {
      case 'packages':
        return <PackagesTab />
      case 'individual':
        return <IndividualServicesTab />
      case 'tours':
        return <ToursTab />
      default:
        return <PackagesTab />
    }
  }

  return (
    <section className="w-full">
      {/* Переключатель вкладок */}
      <div className="card p-5 mb-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setActiveTab(tab.id)
                }}
                className={`px-4 py-2 rounded-sm transition-fast font-medium text-sm border ${
                  isActive 
                    ? 'btn-primary border-primary' 
                    : 'bg-input-bg text-secondary border-divider hover:bg-surface-hover'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Контент вкладок с анимацией */}
      <div
        style={{
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.22s ease-in-out',
          pointerEvents: isTransitioning ? 'none' : 'auto',
        }}
      >
        {renderTabContent()}
      </div>
    </section>
  )
}

