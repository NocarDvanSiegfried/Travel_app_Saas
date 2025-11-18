# Risk Engine Module

Модуль для оценки риска маршрутов с использованием машинного обучения (ML-ready архитектура).

## Архитектура

Модуль следует принципам Clean Architecture и готов к интеграции с ML-моделями:

- **Domain Layer** - сущности (RiskAssessment, RiskFeatures)
- **Application Layer** - бизнес-логика (data-collector, feature-builder, risk-model, risk-service)
- **Infrastructure Layer** - интеграция с OData API

## Структура модуля

```
risk-engine/
├── data-collector/          # Сбор данных для обучения и прогнозов
│   ├── HistoricalDataCollector.ts    # История задержек и отмен
│   ├── ScheduleRegularityCollector.ts # Регулярность расписания
│   └── WeatherDataCollector.ts        # Погодные данные (заглушка)
├── feature-builder/         # Формирование признаков
│   └── RiskFeatureBuilder.ts
├── risk-model/              # ML-модель
│   ├── IRiskModel.ts        # Интерфейс модели
│   └── RuleBasedRiskModel.ts # Rule-based реализация (для разработки)
├── risk-service/            # Сервис оценки риска
│   └── RiskService.ts
├── AssessRouteRiskUseCase.ts # Use Case
└── index.ts                 # Экспорт модуля
```

## Компоненты

### Data Collectors

#### HistoricalDataCollector
Собирает исторические данные:
- Задержки рейсов за 30/60/90 дней
- Отмены рейсов за 30/60/90 дней
- Загруженность рейсов

#### ScheduleRegularityCollector
Вычисляет регулярность расписания:
- Регулярность по дням недели
- Регулярность времени отправления
- Возвращает значение от 0 до 1

#### WeatherDataCollector
Заглушка для будущей интеграции с погодным API.

### Feature Builder

#### RiskFeatureBuilder
Формирует признаки маршрута:
- Количество пересадок
- Типы транспорта
- Исторические задержки
- Процент отмен
- Загруженность
- Сезонность
- Регулярность расписания

Преобразует признаки в вектор для ML-модели.

### Risk Model

#### IRiskModel
Интерфейс для ML-модели. Позволяет легко заменить rule-based модель на ML.

#### RuleBasedRiskModel
Rule-based реализация для разработки:
- Много пересадок → риск выше
- Речные и паромные маршруты → риск выше
- Плохая регулярность → риск выше
- Высокая загруженность → риск выше

### Risk Service

#### RiskService
Оркестрирует работу всех компонентов:
1. Собирает данные
2. Строит признаки
3. Оценивает риск через модель
4. Генерирует рекомендации

## Использование

### API Endpoint

```
POST /api/v1/routes/risk/assess
Content-Type: application/json

{
  "routeId": "route-123",
  "fromCity": "Москва",
  "toCity": "Чурапча",
  "date": "2025-03-01",
  "passengers": 2,
  "segments": [...],
  "totalDuration": 450,
  "totalPrice": 30000,
  "transferCount": 1,
  "transportTypes": ["airplane", "bus"],
  "departureTime": "2025-03-01T08:00:00Z",
  "arrivalTime": "2025-03-01T15:30:00Z"
}
```

### Ответ

```json
{
  "routeId": "route-123",
  "riskScore": {
    "value": 3,
    "level": "low",
    "description": "Низкий риск задержек"
  },
  "factors": {
    "transferCount": 1,
    "transportTypes": ["airplane", "bus"],
    "totalDuration": 450,
    "historicalDelays": {
      "averageDelay30Days": 15,
      "averageDelay60Days": 18,
      "averageDelay90Days": 20,
      "delayFrequency": 0.1
    },
    "cancellations": {
      "cancellationRate30Days": 0.02,
      "cancellationRate60Days": 0.025,
      "cancellationRate90Days": 0.03,
      "totalCancellations": 3
    },
    "occupancy": {
      "averageOccupancy": 0.75,
      "highOccupancySegments": 0,
      "lowAvailabilitySegments": 1
    },
    "weather": {
      "riskLevel": 0.2
    },
    "seasonality": {
      "month": 3,
      "dayOfWeek": 6,
      "seasonFactor": 1.1
    },
    "scheduleRegularity": 0.85
  },
  "recommendations": [
    "Рекомендуем прибыть заранее"
  ]
}
```

## Оценка риска

Оценка риска возвращает значение от 1 до 10:

- **1-2**: Очень низкий риск
- **3-4**: Низкий риск
- **5-6**: Средний риск
- **7-8**: Высокий риск
- **9-10**: Очень высокий риск

## Факторы риска

Модуль учитывает следующие факторы:

1. **Пересадки** - больше пересадок = выше риск
2. **Тип транспорта** - речной/паромный = выше риск
3. **Исторические задержки** - средние задержки за 30/60/90 дней
4. **Отмены** - процент отмен за 30/60/90 дней
5. **Загруженность** - средняя загруженность и доступность мест
6. **Регулярность расписания** - насколько регулярно ходят рейсы
7. **Погода** - факторы погоды (пока заглушка)
8. **Сезонность** - месяц и день недели

## Интеграция с route-builder

Модуль автоматически интегрирован с route-builder:
- При построении маршрута автоматически оценивается риск
- Результат включается в ответ route-builder

## Интеграция с /route страницей

Страница `/route` автоматически отображает оценку риска:
- Если `riskAssessment` присутствует в данных, отображается блок с оценкой
- Показывается числовая оценка (1-10) и уровень риска
- Отображаются факторы риска и рекомендации

## Расширение для ML

Модуль готов к замене rule-based модели на ML:

1. Создать новый класс, реализующий `IRiskModel`
2. Обучить модель на исторических данных
3. Заменить `RuleBasedRiskModel` на новую модель в `AssessRouteRiskUseCase`

Интерфейс `IRiskModel` позволяет легко интегрировать:
- Python ML-сервис через HTTP
- Внешний ML-endpoint
- Локальную ML-модель

## Источники данных

Модуль использует следующие источники из OData API:

- `Document_Рейс` - история рейсов и статусы
- `InformationRegister_РасписаниеРейсов` - расписание
- `InformationRegister_ЗанятостьМест` - загруженность
- `InformationRegister_ДействующиеТарифы` - тарифы
- `Catalog_Маршруты` - информация о маршрутах

## Особенности

- **Модульность** - каждый компонент независим
- **ML-ready** - готов к интеграции с ML-моделями
- **Расширяемость** - легко добавить новые факторы риска
- **Без UI** - чистая бизнес-логика
- **Полная отделённость** - не зависит от UI и других модулей


