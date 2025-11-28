# ✅ Финальный статус TransportType в backend-проекте

## Определение TransportType

**Файл:** `backend/src/domain/entities/RouteSegment.ts`

```typescript
export enum TransportType {
  AIRPLANE = 'airplane',  // Авиа
  BUS = 'bus',            // Автобус
  TRAIN = 'train',        // Поезд
  FERRY = 'ferry',        // Паром
  TAXI = 'taxi',          // Такси (маппится в BUS для PostgreSQL)
  WINTER_ROAD = 'winter_road', // Зимник (маппится в BUS для PostgreSQL)
  UNKNOWN = 'unknown',    // Неизвестный (маппится в BUS для PostgreSQL)
}
```

## PostgreSQL Constraint

**Файл:** `backend/src/infrastructure/database/migrations/005_add_ferry_transport_type.sql`

```sql
CHECK (transport_type IN ('BUS', 'TRAIN', 'PLANE', 'WATER', 'FERRY'))
```

**Поддерживаемые значения в PostgreSQL:**
- `'BUS'` - Автобус
- `'TRAIN'` - Поезд
- `'PLANE'` - Авиа (PostgreSQL использует 'PLANE', не 'AIRPLANE')
- `'WATER'` - Водный транспорт (маппится в FERRY)
- `'FERRY'` - Паром

## Маппинг между TypeScript и PostgreSQL

### TypeScript → PostgreSQL (`transportTypeToPostgres`)

**Файл:** `backend/src/infrastructure/repositories/PostgresRouteRepository.ts`

```typescript
TransportType.AIRPLANE → 'PLANE'
TransportType.BUS → 'BUS'
TransportType.TRAIN → 'TRAIN'
TransportType.FERRY → 'FERRY'
TransportType.TAXI → 'BUS' (маппинг)
TransportType.WINTER_ROAD → 'BUS' (маппинг)
TransportType.UNKNOWN → 'BUS' (маппинг)
```

### PostgreSQL → TypeScript (`transportTypeFromPostgres`)

```typescript
'PLANE' или 'AIRPLANE' → TransportType.AIRPLANE
'BUS' → TransportType.BUS
'TRAIN' → TransportType.TRAIN
'FERRY' или 'WATER' → TransportType.FERRY
Другие → TransportType.UNKNOWN
```

## Нормализация входных данных

### ODataSyncWorker.normalizeTransportType

**Файл:** `backend/src/application/workers/ODataSyncWorker.ts`

**Поддерживаемые входные значения:**
- `'airplane'`, `'plane'`, `'AIRPLANE'`, `'PLANE'`, `'АВИА'` → `TransportType.AIRPLANE`
- `'bus'`, `'BUS'`, `'АВТОБУС'` → `TransportType.BUS`
- `'train'`, `'TRAIN'`, `'ПОЕЗД'` → `TransportType.TRAIN`
- `'ferry'`, `'FERRY'`, `'ПАРОМ'`, `'ПАРОМНАЯ ПЕРЕПРАВА'`, `'water'`, `'WATER'` → `TransportType.FERRY`
- `'taxi'`, `'TAXI'`, `'ТАКСИ'`, `'car'`, `'CAR'` → `TransportType.TAXI`
- `'winter_road'`, `'WINTER_ROAD'`, `'ЗИМНИК'` → `TransportType.WINTER_ROAD`
- Неизвестные значения → `TransportType.UNKNOWN`

### SmartRouteController.normalizeTransportType

**Файл:** `backend/src/presentation/controllers/SmartRouteController.ts`

Аналогичная логика нормализации для входных данных от клиента.

## Использование в компонентах

### ✅ Risk Engine

**Все импорты корректны:**
- `RiskFactorFactory` - использует `TransportType` enum
- `RiskCalculatorFactory` - использует `TransportType` enum
- Все risk factors - используют `TransportType` enum
- Все data providers - используют `TransportType` enum

**Файлы:**
- `backend/src/application/risk-engine/risk-factors/RiskFactorFactory.ts`
- `backend/src/application/risk-engine/risk-calculator/RiskCalculatorFactory.ts`
- `backend/src/application/risk-engine/base/BaseRiskFactor.ts`
- Все файлы в `backend/src/application/risk-engine/risk-factors/`

### ✅ Workers

**ODataSyncWorker:**
- ✅ Корректно нормализует входные данные
- ✅ Использует `TransportType` enum для создания Route и Flight
- ✅ Все создаваемые маршруты имеют валидный транспортный тип

**AirRouteGeneratorWorker:**
- ✅ Использует `TransportType.AIRPLANE` для создания авиамаршрутов

**GraphBuilderWorker:**
- ✅ Использует `TransportType` enum для всех типов транспорта

**VirtualEntitiesGeneratorWorker:**
- ✅ Использует `TransportType` enum в metadata

### ✅ Repositories

**PostgresRouteRepository:**
- ✅ Использует `transportTypeToPostgres()` при записи в базу
- ✅ Использует `transportTypeFromPostgres()` при чтении из базы
- ✅ Все методы работают с `TransportType` enum

## Проверка корректности

### ✅ Импорты

Все файлы корректно импортируют `TransportType`:
```typescript
import { TransportType } from '../../../domain/entities/RouteSegment';
```

**Проверено в:**
- Все risk-engine компоненты
- Все workers
- Все repositories
- Все controllers

### ✅ Использование enum

Везде, где используется `TransportType`, используется enum, а не строки:
- ✅ Фабрики используют enum
- ✅ Risk factors используют enum
- ✅ Workers используют enum
- ✅ Repositories используют enum

### ✅ Маппинг строк

Все строковые значения корректно маппятся к enum:
- ✅ ODataSyncWorker нормализует все варианты
- ✅ SmartRouteController нормализует входные данные
- ✅ PostgresRouteRepository преобразует для PostgreSQL

### ✅ PostgreSQL Constraint

Constraint в PostgreSQL соответствует основным типам:
- ✅ 'BUS', 'TRAIN', 'PLANE', 'WATER', 'FERRY'
- ✅ Все enum значения корректно преобразуются для записи
- ✅ Все значения из базы корректно преобразуются обратно в enum

## Финальный список типов транспорта

### Основные типы (соответствуют финальному списку):
1. **AIRPLANE** (`'airplane'`) - Авиа
2. **BUS** (`'bus'`) - Автобус
3. **TRAIN** (`'train'`) - Поезд
4. **FERRY** (`'ferry'`) - Паром

### Дополнительные типы (используются в системе, маппятся к основным для PostgreSQL):
5. **TAXI** (`'taxi'`) - Такси → маппится в 'BUS' для PostgreSQL
6. **WINTER_ROAD** (`'winter_road'`) - Зимник → маппится в 'BUS' для PostgreSQL
7. **UNKNOWN** (`'unknown'`) - Неизвестный → маппится в 'BUS' для PostgreSQL

## Статус исправлений

### ✅ Завершено:
1. ✅ TransportType enum определен корректно
2. ✅ Все импорты TransportType корректны
3. ✅ Все использования TransportType используют enum, не строки
4. ✅ ODataSyncWorker корректно нормализует входные данные
5. ✅ PostgresRouteRepository корректно преобразует enum для PostgreSQL
6. ✅ PostgreSQL constraint соответствует основным типам
7. ✅ Все фабрики и risk-engine компоненты используют enum
8. ✅ Все workers используют enum
9. ✅ Все маппинги работают корректно

### ✅ Результат:
- ✅ Backend должен собираться без ошибок
- ✅ Backend должен запускаться в Docker
- ✅ Pipeline должен проходить полностью
- ✅ Данные должны успешно сохраняться в базу
- ✅ Constraint `routes_transport_type_check` не должен нарушаться

## Примечания

1. **Дополнительные типы:** TAXI, WINTER_ROAD, UNKNOWN используются в системе для внутренней логики, но при записи в PostgreSQL маппятся к основным типам (BUS), так как constraint не поддерживает эти типы.

2. **Консистентность:** Все компоненты системы используют единый подход:
   - Внутри приложения: enum TransportType
   - При записи в PostgreSQL: преобразование в UPPERCASE значения
   - При чтении из PostgreSQL: преобразование обратно в enum

3. **Нормализация:** Все входные строковые значения корректно нормализуются к enum через `normalizeTransportType()`.

