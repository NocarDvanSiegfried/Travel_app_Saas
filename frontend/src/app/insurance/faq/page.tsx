'use client';

import { Header } from '@/shared/ui';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle, Phone, Mail, Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Что такое этапная страховка?',
    answer: 'Этапная страховка - это недорогой вид страхования, который покрывает конкретный этап путешествия (один билет, один вид транспорта). Она защищает от задержек, отмен рейсов, потери багажа и небольших медицинских расходов на время перевозки. Стоимость - 300 рублей на один билет.',
    category: 'Типы страхования',
    tags: ['этапная', 'билеты', 'дешево']
  },
  {
    id: '2',
    question: 'Чем сквозная страховка отличается от этапной?',
    answer: 'Сквозная страховка покрывает всё путешествие целиком, включая крупные риски: отмену поездки из-за болезни, прерывание поездки, экстренную эвакуацию. Этапная страхует только конкретные билеты. Сквозная дороже (от 1500 ₽), но защищает от более серьезных финансовых потерь.',
    category: 'Типы страхования',
    tags: ['сквозная', 'отличия', 'покрытие']
  },
  {
    id: '3',
    question: 'Можно ли купить оба типа страхования одновременно?',
    answer: 'Да! Комбинированная защита - самый надежный вариант. Этапная страховка покроет мелкие неудобства (задержки, потеря багажа), а сквозная защитит от крупных рисков (отмена поездки, болезнь). При покупке обоих типов предоставляется скидка 15%.',
    category: 'Типы страхования',
    tags: ['комбинация', 'два типа', 'скидка']
  },
  {
    id: '4',
    question: 'Как быстро можно оформить полис?',
    answer: 'Онлайн-оформление занимает 5-10 минут. После оплаты полис сразу приходит на email. Офисное оформление занимает 25-35 минут. Рекомендуем оформлять онлайн - это быстрее и выгоднее (скидка 10%).',
    category: 'Оформление',
    tags: ['скорость', 'онлайн', 'оформление']
  },
  {
    id: '5',
    question: 'Какие документы нужны для оформления?',
    answer: 'Для онлайн-оформления нужен только паспорт РФ и контактные данные. Для офисного оформления дополнительно нужны детали маршрута (даты, направления). Для детей до 18 лет необходимо согласие родителей.',
    category: 'Оформление',
    tags: ['документы', 'паспорт', 'требования']
  },
  {
    id: '6',
    question: 'С какого возраста можно застраховать ребенка?',
    answer: 'Детей можно застраховать с рождения. До 18 лет страхование оформляют родители с письменного согласия. Для детей от 0 до 17 лет действуют сниженные тарифы. Дети до 2 лет обычно летают бесплатно, но страховка для них все равно рекомендуется.',
    category: 'Возрастные ограничения',
    tags: ['дети', 'возраст', 'тарифы']
  },
  {
    id: '7',
    question: 'Есть ли ограничения по возрасту для взрослых?',
    answer: 'Стандартное страхование доступно для граждан РФ от 18 до 70 лет. Для людей старше 70 лет требуется медицинское заключение об отсутствии противопоказаний к путешествию. Стоимость страхования для пожилых людей может быть выше.',
    category: 'Возрастные ограничения',
    tags: ['пожилые', '70+', 'медицина']
  },
  {
    id: '8',
    question: 'Что делать при задержке рейса?',
    answer: 'При задержке рейса более 2 часов: 1) Сохраните посадочный талон и уведомление о задержке 2) Позвоните на горячую линию ассистанса 3) При необходимости оплатите питание и проживание - сохраните чеки. Компенсация составляет 1000 ₽ за каждые 2 часа задержки.',
    category: 'Страховые случаи',
    tags: ['задержка', 'рейс', 'компенсация']
  },
  {
    id: '9',
    question: 'Как получить компенсацию при отмене рейса?',
    answer: 'При отмене рейса по вине перевозчика: 1) Получите справку от авиакомпании об отмене рейса 2) Сохраните билеты и чеки 3) Обратитесь к нам с заявлением и документами. Компенсация составит полную стоимость билета в пределах тарифа.',
    category: 'Страховые случаи',
    tags: ['отмена', 'рейс', 'компенсация']
  },
  {
    id: '10',
    question: 'Покрывает ли страховка хронические заболевания?',
    answer: 'Стандартная страховка не покрывает обострения хронических заболеваний. Однако можно приобрести расширенное страхование с покрытием хронических болезней. Это требует медицинского освидетельствования и стоит дороже.',
    category: 'Медицинское покрытие',
    tags: ['болезни', 'хронические', 'покрытие']
  },
  {
    id: '11',
    question: 'Как работает медицинская помощь за рубежом?',
    answer: 'При болезни за рубежом: 1) Сразу позвоните на круглосуточную горячую линию (номер в полисе) 2) Ассистент подберет клинику и организует помощь 3) Расчеты с клиникой ведет страховая компания 4) Сохраняйте все документы и чеки.',
    category: 'Медицинское покрытие',
    tags: ['медицина', 'заграница', 'ассистанс']
  },
  {
    id: '12',
    question: 'Что входит в экстренную эвакуацию?',
    answer: 'Экстренная эвакуация включает: медицинскую транспортировку до ближайшей больницы, организацию и оплату санитарного транспорта, эвакуацию в Россию при необходимости, сопровождение медицинским персоналом. Покрывается только при жизнеугрожающих состояниях.',
    category: 'Медицинское покрытие',
    tags: ['эвакуация', 'транспортировка', 'скорая']
  },
  {
    id: '13',
    question: 'Какие риски НЕ покрываются страховкой?',
    answer: 'Исключения: умышленные действия, нарушение закона, участие в экстремальных видах спорта, военные действия, терроризм, хронические заболевания в стадии обострения, психические расстройства, алкогольное/наркотическое опьянение, косметические процедуры.',
    category: 'Исключения',
    tags: ['исключения', 'не покрывается', 'ограничения']
  },
  {
    id: '14',
    question: 'Можно ли вернуть полис, если поездка отменяется?',
    answer: 'Да, можно вернуть полис до начала поездки. Возврат осуществляется за вычетом фактических расходов. Если поездка отменяется по уважительной причине (болезнь), можно вернуть полную стоимость при предоставлении подтверждающих документов.',
    category: 'Возврат и отмена',
    tags: ['возврат', 'отмена', 'деньги']
  },
  {
    id: '15',
    question: 'Как продлить действующий полис?',
    answer: 'Продление возможно до окончания срока действия полиса. Обратитесь в службу поддержки или оформите новый полис через личный кабинет. При продлении предоставляется скидка 5% для постоянных клиентов.',
    category: 'Возврат и отмена',
    tags: ['продление', 'срок', 'скидка']
  },
  {
    id: '16',
    question: 'Как связаться со службой поддержки?',
    answer: 'Круглосуточная горячая линия: 8 (800) 555-35-35. Email: support@travelapp.ru. Чат на сайте: Пн-Пт 9:00-18:00. Офисы в Якутске: пр. Ленина, 45 и ул. Кравченко, 12 (Пн-Пт 10:00-19:00, Сб 10:00-16:00).',
    category: 'Поддержка',
    tags: ['контакты', 'помощь', 'служба поддержки']
  },
  {
    id: '17',
    question: 'Что делать при потере багажа?',
    answer: 'При потере багажа: 1) Сразу сообщите в службу багажа аэропорта 2) Получите багажную квитанцию (Property Irregularity Report) 3) Сохраните посадочные талоны и чеки 4) В течение 24 часов позвоните ассистансу 5) Напишите заявление о возврате. Компенсация до 30 000 ₽.',
    category: 'Страховые случаи',
    tags: ['багаж', 'потеря', 'компенсация']
  },
  {
    id: '18',
    question: 'Действует ли страховка в других странах?',
    answer: 'Да, наша страховка действует во всех странах мира. Однако для некоторых стран (США, Шенген) может потребоваться дополнительное страхование с минимальным покрытием €30 000. уточняйте требования страны назначения.',
    category: 'География',
    tags: ['другие страны', 'заграница', 'покрытие']
  },
  {
    id: '19',
    question: 'Как получить выплаты по страховке?',
    answer: 'Процесс: 1) Сообщить о страховом случае в течение 24 часов 2) Собрать необходимые документы (справки, чеки, полис) 3) Заполнить заявление о выплате 4) Предоставить документы в страховую компанию 5) Получить решение в течение 10 рабочих дней.',
    category: 'Выплаты',
    tags: ['выплаты', 'документы', 'процесс']
  },
  {
    id: '20',
    question: 'Какие способы оплаты доступны?',
    answer: 'Доступны: банковские карты (Visa, MasterCard, МИР), электронные кошельки (Qiwi, ЮMoney), оплата через Сбербанк Онлайн, оплата по QR-коду, оплата наличными в офисах. Все онлайн-платежи защищены 3D Secure.',
    category: 'Оплата',
    tags: ['оплата', 'карты', 'способы']
  }
];

export default function InsuranceFAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const categories = ['all', ...Array.from(new Set(faqData.map(item => item.category)))];

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    setExpandedItems(new Set(filteredFAQs.map(item => item.id)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

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
            <span className="text-gray-900">Вопросы и ответы</span>
          </nav>

          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-header-text">
              Часто задаваемые вопросы
            </h1>
            <p className="text-xl text-secondary">
              Ответы на популярные вопросы о страховании путешествий
            </p>
          </div>

          {/* Поиск */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по вопросам, ответам или тегам..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Фильтры */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-medium text-gray-700">Категория:</span>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category === 'all' ? 'Все категории' : category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-4">
              <button
                onClick={expandAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Развернуть все
              </button>
              <button
                onClick={collapseAll}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Свернуть все
              </button>
            </div>
          </div>

          {/* Результаты поиска */}
          {searchTerm && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                Найдено вопросов: <span className="font-semibold">{filteredFAQs.length}</span>
                {searchTerm && ` по запросу "${searchTerm}"`}
              </p>
            </div>
          )}

          {/* FAQ Items */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Вопросы не найдены</p>
                <p className="text-sm text-gray-500">
                  Попробуйте изменить поисковый запрос или выбрать другую категорию
                </p>
              </div>
            ) : (
              filteredFAQs.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-light overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 pr-4">{item.question}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {item.category}
                          </span>
                          {item.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {expandedItems.has(item.id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </button>

                  {expandedItems.has(item.id) && (
                    <div className="px-6 pb-4 border-t border-light">
                      <div className="pt-4">
                        <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Полезные ссылки */}
          <section className="mt-16">
            <h2 className="text-2xl font-semibold mb-6 text-header-text">
              Полезная информация
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/insurance/conditions"
                className="bg-white rounded-lg p-6 border border-light hover:shadow-md transition-shadow"
              >
                <Shield className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900">Условия страхования</h3>
                <p className="text-sm text-gray-600">
                  Детальные правила покрытия, исключения и требования
                </p>
              </Link>

              <Link
                href="/insurance/how-to"
                className="bg-white rounded-lg p-6 border border-light hover:shadow-md transition-shadow"
              >
                <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900">Как оформить</h3>
                <p className="text-sm text-gray-600">
                  Пошаговая инструкция по оформлению полиса
                </p>
              </Link>

              <div className="bg-white rounded-lg p-6 border border-light">
                <AlertTriangle className="h-8 w-8 text-orange-600 mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900">Чрезвычайная ситуация</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-600" />
                    <span className="text-gray-900 font-medium">8 (800) 555-35-35</span>
                  </div>
                  <p className="text-gray-600">Круглосуточная горячая линия</p>
                </div>
              </div>
            </div>
          </section>

          {/* Не нашли ответ */}
          <section className="mt-16">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
              <h2 className="text-2xl font-semibold mb-4 text-center text-gray-900">
                Не нашли ответ на свой вопрос?
              </h2>
              <p className="text-center text-gray-600 mb-8">
                Наша команда поддержки готова помочь вам с любыми вопросами
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Phone className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 text-gray-900">Телефон</h3>
                  <p className="text-blue-600 font-medium mb-1">8 (800) 555-35-35</p>
                  <p className="text-sm text-gray-500">Ежедневно, 8:00 - 20:00</p>
                </div>

                <div className="text-center">
                  <Mail className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 text-gray-900">Email</h3>
                  <p className="text-green-600 font-medium mb-1">support@travelapp.ru</p>
                  <p className="text-sm text-gray-500">Ответ в течение 2 часов</p>
                </div>

                <div className="text-center">
                  <Clock className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 text-gray-900">Чат на сайте</h3>
                  <p className="text-purple-600 font-medium mb-1">Онлайн консультант</p>
                  <p className="text-sm text-gray-500">Пн-Пт, 9:00 - 18:00</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}