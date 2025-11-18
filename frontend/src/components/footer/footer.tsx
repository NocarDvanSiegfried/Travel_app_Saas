'use client'

import Link from 'next/link'

export function Footer() {
  const handleSupportClick = () => {
    // Открыть чат-бот через кнопку мамонтёнка
    const assistantButton = document.querySelector('[aria-label="Помощник мамонтёнок"]') as HTMLElement
    if (assistantButton) {
      assistantButton.click()
    }
  }

  return (
    <footer className="mt-auto border-t border-black/20" style={{ backgroundColor: 'var(--color-header)' }}>
      <div className="container mx-auto px-4 py-3 max-w-[1300px]">
        <div className="flex items-center justify-between">
          {/* Логотип слева - точно как в header */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="AAL Logo"
              className="
                h-8
                w-auto
                scale-[1.8]
                origin-left
                drop-shadow-xl
              "
            />
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
              className="yakutia-transition hover:opacity-70"
              aria-label="VK"
            >
              <img
                src="/icons/vk.svg"
                alt="VK"
                className="w-6 h-6"
              />
            </a>
            <a
              href="https://ok.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="yakutia-transition hover:opacity-70"
              aria-label="Одноклассники"
            >
              <img
                src="/icons/ok.svg"
                alt="Одноклассники"
                className="w-6 h-6"
              />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="yakutia-transition hover:opacity-70"
              aria-label="Telegram"
            >
              <img
                src="/icons/telegram.svg"
                alt="Telegram"
                className="w-6 h-6"
              />
            </a>
            <span className="text-white text-sm">
              © 2025 AAЛ
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

