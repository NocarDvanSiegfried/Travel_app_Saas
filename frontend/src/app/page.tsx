'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { NavigationTabs } from '@/components/navigation-tabs'
import { AssistantButton } from '@/components/assistant-button'
import { RoutesSection } from '@/components/routes-section'
import { HotelsSection } from '@/components/hotels-section'
import { TransportSection } from '@/components/transport-section'
import { ServicesSection } from '@/components/services-section'
import { FavoritesSection } from '@/components/favorites-section'
import { Footer } from '@/components/footer'

type ActiveSection = 'routes' | 'hotels' | 'transport' | 'services' | 'favorites'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState<ActiveSection>('routes')
  const [displaySection, setDisplaySection] = useState<ActiveSection>('routes')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Убеждаемся, что компонент смонтирован на клиенте
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (activeSection !== displaySection && mounted) {
      setIsTransitioning(true)
      setTimeout(() => {
        setDisplaySection(activeSection)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 400)
    }
  }, [activeSection, displaySection, mounted])

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
      case 'favorites':
        return <FavoritesSection />
      case 'routes':
      default:
        return <RoutesSection />
    }
  }

  // Показываем контент только после монтирования на клиенте
  if (!mounted) {
    return (
      <div className="min-h-screen yakutia-pattern relative flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
          <div className="text-center mb-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight text-balance" style={{ color: 'var(--color-text-dark)' }}>
              Путешествия, которые соединяют Якутию и Россию
            </h1>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen yakutia-pattern relative flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px] flex-1">
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
              pointerEvents: isTransitioning ? 'none' : 'auto',
            }}
          >
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Анимированный мамонтёнок */}
      <AssistantButton />

      {/* Footer */}
      <Footer />
    </div>
  )
}
