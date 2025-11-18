# Интеграция Frontend и Backend - Мультимодальные маршруты

## 1. Общая схема потока данных

```
Frontend (SearchForm) 
  → Параметры поиска (from, to, date, passengers)
  → GET /api/v1/routes/search?from=...&to=...&date=...&passengers=...
  → Backend (RouteBuilderController)
  → BuildRouteUseCase
  → IRouteBuilderResult
  → Frontend (RoutesPage)
  → Адаптер данных
  → Отображение маршрутов
```

## 2. Структура данных Backend (выходной формат)

### 2.1 IRouteBuilderResult (ответ от `/api/v1/routes/search`)

```typescript
{
  routes: IBuiltRoute[];           // Основной маршрут (массив из 1 элемента)
  alternatives?: IBuiltRoute[];    // Альтернативные маршруты (до 3)
  riskAssessment?: IRiskAssessment; // Оценка риска для основного маршрута
  mlData?: IRouteMLData;           // ML-данные (опционально)
}
```

### 2.2 IBuiltRoute (структура маршрута)

```typescript
{
  routeId: string;                 // "route-1234567890"
  fromCity: string;                // "Якутск"
  toCity: string;                  // "Москва"
  date: string;                    // "2024-01-15"
  passengers: number;              // 1, 2, 3...
  segments: IRouteSegmentDetails[]; // Массив сегментов
  totalDuration: number;           // Минуты (например, 480)
  totalPrice: number;              // Рубли (например, 15000)
  transferCount: number;           // Количество пересадок (0, 1, 2...)
  transportTypes: TransportType[];  // ["airplane", "bus"]
  departureTime: string;           // ISO 8601: "2024-01-15T08:00:00Z"
  arrivalTime: string;             // ISO 8601: "2024-01-15T16:00:00Z"
}
```

### 2.3 IRouteSegmentDetails (сегмент маршрута)

```typescript
{
  segment: {
    segmentId: string;
    fromStopId: string;
    toStopId: string;
    routeId: string;
    transportType: TransportType;  // "airplane" | "bus" | "train" | "ferry" | "taxi"
    distance?: number;
    estimatedDuration?: number;
    basePrice?: number;
  };
  selectedFlight?: {
    flightId: string;
    flightNumber?: string;
    departureTime: string;         // ISO 8601
    arrivalTime: string;           // ISO 8601
    price?: number;
    availableSeats: number;
    status?: string;
  };
  departureTime: string;           // ISO 8601
  arrivalTime: string;             // ISO 8601
  duration: number;                // Минуты
  price: number;                   // Рубли
  transferTime?: number;           // Минуты между сегментами
}
```

### 2.4 IRiskAssessment (оценка риска)

```typescript
{
  routeId: string;
  riskScore: {
    value: number;                 // 0-10
    level: RiskLevel;              // "very_low" | "low" | "medium" | "high" | "very_high"
    description: string;            // "Низкий риск задержек"
  };
  factors: {
    transferCount: number;
    transportTypes: string[];
    totalDuration: number;
    historicalDelays: {
      averageDelay30Days: number;
      averageDelay60Days: number;
      averageDelay90Days: number;
      delayFrequency: number;      // 0-1 (процент)
    };
    cancellations: {
      cancellationRate30Days: number;
      cancellationRate60Days: number;
      cancellationRate90Days: number;
      totalCancellations: number;
    };
    occupancy: {
      averageOccupancy: number;    // 0-1 (процент)
      highOccupancySegments: number;
      lowAvailabilitySegments: number;
    };
    weather?: {
      riskLevel: number;
      conditions?: string[];
    };
    seasonality: {
      month: number;
      dayOfWeek: number;
      seasonFactor: number;
    };
    scheduleRegularity: number;
  };
  recommendations?: string[];      // ["Рекомендуем взять страховку", ...]
}
```

## 3. Структура данных Frontend (ожидаемый формат)

### 3.1 RoutesPage (страница списка маршрутов)

**Текущая структура (уже работает):**
```typescript
interface Route {
  routeId: string;
  fromCity: string;
  toCity: string;
  date: string;
  passengers: number;
  segments: RouteSegment[];
  totalDuration: number;
  totalPrice: number;
  transferCount: number;
  transportTypes: string[];
  departureTime: string;
  arrivalTime: string;
}
```

**Соответствие с Backend:**
- ✅ Прямое соответствие - структура совпадает
- ✅ Не требуется адаптация для списка маршрутов
- ⚠️ Нужно добавить `riskAssessment` в структуру Route

### 3.2 RouteDetailsView (страница деталей маршрута)

**Ожидаемая структура (в стиле OData):**
```typescript
interface RouteDetailsData {
  from: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
    Адрес?: string;
    Координаты?: string;
  };
  to: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
    Адрес?: string;
    Координаты?: string;
  };
  date: string;
  routes: Array<{
    route: {
      Ref_Key: string;
      Наименование?: string;
      Код?: string;
      Description?: string;
    };
    segments: Array<{
      from: {
        Наименование?: string;
        Код?: string;
        Адрес?: string;
      } | null;
      to: {
        Наименование?: string;
        Код?: string;
        Адрес?: string;
      } | null;
      order: number;
    }>;
    schedule: unknown[];
    flights: Array<{
      Ref_Key: string;
      НомерРейса?: string;
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
      Статус?: string;
      tariffs: Array<{
        Цена?: number;
        Наименование?: string;
        Код?: string;
      }>;
      occupancy: unknown[];
      availableSeats: number;
    }>;
  }>;
  riskAssessment?: {
    riskScore: {
      value: number;
      level: string;
      description: string;
    };
    factors?: {
      transferCount: number;
      historicalDelays?: {
        averageDelay90Days: number;
        delayFrequency: number;
      };
      cancellations?: {
        cancellationRate90Days: number;
      };
      occupancy?: {
        averageOccupancy: number;
      };
    };
    recommendations?: string[];
  };
}
```

## 4. Маппинг данных: Backend → Frontend

### 4.1 Маппинг для RoutesPage (список маршрутов)

**Прямое соответствие:**
- `IBuiltRoute` → `Route` (без изменений)
- Добавить `riskAssessment` в структуру `Route`

**Адаптер не требуется** - данные передаются напрямую.

### 4.2 Маппинг для RouteDetailsView (детали маршрута)

**Требуется адаптер** для преобразования `IBuiltRoute` → `RouteDetailsData`.

#### 4.2.1 Маппинг городов (from/to)

```
Backend: IBuiltRoute.fromCity (string: "Якутск")
  ↓
Frontend: RouteDetailsData.from
  - Ref_Key: routeId (или генерировать)
  - Наименование: fromCity
  - Код: fromCity (первые 3 буквы)
  - Адрес: null (или из OData, если доступен)
  - Координаты: null (или из OData)
```

#### 4.2.2 Маппинг маршрута (route)

```
Backend: IBuiltRoute
  ↓
Frontend: RouteDetailsData.routes[0].route
  - Ref_Key: routeId
  - Наименование: `${fromCity} → ${toCity}`
  - Код: routeId
  - Description: `Маршрут с ${transferCount} пересадками, длительность ${totalDuration} мин`
```

#### 4.2.3 Маппинг сегментов (segments)

```
Backend: IRouteSegmentDetails[]
  ↓
Frontend: RouteDetailsData.routes[0].segments[]

Для каждого сегмента:
  - from: {
      Наименование: stopName (из fromStopId через OData или кэш)
      Код: fromStopId
      Адрес: null (или из OData)
    }
  - to: {
      Наименование: stopName (из toStopId через OData или кэш)
      Код: toStopId
      Адрес: null (или из OData)
    }
  - order: index в массиве segments
```

**Проблема:** Backend не возвращает названия остановок (stopName), только stopId.

**Решение:**
1. Создать кэш соответствий stopId → stopName на frontend
2. Или добавить endpoint `/api/v1/routes/details?routeId=...` на backend, который вернёт полные данные с названиями
3. Или расширить ответ `/api/v1/routes/search` включением названий остановок

#### 4.2.4 Маппинг рейсов (flights)

```
Backend: IRouteSegmentDetails.selectedFlight
  ↓
Frontend: RouteDetailsData.routes[0].flights[]

Для каждого сегмента с selectedFlight:
  - Ref_Key: selectedFlight.flightId
  - НомерРейса: selectedFlight.flightNumber || "Без номера"
  - ВремяОтправления: selectedFlight.departureTime (ISO → формат для отображения)
  - ВремяПрибытия: selectedFlight.arrivalTime (ISO → формат для отображения)
  - Статус: selectedFlight.status || "Доступен"
  - tariffs: [{
      Цена: selectedFlight.price || segment.price
      Наименование: "Базовый тариф"
      Код: "BASIC"
    }]
  - occupancy: [] (пустой массив или данные из OData)
  - availableSeats: selectedFlight.availableSeats
```

#### 4.2.5 Маппинг расписания (schedule)

```
Backend: IRouteSegmentDetails (departureTime, arrivalTime)
  ↓
Frontend: RouteDetailsData.routes[0].schedule[]

Создать массив событий расписания:
  [
    { type: "departure", time: segment.departureTime, stop: segment.from },
    { type: "arrival", time: segment.arrivalTime, stop: segment.to },
    ... (для каждого сегмента)
  ]
```

#### 4.2.6 Маппинг riskAssessment

```
Backend: IRiskAssessment
  ↓
Frontend: RouteDetailsData.riskAssessment

Прямое соответствие:
  - riskScore.value → riskScore.value
  - riskScore.level → riskScore.level (преобразовать enum в string)
  - riskScore.description → riskScore.description
  - factors.transferCount → factors.transferCount
  - factors.historicalDelays.averageDelay90Days → factors.historicalDelays.averageDelay90Days
  - factors.historicalDelays.delayFrequency → factors.historicalDelays.delayFrequency
  - factors.cancellations.cancellationRate90Days → factors.cancellations.cancellationRate90Days
  - factors.occupancy.averageOccupancy → factors.occupancy.averageOccupancy
  - recommendations → recommendations
```

## 5. Последовательность действий для интеграции

### Шаг 1: Обновить структуру Route на RoutesPage

**Действие:** Добавить поле `riskAssessment` в интерфейс `Route` на странице `/routes`.

**Результат:** Страница списка маршрутов может принимать и отображать risk-score.

### Шаг 2: Создать адаптер данных для RouteDetailsView

**Действие:** Создать функцию-адаптер `adaptRouteToDetailsFormat(route: IBuiltRoute): RouteDetailsData`.

**Логика адаптера:**
1. Преобразовать `fromCity` → `from` (структура OData)
2. Преобразовать `toCity` → `to` (структура OData)
3. Преобразовать `IBuiltRoute` → `route` (структура OData)
4. Преобразовать `segments[]` → `segments[]` (с названиями остановок)
5. Преобразовать `selectedFlight[]` → `flights[]` (с тарифами)
6. Создать `schedule[]` из времен отправления/прибытия
7. Преобразовать `riskAssessment` → `riskAssessment` (если есть)

**Проблема:** Нужны названия остановок (stopName) по stopId.

**Варианты решения:**
- **Вариант A:** Создать кэш на frontend (stopId → stopName) и заполнять его при первом запросе
- **Вариант B:** Добавить endpoint `/api/v1/routes/details?routeId=...` на backend, который вернёт полные данные
- **Вариант C:** Расширить ответ `/api/v1/routes/search` включением названий остановок в каждый сегмент

**Рекомендация:** Вариант C (расширить ответ backend) - самый простой и эффективный.

### Шаг 3: Обновить API-клиент на frontend

**Действие:** Обновить функцию `fetchApi` для вызова `/api/v1/routes/search`.

**Параметры запроса:**
- `from` - город отправления
- `to` - город назначения
- `date` - дата поездки (YYYY-MM-DD)
- `passengers` - количество пассажиров

**Обработка ответа:**
- Проверить наличие `routes` (массив)
- Проверить наличие `alternatives` (опционально)
- Проверить наличие `riskAssessment` (опционально)
- Применить адаптер для деталей маршрута (если требуется)

### Шаг 4: Интегрировать riskAssessment в RoutesPage

**Действие:** Добавить отображение risk-score в карточки маршрутов.

**Где отображать:**
- В карточке основного маршрута (если `riskAssessment` присутствует)
- В виде бейджа/индикатора рядом с ценой
- Цветовая индикация: зеленый (0-2), синий (3-4), желтый (5-6), оранжевый (7-8), красный (9-10)

**Компонент:** Использовать существующий `RouteRiskAssessment` или создать упрощенную версию для карточек.

### Шаг 5: Интегрировать riskAssessment в RouteDetailsView

**Действие:** Передать `riskAssessment` в компонент `RouteRiskAssessment`.

**Логика:**
- Если `riskAssessment` присутствует в данных маршрута → отобразить полный блок
- Если отсутствует → показать сообщение "Оценка рисков в разработке"

**Компонент:** Использовать существующий `RouteRiskAssessment` (уже готов).

### Шаг 6: Обработка альтернативных маршрутов

**Действие:** Отобразить альтернативные маршруты на странице списка.

**Логика:**
- Основной маршрут → `routes[0]`
- Альтернативные маршруты → `alternatives[]` (если присутствуют)
- Каждый альтернативный маршрут отображается как отдельная карточка
- При клике на альтернативный маршрут → переход на страницу деталей с этим маршрутом

### Шаг 7: Навигация между страницами

**Поток:**
1. Пользователь заполняет форму поиска → `/` (главная)
2. Нажимает "Найти маршрут" → `/routes?from=...&to=...&date=...`
3. Страница `/routes` вызывает `/api/v1/routes/search` с параметрами
4. Отображает список маршрутов (основной + альтернативы)
5. Пользователь кликает "Выбрать маршрут" → `/routes/details?routeId=...`
6. Страница деталей получает `routeId` из URL
7. Вызывает `/api/v1/routes/details?routeId=...` (если endpoint существует)
8. Или использует данные из кэша (если маршрут уже загружен)
9. Применяет адаптер для преобразования данных
10. Отображает детали через `RouteDetailsView`

**Проблема:** Endpoint `/api/v1/routes/details` может не существовать.

**Решение:**
- **Вариант A:** Создать endpoint на backend для получения деталей по routeId
- **Вариант B:** Передавать полные данные маршрута через URL state или localStorage
- **Вариант C:** Повторно вызывать `/api/v1/routes/search` с теми же параметрами и найти маршрут по routeId

**Рекомендация:** Вариант B (localStorage) - самый простой для MVP.

## 6. Структура адаптера данных

### 6.1 Функция адаптера

```
adaptRouteToDetailsFormat(
  route: IBuiltRoute,
  riskAssessment?: IRiskAssessment,
  stopNamesCache?: Map<stopId, stopName>
): RouteDetailsData
```

### 6.2 Логика преобразования

1. **Города (from/to):**
   - `fromCity` → `from` (OData формат)
   - `toCity` → `to` (OData формат)
   - Использовать кэш для получения названий остановок

2. **Маршрут (route):**
   - `routeId` → `Ref_Key`
   - Сформировать `Наименование` из городов
   - Сформировать `Description` из метрик

3. **Сегменты (segments):**
   - Для каждого `IRouteSegmentDetails`:
     - Получить название остановки из кэша по `fromStopId`
     - Получить название остановки из кэша по `toStopId`
     - Создать объект сегмента в формате OData

4. **Рейсы (flights):**
   - Для каждого сегмента с `selectedFlight`:
     - Преобразовать `selectedFlight` → формат OData
     - Создать тариф из `price`
     - Форматировать время отправления/прибытия

5. **Расписание (schedule):**
   - Создать массив событий из `departureTime` и `arrivalTime` каждого сегмента

6. **Оценка риска (riskAssessment):**
   - Преобразовать `IRiskAssessment` → формат для `RouteRiskAssessment`
   - Преобразовать enum `RiskLevel` → string

## 7. Отображение данных на страницах

### 7.1 RoutesPage (список маршрутов)

**Блоки отображения:**

1. **Заголовок маршрута:**
   - `fromCity` → `toCity`
   - `departureTime` → `arrivalTime` (форматированное время)
   - `transferCount` (если > 0)

2. **Метрики маршрута:**
   - `totalPrice` (рубли)
   - `totalDuration` (часы и минуты)

3. **Сегменты (кратко):**
   - Для каждого сегмента: тип транспорта, время отправления/прибытия, цена

4. **Risk-score (если есть):**
   - Бейдж с числом (0-10)
   - Цветовая индикация
   - Краткое описание уровня риска

5. **Кнопка "Выбрать маршрут":**
   - Переход на `/routes/details?routeId=...`

### 7.2 RouteDetailsView (детали маршрута)

**Блоки отображения:**

1. **RouteSummary:**
   - `from` → `to` (названия городов)
   - `date` (форматированная дата)
   - `route.Наименование` (описание маршрута)

2. **RouteSegments:**
   - Список сегментов с названиями остановок
   - Порядковый номер сегмента
   - Адреса остановок (если доступны)

3. **RouteSchedule:**
   - Временная линия отправления/прибытия
   - События расписания

4. **RoutePricing:**
   - Тарифы для каждого рейса
   - Диапазон цен
   - Детализация по сегментам

5. **RouteRiskAssessment:**
   - Risk-score (0-10) с цветовой индикацией
   - Факторы риска (пересадки, задержки, отмены, загруженность)
   - Рекомендации (если есть)

6. **RouteAlternatives:**
   - Альтернативные маршруты (если есть)
   - Сравнение с основным маршрутом

## 8. Итоговые действия

### 8.1 Что нужно создать на Frontend

1. **Адаптер данных:**
   - Функция `adaptRouteToDetailsFormat()`
   - Преобразование `IBuiltRoute` → `RouteDetailsData`
   - Обработка названий остановок (кэш или запрос к backend)

2. **Обновление типов:**
   - Добавить `riskAssessment` в интерфейс `Route` на RoutesPage
   - Создать типы для адаптированных данных

3. **Обновление API-клиента:**
   - Вызов `/api/v1/routes/search` с корректными параметрами
   - Обработка ответа с `routes`, `alternatives`, `riskAssessment`

4. **Интеграция risk-score:**
   - Компонент для отображения risk-score в карточках маршрутов
   - Передача `riskAssessment` в `RouteRiskAssessment` на странице деталей

5. **Навигация:**
   - Передача данных маршрута между страницами (localStorage или URL state)
   - Обработка параметра `routeId` на странице деталей

### 8.2 Что нужно проверить на Backend

1. **Endpoint `/api/v1/routes/search`:**
   - ✅ Возвращает `IRouteBuilderResult`
   - ✅ Включает `routes`, `alternatives`, `riskAssessment`
   - ⚠️ Проверить, что названия остановок доступны (если требуется для адаптера)

2. **Endpoint `/api/v1/routes/details` (опционально):**
   - Если создаётся новый endpoint, он должен возвращать полные данные маршрута с названиями остановок

3. **Структура данных:**
   - ✅ `IBuiltRoute` соответствует ожиданиям frontend
   - ✅ `IRiskAssessment` готов к использованию
   - ⚠️ Проверить наличие названий остановок в сегментах (если требуется)

### 8.3 Последовательность реализации

1. **Этап 1: Базовая интеграция**
   - Обновить API-клиент для вызова `/api/v1/routes/search`
   - Отобразить список маршрутов на RoutesPage (без risk-score)
   - Проверить передачу параметров поиска

2. **Этап 2: Интеграция risk-score**
   - Добавить `riskAssessment` в структуру `Route`
   - Отобразить risk-score в карточках маршрутов
   - Интегрировать `RouteRiskAssessment` на странице деталей

3. **Этап 3: Адаптер данных**
   - Создать функцию `adaptRouteToDetailsFormat()`
   - Реализовать кэш названий остановок (или запрос к backend)
   - Применить адаптер на странице деталей

4. **Этап 4: Навигация и детали**
   - Реализовать передачу данных между страницами
   - Применить адаптер для RouteDetailsView
   - Проверить отображение всех блоков деталей маршрута

5. **Этап 5: Альтернативные маршруты**
   - Отобразить альтернативные маршруты на RoutesPage
   - Реализовать переход на детали альтернативного маршрута

## 9. Ключевые моменты

### 9.1 Прямое соответствие структур

- ✅ **RoutesPage** - структура `IBuiltRoute` полностью соответствует ожиданиям frontend
- ⚠️ **RouteDetailsView** - требуется адаптер для преобразования в формат OData

### 9.2 Risk-score

- ✅ Backend отдаёт `riskAssessment` в финальном виде
- ✅ Frontend только отображает данные, без вычислений
- ✅ Компонент `RouteRiskAssessment` уже готов к использованию

### 9.3 Названия остановок

- ⚠️ Backend возвращает только `stopId`, но не `stopName`
- ⚠️ Frontend ожидает названия остановок в формате OData
- ✅ Решение: создать кэш на frontend или расширить ответ backend

### 9.4 Альтернативные маршруты

- ✅ Backend возвращает `alternatives[]` (до 3 маршрутов)
- ✅ Frontend должен отобразить их как отдельные карточки
- ✅ Каждый альтернативный маршрут имеет свою структуру `IBuiltRoute`

### 9.5 Временные метки

- ✅ Backend использует ISO 8601 формат (`"2024-01-15T08:00:00Z"`)
- ✅ Frontend должен форматировать для отображения (часы:минуты, дата)
- ✅ Утилиты форматирования уже есть на frontend

## 10. Заключение

**Основные задачи:**
1. Создать адаптер `adaptRouteToDetailsFormat()` для преобразования данных деталей маршрута
2. Интегрировать `riskAssessment` в карточки маршрутов и страницу деталей
3. Реализовать передачу данных между страницами (localStorage или URL state)
4. Обеспечить получение названий остановок (кэш или расширение ответа backend)

**Результат:**
- Frontend корректно принимает и отображает данные от backend
- Risk-score интегрирован в интерфейс
- Детали маршрута отображаются в формате OData через адаптер
- Навигация между страницами работает корректно


