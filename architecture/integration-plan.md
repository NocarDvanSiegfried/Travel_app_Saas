# План интеграции Frontend и Backend - Мультимодальные маршруты

## Анализ текущего состояния

### Backend (готов)
- ✅ Endpoint `/api/v1/routes/search` возвращает `IRouteBuilderResult`
- ✅ Структура `IBuiltRoute` полностью соответствует ожиданиям frontend для списка маршрутов
- ✅ `IRiskAssessment` готов к использованию
- ✅ Альтернативные маршруты возвращаются в `alternatives[]`

### Frontend (частично готов)
- ✅ Страница `/routes` имеет структуру для отображения маршрутов
- ✅ Компонент `RouteDetailsView` ожидает формат OData
- ✅ Компонент `RouteRiskAssessment` готов к использованию
- ⚠️ Отсутствует адаптер для преобразования `IBuiltRoute` → `RouteDetailsData`
- ⚠️ `riskAssessment` не интегрирован в карточки маршрутов
- ⚠️ API-клиент не настроен для получения данных от backend

## Поток данных (согласно документу)

```
1. SearchForm → параметры (from, to, date, passengers)
2. RoutesPage → GET /api/v1/routes/search?from=...&to=...&date=...&passengers=...
3. Backend → IRouteBuilderResult { routes, alternatives, riskAssessment }
4. RoutesPage → отображение маршрутов (прямое соответствие)
5. RouteDetailsPage → адаптер → RouteDetailsData (формат OData)
6. RouteDetailsView → отображение деталей
```

## Структура маппинга данных

### Маппинг 1: RoutesPage (прямое соответствие)

**Вход:** `IBuiltRoute` из `IRouteBuilderResult.routes[]`

**Выход:** `Route` интерфейс на RoutesPage

**Действия:**
- Прямая передача данных без преобразования
- Добавить поле `riskAssessment?: IRiskAssessment` в интерфейс `Route`

**Соответствие полей:**
- `routeId` → `routeId` ✅
- `fromCity` → `fromCity` ✅
- `toCity` → `toCity` ✅
- `date` → `date` ✅
- `passengers` → `passengers` ✅
- `segments` → `segments` ✅
- `totalDuration` → `totalDuration` ✅
- `totalPrice` → `totalPrice` ✅
- `transferCount` → `transferCount` ✅
- `transportTypes` → `transportTypes` ✅
- `departureTime` → `departureTime` ✅
- `arrivalTime` → `arrivalTime` ✅
- `riskAssessment` → `riskAssessment` ⚠️ (добавить)

### Маппинг 2: RouteDetailsView (требуется адаптер)

**Вход:** `IBuiltRoute` + `IRiskAssessment` (опционально)

**Выход:** `RouteDetailsData` (формат OData)

**Требуется адаптер:** `adaptRouteToDetailsFormat()`

**Маппинг полей:**

#### 2.1 Города (from/to)
```
IBuiltRoute.fromCity (string) → RouteDetailsData.from
  - Ref_Key: routeId или генерировать уникальный ID
  - Наименование: fromCity
  - Код: первые 3 буквы fromCity или fromCity
  - Адрес: null (или из OData, если доступен)
  - Координаты: null (или из OData)

IBuiltRoute.toCity (string) → RouteDetailsData.to
  - Ref_Key: routeId или генерировать уникальный ID
  - Наименование: toCity
  - Код: первые 3 буквы toCity или toCity
  - Адрес: null (или из OData, если доступен)
  - Координаты: null (или из OData)
```

#### 2.2 Маршрут (route)
```
IBuiltRoute → RouteDetailsData.routes[0].route
  - Ref_Key: routeId
  - Наименование: `${fromCity} → ${toCity}`
  - Код: routeId
  - Description: `Маршрут с ${transferCount} пересадками, длительность ${totalDuration} мин`
```

#### 2.3 Сегменты (segments)
```
IRouteSegmentDetails[] → RouteDetailsData.routes[0].segments[]

Для каждого сегмента (index):
  - from: {
      Наименование: stopName (из кэша по fromStopId) или fromStopId
      Код: fromStopId
      Адрес: null
    }
  - to: {
      Наименование: stopName (из кэша по toStopId) или toStopId
      Код: toStopId
      Адрес: null
    }
  - order: index
```

**Проблема:** Backend возвращает только `stopId`, но не `stopName`.

**Решение:** Создать кэш на frontend (Map<stopId, stopName>) или использовать `stopId` как название.

#### 2.4 Рейсы (flights)
```
IRouteSegmentDetails.selectedFlight → RouteDetailsData.routes[0].flights[]

Для каждого сегмента с selectedFlight:
  - Ref_Key: selectedFlight.flightId
  - НомерРейса: selectedFlight.flightNumber || "Без номера"
  - ВремяОтправления: selectedFlight.departureTime (ISO 8601)
  - ВремяПрибытия: selectedFlight.arrivalTime (ISO 8601)
  - Статус: selectedFlight.status || "Доступен"
  - tariffs: [{
      Цена: selectedFlight.price || segment.price
      Наименование: "Базовый тариф"
      Код: "BASIC"
    }]
  - occupancy: []
  - availableSeats: selectedFlight.availableSeats
```

#### 2.5 Расписание (schedule)
```
IRouteSegmentDetails[] → RouteDetailsData.routes[0].schedule[]

Создать массив событий:
  [
    { type: "departure", time: segment.departureTime, stop: segment.fromStopId },
    { type: "arrival", time: segment.arrivalTime, stop: segment.toStopId },
    ... (для каждого сегмента)
  ]
```

#### 2.6 Оценка риска (riskAssessment)
```
IRiskAssessment → RouteDetailsData.riskAssessment

Прямое соответствие:
  - riskScore.value → riskScore.value
  - riskScore.level → riskScore.level (enum → string)
  - riskScore.description → riskScore.description
  - factors.transferCount → factors.transferCount
  - factors.historicalDelays.averageDelay90Days → factors.historicalDelays.averageDelay90Days
  - factors.historicalDelays.delayFrequency → factors.historicalDelays.delayFrequency
  - factors.cancellations.cancellationRate90Days → factors.cancellations.cancellationRate90Days
  - factors.occupancy.averageOccupancy → factors.occupancy.averageOccupancy
  - recommendations → recommendations
```

## Последовательность действий для интеграции

### Этап 1: Обновление типов данных

**Действие 1.1:** Обновить интерфейс `Route` на странице `/routes/page.tsx`
- Добавить поле `riskAssessment?: IRiskAssessment`
- Импортировать тип `IRiskAssessment` из backend типов (или создать локальный тип)

**Действие 1.2:** Создать типы для адаптера данных
- Создать файл `frontend/src/shared/types/route-adapter.ts`
- Определить интерфейс `IRouteAdapterInput` (IBuiltRoute + IRiskAssessment)
- Определить интерфейс `IRouteAdapterOutput` (RouteDetailsData)
- Определить функцию-тип `RouteAdapterFunction`

**Действие 1.3:** Создать типы для кэша остановок
- Определить `StopNamesCache` как `Map<string, string>`
- Определить интерфейс для работы с кэшем

### Этап 2: Создание адаптера данных

**Действие 2.1:** Создать файл адаптера
- Создать `frontend/src/shared/utils/route-adapter.ts`
- Экспортировать функцию `adaptRouteToDetailsFormat()`

**Действие 2.2:** Реализовать логику адаптера
- Преобразование городов (from/to)
- Преобразование маршрута (route)
- Преобразование сегментов (segments) с использованием кэша остановок
- Преобразование рейсов (flights)
- Создание расписания (schedule)
- Преобразование riskAssessment

**Действие 2.3:** Создать кэш остановок
- Создать `frontend/src/shared/utils/stop-names-cache.ts`
- Реализовать функции: `getStopName()`, `setStopName()`, `clearCache()`
- Использовать `stopId` как fallback, если название не найдено

### Этап 3: Обновление API-клиента

**Действие 3.1:** Проверить использование API-клиента
- Убедиться, что `fetchApi` используется на странице `/routes`
- Проверить, что базовый URL настроен корректно

**Действие 3.2:** Обновить вызов API на RoutesPage
- Использовать `fetchApi<IRouteBuilderResult>('/routes/search?from=...&to=...&date=...&passengers=...')`
- Обработать ответ: `routes`, `alternatives`, `riskAssessment`
- Добавить обработку ошибок

**Действие 3.3:** Обновить обработку данных на RoutesPage
- Присвоить `riskAssessment` каждому маршруту из `routes[0]`
- Обработать альтернативные маршруты из `alternatives[]`

### Этап 4: Интеграция risk-score в RoutesPage

**Действие 4.1:** Создать компонент для отображения risk-score в карточках
- Создать `frontend/src/components/route-risk-badge/route-risk-badge.tsx`
- Компонент принимает `riskScore: { value: number, level: string, description: string }`
- Отображает бейдж с числом (0-10) и цветовой индикацией
- Цвета: зеленый (0-2), синий (3-4), желтый (5-6), оранжевый (7-8), красный (9-10)

**Действие 4.2:** Интегрировать компонент в карточки маршрутов
- Добавить `RouteRiskBadge` в карточку маршрута на RoutesPage
- Разместить рядом с ценой или в заголовке карточки
- Показывать только если `riskAssessment` присутствует

### Этап 5: Интеграция risk-score в RouteDetailsView

**Действие 5.1:** Обновить передачу данных в RouteRiskAssessment
- Убедиться, что `riskAssessment` передается в `RouteDetailsView`
- Передать `riskAssessment` в компонент `RouteRiskAssessment`
- Компонент уже готов, требуется только передача данных

### Этап 6: Навигация между страницами

**Действие 6.1:** Реализовать передачу данных маршрута
- При клике "Выбрать маршрут" сохранить данные маршрута в localStorage
- Ключ: `route-${routeId}`
- Значение: JSON.stringify(IBuiltRoute + riskAssessment)

**Действие 6.2:** Обновить страницу деталей маршрута
- Создать страницу `/routes/details/page.tsx` (если не существует)
- Получить `routeId` из URL параметров
- Загрузить данные маршрута из localStorage
- Применить адаптер `adaptRouteToDetailsFormat()`
- Передать результат в `RouteDetailsView`

**Действие 6.3:** Обработать альтернативные маршруты
- При клике на альтернативный маршрут сохранить его в localStorage
- Перейти на страницу деталей с соответствующим `routeId`

### Этап 7: Обработка альтернативных маршрутов

**Действие 7.1:** Отображение альтернативных маршрутов на RoutesPage
- Отобразить `alternatives[]` как отдельные карточки
- Каждая карточка имеет ту же структуру, что и основной маршрут
- Добавить индикатор "Альтернативный вариант"

**Действие 7.2:** Интеграция с RouteAlternatives
- Обновить компонент `RouteAlternatives` для работы с новым форматом данных
- Преобразовать `alternatives[]` в формат, ожидаемый компонентом

## Точки интеграции

### Точка 1: API Endpoint
- **Местоположение:** `GET /api/v1/routes/search`
- **Входные параметры:** `from`, `to`, `date`, `passengers`
- **Выходные данные:** `IRouteBuilderResult`
- **Статус:** ✅ Готов на backend

### Точка 2: RoutesPage
- **Местоположение:** `frontend/src/app/routes/page.tsx`
- **Действия:**
  - Вызов API через `fetchApi`
  - Обработка ответа `IRouteBuilderResult`
  - Отображение маршрутов с risk-score
  - Отображение альтернативных маршрутов
- **Статус:** ⚠️ Требуется обновление

### Точка 3: Адаптер данных
- **Местоположение:** `frontend/src/shared/utils/route-adapter.ts`
- **Действия:**
  - Преобразование `IBuiltRoute` → `RouteDetailsData`
  - Использование кэша остановок
- **Статус:** ❌ Не создан

### Точка 4: RouteDetailsPage
- **Местоположение:** `frontend/src/app/routes/details/page.tsx` (создать)
- **Действия:**
  - Получение данных из localStorage
  - Применение адаптера
  - Передача данных в `RouteDetailsView`
- **Статус:** ❌ Не создан

### Точка 5: RouteRiskBadge
- **Местоположение:** `frontend/src/components/route-risk-badge/route-risk-badge.tsx`
- **Действия:**
  - Отображение risk-score в карточках маршрутов
- **Статус:** ❌ Не создан

## Проверка согласованности данных

### Проверка 1: Структура списка маршрутов
- ✅ `IBuiltRoute` соответствует `Route` интерфейсу на RoutesPage
- ⚠️ Требуется добавить `riskAssessment` в интерфейс `Route`

### Проверка 2: Структура деталей маршрута
- ⚠️ `IBuiltRoute` не соответствует `RouteDetailsData`
- ✅ Требуется адаптер для преобразования

### Проверка 3: Отображение riskAssessment
- ✅ Структура `IRiskAssessment` соответствует ожиданиям `RouteRiskAssessment`
- ⚠️ Требуется интеграция в карточки маршрутов

### Проверка 4: Работа сегментов, рейсов, расписания
- ✅ Структура `IRouteSegmentDetails` содержит все необходимые данные
- ⚠️ Требуется преобразование в формат OData через адаптер

## Проверка архитектуры

### Проверка 1: Структура слоёв Backend
- ✅ Controller → UseCase → Domain (не нарушена)
- ✅ Логика маршрутов не изменяется
- ✅ Endpoint `/api/v1/routes/search` остаётся без изменений

### Проверка 2: Структура Frontend
- ✅ Feature-Based Architecture сохранена
- ✅ Компоненты остаются на своих местах
- ✅ Новые утилиты добавляются в `shared/utils`

### Проверка 3: Docker и Node.js
- ✅ Dockerfile не изменяется
- ✅ docker-compose.yml не изменяется
- ✅ Пути и env-переменные не изменяются
- ✅ Порты не изменяются

## Список проверок для билда

### Проверка Backend Build
1. ✅ TypeScript компиляция: `npm run build` в `backend/`
2. ✅ Проверка типов: `npm run type-check` в `backend/`
3. ✅ Линтинг: `npm run lint` в `backend/`
4. ✅ Импорты и зависимости корректны

### Проверка Frontend Build
1. ✅ TypeScript компиляция: `npm run build` в `frontend/`
2. ✅ Проверка типов: `npm run type-check` в `frontend/`
3. ✅ Линтинг: `npm run lint` в `frontend/`
4. ✅ Импорты и зависимости корректны
5. ✅ Next.js сборка проходит успешно

### Проверка интеграции
1. ✅ API-клиент корректно вызывает endpoint
2. ✅ Данные корректно обрабатываются на RoutesPage
3. ✅ Адаптер корректно преобразует данные
4. ✅ RouteDetailsView получает корректные данные
5. ✅ Risk-score отображается корректно

## Итоговый список файлов для создания/изменения

### Создать:
1. `frontend/src/shared/types/route-adapter.ts` - типы для адаптера
2. `frontend/src/shared/utils/route-adapter.ts` - функция адаптера
3. `frontend/src/shared/utils/stop-names-cache.ts` - кэш остановок
4. `frontend/src/components/route-risk-badge/route-risk-badge.tsx` - компонент бейджа
5. `frontend/src/components/route-risk-badge/index.ts` - экспорт компонента
6. `frontend/src/app/routes/details/page.tsx` - страница деталей маршрута

### Изменить:
1. `frontend/src/app/routes/page.tsx` - добавить riskAssessment, обновить API-вызов
2. `frontend/src/components/route-details/route-details-view.tsx` - передача riskAssessment
3. `frontend/src/components/route-alternatives/route-alternatives.tsx` - обновление формата данных

### Не изменять:
- Backend файлы (controller, usecase, domain)
- Dockerfile
- docker-compose.yml
- package.json (если не требуется новая зависимость)
- tsconfig.json
- Структура папок

## Подтверждение успешной интеграции

### Критерии успеха:
1. ✅ Backend build проходит без ошибок
2. ✅ Frontend build проходит без ошибок
3. ✅ RoutesPage отображает маршруты с risk-score
4. ✅ RouteDetailsView отображает детали маршрута в формате OData
5. ✅ Альтернативные маршруты отображаются корректно
6. ✅ Навигация между страницами работает
7. ✅ Risk-score интегрирован в карточки и детали

### Финальная проверка:
- Запустить `npm run build` в `backend/` → успех
- Запустить `npm run build` в `frontend/` → успех
- Проверить отсутствие ошибок TypeScript
- Проверить отсутствие ошибок линтера
- Убедиться, что все импорты корректны


