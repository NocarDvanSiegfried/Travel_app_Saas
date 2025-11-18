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
    <header className="w-full h-14 flex items-center justify-between px-6 bg-[#1F5767] shadow-md">
      <div className="container mx-auto w-full">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="AAL Logo"
              className="h-10 w-auto scale-[2.0] origin-left drop-shadow-xl"
            />
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
