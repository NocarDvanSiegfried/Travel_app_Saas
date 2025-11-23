import { Header } from '@/shared/ui'

export default function LicensePage() {
  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="container-main section-spacing-compact">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-header-text">
            Документы
          </h1>

          <div className="space-y-8 text-secondary">
            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Пользовательское соглашение</h2>
              <p className="leading-relaxed mb-4">
                Добро пожаловать в Travel App SaaS! Используя наш сервис, вы соглашаетесь с условиями,
                изложенными в настоящем пользовательском соглашении.
              </p>
              <div className="space-y-3">
                <h3 className="font-semibold text-header-text">1. Условия использования</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Сервис предоставляется "как есть" без гарантий</li>
                  <li>Пользователь несет ответственность за достоверность предоставляемых данных</li>
                  <li>Запрещено использовать сервис для незаконных целей</li>
                </ul>

                <h3 className="font-semibold text-header-text mt-4">2. Конфиденциальность</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Мы защищаем персональные данные пользователей</li>
                  <li>Информация используется для улучшения качества сервиса</li>
                  <li>Мы не передаем данные третьим лицам без согласия</li>
                </ul>

                <h3 className="font-semibold text-header-text mt-4">3. Ограничения ответственности</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Сервис не несет ответственности за убытки пользователей</li>
                  <li>Мы не гарантируем доступность сервиса 24/7</li>
                  <li>Пользователи используют сервис на свой страх и риск</li>
                </ul>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Политика конфиденциальности</h2>
              <p className="leading-relaxed mb-4">
                Мы ценим ваше доверие и стремимся защищать вашу личную информацию.
              </p>
              <div className="space-y-3">
                <h3 className="font-semibold text-header-text">Сбор информации</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Собираем только необходимую информацию для предоставления услуг</li>
                  <li>Данные хранятся в зашифрованном виде</li>
                  <li>Используем современные методы защиты информации</li>
                </ul>

                <h3 className="font-semibold text-header-text mt-4">Использование данных</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Персонализация пользовательского опыта</li>
                  <li>Улучшение качества сервиса</li>
                  <li>Техническая поддержка</li>
                </ul>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Лицензирование</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-header-text mb-2">Open Source компоненты</h3>
                  <p className="leading-relaxed">
                    Наш сервис использует open source компоненты под следующими лицензиями:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>MIT License</li>
                    <li>Apache License 2.0</li>
                    <li>BSD License</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-header-text mb-2">Коммерческое использование</h3>
                  <p className="leading-relaxed">
                    Для коммерческого использования нашего сервиса необходимо получить специальную лицензию.
                    Свяжитесь с нами для получения подробной информации.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-header-text">Контакты</h2>
              <div className="space-y-3">
                <p>
                  <strong>Email:</strong> support@travelapp.ru
                </p>
                <p>
                  <strong>Телефон:</strong> +7 (XXX) XXX-XX-XX
                </p>
                <p>
                  <strong>Адрес:</strong> г. Якутск, ул. Ленина, 1
                </p>
                <p className="text-sm text-gray-600 mt-4">
                  Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}