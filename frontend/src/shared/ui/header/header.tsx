'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ProfileIcon, SettingsIcon } from '@/shared/icons'

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
    <header className="sticky top-0 z-50 bg-header-bg border-b border-header-border shadow-sm">
      <div className="container-main">
        <div className="flex items-center justify-between h-header">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-sm hover:opacity-80 transition-fast">
            <div className="w-logo h-logo bg-header-hover rounded-sm flex items-center justify-center shadow-none">
              <span className="text-header-text text-md font-medium">Т</span>
            </div>
            <span className="text-header-text font-medium text-sm hidden sm:block tracking-tight">
              Travel App
            </span>
          </Link>

          {/* Right side - Profile and Settings */}
          <div className="flex items-center gap-xs">
            <Link
              href="/profile"
              className="flex items-center gap-xs px-sm py-xs rounded-sm hover-header"
              aria-label="Профиль"
            >
              <ProfileIcon className="w-4 h-4" color="currentColor" />
              <span className="text-xs hidden sm:inline font-normal tracking-tight">Профиль</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-xs px-sm py-xs rounded-sm hover-header"
              aria-label="Настройки"
            >
              <SettingsIcon className="w-4 h-4" color="currentColor" />
              <span className="text-xs hidden sm:inline font-normal tracking-tight">Настройки</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
})

