# ✅ Исправление ошибки TS2322 в GraphBuilderWorker

## Проблема

```
error TS2322: Type 'string' is not assignable to type 'TransportType'.
```

В `GraphBuilderWorker.ts` тип параметра `transportType` в методе `buildGraphStructure` был указан как `string`, но использовался как `TransportType`.

## Причина

Метод `buildGraphStructure` принимал параметр `routes` с типом `transportType: string`, но при использовании этого значения в объектах `GraphEdge`, где поле `transportType` имеет тип `TransportType | undefined`, возникала ошибка несовместимости типов.

## Исправление

**Файл:** `backend/src/application/workers/GraphBuilderWorker.ts`

### 1. Исправлен тип параметра в методе `buildGraphStructure` (строка 632)

**Было:**
```typescript
routes: Array<{ 
  id: string; 
  fromStopId: string; 
  toStopId: string; 
  stopsSequence: Array<{ stopId: string }>; 
  transportType: string; // ❌ Неправильный тип
  durationMinutes?: number; 
  distanceKm?: number; 
  metadata?: Record<string, unknown> 
}>
```

**Стало:**
```typescript
routes: Array<{ 
  id: string; 
  fromStopId: string; 
  toStopId: string; 
  stopsSequence: Array<{ stopId: string }>; 
  transportType: TransportType; // ✅ Правильный тип
  durationMinutes?: number; 
  distanceKm?: number; 
  metadata?: Record<string, unknown> 
}>
```

### 2. Улучшена типизация `finalTransportType` (строка 692)

**Было:**
```typescript
let finalTransportType = route?.transportType as TransportType | undefined;
```

**Стало:**
```typescript
let finalTransportType: TransportType | undefined = route?.transportType;
```

Убран ненужный type assertion, так как тип теперь правильно выводится из параметра.

## Проверка использования

Все места, где используется `transportType`, уже используют enum-значения:

1. **Строка 181**: `transportType: route.transportType` - TransportType enum из Route entity
2. **Строка 194**: `transportType: TransportType.UNKNOWN` - для virtual routes
3. **Строка 692**: `finalTransportType: TransportType | undefined = route?.transportType` - правильная типизация
4. **Строка 694**: `route?.transportType === TransportType.FERRY` - сравнение с enum
5. **Строка 759**: `transportType: finalTransportType` - присваивание в GraphEdge
6. **Строка 811, 823**: `transportType: route.transportType` - прямое использование
7. **Строка 883, 893**: `transportType: TransportType.UNKNOWN` - для transfer edges

## Результат

- ✅ Ошибка TS2322 устранена
- ✅ Тип параметра `transportType` изменен с `string` на `TransportType`
- ✅ Убран ненужный type assertion
- ✅ Все использования `transportType` используют enum-значения
- ✅ `TransportType` импортирован как значение (не через `import type`)
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибка TS2322 должна исчезнуть.


