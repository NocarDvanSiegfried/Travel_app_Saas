'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { NavigationTabs } from '@/components/navigation-tabs'
import { AssistantButton } from '@/components/assistant-button'
import { RoutesSection } from '@/components/routes-section'
import { HotelsSection } from '@/components/hotels-section'
import { TransportSection } from '@/components/transport-section'
import { ServicesSection } from '@/components/services-section'

type ActiveSection = 'routes' | 'hotels' | 'transport' | 'services' | 'favorites'

export default function Home() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('routes')
  const [displaySection, setDisplaySection] = useState<ActiveSection>('routes')
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (activeSection !== displaySection) {
      setIsTransitioning(true)
      setTimeout(() => {
        setDisplaySection(activeSection)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 400)
    }
  }, [activeSection, displaySection])

  const handleSectionChange = (section: ActiveSection) => {
    if (section === activeSection) return
    setActiveSection(section)
  }

  const renderContent = () => {
    switch (displaySection) {
      case 'hotels':
        return <HotelsSection />
      case 'transport':
        return <TransportSection />
      case 'services':
        return <ServicesSection />
      case 'routes':
      default:
        return <RoutesSection />
    }
  }

  return (
    <div className="min-h-screen yakutia-pattern relative">
      <Header />

      <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px]">
        {/* Центральный заголовок */}
        <div className="text-center mb-4">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight text-balance" style={{ color: 'var(--color-text-dark)' }}>
            Путешествия, которые соединяют Якутию и Россию
          </h1>
          {displaySection === 'routes' && (
            <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: 'var(--color-text-dark)' }}>
              Ваш маршрут начинается здесь
            </h2>
          )}
        </div>

        {/* Навигационные табы */}
        <div className="mb-5">
          <NavigationTabs onSectionChange={handleSectionChange} activeSection={activeSection} />
        </div>

        {/* Контент с плавной анимацией */}
        <div className="relative min-h-[400px]">
          <div
            className={isTransitioning ? 'fade-out' : 'fade-in'}
            style={{
              opacity: isTransitioning ? 0 : 1,
              transition: 'opacity 0.4s ease-in-out',
            }}
          >
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Анимированный мамонтёнок */}
      <AssistantButton />
    </div>
  )
}
