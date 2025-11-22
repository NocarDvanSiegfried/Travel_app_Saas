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
      <div className="card p-lg mb-md">
        <div className="flex flex-wrap items-center justify-center gap-sm">
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
                className={`tab tab-light ${isActive ? 'tab-light-active' : ''}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Контент вкладок с анимацией */}
      <div
        className={`transition-opacity ${isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
      >
        {renderTabContent()}
      </div>
    </section>
  )
}

