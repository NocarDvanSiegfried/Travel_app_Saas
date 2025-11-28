# ✅ Исправление ошибок TS2345 в AirRouteGeneratorWorker

## Проблема

```
error TS2345: Argument of type '"PLANE"' is not assignable to parameter of type 'TransportType'.
```

В `AirRouteGeneratorWorker.ts` использовались строковые литералы `'PLANE'` вместо enum-значений `TransportType`.

## Причина

При создании объектов `Route` и `Flight` передавались строковые литералы `'PLANE'`, но конструкторы ожидают enum `TransportType`.

## Исправление

**Файл:** `backend/src/application/workers/AirRouteGeneratorWorker.ts`

### 1. Добавлен импорт TransportType

**Было:**
```typescript
import { Route, type RouteStop } from '../../domain/entities/Route';
import { Flight } from '../../domain/entities/Flight';
```

**Стало:**
```typescript
import { Route, type RouteStop } from '../../domain/entities/Route';
import { Flight } from '../../domain/entities/Flight';
import { TransportType } from '../../domain/entities/RouteSegment';
```

### 2. Исправлено создание Route (строка 361)

**Было:**
```typescript
return new Route(
  routeId,
  'PLANE',
  fromStopId,
  toStopId,
  // ...
);
```

**Стало:**
```typescript
return new Route(
  routeId,
  TransportType.AIRPLANE,
  fromStopId,
  toStopId,
  // ...
);
```

### 3. Исправлено создание Flight (строка 400)

**Было:**
```typescript
flights.push(
  new Flight(
    flightId,
    fromStopId,
    toStopId,
    departureTime,
    arrivalTime,
    [dayOfWeek],
    routeId,
    15000,
    false,
    'PLANE',
    { generatedBy: 'AirRouteGeneratorWorker' },
    undefined
  )
);
```

**Стало:**
```typescript
flights.push(
  new Flight(
    flightId,
    fromStopId,
    toStopId,
    departureTime,
    arrivalTime,
    [dayOfWeek],
    routeId,
    15000,
    false,
    TransportType.AIRPLANE,
    { generatedBy: 'AirRouteGeneratorWorker' },
    undefined
  )
);
```

## Результат

- ✅ Ошибки TS2345 устранены
- ✅ Все строковые литералы `'PLANE'` заменены на `TransportType.AIRPLANE`
- ✅ `TransportType` импортирован как значение (не через `import type`)
- ✅ Все вызовы конструкторов `Route` и `Flight` используют enum-значения
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибки TS2345 должны исчезнуть.


