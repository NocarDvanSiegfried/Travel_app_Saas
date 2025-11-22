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
        <div className="bg-header-bg">
          <div className="container-main section-spacing-compact">
            <div className="text-center mb-xl">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-sm leading-tight text-balance text-header-text">
                Путешествия, которые соединяют Якутию и Россию
              </h1>
            </div>
          </div>
        </div>
        <main className="container-main section-spacing-compact flex-1">
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Тёмная верхняя зона: заголовок + табы */}
      <div className="bg-header-bg">
        <div className="container-main section-spacing-compact">
          {/* Центральный заголовок */}
          <div className="text-center mb-xl">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-sm leading-tight text-balance text-header-text">
              Путешествия, которые соединяют Якутию и Россию
            </h1>
            {displaySection === 'routes' && (
              <h2 className="text-lg md:text-xl font-normal text-header-secondary">
                Ваш маршрут начинается здесь
              </h2>
            )}
          </div>

          {/* Навигационные табы */}
          <div className="mb-xl">
            <NavigationTabs onSectionChange={handleSectionChange} activeSection={activeSection} />
          </div>
        </div>
      </div>

      {/* Светлая контентная часть */}
      <main className="container-main section-spacing-compact flex-1" aria-live="polite" aria-atomic="false">
        {/* Контент с плавной анимацией */}
        <section aria-label={`Секция ${displaySection}`} className="relative min-h-screen">
          <div
            className={`${isTransitioning ? 'opacity-0 pointer-events-none' : 'animate-fade-in pointer-events-auto'} transition-opacity`}
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
