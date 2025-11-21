# Infrastructure Layer

Инфраструктурный слой приложения, содержащий реализации интерфейсов из Domain Layer и интеграции с внешними системами.

## Архитектурный принцип

Infrastructure Layer зависит от Domain Layer через реализацию интерфейсов, но не содержит бизнес-логики. Все решения о режимах работы, восстановлении данных и валидации качества принимаются в Application Layer.

## Структура

```
infrastructure/
├── data-providers/           # Провайдеры транспортных данных
│   ├── ODataTransportProvider.ts    # Загрузка из внешнего OData источника
│   ├── MockTransportProvider.ts     # Загрузка демонстрационных данных
│   └── index.ts
├── cache/                    # Механизм кеширования
│   ├── DatasetCacheRepository.ts    # Репозиторий для кеширования датасетов
│   └── index.ts
├── api/                      # Существующие API клиенты (не изменялись)
├── database/                 # Существующие database модули (не изменялись)
├── repositories/             # Существующие репозитории (не изменялись)
├── storage/                  # Существующие storage модули (не изменялись)
└── index.ts                  # Главный экспорт
```

## Компоненты

### Data Providers

#### ODataTransportProvider

**Назначение:** Загрузка реальных транспортных данных из внешнего OData API.

**Responsibilities:**
- Проверка доступности OData источника
- Параллельная загрузка маршрутов, остановок и расписания
- Преобразование OData DTO в доменные сущности
- Retry логика для повышения надёжности
- Обработка сетевых ошибок и таймаутов

**NOT responsible for:**
- Валидация качества данных
- Восстановление недостающих данных
- Принятие решений о режиме работы
- Fallback на другие источники

**Конфигурация:**
```typescript
{
  timeout: 30000,          // Таймаут запроса в мс
  retryAttempts: 3,        // Количество попыток
  retryDelay: 1000         // Задержка между попытками в мс
}
```

**Использование:**
```typescript
const provider = new ODataTransportProvider(
  routesService,
  stopsService,
  flightsService,
  odataClient,
  logger,
  config
);

const isAvailable = await provider.isAvailable();
if (isAvailable) {
  const dataset = await provider.loadData();
}
```

#### MockTransportProvider

**Назначение:** Предоставление стабильных демонстрационных данных для fallback и тестирования.

**Responsibilities:**
- Загрузка данных из локальных JSON файлов
- Формирование структур Domain Layer
- Обеспечение стабильной доступности
- Преобразование дат из строк в Date объекты

**NOT responsible for:**
- Восстановление данных (mock данные уже полные)
- Валидация качества
- Принятие решений о режиме

**Конфигурация:**
```typescript
{
  mockDataPath: './data/mock'  // Путь к директории с mock-данными
}
```

**Использование:**
```typescript
const provider = new MockTransportProvider(logger, mockDataPath);

const isAvailable = await provider.isAvailable(); // Всегда true если файлы существуют
const dataset = await provider.loadData();
```

**Mock Data Files:**
- `data/mock/routes.json` - 10 маршрутов (авиа, автобус, поезд)
- `data/mock/stops.json` - 12 остановок (Якутск, Москва, Иркутск и др.)
- `data/mock/flights.json` - 15 рейсов на ближайшие дни

### Cache Repository

#### DatasetCacheRepository

**Назначение:** Кеширование транспортных данных в Redis для ускорения повторных запросов.

**Responsibilities:**
- Сохранение TransportDataset в Redis с TTL
- Извлечение TransportDataset из кеша
- Инвалидация кеша по запросу
- Graceful degradation при недоступности Redis
- Сериализация/десериализация с сохранением Date объектов

**NOT responsible for:**
- Принятие решений о кешировании
- Валидация данных перед сохранением
- Выбор режима работы

**Конфигурация:**
```typescript
{
  ttl: 3600,        // Time to live в секундах (1 час)
  enabled: true     // Feature toggle для кеширования
}
```

**Использование:**
```typescript
const cacheRepo = new DatasetCacheRepository(redisClient, logger, config);

// Проверка доступности Redis
const isAvailable = await cacheRepo.isAvailable();

// Получение из кеша
const cached = await cacheRepo.get('default');
if (!cached) {
  // Cache miss - загрузка данных
  const dataset = await loadData();
  // Сохранение в кеш
  await cacheRepo.set('default', dataset);
}

// Принудительная инвалидация
await cacheRepo.invalidate('default');
```

**Graceful Degradation:**
Все методы обрабатывают ошибки Redis gracefully - при недоступности кеша система продолжает работать, просто без кеширования.

## Интеграция с Domain Layer

Все провайдеры реализуют интерфейс `ITransportDataProvider` из Domain Layer:

```typescript
interface ITransportDataProvider {
  isAvailable(): Promise<boolean>;
  loadData(): Promise<ITransportDataset>;
}
```

Это обеспечивает:
- Взаимозаменяемость провайдеров
- Независимость Application Layer от конкретных реализаций
- Тестируемость через mock-провайдеры

## Принципы работы

### Разделение ответственности

- **ODataTransportProvider** - только загрузка и преобразование данных
- **MockTransportProvider** - только предоставление заглушки
- **DatasetCacheRepository** - только операции с кешом

### Обработка ошибок

- Все ошибки логируются
- Критические ошибки пробрасываются наверх
- Graceful degradation для некритичных ошибок (Redis недоступен)

### Преобразование данных

ODataTransportProvider выполняет маппинг:
- `Ref_Key` / `id` → `Ref_Key`
- `Наименование` / `name` → `Наименование`
- `НомерМаршрута` / `routeNumber` → `НомерМаршрута`
- `ТипТранспорта` / `transportType` → `ТипТранспорта`
- `Координаты` / `coordinates` → стандартный формат `{ latitude, longitude }`

### Retry логика

ODataTransportProvider выполняет до 3 попыток загрузки с задержкой 1 секунда между попытками. Timeout для каждой попытки = 30 секунд.

## Тестирование

### Unit тесты

Каждый провайдер и репозиторий должен иметь unit-тесты:
- ODataTransportProvider.test.ts - с mock OData сервисами
- MockTransportProvider.test.ts - с реальными JSON файлами
- DatasetCacheRepository.test.ts - с mock Redis клиентом

### Integration тесты

- Тестирование с реальным Redis (опционально)
- Тестирование с реальным OData API на staging (опционально)

## Зависимости

Infrastructure Layer зависит от:
- Domain Layer (интерфейсы и сущности)
- Node.js fs модуль (для MockTransportProvider)
- Redis клиент (для DatasetCacheRepository)
- Существующие OData сервисы (для ODataTransportProvider)

Infrastructure Layer НЕ зависит от:
- Application Layer
- Presentation Layer

## Расширение

### Добавление нового провайдера данных

1. Создать класс, реализующий `ITransportDataProvider`
2. Реализовать методы `isAvailable()` и `loadData()`
3. Добавить преобразование в структуры Domain Layer
4. Экспортировать из `index.ts`
5. Зарегистрировать в DI-контейнере

### Добавление нового источника mock-данных

1. Создать JSON файлы в `data/mock/`
2. Убедиться, что структура соответствует Domain Layer
3. MockTransportProvider автоматически загрузит новые данные

## Конфигурация окружения

```env
# OData Configuration
ODATA_BASE_URL=https://avibus.gars-ykt.ru:4443/avitest/odata/standard.odata
ODATA_USERNAME=your_username
ODATA_PASSWORD=your_password
ODATA_TIMEOUT=30000
ODATA_RETRY_ATTEMPTS=3
ODATA_RETRY_DELAY=1000

# Mock Data Configuration
MOCK_DATA_PATH=./data/mock

# Redis Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=123456S
REDIS_TTL_TRANSPORT_DATASET=3600
CACHE_ENABLED=true
```

## Архитектурное соответствие

Infrastructure Layer соответствует:
- ✅ Clean Architecture (зависит только от Domain)
- ✅ SOLID принципы (особенно SRP, DIP)
- ✅ Separation of Concerns
- ✅ Graceful Degradation
- ✅ Fail-Safe поведение

## Следующие шаги

После реализации Infrastructure Layer:
1. Тестирование каждого провайдера
2. Интеграция с Application Layer (TransportDataService)
3. Настройка DI-контейнера
4. Integration тесты
5. Deployment и мониторинг

---

**Статус:** Полностью реализован (STAGE 10 завершён)  
**Дата:** 18 ноября 2025  
**Версия:** 1.0







