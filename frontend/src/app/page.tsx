'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Header, Footer, NavigationTabs, AssistantButton } from '@/shared/ui'

// Динамическая загрузка секций для уменьшения начального bundle size
const RoutesSection = dynamic(
  () => import('@/modules/routes').then((mod) => ({ default: mod.RoutesSection })),
  {
    loading: () => <div className="text-center py-8 text-secondary">Загрузка...</div>,
  }
)

const HotelsSection = dynamic(
  () => import('@/modules/hotels').then((mod) => ({ default: mod.HotelsSection })),
  {
    loading: () => <div className="text-center py-8 text-secondary">Загрузка...</div>,
  }
)

const TransportSection = dynamic(
  () => import('@/modules/transport').then((mod) => ({ default: mod.TransportSection })),
  {
    loading: () => <div className="text-center py-8 text-secondary">Загрузка...</div>,
  }
)

const ServicesSection = dynamic(
  () => import('@/modules/services').then((mod) => ({ default: mod.ServicesSection })),
  {
    loading: () => <div className="text-center py-8 text-secondary">Загрузка...</div>,
  }
)

const FavoritesSection = dynamic(
  () => import('@/modules/favorites').then((mod) => ({ default: mod.FavoritesSection })),
  {
    loading: () => <div className="text-center py-8 text-secondary">Загрузка...</div>,
  }
)

type ActiveSection = 'routes' | 'hotels' | 'transport' | 'services' | 'favorites'

/**
 * Главная страница приложения
 * 
 * Отображает навигационные вкладки и контент выбранной секции:
 * - Маршруты
 * - Отели
 * - Транспорт
 * - Услуги
 * - Избранное
 * 
 * Использует плавные переходы между секциями и обеспечивает SSR-безопасность
 * 
 * @returns JSX элемент главной страницы
 */
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
      const timer = setTimeout(() => {
        setDisplaySection(activeSection)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [activeSection, displaySection, mounted])

  const handleSectionChange = useCallback((section: ActiveSection) => {
    if (section === activeSection) return
    setActiveSection(section)
  }, [activeSection])

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
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container-main section-spacing-compact flex-1">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-2 leading-tight text-balance" style={{ color: 'var(--color-text-heading)' }}>
              Путешествия, которые соединяют Якутию и Россию
            </h1>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container-main section-spacing-compact flex-1">
        {/* Центральный заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-2 leading-tight text-balance" style={{ color: 'var(--color-text-heading)' }}>
            Путешествия, которые соединяют Якутию и Россию
          </h1>
          {displaySection === 'routes' && (
            <h2 className="text-lg md:text-xl font-normal text-secondary">
              Ваш маршрут начинается здесь
            </h2>
          )}
        </div>

        {/* Навигационные табы */}
        <div className="mb-6">
          <NavigationTabs onSectionChange={handleSectionChange} activeSection={activeSection} />
        </div>

        {/* Контент с плавной анимацией */}
        <section aria-label={`Секция ${displaySection}`} className="relative min-h-[400px]">
          <div
            className={`${isTransitioning ? 'opacity-0' : 'animate-fade-in'} transition-opacity duration-base ${isTransitioning ? 'pointer-events-none' : 'pointer-events-auto'}`}
          >
            {renderContent()}
          </div>
        </section>
      </main>

      {/* Анимированный мамонтёнок */}
      <AssistantButton />

      {/* Footer */}
      <Footer />
    </div>
  )
}
