'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RouteIcon, HotelIcon, CarIcon, ServicesIcon, HeartIcon } from '@/shared/icons'

const tabs = [
  { id: 'routes', label: 'Маршруты', Icon: RouteIcon, href: '/' },
  { id: 'hotels', label: 'Гостиницы', Icon: HotelIcon, href: '/hotels' },
  { id: 'cars', label: 'Авто', Icon: CarIcon, href: '/cars' },
  { id: 'services', label: 'Услуги', Icon: ServicesIcon, href: '/services' },
  { id: 'favorites', label: 'Путешествуйте выгодно', Icon: HeartIcon, href: '/favorites' },
]

export function NavigationTabs() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <nav className="yakutia-card mt-5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center md:justify-start overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === '/' && pathname === '/')
            const Icon = tab.Icon
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center space-x-3 px-6 py-3 border-b-2 yakutia-smooth
                  ${isActive
                    ? 'border-[#0f9eb1] text-[#0f9eb1] font-semibold'
                    : 'border-transparent text-white/80 hover:text-white hover:border-white/30'
                  }
                `}
              >
                <Icon 
                  className="w-5 h-5 yakutia-smooth" 
                  color={isActive ? '#0f9eb1' : 'rgba(255, 255, 255, 0.8)'}
                />
                <span className="text-sm whitespace-nowrap">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

