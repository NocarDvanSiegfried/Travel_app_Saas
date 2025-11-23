import { Header } from '@/shared/ui'

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="container-main section-spacing-compact">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-header-text">
            О нас
          </h1>

          <div className="space-y-8 text-secondary">
            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Travel App SaaS</h2>
              <p className="leading-relaxed">
                Travel App SaaS — это инновационная система для планирования и покупки билетов на транспорт,
                которая соединяет Якутию и Россию. Наше приложение предлагает уникальный опыт путешествий
                с интеллектуальным помощником-мамонтёнком.
              </p>
            </section>

            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Наша миссия</h2>
              <p className="leading-relaxed">
                Мы стремимся сделать путешествия по Якутии доступными, комфортными и безопасными для всех.
                Наша платформа объединяет современные технологии с глубоким пониманием региональных особенностей,
                предлагая пользователям лучшие маршруты и сервисы.
              </p>
            </section>

            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Наши преимущества</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Интеллектуальный помощник для планирования маршрутов</li>
                <li>Оценка рисков путешествий по 10-балльной шкале</li>
                <li>Подбор оптимальных транспортных вариантов</li>
                <li>Интеграция с отелями и дополнительными услугами</li>
                <li>Персонализированные рекомендации</li>
              </ul>
            </section>

            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Технологии</h2>
              <p className="leading-relaxed mb-4">
                Наша платформа построена на современных технологиях:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Frontend</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Next.js 14 с TypeScript</li>
                    <li>• React 18</li>
                    <li>• Tailwind CSS</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Backend</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Node.js 18</li>
                    <li>• PostgreSQL</li>
                    <li>• Redis</li>
                    <li>• MinIO S3</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}