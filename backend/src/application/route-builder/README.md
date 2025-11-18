# Route Builder Module

Модуль для построения маршрутов между двумя точками с использованием алгоритма поиска пути в графе.

## Архитектура

Модуль следует принципам Clean Architecture:

- **Domain Layer** - сущности (RouteSegment, RouteNode, RouteEdge, BuiltRoute)
- **Application Layer** - бизнес-логика (RouteGraph, PathFinder, RouteBuilder, BuildRouteUseCase)
- **Infrastructure Layer** - интеграция с OData API (RouteGraphBuilder использует OData сервисы)

## Компоненты

### Domain Entities

#### RouteSegment
Сегмент маршрута между двумя остановками. Содержит информацию о типе транспорта, длительности, цене.

#### RouteNode
Узел графа - остановка. Содержит координаты и название.

#### RouteEdge
Ребро графа - связь между остановками. Содержит сегмент маршрута и доступные рейсы.

#### BuiltRoute
Построенный маршрут - результат работы модуля. Содержит все сегменты с деталями рейсов.

### Application Services

#### RouteGraph
Граф маршрутов для поиска пути. Хранит узлы и рёбра.

#### PathFinder
Алгоритм поиска пути (Dijkstra). Находит кратчайший путь между двумя остановками.

#### RouteGraphBuilder
Построитель графа из OData данных. Загружает маршруты, остановки, рейсы и строит граф.

#### RouteBuilder
Основной класс для построения маршрутов. Использует граф и алгоритм поиска пути.

#### BuildRouteUseCase
Use Case для построения маршрута. Оркестрирует работу всех компонентов.

## Использование

### API Endpoint

```
GET /api/v1/routes/build?from=Москва&to=Чурапча&date=2025-03-01&passengers=2
```

### Параметры

- `from` (обязательно) - город отправления
- `to` (обязательно) - город назначения
- `date` (обязательно) - дата поездки (YYYY-MM-DD)
- `passengers` (опционально) - количество пассажиров (по умолчанию: 1)

### Ответ

```json
{
  "routes": [
    {
      "routeId": "route-1234567890",
      "fromCity": "Москва",
      "toCity": "Чурапча",
      "date": "2025-03-01",
      "passengers": 2,
      "segments": [
        {
          "segment": {
            "segmentId": "route-id-stop1-stop2",
            "fromStopId": "stop1-id",
            "toStopId": "stop2-id",
            "routeId": "route-id",
            "transportType": "airplane"
          },
          "selectedFlight": {
            "flightId": "flight-id",
            "flightNumber": "SU123",
            "departureTime": "2025-03-01T08:00:00Z",
            "arrivalTime": "2025-03-01T14:30:00Z",
            "price": 15000,
            "availableSeats": 45
          },
          "departureTime": "2025-03-01T08:00:00Z",
          "arrivalTime": "2025-03-01T14:30:00Z",
          "duration": 390,
          "price": 30000,
          "transferTime": 60
        }
      ],
      "totalDuration": 450,
      "totalPrice": 30000,
      "transferCount": 1,
      "transportTypes": ["airplane", "bus"],
      "departureTime": "2025-03-01T08:00:00Z",
      "arrivalTime": "2025-03-01T15:30:00Z"
    }
  ],
  "alternatives": [...],
  "mlData": {
    "routeId": "route-1234567890",
    "segments": [...],
    "totalMetrics": {
      "totalDuration": 450,
      "totalPrice": 30000,
      "transferCount": 1,
      "complexity": 5
    },
    "riskFactors": {
      "delayRisk": 0.3,
      "availabilityRisk": 0.1
    }
  }
}
```

## Алгоритм работы

1. **Поиск остановок** - находит ближайшие остановки для городов отправления и назначения
2. **Построение графа** - загружает все маршруты и строит граф связей
3. **Поиск пути** - использует алгоритм Dijkstra для поиска кратчайшего пути
4. **Выбор рейсов** - для каждого сегмента выбирает ближайший доступный рейс
5. **Формирование результата** - собирает полный маршрут с деталями всех сегментов
6. **Подготовка ML данных** - формирует структуру для ML-моделей

## Типы транспорта

Модуль поддерживает следующие типы транспорта:

- `airplane` - авиа
- `bus` - автобус
- `train` - поезд
- `ferry` - паром
- `taxi` - такси
- `unknown` - неизвестный тип

## Особенности

- **Универсальность** - работает с любыми типами транспорта
- **Пересадки** - автоматически находит маршруты с пересадками
- **Смешанные маршруты** - поддерживает комбинации разных типов транспорта
- **ML готовность** - данные подготовлены для использования в ML-моделях
- **Расширяемость** - легко добавить новые алгоритмы поиска пути

## Расширение

Для добавления новых алгоритмов поиска пути:

1. Создать новый класс, реализующий интерфейс поиска пути
2. Добавить метод в `RouteBuilder` для выбора алгоритма
3. Использовать новый алгоритм в `BuildRouteUseCase`

## Тестирование

Модуль можно тестировать изолированно, мокируя OData сервисы:

```typescript
const mockRoutesService = {
  getAllRoutes: jest.fn(),
  getRouteStops: jest.fn(),
};

const graphBuilder = new RouteGraphBuilder(
  mockRoutesService,
  // ... другие моки
);
```


