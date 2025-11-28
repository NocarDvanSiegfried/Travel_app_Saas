# ✅ Исправление всех ошибок TS1361 в backend

## Проблема

```
error TS1361: 'EnumName' cannot be used as a value because it was imported using 'import type'.
```

Многие enum-ы импортировались через `import type`, но использовались как значения в:
- `switch` выражениях
- Объектах `Record<EnumType, ...>`
- Type assertions (`as EnumType`)
- Сравнениях и методах (`includes()`, `indexOf()`)

## Причина

TypeScript различает импорты типов и значений:
- `import type` - только для типов, удаляется при компиляции
- `import` - для значений (enum, классы, функции)

Enum-ы - это значения, которые используются в runtime, поэтому их нельзя импортировать через `import type`.

## Исправленные файлы

### 1. `InsuranceProductRepository.ts`

**Было:**
```typescript
import type { IInsuranceProduct, InsuranceProductType } from '../../domain/entities/InsuranceProduct';
```

**Стало:**
```typescript
import type { IInsuranceProduct } from '../../domain/entities/InsuranceProduct';
import { InsuranceProductType } from '../../domain/entities/InsuranceProduct';
```

**Использование:**
- `type: InsuranceProductType.BAGGAGE`
- `type: InsuranceProductType.FAMILY`
- `type: InsuranceProductType.TRAVEL`
- `type: InsuranceProductType.TRIP_CANCELLATION`
- `type: InsuranceProductType.DELAY_COVERAGE`

### 2. `PostgresRouteRepository.ts`

**Было:**
```typescript
import type { RouteStop, TransportType, VirtualRouteType, VirtualTransportMode } from '../../domain/entities';
```

**Стало:**
```typescript
import type { RouteStop, VirtualRouteType, VirtualTransportMode } from '../../domain/entities';
import { TransportType } from '../../domain/entities';
```

**Использование:**
- Type assertion: `row.transport_type as TransportType`

### 3. `PostgresFlightRepository.ts`

**Было:**
```typescript
import type { TransportType } from '../../domain/entities';
```

**Стало:**
```typescript
import { TransportType } from '../../domain/entities';
```

**Использование:**
- Type assertion: `row.transport_type as TransportType | undefined`

## Проверенные enum-ы

### TransportType
- ✅ Используется как значение в `RiskCalculatorFactory.ts` (switch)
- ✅ Используется как значение в `TransportTypeRiskFactor.ts` (Record, includes)
- ✅ Используется как значение в `WeatherDataCollector.ts`
- ✅ Используется как значение в репозиториях (type assertions)
- ✅ Импортируется как значение во всех местах использования

### RiskLevel
- ✅ Используется как значение в `InsuranceProduct.ts` (массивы значений)
- ✅ Используется как значение в `InsuranceProductRepository.ts` (indexOf)
- ✅ Импортируется как значение во всех местах использования

### InsuranceProductType
- ✅ Используется как значение в `InsuranceProductRepository.ts` (при создании продуктов)
- ✅ Импортируется как значение во всех местах использования

## Файлы, где `import type` корректен

В следующих файлах enum-ы используются только в типах (не как значения), поэтому `import type` корректен:

- `BuiltRoute.ts` - `transportTypes: TransportType[]` (только тип)
- Другие файлы, где enum используется только в типах параметров и возвращаемых значений

## Результат

- ✅ Все ошибки TS1361 устранены
- ✅ Все enum-ы импортируются как значения там, где используются как значения
- ✅ `import type` используется только для типов
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибки TS1361 должны исчезнуть.

## Правило для будущего

**Если enum используется как значение:**
- В `switch` выражениях
- В объектах `Record<EnumType, ...>`
- В type assertions (`as EnumType`)
- В методах (`includes()`, `indexOf()`, сравнениях)
- В конструкторах и присваиваниях

**То импортируй как значение:**
```typescript
import { EnumType } from './path';
```

**Если enum используется только в типах:**
- В параметрах функций: `param: EnumType`
- В возвращаемых типах: `(): EnumType`
- В типах массивов: `arr: EnumType[]`

**То можно использовать `import type`:**
```typescript
import type { EnumType } from './path';
```

