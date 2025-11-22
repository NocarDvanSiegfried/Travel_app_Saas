'use client'

import { memo } from 'react'
import Link from 'next/link'
import { VkIcon, OkIcon, TelegramIcon } from '@/shared/icons'

export const Footer = memo(function Footer() {
  const handleSupportClick = () => {
    // Открыть чат-бот через кнопку мамонтёнка
    const assistantButton = document.querySelector('[aria-label="Помощник мамонтёнок"]') as HTMLElement
    if (assistantButton) {
      assistantButton.click()
    }
  }

  return (
    <footer className="mt-auto border-t border-header-border bg-header-bg shadow-sm">
      <div className="container-main">
        <div className="flex items-center justify-between py-sm">
          {/* Логотип слева */}
          <div className="flex items-center gap-sm">
            <div className="w-logo h-logo bg-header-hover rounded-sm flex items-center justify-center shadow-none">
              <span className="text-header-text text-sm font-medium">Т</span>
            </div>
            <span className="text-header-text font-medium text-xs hidden sm:block tracking-tight">
              Travel App
            </span>
          </div>

          {/* Центр - ссылки */}
          <div className="flex items-center gap-sm">
            <Link
              href="/about"
              className="text-xs font-normal tracking-tight hover-header-link transition-fast"
            >
              О нас
            </Link>
            <span className="text-xs text-header-tertiary">•</span>
            <button
              type="button"
              onClick={handleSupportClick}
              aria-label="Открыть поддержку"
              className="text-xs font-normal tracking-tight hover-header-link transition-fast"
            >
              Поддержка
            </button>
            <span className="text-xs text-header-tertiary">•</span>
            <Link
              href="/license"
              className="text-xs font-normal tracking-tight hover-header-link transition-fast"
            >
              Документы
            </Link>
          </div>

          {/* Справа - соц.значки и копирайт */}
          <div className="flex items-center gap-sm">
            <a
              href="https://vk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-header-icon"
              aria-label="VK"
            >
              <VkIcon className="w-4 h-4" color="currentColor" />
            </a>
            <a
              href="https://ok.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-header-icon"
              aria-label="Одноклассники"
            >
              <OkIcon className="w-4 h-4" color="currentColor" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-header-icon"
              aria-label="Telegram"
            >
              <TelegramIcon className="w-4 h-4" color="currentColor" />
            </a>
            <span className="text-xs tracking-tight text-header-tertiary">
              © 2025
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
})

