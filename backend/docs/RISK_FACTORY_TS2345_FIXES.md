# ✅ Исправление TS2345 в RiskFactorFactory и связанных модулях

## Выполненные исправления

### 1. ✅ Исправление RiskFactorFactory.ts

**Проблема:** Метод `getFactorsForTransportType` принимал `string` вместо `TransportType`.

**Исправлено:**
```typescript
// Было:
static getFactorsForTransportType(transportType: string): IRiskFactor[] {
  this.ensureInitialized();
  return this.factors.filter((factor) => factor.isApplicable(transportType));
}

// Стало:
static getFactorsForTransportType(transportType: TransportType): IRiskFactor[] {
  this.ensureInitialized();
  return this.factors.filter((factor) => factor.isApplicable(transportType));
}
```

**Добавлен импорт:**
```typescript
import { TransportType } from '../../../domain/entities/RouteSegment';
```

**Файл:** `backend/src/application/risk-engine/risk-factors/RiskFactorFactory.ts`

### 2. ✅ Исправление BaseRiskFactor.ts

**Проблема:** Абстрактный метод `isApplicable` принимал `string` вместо `TransportType`, что не соответствовало интерфейсу `IRiskFactor`.

**Исправлено:**
```typescript
// Было:
abstract isApplicable(transportType: string): boolean;

// Стало:
abstract isApplicable(transportType: TransportType): boolean;
```

**Добавлен импорт:**
```typescript
import { TransportType } from '../../../domain/entities/RouteSegment';
```

**Файл:** `backend/src/application/risk-engine/base/BaseRiskFactor.ts`

### 3. ✅ Исправление TransportTypeRiskFactor.ts

**Проблема:** Метод `isApplicable` принимал `string` вместо `TransportType`.

**Исправлено:**
```typescript
// Было:
isApplicable(_transportType: string): boolean {
  return true;
}

// Стало:
isApplicable(_transportType: TransportType): boolean {
  return true;
}
```

**Файл:** `backend/src/application/risk-engine/risk-factors/TransportTypeRiskFactor.ts`

### 4. ✅ Проверка всех связанных модулей

**Проверено:**

#### RiskCalculatorFactory
- ✅ Уже использует `TransportType` в методе `getCalculator(transportType: TransportType)`
- ✅ Все case-ы используют enum-значения: `TransportType.AIRPLANE`, `TransportType.TRAIN`, и т.д.

#### SegmentRiskEngine
- ✅ Не использует `RiskFactorFactory` напрямую
- ✅ Работает через `SegmentRiskService`, который не использует строки

#### UnifiedRiskCalculator
- ✅ Не использует `RiskFactorFactory` напрямую
- ✅ Работает с `IRiskFactorResult[]`, не требует `TransportType`

#### Use Cases
- ✅ `AssessSegmentRiskUseCase.ts` - использует `TransportType` enum в сравнениях
- ✅ `AssessRouteRiskUseCase.ts` - не использует `RiskFactorFactory` напрямую

#### Сервисы
- ✅ `RouteRiskService.ts` - не использует `RiskFactorFactory` напрямую
- ✅ `SegmentRiskService.ts` - не использует `RiskFactorFactory` напрямую
- ✅ `RiskService.ts` - не использует `RiskFactorFactory` напрямую

#### Модели
- ✅ `RuleBasedRiskModel.ts` - использует `TransportType` enum в сравнениях

### 5. ✅ Проверка вызовов getFactorsForTransportType

**Результат:** Метод `getFactorsForTransportType` не вызывается нигде в коде напрямую.

**Примечание:** Это означает, что метод готов к использованию с правильным типом, но пока не используется в текущей реализации. Все факторы риска фильтруются через интерфейс `IRiskFactor.isApplicable()`, который теперь требует `TransportType`.

### 6. ✅ Проверка всех факторов риска

**Проверено:** Все факторы риска уже используют `TransportType` в методе `isApplicable`:
- ✅ `WeatherRiskFactor` - `isApplicable(_transportType: TransportType)`
- ✅ `RoadConditionsRiskFactor` - `isApplicable(transportType: TransportType)`
- ✅ `DelayRiskFactor` - `isApplicable(transportType: TransportType)`
- ✅ `ScheduleRegularityRiskFactor` - `isApplicable(transportType: TransportType)`
- ✅ `OccupancyRiskFactor` - `isApplicable(transportType: TransportType)`
- ✅ `CancellationRiskFactor` - `isApplicable(transportType: TransportType)`
- ✅ `TransferRiskFactor` - `isApplicable(_transportType: TransportType)`
- ✅ `SeasonalityRiskFactor` - `isApplicable(_transportType: TransportType)`
- ✅ `TransportTypeRiskFactor` - исправлен на `isApplicable(_transportType: TransportType)`

## Статус исправлений

### ✅ Завершено:
1. Исправлен тип параметра в `RiskFactorFactory.getFactorsForTransportType` с `string` на `TransportType`
2. Добавлен импорт `TransportType` в `RiskFactorFactory.ts`
3. Исправлен абстрактный метод в `BaseRiskFactor.isApplicable` с `string` на `TransportType`
4. Добавлен импорт `TransportType` в `BaseRiskFactor.ts`
5. Исправлен метод в `TransportTypeRiskFactor.isApplicable` с `string` на `TransportType`
6. Проверены все связанные модули - все используют enum
7. Проверен линтер - ошибок нет

## Измененные файлы

1. `backend/src/application/risk-engine/risk-factors/RiskFactorFactory.ts`
   - Изменен тип параметра: `getFactorsForTransportType(transportType: TransportType)`
   - Добавлен импорт: `import { TransportType } from '../../../domain/entities/RouteSegment';`

2. `backend/src/application/risk-engine/base/BaseRiskFactor.ts`
   - Изменен абстрактный метод: `abstract isApplicable(transportType: TransportType): boolean;`
   - Добавлен импорт: `import { TransportType } from '../../../domain/entities/RouteSegment';`

3. `backend/src/application/risk-engine/risk-factors/TransportTypeRiskFactor.ts`
   - Изменен метод: `isApplicable(_transportType: TransportType): boolean`

## Результат

После всех исправлений:
- ✅ `RiskFactorFactory.getFactorsForTransportType` принимает только `TransportType` enum
- ✅ `BaseRiskFactor.isApplicable` требует `TransportType` enum
- ✅ Все факторы риска соответствуют интерфейсу `IRiskFactor`
- ✅ Все факторы риска используют `TransportType` enum
- ✅ Нет строковых значений транспорта в risk-engine
- ✅ Ошибок линтера: 0
- ✅ Нет ошибок TS2345
- ✅ Risk-engine полностью типобезопасен

## Примечания

1. **Метод getFactorsForTransportType не используется:** Это нормально, так как текущая реализация использует другой подход к фильтрации факторов. Метод готов к использованию с правильным типом.

2. **Консистентность:** Все компоненты risk-engine теперь используют единый подход:
   - Все методы принимают `TransportType` enum
   - Все сравнения используют enum-значения
   - Нет строковых значений транспорта

3. **Интерфейс IRiskFactor:** Теперь полностью соответствует всем реализациям, включая `BaseRiskFactor` и все факторы риска.

