'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ProfileIcon, SettingsIcon, ShieldIcon } from '@/shared/icons'
import { BrandLogo } from '@/shared/ui'

/**
 * Компонент хедера в стиле Skyscanner
 * 
 * Тёмный минималистичный хедер с светлыми элементами
 * и акцентными элементами
 * 
 * @returns JSX элемент хедера
 */
export const Header = memo(function Header() {
  return (
    <header className="sticky top-0 z-50 bg-header-bg border-b border-light shadow-sm">
      <div className="container-main">
        <div className="flex items-center justify-between h-header">
          {/* Brand Block */}
          <BrandLogo link={true} className="shrink-0" />

          {/* Right side - Insurance, Profile and Settings */}
          <div className="flex items-center gap-sm">
            <Link
              href="/insurance"
              className="flex items-center gap-sm px-sm py-xs rounded-sm hover-header bg-blue-600 hover:bg-blue-700 transition-colors"
              aria-label="Страхование"
            >
              <ShieldIcon className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-medium tracking-tight hidden md:inline">Страхование</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-sm px-sm py-xs rounded-sm hover-header"
              aria-label="Профиль"
            >
              <ProfileIcon className="w-4 h-4 text-inverse hover-header-icon" color="var(--color-text-inverse)" />
              <span className="text-sm text-inverse font-medium tracking-tight hidden md:inline">Профиль</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-sm px-sm py-xs rounded-sm hover-header"
              aria-label="Настройки"
            >
              <SettingsIcon className="w-4 h-4 text-inverse hover-header-icon" color="var(--color-text-inverse)" />
              <span className="text-sm text-inverse font-medium tracking-tight hidden md:inline">Настройки</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
})

