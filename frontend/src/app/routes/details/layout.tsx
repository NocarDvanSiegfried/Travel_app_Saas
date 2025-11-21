import type { Metadata } from 'next'

/**
 * Метаданные для страницы детальной информации о маршруте
 * 
 * Динамические мета-теги для страницы детальной информации о маршруте.
 * Включает Open Graph и Twitter Card теги для улучшения SEO и социальных превью.
 */
export const metadata: Metadata = {
  title: 'Детали маршрута',
  description: 'Подробная информация о маршруте: расписание, цены, пересадки, оценка рисков и альтернативные варианты.',
  keywords: [
    'детали маршрута',
    'расписание',
    'цены',
    'пересадки',
    'оценка рисков',
    'альтернативные маршруты',
  ],
  openGraph: {
    title: 'Детали маршрута | Travel App',
    description: 'Подробная информация о маршруте: расписание, цены, пересадки, оценка рисков и альтернативные варианты.',
    type: 'website',
    url: '/routes/details',
    images: [
      {
        url: '/og-route-details.jpg',
        width: 1200,
        height: 630,
        alt: 'Детали маршрута - Travel App',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Детали маршрута | Travel App',
    description: 'Подробная информация о маршруте: расписание, цены, пересадки, оценка рисков и альтернативные варианты.',
    images: [
      {
        url: '/og-route-details.jpg',
        alt: 'Детали маршрута - Travel App',
      },
    ],
  },
  alternates: {
    canonical: '/routes/details',
  },
}

export default function RouteDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
