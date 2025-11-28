import { Header } from '@/shared/ui'
import { InsuranceTab } from '@/modules/services/features/services-section/ui/insurance-tab'

export default function InsurancePage() {
  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="container-main section-spacing-compact">
        <div className="max-w-6xl mx-auto">
          {/* Навигация по разделам страхования */}
          <div className="mb-xl">
            <nav className="flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href="/insurance"
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium"
              >
                Главная
              </Link>
              <Link
                href="/insurance/conditions"
                className="px-4 py-2 bg-white text-gray-700 border border-light rounded-lg font-medium hover:bg-gray-50"
              >
                Условия
              </Link>
              <Link
                href="/insurance/how-to"
                className="px-4 py-2 bg-white text-gray-700 border border-light rounded-lg font-medium hover:bg-gray-50"
              >
                Как оформить
              </Link>
              <Link
                href="/insurance/faq"
                className="px-4 py-2 bg-white text-gray-700 border border-light rounded-lg font-medium hover:bg-gray-50"
              >
                Вопросы и ответы
              </Link>
            </nav>
          </div>

          {/* Заголовок страницы */}
          <div className="text-center mb-xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-header-text">
              Страхование путешественников
            </h1>
            <p className="text-xl text-secondary max-w-4xl mx-auto">
              Комплексная защита вашего путешествия по Якутии и России.
              Модульная система страхования для максимальной безопасности.
            </p>
          </div>

          {/* Основной компонент страхования */}
          <InsuranceTab />

          {/* Дополнительная информация */}
          <div className="mt-16 space-y-8">
            {/* Преимущества */}
            <section className="bg-white rounded-lg p-8 shadow-sm border border-light">
              <h2 className="text-2xl font-semibold mb-6 text-header-text">
                Почему выбирают нашу страховку?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🛡️</div>
                  <h3 className="font-semibold mb-2 text-primary">Надежная защита</h3>
                  <p className="text-sm text-secondary">
                    Два типа страхования для разных бюджетов и потребностей
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">⚡</div>
                  <h3 className="font-semibold mb-2 text-primary">Быстрое оформление</h3>
                  <p className="text-sm text-secondary">
                    Получите полис онлайн за 2 минуты без визита в офис
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">💰</div>
                  <h3 className="font-semibold mb-2 text-primary">Выгодные условия</h3>
                  <p className="text-sm text-secondary">
                    Гибкие цены и система скидок при комплексной покупке
                  </p>
                </div>
              </div>
            </section>

            {/* Как это работает */}
            <section className="bg-white rounded-lg p-8 shadow-sm border border-light">
              <h2 className="text-2xl font-semibold mb-6 text-header-text">
                Как это работает?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-primary">Выберите тип</h3>
                  <p className="text-sm text-secondary">
                    Этапная или сквозная страховка
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-primary">Оформите онлайн</h3>
                  <p className="text-sm text-secondary">
                    Заполните форму и оплатите картой
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-primary">Получите полис</h3>
                  <p className="text-sm text-secondary">
                    Электронный полис сразу на вашу почту
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-primary">Путешествуйте спокойно</h3>
                  <p className="text-sm text-secondary">
                    Мы рядом 24/7 при возникновении проблем
                  </p>
                </div>
              </div>
            </section>

            {/* Часто задаваемые вопросы */}
            <section className="bg-white rounded-lg p-8 shadow-sm border border-light">
              <h2 className="text-2xl font-semibold mb-6 text-header-text">
                Часто задаваемые вопросы
              </h2>
              <div className="space-y-6">
                <div className="border-b border-light pb-4">
                  <h3 className="font-semibold mb-2 text-primary">
                    Что такое этапная страховка?
                  </h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Это недорогая страховка, которая защищает вас на конкретном этапе путешествия
                    (один билет, один вид транспорта). Идеально подходит для бюджетных поездок.
                  </p>
                </div>
                <div className="border-b border-light pb-4">
                  <h3 className="font-semibold mb-2 text-primary">
                    В чем разница со сквозной страховкой?
                  </h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Сквозная страховка защищает все путешествие целиком, включая крупные риски
                    вроде невыезда из-за болезни или прерывания поездки. Это ваш "спасательный круг".
                  </p>
                </div>
                <div className="border-b border-light pb-4">
                  <h3 className="font-semibold mb-2 text-primary">
                    Можно ли купить оба типа страхования?
                  </h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Да! Это самый надежный вариант. Вы получаете и мелкую защиту от неудобств,
                    и крупную защиту от катастрофических рисков.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-primary">
                    Как получить помощь при страховом случае?
                  </h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Позвоните на круглосуточную горячую линию, указанную в вашем полисе,
                    или напишите нам на support@travelapp.ru
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}