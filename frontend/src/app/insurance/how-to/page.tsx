import { Header } from '@/shared/ui';
import Link from 'next/link';
import { CreditCard, FileText, CheckCircle, Clock, Shield, Phone, Mail, MapPin, Users, HelpCircle } from 'lucide-react';

export default function InsuranceHowToPage() {
  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="container-main section-spacing-compact">
        <div className="max-w-4xl mx-auto">
          {/* Хлебные крошки */}
          <nav className="mb-8 text-sm">
            <Link href="/insurance" className="text-primary hover:text-primary/80">
              Страхование
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900">Как оформить</span>
          </nav>

          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-header-text">
              Как оформить страховку
            </h1>
            <p className="text-xl text-secondary">
              Простая и быстрая процедура оформления полиса за 5 шагов
            </p>
          </div>

          {/* Способы оформления */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text">
              Выберите удобный способ
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border-2 border-primary shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold text-primary">Онлайн-оформление</h3>
                </div>
                <ul className="space-y-2 mb-4 text-sm text-gray-600">
                  <li>• Самый быстрый способ - 5 минут</li>
                  <li>• Круглосуточная доступность</li>
                  <li>• Мгновенная отправка полиса на email</li>
                  <li>• Скидка 10% за онлайн-покупку</li>
                  <li>• Сохранение данных в личном кабинете</li>
                </ul>
                <Link
                  href="/insurance"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Оформить онлайн
                </Link>
              </div>

              <div className="bg-white rounded-lg p-6 border border-light shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-6 w-6 text-gray-600" />
                  <h3 className="text-xl font-semibold text-gray-900">В офисе</h3>
                </div>
                <ul className="space-y-2 mb-4 text-sm text-gray-600">
                  <li>• Личная консультация специалиста</li>
                  <li>• Помощь с выбором оптимального пакета</li>
                  <li>• Бумажный полис на руках</li>
                  <li>• Возможность оплаты наличными</li>
                  <li>• Разрешение сложных вопросов</li>
                </ul>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Адреса офисов:</p>
                  <p>г. Якутск, пр. Ленина, 45</p>
                  <p>г. Якутск, ул. Кравченко, 12</p>
                </div>
              </div>
            </div>
          </section>

          {/* Пошаговая инструкция онлайн */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Онлайн-оформление за 5 шагов
            </h2>

            <div className="space-y-4">
              {/* Шаг 1 */}
              <div className="bg-white rounded-lg p-6 border border-light flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Выберите тип страхования</h3>
                  <p className="text-gray-600 mb-4">
                    Определите, какой тип страховки вам нужен - этапная для защиты конкретных билетов
                    или сквозная для покрытия всего путешествия.
                  </p>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-800">
                    <strong>Совет:</strong> Для дорогих путешествий рекомендуем оба типа страхования
                  </div>
                </div>
              </div>

              {/* Шаг 2 */}
              <div className="bg-white rounded-lg p-6 border border-light flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Заполните личные данные</h3>
                  <p className="text-gray-600 mb-4">
                    Введите ФИО, дату рождения, паспортные данные и контактную информацию.
                    Убедитесь, что все данные указаны верно.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium text-gray-700">Обязательно:</p>
                      <ul className="text-gray-600">
                        <li>• ФИО как в паспорте</li>
                        <li>• Серия и номер паспорта</li>
                        <li>• Телефон для связи</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium text-gray-700">Рекомендуется:</p>
                      <ul className="text-gray-600">
                        <li>• Email для полиса</li>
                        <li>• Адрес регистрации</li>
                        <li>• Медицинские противопоказания</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Шаг 3 */}
              <div className="bg-white rounded-lg p-6 border border-light flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Укажите детали путешествия</h3>
                  <p className="text-gray-600 mb-4">
                    Добавьте информацию о маршруте, датах поездки и видах транспорта.
                    Это нужно для точного расчета стоимости и покрытия.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
                    <strong>Внимание:</strong> Некорректные даты могут привести к отказу в выплате
                  </div>
                </div>
              </div>

              {/* Шаг 4 */}
              <div className="bg-white rounded-lg p-6 border border-light flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">4</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Оплатите полис</h3>
                  <p className="text-gray-600 mb-4">
                    Выберите удобный способ оплаты - банковской картой или электронным кошельком.
                    Все платежи защищены и безопасны.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">V</span>
                      </div>
                      Visa
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-8 h-5 bg-red-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      MasterCard
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-8 h-5 bg-green-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      МИР
                    </div>
                  </div>
                </div>
              </div>

              {/* Шаг 5 */}
              <div className="bg-white rounded-lg p-6 border border-light flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Получите полис</h3>
                  <p className="text-gray-600 mb-4">
                    Сразу после оплаты вы получите электронный полис на email.
                    Дополнительно полис будет доступен в личном кабинете.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded border border-green-200 text-sm">
                      <p className="font-medium text-green-800">Что вы получите:</p>
                      <ul className="text-green-700">
                        <li>• Электронный полис (PDF)</li>
                        <li>• Правила страхования</li>
                        <li>• Контакты ассистанса</li>
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                      <p className="font-medium text-blue-800">Действия:</p>
                      <ul className="text-blue-700">
                        <li>• Сохраните полис</li>
                        <li>• Распечатайте при желании</li>
                        <li>• Сохраните контакты</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Офисное оформление */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Офисное оформление
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Что нужно взять с собой</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Паспорт РФ</p>
                      <p className="text-sm text-gray-600">Оригинал</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Данные всех застрахованных</p>
                      <p className="text-sm text-gray-600">ФИО, даты рождения, паспорта</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Детали маршрута</p>
                      <p className="text-sm text-gray-600">Даты, направления, билеты</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Способ оплаты</p>
                      <p className="text-sm text-gray-600">Наличные или карта</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Процесс в офисе</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li><span className="font-semibold">1.</span> Консультация специалиста (5-10 минут)</li>
                  <li><span className="font-semibold">2.</span> Заполнение анкеты (10-15 минут)</li>
                  <li><span className="font-semibold">3.</span> Расчет стоимости (2-3 минуты)</li>
                  <li><span className="font-semibold">4.</span> Оплата (2-5 минут)</li>
                  <li><span className="font-semibold">5.</span> Выдача полиса (2-3 минуты)</li>
                </ol>

                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200 text-sm">
                  <p className="text-green-800">
                    <strong>Итого:</strong> 25-35 минут на всё про всё
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Поддержка */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Нужна помощь с оформлением?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 border border-light text-center">
                <Phone className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900">Телефон</h3>
                <p className="text-blue-600 font-medium mb-1">8 (800) 555-35-35</p>
                <p className="text-sm text-gray-500">Ежедневно, 8:00 - 20:00</p>
                <p className="text-xs text-gray-400 mt-2">Бесплатно по России</p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-light text-center">
                <Mail className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900">Email</h3>
                <p className="text-green-600 font-medium mb-1">info@travelapp.ru</p>
                <p className="text-sm text-gray-500">Ответ в течение 2 часов</p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-light text-center">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900">Чат на сайте</h3>
                <p className="text-purple-600 font-medium mb-1">Онлайн консультант</p>
                <p className="text-sm text-gray-500">Пн-Пт, 9:00 - 18:00</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                Готовы защитить своё путешествие?
              </h2>
              <p className="text-gray-600 mb-6">
                Начните оформление страховки прямо сейчас и получите скидку 10%
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/insurance"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Оформить онлайн
                </Link>
                <Link
                  href="/insurance/conditions"
                  className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Изучить условия
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}