import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/shared/providers/query-provider'
import { ErrorBoundaryProvider } from '@/shared/providers/error-boundary-provider'
import { AppProviders } from '@/shared/providers/app-providers'
import { OfflineNotification, WebVitalsTracker, Footer } from '@/shared/ui'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Travel App - Путешествия по Якутии',
    template: '%s | Travel App',
  },
  description: 'Путешествия, которые соединяют Якутию и Россию. Найдите идеальный маршрут, отель или транспорт для вашего путешествия.',
  keywords: [
    'путешествия',
    'Якутия',
    'маршруты',
    'отели',
    'транспорт',
    'туризм',
    'бронирование',
    'поездки',
  ],
  authors: [{ name: 'Travel App' }],
  creator: 'Travel App',
  publisher: 'Travel App',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'Travel App',
    title: 'Travel App - Путешествия по Якутии',
    description: 'Путешествия, которые соединяют Якутию и Россию. Найдите идеальный маршрут, отель или транспорт для вашего путешествия.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Travel App - Путешествия по Якутии',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travel App - Путешествия по Якутии',
    description: 'Путешествия, которые соединяют Якутию и Россию. Найдите идеальный маршрут, отель или транспорт для вашего путешествия.',
    images: [
      {
        url: '/og-image.jpg',
        alt: 'Travel App - Путешествия по Якутии',
      },
    ],
    creator: '@travelapp',
    site: '@travelapp',
  },
  alternates: {
    canonical: '/',
  },
  category: 'travel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Schema.org разметка для SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'Travel App',
    description: 'Путешествия, которые соединяют Якутию и Россию',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/og-image.jpg`,
    sameAs: [
      'https://vk.com',
      'https://ok.ru',
      'https://t.me',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Russian'],
    },
    areaServed: {
      '@type': 'Country',
      name: 'Russia',
    },
  }

  return (
    <html lang="ru" className={`${inter.variable} antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Yandex Maps API */}
        {process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY && process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY.trim() !== '' && (
          <script
            src={`https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${encodeURIComponent(process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY)}`}
            defer
          />
        )}
      </head>
      <body className="font-sans min-h-screen flex flex-col">
        <QueryProvider>
          <ErrorBoundaryProvider>
            <AppProviders>
              <WebVitalsTracker />
              <OfflineNotification />
              <div className="flex flex-col flex-1">
                {children}
                <Footer />
              </div>
            </AppProviders>
          </ErrorBoundaryProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

