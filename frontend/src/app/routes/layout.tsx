import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Результаты поиска маршрутов',
  description: 'Найдите идеальный маршрут для вашего путешествия по Якутии и России',
  robots: {
    index: false,
    follow: true,
  },
}

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
