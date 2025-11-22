import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Детали маршрута',
  description: 'Подробная информация о выбранном маршруте, включая расписание, стоимость и оценку рисков',
  robots: {
    index: false,
    follow: true,
  },
}

export default function RouteDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
