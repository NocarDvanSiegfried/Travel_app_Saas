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
      <div className="yakutia-card p-[18px] mb-5">
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
                className="px-4 py-2 rounded-yakutia yakutia-transition font-medium text-sm border"
                style={{
                  backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-input-bg)',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-light)',
                  borderColor: isActive ? 'var(--color-primary)' : 'var(--color-input-border)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-card-bg)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-input-bg)'
                  }
                }}
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

