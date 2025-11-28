import { Header } from '@/shared/ui';
import Link from 'next/link';
import { Shield, CheckCircle, AlertTriangle, X, Clock, MapPin, Heart, Car, Plane } from 'lucide-react';

export default function InsuranceConditionsPage() {
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
            <span className="text-gray-900">Условия страхования</span>
          </nav>

          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-header-text">
              Условия страхования
            </h1>
            <p className="text-xl text-secondary">
              Детальные правила покрытия, исключения и требования к оформлению
            </p>
          </div>

          {/* Типы страхования */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Типы страхования
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Этапная страховка */}
              <div className="bg-white rounded-lg p-6 border border-light">
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Этапная страховка
                </h3>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Стоимость:</p>
                  <p className="text-2xl font-bold text-primary">300 ₽</p>
                  <p className="text-sm text-gray-500">на один билет/этап</p>
                </div>

                <h4 className="font-semibold mb-3 text-gray-900">Что покрывает:</h4>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Задержка рейса от 2 часов (компенсация 1000 ₽)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Отмена рейса по вине перевозчика (полный возврат)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Потеря багажа (до 30 000 ₽)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Медицинские расходы в пути (до 50 000 ₽)</span>
                  </li>
                </ul>

                <h4 className="font-semibold mb-3 text-gray-900">Для кого:</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Бюджетные путешествия, короткие поездки, когда нужно защитить конкретный билет.
                </p>
              </div>

              {/* Сквозная страховка */}
              <div className="bg-white rounded-lg p-6 border border-light">
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Сквозная страховка
                </h3>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Стоимость:</p>
                  <p className="text-2xl font-bold text-primary">от 1500 ₽</p>
                  <p className="text-sm text-gray-500">на всё путешествие</p>
                </div>

                <h4 className="font-semibold mb-3 text-gray-900">Что покрывает:</h4>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Отмена поездки из-за болезни (до 100 000 ₽)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Прерывание поездки (компенсация невозвратных расходов)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Экстренная эвакуация (полное покрытие)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Стоматологическая помощь (до 15 000 ₽)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Юридическая помощь (до 50 000 ₽)</span>
                  </li>
                </ul>

                <h4 className="font-semibold mb-3 text-gray-900">Для кого:</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Длительные путешествия, командировки, дорогие билеты с невозвратными тарифами.
                </p>
              </div>
            </div>
          </section>

          {/* Исключения */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <X className="h-6 w-6" />
              Исключения из покрытия
            </h2>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-900">
                Что НЕ покрывает страховка:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Медицинские исключения
                  </h4>
                  <ul className="space-y-1 text-sm text-red-700">
                    <li>• Хронические заболевания в стадии обострения</li>
                    <li>• Психические расстройства</li>
                    <li>• Алкогольное/наркотическое опьянение</li>
                    <li>• Беременность (после 30 недель)</li>
                    <li>• Косметические процедуры</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Общие исключения
                  </h4>
                  <ul className="space-y-1 text-sm text-red-700">
                    <li>• Умышленные действия</li>
                    <li>• Нарушение закона</li>
                    <li>• Участие в экстремальных видах спорта</li>
                    <li>• Военные действия, теракты</li>
                    <li>• Ядерные риски</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded border border-red-300">
                <p className="text-sm text-red-800">
                  <strong>Важно:</strong> Полный список исключений указан в правилах страхования.
                  Рекомендуем внимательно прочитать их перед покупкой.
                </p>
              </div>
            </div>
          </section>

          {/* Требования к оформлению */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Требования к оформлению
            </h2>

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-light">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Необходимые документы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Паспорт</p>
                      <p className="text-sm text-gray-600">Действующий паспорт РФ</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Контактные данные</p>
                      <p className="text-sm text-gray-600">Телефон и email</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Маршрут путешествия</p>
                      <p className="text-sm text-gray-600">Даты и направления</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Платежная карта</p>
                      <p className="text-sm text-gray-600">Для оплаты полиса</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-light">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Возрастные ограничения</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded">
                    <Heart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-900">Дети</p>
                    <p className="text-sm text-green-700">0-17 лет</p>
                    <p className="text-xs text-green-600 mt-1">
                      С согласия родителей, сниженная стоимость
                    </p>
                  </div>

                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="h-8 w-8 bg-blue-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">18-70</span>
                    </div>
                    <p className="font-semibold text-blue-900">Взрослые</p>
                    <p className="text-sm text-blue-700">18-70 лет</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Стандартное покрытие
                    </p>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded">
                    <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="font-semibold text-orange-900">Пожилые</p>
                    <p className="text-sm text-orange-700">70+ лет</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Медицинское заключение обязательно
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-light">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Сроки оформления</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Онлайн-оформление</p>
                      <p className="text-sm text-gray-600">5-10 минут</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Офисное оформление</p>
                      <p className="text-sm text-gray-600">15-30 минут</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Последний момент</p>
                      <p className="text-sm text-gray-600">До вылета (недорого)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Действия при страховом случае */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-header-text flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Действия при страховом случае
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-yellow-900">Что делать СРАЗУ:</h3>
                  <ol className="space-y-2 text-sm text-yellow-800">
                    <li><span className="font-semibold">1.</span> Позвонить на круглосуточную горячую линию</li>
                    <li><span className="font-semibold">2.</span> Сообщить номер полиса и детали случившегося</li>
                    <li><span className="font-semibold">3.</span> Следовать инструкциям ассистента</li>
                    <li><span className="font-semibold">4.</span> Сохранить все чеки и документы</li>
                    <li><span className="font-semibold">5.</span> Получить у врача справку о диагнозе</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-yellow-900">Куда обращаться:</h3>
                  <div className="space-y-3 text-sm text-yellow-800">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span><strong>ДТП:</strong> +7 (800) 555-35-35</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span><strong>Медицина:</strong> +7 (800) 555-36-36</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      <span><strong>Авиа:</strong> +7 (800) 555-37-37</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span><strong>Экстренные случаи:</strong> +7 (800) 555-38-38</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
                    <p className="text-xs text-yellow-900">
                      <strong>Важно:</strong> Звонок должен быть совершен в течение 24 часов с момента события
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
              <h2 className="text-2xl font-semibold mb-4 text-blue-900">
                Готовы оформить страховку?
              </h2>
              <p className="text-blue-700 mb-6">
                Защитите своё путешествие всего за несколько минут
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/insurance"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Оформить онлайн
                </Link>
                <Link
                  href="/insurance/faq"
                  className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Вопросы и ответы
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}