# Domain Layer — Адаптивная загрузка транспортных данных

## Обзор

Domain Layer содержит сущности, интерфейсы и контракты бизнес-логики системы адаптивной загрузки транспортных данных (Вариант B).

**Ключевые принципы:**
- ✅ Отсутствие зависимостей от других слоёв (Application, Infrastructure, Presentation)
- ✅ Чистые интерфейсы и типы TypeScript
- ✅ Независимость от технических деталей (сеть, БД, файловая система)
- ✅ Соблюдение Clean Architecture

---

## Структура

```
domain/
├── enums/
│   ├── DataSourceMode.ts       # Enum режимов источника данных (REAL/RECOVERY/MOCK)
│   └── index.ts
├── entities/
│   ├── TransportDataset.ts     # Унифицированный датасет транспортных данных
│   ├── QualityReport.ts        # Отчет о качестве данных
│   ├── BuiltRoute.ts           # Расширен полями dataMode и dataQuality
│   └── index.ts
└── repositories/
    ├── ITransportDataProvider.ts      # Интерфейс провайдера данных
    ├── IDataQualityValidator.ts       # Интерфейс валидатора качества
    ├── IDataRecoveryService.ts        # Интерфейс сервиса восстановления
    └── index.ts
```

---

## Новые сущности

### 1. DataSourceMode (Enum)

**Файл:** `enums/DataSourceMode.ts`

**Описание:** Определяет режим источника транспортных данных.

**Значения:**
- `REAL` — реальные данные из OData API (качество >= 90%)
- `RECOVERY` — частично восстановленные данные (качество 50-89%)
- `MOCK` — демонстрационные данные (fallback при недоступности OData)

---

### 2. ITransportDataset

**Файл:** `entities/TransportDataset.ts`

**Описание:** Унифицированный датасет транспортных данных, содержащий маршруты, остановки, рейсы и метаданные.

**Основные поля:**
- `routes: IRoute[]` — массив маршрутов
- `stops: IStop[]` — массив остановок
- `flights: IFlight[]` — массив рейсов (расписание)
- `mode: DataSourceMode` — режим источника данных
- `quality: number` — показатель качества (0-100)
- `loadedAt: Date` — время загрузки
- `source: string` — название провайдера

**Связанные интерфейсы:**
- `IRoute` — маршрут транспортной сети
- `IStop` — остановка с координатами
- `IFlight` — рейс с расписанием
- `IDatasetValidation` — хелпер для проверки пустоты датасета

---

### 3. IQualityReport

**Файл:** `entities/QualityReport.ts`

**Описание:** Отчет о качестве транспортных данных с детальной информацией по категориям.

**Основные поля:**
- `overallScore: number` — общий показатель качества (0-100)
- `routesScore: number` — качество маршрутов
- `stopsScore: number` — качество остановок
- `coordinatesScore: number` — качество координат
- `schedulesScore: number` — качество расписания
- `missingFields: string[]` — список недостающих полей
- `recommendations: string[]` — рекомендации по восстановлению

**Связанные интерфейсы:**
- `IQualityThresholds` — пороговые значения для определения режима
- `QualityCategory` — enum категорий валидации
- `ICategoryValidation` — результат валидации отдельной категории

---

## Новые интерфейсы

### 1. ITransportDataProvider

**Файл:** `repositories/ITransportDataProvider.ts`

**Описание:** Интерфейс провайдера транспортных данных. Реализуется в Infrastructure Layer (ODataTransportProvider, MockTransportProvider).

**Методы:**
- `loadData(): Promise<ITransportDataset>` — загрузить данные из источника
- `isAvailable(): Promise<boolean>` — проверить доступность источника
- `getName(): string` — получить название провайдера

**Связанные интерфейсы:**
- `IProviderOptions` — опции конфигурации провайдера

---

### 2. IDataQualityValidator

**Файл:** `repositories/IDataQualityValidator.ts`

**Описание:** Интерфейс валидатора качества данных. Реализуется в Application Layer.

**Методы:**
- `validate(dataset, thresholds?): Promise<IQualityReport>` — валидировать датасет
- `shouldRecover(report): boolean` — проверить необходимость восстановления
- `getRecoveryRecommendations(report): string[]` — получить рекомендации

---

### 3. IDataRecoveryService

**Файл:** `repositories/IDataRecoveryService.ts`

**Описание:** Интерфейс сервиса восстановления данных. Реализуется в Application Layer.

**Методы:**
- `recover(dataset, report): Promise<IRecoveryResult>` — восстановить данные
- `recoverCoordinates(dataset): Promise<ITransportDataset>` — восстановить координаты
- `recoverSchedules(dataset): Promise<ITransportDataset>` — восстановить расписание
- `fillMissingNames(dataset): Promise<ITransportDataset>` — заполнить названия

**Связанные интерфейсы:**
- `IRecoveryResult` — результат восстановления данных
- `IRecoveryOptions` — опции восстановления

---

## Расширение существующих интерфейсов

### IRouteBuilderResult

**Файл:** `entities/BuiltRoute.ts`

**Добавленные поля:**
- `dataMode?: string` — режим источника данных (опционально, только при `USE_ADAPTIVE_DATA_LOADING=true`)
- `dataQuality?: number` — показатель качества (0-100)

**Обратная совместимость:** Поля опциональны, существующие клиенты продолжают работать без изменений.

---

## Использование

### Импорт

```typescript
import {
  ITransportDataset,
  IRoute,
  IStop,
  IFlight,
  DataSourceMode,
  IQualityReport,
  ITransportDataProvider,
  IDataQualityValidator,
  IDataRecoveryService,
} from '@/domain';
```

### Пример структуры датасета

```typescript
const dataset: ITransportDataset = {
  routes: [
    {
      id: 'route-1',
      name: 'Якутск — Москва',
      routeNumber: 'SU-1234',
      transportType: 'airplane',
      stops: ['stop-1', 'stop-2'],
      baseFare: 15000,
    },
  ],
  stops: [
    {
      id: 'stop-1',
      name: 'Аэропорт Якутск',
      coordinates: { latitude: 62.093, longitude: 129.771 },
      type: 'airport',
    },
  ],
  flights: [
    {
      id: 'flight-1',
      routeId: 'route-1',
      fromStopId: 'stop-1',
      toStopId: 'stop-2',
      departureTime: '2025-11-20T10:00:00Z',
      arrivalTime: '2025-11-20T17:00:00Z',
      price: 15000,
    },
  ],
  mode: DataSourceMode.REAL,
  quality: 95,
  loadedAt: new Date(),
  source: 'ODataTransportProvider',
};
```

---

## Принципы проектирования

### 1. Dependency Inversion Principle (DIP)

Domain Layer определяет интерфейсы (ITransportDataProvider, IDataQualityValidator, IDataRecoveryService), которые реализуются в Application и Infrastructure Layer. Domain не зависит от этих реализаций.

### 2. Interface Segregation Principle (ISP)

Интерфейсы разделены по ролям:
- `ITransportDataProvider` — загрузка данных
- `IDataQualityValidator` — валидация качества
- `IDataRecoveryService` — восстановление данных

Каждый клиент зависит только от нужных ему методов.

### 3. Open/Closed Principle (OCP)

Система открыта для расширения (новые провайдеры, новые категории валидации) и закрыта для модификации (существующие интерфейсы не меняются).

---

## Тестирование

Domain Layer содержит только типы и интерфейсы, поэтому unit-тесты не требуются. Однако можно создать тесты для проверки типов TypeScript (type tests) и документирования контрактов.

---

## Следующие шаги

После реализации Domain Layer:

1. **Application Layer** — реализация use-cases и services
   - `LoadTransportDataUseCase`
   - `TransportDataService`
   - `DataRecoveryService`
   - `QualityValidator`

2. **Infrastructure Layer** — реализация провайдеров и репозиториев
   - `ODataTransportProvider`
   - `MockTransportProvider`
   - `DatasetCacheRepository`

3. **Presentation Layer** — расширение контроллеров
   - `RouteBuilderController` (добавление dataMode и dataQuality в ответ)
   - `DiagnosticsController` (новый endpoint)

---

## Документация

- **ЧАСТЬ 1-7:** Архитектурные документы (см. `architecture/`)
- **HLD:** High-Level Design — Вариант B (`architecture/adaptive-architecture-diogram.md`)
- **LLD:** Low-Level Design — Вариант B (`architecture/adaptive-architecture-lld-variant-b.md`)
- **Integration:** План интеграции (`architecture/adaptive-architecture-integration-variant-b.md`)
- **Implementation:** План реализации (`architecture/adaptive-analitice-7-step.md`)

---

**Дата создания:** 18 ноября 2025  
**Версия:** 1.0  
**Статус:** Готов к использованию  
**Архитектурный вариант:** B (Medium Complexity)







