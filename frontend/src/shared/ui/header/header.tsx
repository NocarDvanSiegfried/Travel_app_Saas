'use client'

import Link from 'next/link'
import { ProfileIcon, SettingsIcon } from '@/shared/icons'

/**
 * Компонент хедера в стиле Skyscanner
 * 
 * Легкий, воздушный, минималистичный хедер с белым фоном
 * и акцентными элементами
 * 
 * @returns JSX элемент хедера
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-header-bg border-b border-header-border shadow-sm">
      <div className="container-main">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 transition-fast hover:opacity-75">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center" style={{ boxShadow: 'none' }}>
              <span className="text-inverse text-base font-medium">Т</span>
            </div>
            <span className="text-header-text font-medium text-sm hidden sm:block" style={{ letterSpacing: '-0.01em' }}>
              Travel App
            </span>
          </Link>

          {/* Right side - Profile and Settings */}
          <div className="flex items-center space-x-0.5">
            <Link
              href="/profile"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-sm hover:bg-surface-hover transition-fast"
              aria-label="Профиль"
            >
              <ProfileIcon className="w-3.5 h-3.5" color="var(--color-text-secondary)" />
              <span className="text-secondary text-xs hidden sm:inline font-normal" style={{ letterSpacing: '-0.01em' }}>Профиль</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-sm hover:bg-surface-hover transition-fast"
              aria-label="Настройки"
            >
              <SettingsIcon className="w-3.5 h-3.5" color="var(--color-text-secondary)" />
              <span className="text-secondary text-xs hidden sm:inline font-normal" style={{ letterSpacing: '-0.01em' }}>Настройки</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

