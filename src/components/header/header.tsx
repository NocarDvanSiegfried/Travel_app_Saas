'use client'

import Link from 'next/link'
import { ProfileIcon, SettingsIcon } from '@/shared/icons'
import { isLoggedIn, logout } from '@/shared/auth/useAuth'
import { useState, useEffect } from 'react'

export function Header() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
  };

  return (
    <header className="sticky top-0 z-50 shadow-lg border-b border-black/20" style={{ backgroundColor: 'var(--color-header)' }}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 rounded-yakutia flex items-center justify-center border border-white/30">
              <span className="text-white text-xl font-bold">Т</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">
              Travel App
            </span>
          </div>

          {/* Right side - Auth, Profile and Settings */}
          <div className="flex items-center space-x-4">
            {!loggedIn && (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-yakutia hover:bg-white/10 yakutia-transition text-white text-sm hover:opacity-80"
                  aria-label="Войти"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-yakutia hover:bg-white/10 yakutia-transition text-white text-sm hover:opacity-80"
                  aria-label="Регистрация"
                >
                  Регистрация
                </Link>
              </>
            )}
            {loggedIn && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-yakutia hover:bg-white/10 yakutia-transition text-white text-sm hover:opacity-80"
                aria-label="Выйти"
              >
                Выйти
              </button>
            )}
            <Link
              href="/profile"
              className="flex items-center space-x-2 px-4 py-2 rounded-yakutia hover:bg-white/10 yakutia-transition"
              aria-label="Профиль"
            >
              <ProfileIcon className="w-5 h-5" color="#FFFFFF" />
              <span className="text-white text-sm hidden sm:inline">Профиль</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center space-x-2 px-4 py-2 rounded-yakutia hover:bg-white/10 yakutia-transition"
              aria-label="Настройки"
            >
              <SettingsIcon className="w-5 h-5" color="#FFFFFF" />
              <span className="text-white text-sm hidden sm:inline">Настройки</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
