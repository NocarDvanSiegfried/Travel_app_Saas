'use client'

import Link from 'next/link'
import { VkIcon, OkIcon, TelegramIcon } from '@/shared/icons'

export function Footer() {
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
        <div className="flex items-center justify-between py-2.5">
          {/* Логотип слева */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center" style={{ boxShadow: 'none' }}>
              <span className="text-inverse text-sm font-medium">Т</span>
            </div>
            <span className="text-header-text font-medium text-xs hidden sm:block" style={{ letterSpacing: '-0.01em' }}>
              Travel App
            </span>
          </div>

          {/* Центр - ссылки */}
          <div className="flex items-center space-x-2.5">
            <Link
              href="/about"
              className="text-secondary text-xs hover:text-primary transition-fast font-normal"
              style={{ letterSpacing: '-0.01em' }}
            >
              О нас
            </Link>
            <span className="text-tertiary text-xs opacity-40">•</span>
            <button
              type="button"
              onClick={handleSupportClick}
              aria-label="Открыть поддержку"
              className="text-secondary text-xs hover:text-primary transition-fast font-normal"
              style={{ letterSpacing: '-0.01em' }}
            >
              Поддержка
            </button>
            <span className="text-tertiary text-xs opacity-40">•</span>
            <Link
              href="/license"
              className="text-secondary text-xs hover:text-primary transition-fast font-normal"
              style={{ letterSpacing: '-0.01em' }}
            >
              Документы
            </Link>
          </div>

          {/* Справа - соц.значки и копирайт */}
          <div className="flex items-center space-x-2">
            <a
              href="https://vk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-fast hover:opacity-60 text-tertiary"
              aria-label="VK"
            >
              <VkIcon className="w-3.5 h-3.5" color="currentColor" />
            </a>
            <a
              href="https://ok.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-fast hover:opacity-60 text-tertiary"
              aria-label="Одноклассники"
            >
              <OkIcon className="w-3.5 h-3.5" color="currentColor" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-fast hover:opacity-60 text-tertiary"
              aria-label="Telegram"
            >
              <TelegramIcon className="w-3.5 h-3.5" color="currentColor" />
            </a>
            <span className="text-tertiary text-xs opacity-60" style={{ letterSpacing: '-0.01em' }}>
              © 2025
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

