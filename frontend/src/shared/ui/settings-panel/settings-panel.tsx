'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SettingsIcon } from '@/shared/icons'
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  HelpCircle,
  CreditCard,
  LogOut,
  Moon,
  Sun
} from 'lucide-react'

interface SettingsPanelProps {
  children?: React.ReactNode
}

export const SettingsPanel = ({ children }: SettingsPanelProps) => {
  const [open, setOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const settingsSections = [
    {
      title: 'Профиль',
      icon: User,
      items: [
        { label: 'Личные данные', action: () => console.log('Личные данные') },
        { label: 'Безопасность', action: () => console.log('Безопасность') },
      ]
    },
    {
      title: 'Уведомления',
      icon: Bell,
      items: [
        { label: 'Email-уведомления', action: () => console.log('Email') },
        { label: 'Push-уведомления', action: () => console.log('Push') },
      ]
    },
    {
      title: 'Оформление',
      icon: Palette,
      items: [
        {
          label: darkMode ? 'Светлая тема' : 'Темная тема',
          action: () => setDarkMode(!darkMode),
          icon: darkMode ? Sun : Moon
        },
      ]
    },
    {
      title: 'Язык и регион',
      icon: Globe,
      items: [
        { label: 'Русский', action: () => console.log('Русский') },
        { label: 'English', action: () => console.log('English') },
      ]
    },
    {
      title: 'Платежи',
      icon: CreditCard,
      items: [
        { label: 'Способы оплаты', action: () => console.log('Платежи') },
        { label: 'История платежей', action: () => console.log('История') },
      ]
    },
    {
      title: 'Поддержка',
      icon: HelpCircle,
      items: [
        { label: 'Центр помощи', action: () => console.log('Помощь') },
        { label: 'Связаться с нами', action: () => console.log('Контакты') },
      ]
    },
    {
      title: 'Приватность',
      icon: Shield,
      items: [
        { label: 'Политика конфиденциальности', action: () => console.log('Конфиденциальность') },
        { label: 'Условия использования', action: () => console.log('Условия') },
      ]
    }
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-sm px-sm py-xs rounded-sm hover-header"
            aria-label="Настройки"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="text-sm font-medium tracking-tight">Настройки</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold">Настройки</SheetTitle>
          <SheetDescription>
            Управление профилем и настройками приложения
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
          {settingsSections.map((section, index) => {
            const Icon = section.icon
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">{section.title}</h3>
                </div>
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => {
                    const ItemIcon = item.icon
                    return (
                      <button
                        key={itemIndex}
                        onClick={() => {
                          item.action()
                          if (item.label.includes('тему')) {
                            // Не закрываем панель при смене темы
                          } else {
                            setOpen(false)
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3"
                      >
                        {ItemIcon && <ItemIcon className="w-4 h-4" />}
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
                {index < settingsSections.length - 1 && (
                  <div className="border-t pt-4 mt-4" />
                )}
              </div>
            )
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
          <Button
            variant="destructive"
            className="w-full flex items-center gap-2"
            onClick={() => {
              console.log('Выход из системы')
              setOpen(false)
            }}
          >
            <LogOut className="w-4 h-4" />
            Выйти из аккаунта
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}