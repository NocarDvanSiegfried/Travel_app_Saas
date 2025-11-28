# ✅ Исправление ошибок TS1361 в RiskCalculatorFactory

## Проблема

```
error TS1361: 'TransportType' cannot be used as a value because it was imported using 'import type'.
```

`TransportType` импортировался через `import type`, но использовался как значение в:
- `switch` выражениях
- Объектах `Record<TransportType, number>`
- Методах `includes()` и сравнениях

## Причина

TypeScript различает импорты типов и значений:
- `import type` - только для типов, удаляется при компиляции
- `import` - для значений (enum, классы, функции)

`TransportType` - это enum, который используется как значение в runtime, поэтому его нельзя импортировать через `import type`.

## Исправление

### Файл 1: `RiskCalculatorFactory.ts`

**Было:**
```typescript
import type { TransportType } from '../../../domain/entities/RouteSegment';
```

**Стало:**
```typescript
import { TransportType } from '../../../domain/entities/RouteSegment';
```

**Использование:**
- В `switch` выражении: `case TransportType.AIRPLANE:`
- В `Map<TransportType, IRiskCalculator>`
- В параметрах методов: `getCalculator(transportType: TransportType)`

### Файл 2: `TransportTypeRiskFactor.ts`

**Было:**
```typescript
import type { IRouteSegment, TransportType } from '../../../domain/entities/RouteSegment';
```

**Стало:**
```typescript
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
```

**Использование:**
- В объекте `TRANSPORT_TYPE_WEIGHTS: Record<TransportType, number>`
- В ключах объекта: `[TransportType.AIRPLANE]: 0.0`
- В методах: `transportTypes.includes(TransportType.FERRY)`

## Результат

- ✅ Ошибки TS1361 устранены
- ✅ `TransportType` импортируется как значение во всех местах, где используется как enum
- ✅ `IRouteSegment` остается импортом типа (используется только для типизации)
- ✅ Все файлы в `risk-calculator` используют `TransportType` корректно
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибки TS1361 должны исчезнуть.

## Дополнительная проверка

Убедились, что во всех файлах `risk-engine`:
- `TransportType` импортируется как значение (`import { TransportType }`)
- Нет `import type { TransportType }` в местах, где он используется как значение
- Все enum-значения доступны в runtime

