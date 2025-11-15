import { Header } from '@/components/header'
import { SearchForm } from '@/components/search-form'
import { NavigationTabs } from '@/components/navigation-tabs'
import { AssistantButton } from '@/components/assistant-button'
import { RussiaMap } from '@/components/russia-map'

export default function Home() {
  return (
    <div className="min-h-screen yakutia-pattern relative">
      <Header />
      
      <main className="container mx-auto px-4 py-6 md:py-8 relative z-10 max-w-[1300px]">
        {/* Центральный заголовок */}
        <div className="text-center mb-5 md:mb-7">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight text-balance" style={{ color: 'var(--color-text-dark)' }}>
            Путешествия, которые соединяют Якутию и Россию
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-balance" style={{ color: 'var(--color-text-dark)' }}>
            Ваш маршрут начинается здесь
          </p>
        </div>

        {/* Поисковая форма */}
        <div className="mb-5">
          <SearchForm />
        </div>

        {/* Навигационные табы */}
        <div className="mb-5">
          <NavigationTabs />
        </div>

        {/* Карта России */}
        <div>
          <RussiaMap />
        </div>
      </main>

      {/* Анимированный мамонтёнок */}
      <AssistantButton />
    </div>
  )
}
