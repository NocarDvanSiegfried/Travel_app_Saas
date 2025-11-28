# Полный отчёт об исправлении проблемы пропажи городов

## Дата: 2025-01-27

## Проблема

После выполнения pipeline некоторые города пропали из `/api/v1/cities` и не отображались во фронтенде:
- Якутск
- Олёкминск
- Чурапча
- Мирный
- Верхоянск
- Алдан
- Амга
- Чокурдах
- и другие

## Глобальные требования

Любая логика работы с городами должна идти через:
1. **unified cities reference** - единый справочник городов
2. **нормализацию через normalizeCityName** - единая нормализация
3. **справочники аэропортов / пригородов** - для корректного извлечения городов
4. **оригинальные названия из справочника (НЕ normalized)** - только оригинальные названия в API

**Критическое правило**: В системе никогда не должно появляться нормализованных названий в городах, только оригинальные.

## Найденные проблемы

### 1. CitiesController.ts

**Проблемы:**
- Fallback на нормализованные названия (`normalizedCityId`) если город не найден в unified reference
- Города из unified reference не перезаписывали нормализованные версии
- Логика извлечения городов из остановок могла добавлять города, не найденные в unified reference

**Исправления:**
- ✅ Убран fallback на `normalizedCityId` - если город не найден в unified reference, он не добавляется (будет добавлен из unified reference в конце)
- ✅ Изменена логика добавления городов из unified reference - теперь они всегда перезаписывают нормализованные версии оригинальными названиями
- ✅ Улучшена логика извлечения городов из остановок - города добавляются только если они найдены в unified reference
- ✅ Добавлено логирование для самопроверки:
  - Количество городов в ответе
  - Список городов, пропущенных относительно unified reference
  - Список городов, найденных в остановках, но не в unified reference

### 2. VirtualEntitiesGeneratorWorker.ts

**Проблемы:**
- Поиск города в `citiesMap` выполнялся только по оригинальному названию
- `cityName` из `missingCities` мог быть уже нормализован
- Отсутствовало логирование городов, не найденных в unified reference

**Исправления:**
- ✅ Созданы две карты для поиска: `citiesMapByName` (по оригинальному названию) и `citiesMapByNormalized` (по нормализованному)
- ✅ Поиск выполняется сначала по оригинальному названию, затем по нормализованному
- ✅ Используется оригинальное название города из unified reference для `name` виртуальной остановки
- ✅ `cityId` устанавливается как нормализованное название из unified reference
- ✅ Добавлено логирование городов, не найденных в unified reference

### 3. ODataSyncWorker.ts

**Проверка:**
- ✅ Город извлекается из `stopData.name` через `extractCityFromStopName`
- ✅ Если не найден → проверяется через справочник аэропортов (`getCityByAirportName`)
- ✅ Если не найден → проверяется через справочник пригородов (`getMainCityBySuburb`)
- ✅ Нормализуется и сверяется через unified reference (`isCityInUnifiedReference`)
- ✅ `cityId` сохраняется как нормализованное название

**Статус:** ✅ Логика корректна, изменений не требуется

### 4. GraphBuilderWorker.ts

**Проблемы:**
- `cityId` нормализовался, но не всегда проверялся на наличие в unified reference
- Отсутствовало логирование городов, попавших в граф
- Отсутствовало сравнение с unified reference

**Исправления:**
- ✅ `cityId` нормализуется перед созданием `GraphNode`
- ✅ Добавлена проверка `isCityInUnifiedReference` для `normalizedCityId` (с предупреждением, но не блокирует)
- ✅ Определение виртуальных остановок изменено на проверку префикса `virtual-stop-` вместо проверки `cityId`
- ✅ Добавлено логирование для самопроверки:
  - Количество городов в графе
  - Список городов из unified reference, отсутствующих в графе
  - Список городов в графе, отсутствующих в unified reference
  - Проверка ключевых городов (Якутск, Олёкминск, Верхоянск, Мирный)

### 5. BuildRouteUseCase.optimized.ts

**Проверка:**
- ✅ Использует `getRealStopsByCityName` и `getVirtualStopsByCityName` из `PostgresStopRepository`
- ✅ Эти методы используют нормализацию и full-text search на уровне БД
- ✅ Логика корректна, изменений не требуется

## Исправленные файлы

### 1. backend/src/presentation/controllers/CitiesController.ts

**Изменения:**
- Убран fallback на `normalizedCityId` для реальных и виртуальных остановок
- Улучшена логика извлечения городов из остановок - города добавляются только если найдены в unified reference
- Изменена логика добавления городов из unified reference - всегда перезаписывают нормализованные версии
- Добавлено логирование для самопроверки:
  - Количество городов в ответе vs unified reference
  - Список пропущенных городов
  - Список городов, не в unified reference

**Ключевые изменения:**
```typescript
// БЫЛО:
if (unifiedCity) {
  cityName = unifiedCity.name;
} else {
  cityName = normalizedCityId; // ❌ Fallback на нормализованное название
}

// СТАЛО:
if (unifiedCity) {
  cityName = unifiedCity.name;
}
// Если не найден, cityName остается null - будет добавлен из unified reference в конце ✅
```

### 2. backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts

**Изменения:**
- Созданы две карты для поиска: `citiesMapByName` и `citiesMapByNormalized`
- Поиск выполняется сначала по оригинальному названию, затем по нормализованному
- Используется оригинальное название города из unified reference для `name` виртуальной остановки
- Добавлено логирование городов, не найденных в unified reference

**Ключевые изменения:**
```typescript
// БЫЛО:
const citiesMap = new Map<string, UnifiedCity>();
for (const city of allCities) {
  citiesMap.set(city.name, city); // ❌ Только по оригинальному названию
}

// СТАЛО:
const citiesMapByName = new Map<string, UnifiedCity>();
const citiesMapByNormalized = new Map<string, UnifiedCity>();
for (const city of allCities) {
  citiesMapByName.set(city.name, city);
  const normalized = normalizeCityName(city.name);
  citiesMapByNormalized.set(normalized, city); // ✅ И по нормализованному
}
```

### 3. backend/src/application/workers/GraphBuilderWorker.ts

**Изменения:**
- `cityId` нормализуется перед созданием `GraphNode`
- Добавлена проверка `isCityInUnifiedReference` для `normalizedCityId`
- Определение виртуальных остановок изменено на проверку префикса `virtual-stop-`
- Добавлено логирование для самопроверки:
  - Количество городов в графе vs unified reference
  - Список пропущенных городов
  - Проверка ключевых городов

**Ключевые изменения:**
```typescript
// БЫЛО:
isVirtual: !normalizedCityId, // ❌ Ненадежная проверка

// СТАЛО:
const isVirtual = stop.id.startsWith('virtual-stop-'); // ✅ Надежная проверка по префиксу
```

## Добавленное логирование

### CitiesController.ts

```typescript
// При возврате /api/v1/cities:
- Количество городов в ответе
- Количество городов в unified reference
- Список городов, пропущенных относительно unified reference
- Список городов, найденных в остановках, но не в unified reference
```

### VirtualEntitiesGeneratorWorker.ts

```typescript
// При генерации виртуальных остановок:
- Количество сгенерированных виртуальных остановок
- Список городов, не найденных в unified reference (первые 10)
```

### GraphBuilderWorker.ts

```typescript
// При построении графа:
- Количество городов в графе
- Количество городов в unified reference
- Список городов из unified reference, отсутствующих в графе
- Список городов в графе, отсутствующих в unified reference
- Проверка ключевых городов (Якутск, Олёкминск, Верхоянск, Мирный)
```

## Ожидаемый результат

После выполнения исправлений:

### ✅ Все города из unified reference отображаются в API

**Контрольные города:**
- Якутск
- Олёкминск
- Мирный
- Чурапча
- Верхоянск
- Алдан
- Амга
- Чокурдах
- Ленск
- Нерюнгри
- и все остальные из unified reference

### ✅ Virtual stops создаются корректно

- `name` = оригинальное название из unified reference (например, "г. Якутск")
- `cityId` = нормализованное название из unified reference (например, "якутск")
- Все виртуальные остановки попадают в таблицу без ошибок

### ✅ Graph builder собирает весь граф без пропусков

- Все города из unified reference присутствуют в графе
- Каждая нода привязана к правильному городу через `cityId`
- Нет изолированных городов

### ✅ Поиск маршрутов работает для всех направлений

**Контрольные маршруты:**
- Якутск → Москва
- Москва → Чурапча
- Якутск → Олёкминск
- Олёкминск → Ленск
- Мирный → Владивосток
- Верхоянск → Мирный
- Москва → Якутск → Н. Бестях → Чурапча
- Новосибирск → Якутск → Олёкминск

## Проверка после исправлений

### Шаг 1: Перезапустить pipeline

```bash
docker-compose restart backend
```

### Шаг 2: Проверить логи backend

**CitiesController:**
```
[INFO] Cities loaded from database
  - count: [количество городов]
  - unifiedReferenceCount: [количество в unified reference]
  - missingInResponse: [количество пропущенных]
```

**VirtualEntitiesGeneratorWorker:**
```
[INFO] Generated [N] virtual stops from [M] city names
[WARN] Virtual cities not found in unified reference: [список]
```

**GraphBuilderWorker:**
```
[INFO] Cities verification:
  - citiesInGraph: [количество]
  - unifiedReferenceCount: [количество]
  - missingInGraph: [количество]
[INFO] Yakutsk found in graph: [stop-id] (cityId: якутск)
[INFO] Olekminsk found in graph: [stop-id] (cityId: олёкминск)
```

### Шаг 3: Проверить `/api/v1/cities`

```bash
curl http://localhost:5000/api/v1/cities?limit=100
```

**Ожидаемый результат:**
- Все города из unified reference присутствуют
- Все города имеют оригинальные названия (не нормализованные)
- Количество городов соответствует unified reference

### Шаг 4: Проверить фронтенд

- Все города отображаются в автокомплите
- Поиск маршрутов работает для всех контрольных направлений
- Нет ошибок 503 после сборки графа

## Статус исправлений

✅ **Все исправления применены**

### Изменённые файлы:

1. ✅ `backend/src/presentation/controllers/CitiesController.ts`
   - Убран fallback на нормализованные названия
   - Улучшена логика добавления городов из unified reference
   - Добавлено логирование для самопроверки

2. ✅ `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts`
   - Созданы две карты для поиска городов
   - Используются оригинальные названия из unified reference
   - Добавлено логирование

3. ✅ `backend/src/application/workers/GraphBuilderWorker.ts`
   - Улучшена нормализация `cityId`
   - Изменено определение виртуальных остановок
   - Добавлено логирование для самопроверки

### Проверенные файлы (изменений не требуется):

4. ✅ `backend/src/application/workers/ODataSyncWorker.ts`
   - Логика корректна, использует unified reference

5. ✅ `backend/src/application/route-builder/use-cases/BuildRouteUseCase.optimized.ts`
   - Логика корректна, использует нормализацию на уровне БД

## Следующие шаги

1. **Перезапустить backend** для применения изменений
2. **Проверить логи** на наличие предупреждений о пропущенных городах
3. **Проверить `/api/v1/cities`** - все города должны присутствовать
4. **Проверить фронтенд** - все города должны отображаться
5. **Проверить поиск маршрутов** для всех контрольных направлений

## Критерии успеха

✅ Все 30+ городов из unified reference отображаются в `/api/v1/cities`  
✅ Все города имеют оригинальные названия (не нормализованные)  
✅ Virtual stops создаются корректно для всех городов  
✅ Graph builder собирает весь граф без пропусков  
✅ Поиск маршрутов работает для всех направлений  
✅ Нет ошибок в логах о пропущенных городах  










