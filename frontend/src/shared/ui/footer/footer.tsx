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
    <footer className="mt-auto border-t border-black/20 bg-header">
      <div className="container mx-auto px-4 py-3 max-w-[1300px]">
        <div className="flex items-center justify-between">
          {/* Логотип слева - точно как в header */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 rounded-yakutia flex items-center justify-center border border-white/30">
              <span className="text-white text-xl font-bold">Т</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">
              Travel App
            </span>
          </div>

          {/* Центр - ссылки */}
          <div className="flex items-center space-x-4">
            <Link
              href="/about"
              className="text-white text-sm hover:text-white/80 yakutia-transition"
            >
              О нас
            </Link>
            <span className="text-white/40 text-sm">•</span>
            <button
              type="button"
              onClick={handleSupportClick}
              aria-label="Открыть поддержку"
              className="text-white text-sm hover:text-white/80 yakutia-transition"
            >
              Поддержка
            </button>
            <span className="text-white/40 text-sm">•</span>
            <Link
              href="/license"
              className="text-white text-sm hover:text-white/80 yakutia-transition"
            >
              Документы
            </Link>
          </div>

          {/* Справа - соц.значки и копирайт в одной линии */}
          <div className="flex items-center space-x-3">
            <a
              href="https://vk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="yakutia-transition hover:opacity-70 text-light"
              aria-label="VK"
            >
              <VkIcon className="w-5 h-5" color="currentColor" />
            </a>
            <a
              href="https://ok.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="yakutia-transition hover:opacity-70 text-light"
              aria-label="Одноклассники"
            >
              <OkIcon className="w-5 h-5" color="currentColor" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="yakutia-transition hover:opacity-70 text-light"
              aria-label="Telegram"
            >
              <TelegramIcon className="w-5 h-5" color="currentColor" />
            </a>
            <span className="text-white/60 text-sm">
              © 2025 Travel App
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

