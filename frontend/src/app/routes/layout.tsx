import type { Metadata } from 'next'

/**
 * Метаданные для страницы поиска маршрутов
 * 
 * Динамические мета-теги для страницы результатов поиска маршрутов.
 * Включает Open Graph и Twitter Card теги для улучшения SEO и социальных превью.
 */
export const metadata: Metadata = {
  title: 'Поиск маршрутов',
  description: 'Найдите идеальный маршрут для путешествия по Якутии. Поиск билетов на самолеты, поезда и автобусы с учетом всех пересадок.',
  keywords: [
    'поиск маршрутов',
    'билеты',
    'Якутия',
    'авиабилеты',
    'железнодорожные билеты',
    'автобусные билеты',
    'бронирование',
  ],
  openGraph: {
    title: 'Поиск маршрутов | Travel App',
    description: 'Найдите идеальный маршрут для путешествия по Якутии. Поиск билетов на самолеты, поезда и автобусы с учетом всех пересадок.',
    type: 'website',
    url: '/routes',
    images: [
      {
        url: '/og-routes.jpg',
        width: 1200,
        height: 630,
        alt: 'Поиск маршрутов - Travel App',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Поиск маршрутов | Travel App',
    description: 'Найдите идеальный маршрут для путешествия по Якутии. Поиск билетов на самолеты, поезда и автобусы с учетом всех пересадок.',
    images: [
      {
        url: '/og-routes.jpg',
        alt: 'Поиск маршрутов - Travel App',
      },
    ],
  },
  alternates: {
    canonical: '/routes',
  },
}

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
