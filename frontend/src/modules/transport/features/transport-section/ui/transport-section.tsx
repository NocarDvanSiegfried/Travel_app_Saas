'use client'

import { useState, useEffect } from 'react'
import { TaxiTab } from './taxi-tab'
import { RentTab } from './rent-tab'
import { BusTab } from './bus-tab'

type TransportTab = 'taxi' | 'rent' | 'bus'

export function TransportSection() {
  const [activeTab, setActiveTab] = useState<TransportTab>('taxi')
  const [displayTab, setDisplayTab] = useState<TransportTab>('taxi')
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
    { id: 'taxi' as TransportTab, label: 'Такси' },
    { id: 'rent' as TransportTab, label: 'Аренда авто' },
    { id: 'bus' as TransportTab, label: 'Автобусы' },
  ]

  const renderTabContent = () => {
    switch (displayTab) {
      case 'taxi':
        return <TaxiTab />
      case 'rent':
        return <RentTab />
      case 'bus':
        return <BusTab />
      default:
        return <TaxiTab />
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

