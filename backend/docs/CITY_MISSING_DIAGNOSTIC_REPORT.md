# Диагностический отчёт: Пропажа городов из /api/v1/cities

**Дата:** 2025-01-27  
**Проблема:** Фронтенд получает только 20 городов вместо 30 из unified reference  
**Отсутствующие города:** Якутск, Олёкминск, Чурапча, Амга, Среднеколымск, Томмот и другие

---

## 1. Анализ данных в справочниках

### 1.1 Unified Reference (unified-cities-loader.ts)

**Всего городов:** 30
- **Якутские города:** 16 (из `yakutia-cities-reference.json`)
- **Федеральные города:** 14 (из `russia-federal-cities-reference.json`)

**Проверка наличия проблемных городов в справочнике:**

✅ **Якутск** - присутствует в `yakutia-cities-reference.json`:
```json
{
  "name": "Якутск",
  "normalizedName": "якутск"
}
```

✅ **Олёкминск** - присутствует в `yakutia-cities-reference.json`:
```json
{
  "name": "Олёкминск",
  "normalizedName": "олекминск"
}
```

✅ **Среднеколымск** - присутствует в `yakutia-cities-reference.json`:
```json
{
  "name": "Среднеколымск",
  "normalizedName": "среднеколымск"
}
```

❌ **Чурапча** - ОТСУТСТВУЕТ в `yakutia-cities-reference.json`  
❌ **Амга** - ОТСУТСТВУЕТ в `yakutia-cities-reference.json`  
❌ **Томмот** - ОТСУТСТВУЕТ в `yakutia-cities-reference.json`

**Вывод:** Проблемные города (Чурапча, Амга, Томмот) отсутствуют в справочнике, поэтому они не могут появиться в ответе API. Это не баг, а отсутствие данных в справочнике.

**НО:** Якутск, Олёкминск, Среднеколымск присутствуют в справочнике, но не попадают в ответ API. Это указывает на проблему в логике обработки.

---

## 2. Анализ логики CitiesController

### 2.1 Структура обработки городов

**Файл:** `backend/src/presentation/controllers/CitiesController.ts`

**Логика обработки (строки 121-298):**

1. **Инициализация (строки 139-140):**
   ```typescript
   const citiesSet = new Set<string>();
   const normalizedCitiesMap = new Map<string, string>(); // normalized -> original name
   ```

2. **Обработка реальных остановок (строки 143-194):**
   - Для каждой реальной остановки:
     - Если есть `stop.cityId` → нормализуется → ищется в unified reference через `getUnifiedCity()`
     - Если `getUnifiedCity()` находит город → `cityName = unifiedCity.name`
     - Если не находит → `cityName` остаётся `null` (город пропускается)
     - Если `cityName` не null → добавляется в `normalizedCitiesMap` и `citiesSet`

3. **Обработка виртуальных остановок (строки 197-248):**
   - Аналогичная логика для виртуальных остановок

4. **Финальный шаг: добавление всех городов из unified reference (строки 256-266):**
   ```typescript
   for (const city of allUnifiedCities) {
     unifiedCityNames.add(city.name);
     const normalized = normalizeCityName(city.name);
     normalizedCitiesMap.set(normalized, city.name); // БЕЗ проверки has()
     citiesSet.add(city.name);
   }
   ```

### 2.2 Критические проблемы в логике

#### Проблема #1: Проверка `!normalizedCitiesMap.has(normalized)` пропускает города

**Местоположение:** Строки 189-190 и 243-244

**Код:**
```typescript
if (cityName) {
  const normalized = normalizeCityName(cityName);
  if (!normalizedCitiesMap.has(normalized)) {  // ❌ ПРОБЛЕМА ЗДЕСЬ
    normalizedCitiesMap.set(normalized, cityName);
    citiesSet.add(cityName);
  }
}
```

**Проблема:**
- Если город уже был добавлен в `normalizedCitiesMap` с нормализованным ключом, он не добавляется снова
- Это происходит ДО финального шага добавления всех городов из unified reference
- Если город был добавлен из остановок с правильным названием, это нормально
- НО если город был добавлен с неправильным названием (например, нормализованным), он не перезаписывается

**Пример проблемы:**
1. Stop имеет `cityId = "якутск"` (нормализованное)
2. `getUnifiedCity("якутск")` находит город → `cityName = "Якутск"`
3. `normalizeCityName("Якутск")` → `"якутск"`
4. `normalizedCitiesMap.has("якутск")` → `false` (ещё нет)
5. `normalizedCitiesMap.set("якутск", "Якутск")` ✅
6. `citiesSet.add("Якутск")` ✅

**НО если:**
1. Stop имеет `cityId = "якутск"`, но `getUnifiedCity("якутск")` НЕ находит город (ошибка в логике поиска)
2. `cityName` остаётся `null`
3. Город не добавляется из остановок
4. В финальном шаге город должен добавиться из unified reference

**Вывод:** Проблема может быть в том, что `getUnifiedCity()` не находит город по нормализованному ключу.

#### Проблема #2: Нормализация "Олёкминск" удаляет "ё" и "ь"

**Местоположение:** `backend/src/shared/utils/city-normalizer.ts`, строки 40-44

**Код:**
```typescript
normalized = normalized
  .replace(/ё/g, 'е')  // "ё" → "е"
  .replace(/ъ/g, '')
  .replace(/ь/g, '');  // "ь" → удаляется
```

**Проверка:**
- `normalizeCityName("Олёкминск")` → `"олекминск"` (ё→е, ь удалён)
- В справочнике `normalizedName` для "Олёкминск" = `"олекминск"` ✅
- Ключ в Map: `normalizeCityName("Олёкминск")` = `"олекминск"` ✅
- `getUnifiedCity("Олёкминск")` → нормализует → `"олекминск"` → находит в Map ✅

**Вывод:** Нормализация работает правильно, проблема не в этом.

#### Проблема #3: Логика поиска в unified reference

**Местоположение:** `backend/src/shared/utils/unified-cities-loader.ts`, строки 137-141

**Код:**
```typescript
export function getUnifiedCity(cityName: string): UnifiedCity | undefined {
  const citiesMap = loadUnifiedCitiesReference();
  const normalized = normalizeCityName(cityName);
  return citiesMap.get(normalized);
}
```

**Проверка:**
- Map создаётся с ключами: `normalizeCityName(city.normalizedName || city.name)`
- Для "Олёкминск": `normalizedName = "олекминск"` → ключ = `normalizeCityName("олекминск")` = `"олекминск"` ✅
- `getUnifiedCity("Олёкминск")` → нормализует → `"олекминск"` → `citiesMap.get("олекминск")` → должен найти ✅

**НО:** Если `stop.cityId` содержит неправильное значение (например, "олекминск" с другой нормализацией), поиск может не сработать.

#### Проблема #4: Финальный шаг перезаписывает, но не гарантирует добавление

**Местоположение:** Строки 260-266

**Код:**
```typescript
for (const city of allUnifiedCities) {
  unifiedCityNames.add(city.name);
  const normalized = normalizeCityName(city.name);
  normalizedCitiesMap.set(normalized, city.name); // БЕЗ проверки has() - перезаписывает
  citiesSet.add(city.name); // Добавляет в Set (дубликаты игнорируются)
}
```

**Анализ:**
- `normalizedCitiesMap.set()` вызывается БЕЗ проверки `has()`, что означает перезапись
- `citiesSet.add()` добавляет в Set, дубликаты игнорируются
- Это должно гарантировать, что все города из unified reference попадут в ответ

**НО:** Если город уже был добавлен с правильным названием, это нормально. Если с неправильным - перезапишется.

**Вывод:** Логика финального шага должна работать правильно, но может быть проблема в том, что города не добавляются из остановок из-за ошибок в поиске.

---

## 3. Анализ пути данных через воркеры

### 3.1 ODataSyncWorker

**Файл:** `backend/src/application/workers/ODataSyncWorker.ts`

**Логика обработки stops (строки 273-349):**

1. Извлечение города из `stopData.name` через `extractCityFromStopName()`
2. Проверка через `getMainCityBySuburb()` (замена пригорода на основной город)
3. Проверка через `getCityByAirportName()` (замена аэропорта на город)
4. Нормализация через `normalizeCityName()`
5. Проверка в unified reference через `isCityInUnifiedReference()`
6. Если не найден → повторная проверка через airports/suburbs справочники
7. Сохранение `stop.cityId = normalizedCityName`

**Потенциальные проблемы:**

**Проблема A:** Если `extractCityFromStopName()` возвращает неправильное название (например, "Туймаада" вместо "Якутск"), и справочники аэропортов/пригородов не находят город, то `normalizedCityName` будет неправильным.

**Проблема B:** Если `normalizedCityName` не найден в unified reference, stop всё равно сохраняется с этим `cityId`, но в CitiesController этот город не попадёт в список (так как `getUnifiedCity()` не найдёт его).

**Пример для "Якутск":**
- Stop: "Аэропорт Якутск (Туймаада)"
- `extractCityFromStopName()` → "Якутск" (через справочник аэропортов)
- `normalizeCityName("Якутск")` → `"якутск"`
- `isCityInUnifiedReference("якутск")` → `true` ✅
- `stop.cityId = "якутск"` ✅

**Пример для "Олёкминск":**
- Stop: "Автостанция Олёкминск"
- `extractCityFromStopName()` → "Олёкминск"
- `normalizeCityName("Олёкминск")` → `"олекминск"`
- `isCityInUnifiedReference("олекминск")` → `true` ✅
- `stop.cityId = "олекминск"` ✅

**Вывод:** ODataSyncWorker должен сохранять правильные `cityId`, но если есть ошибки в извлечении или нормализации, `cityId` может быть неправильным.

### 3.2 VirtualEntitiesGeneratorWorker

**Файл:** `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts`

**Логика генерации виртуальных остановок (строки 305-369):**

1. Загрузка всех городов из unified reference
2. Поиск городов без реальных остановок
3. Для каждого города:
   - Проверка `isCityInUnifiedReference(cityName)`
   - Поиск города в `citiesMapByName` или `citiesMapByNormalized`
   - Создание виртуальной остановки с `cityId = normalizeCityName(city.name)`

**Потенциальные проблемы:**

**Проблема C:** Если город не найден в unified reference, виртуальная остановка не создаётся.

**Проблема D:** Если `cityId` виртуальной остановки неправильный, в CitiesController `getUnifiedCity()` может не найти город.

**Пример для "Якутск":**
- Город "Якутск" есть в unified reference ✅
- `normalizeCityName("Якутск")` → `"якутск"`
- `virtualStop.cityId = "якутск"` ✅
- В CitiesController: `getUnifiedCity("якутск")` → должен найти ✅

**Вывод:** VirtualEntitiesGeneratorWorker должен создавать виртуальные остановки с правильными `cityId`, но если город отсутствует в unified reference, остановка не создаётся.

### 3.3 GraphBuilderWorker

**Файл:** `backend/src/application/workers/GraphBuilderWorker.ts`

**Логика построения графа (строки 571+):**

- `cityId` нормализуется перед созданием узлов графа
- Проверка `isCityInUnifiedReference()` для `normalizedCityId`

**Вывод:** GraphBuilderWorker не влияет на список городов в CitiesController, так как CitiesController читает данные напрямую из базы через PostgresStopRepository.

---

## 4. Точные места проблем

### 4.1 CitiesController.ts - Проблема с проверкой has()

**Файл:** `backend/src/presentation/controllers/CitiesController.ts`  
**Строки:** 189-190, 243-244

**Проблемный код:**
```typescript
if (cityName) {
  const normalized = normalizeCityName(cityName);
  if (!normalizedCitiesMap.has(normalized)) {  // ❌ ПРОБЛЕМА
    normalizedCitiesMap.set(normalized, cityName);
    citiesSet.add(cityName);
  }
}
```

**Проблема:**
- Если город уже был добавлен с нормализованным ключом, он не добавляется снова
- Это происходит ДО финального шага, но финальный шаг должен перезаписать
- **НО:** Если `cityName` был `null` (город не найден в unified reference), город не добавляется из остановок, и должен добавиться в финальном шаге

**Диагноз:** Проблема не в этой проверке, так как финальный шаг должен добавить все города из unified reference.

### 4.2 CitiesController.ts - Проблема с поиском в unified reference

**Файл:** `backend/src/presentation/controllers/CitiesController.ts`  
**Строки:** 153, 207

**Проблемный код:**
```typescript
const normalizedCityId = normalizeCityName(stop.cityId);
const unifiedCity = getUnifiedCity(normalizedCityId);
if (unifiedCity) {
  cityName = unifiedCity.name;
}
// If not found in unified reference, skip this stop's city
```

**Проблема:**
- Если `getUnifiedCity(normalizedCityId)` не находит город, `cityName` остаётся `null`
- Город не добавляется из остановок
- Должен добавиться в финальном шаге, но если `stop.cityId` неправильный, это может указывать на проблему в данных

**Диагноз:** Если `stop.cityId` содержит неправильное значение (не из unified reference), город не найдётся, и должен добавиться в финальном шаге. Но если в базе нет остановок для города, и виртуальная остановка не создана, город всё равно должен добавиться в финальном шаге.

### 4.3 unified-cities-loader.ts - Проблема с ключами в Map

**Файл:** `backend/src/shared/utils/unified-cities-loader.ts`  
**Строки:** 72, 96

**Проблемный код:**
```typescript
const normalizedKey = normalizeCityName(city.normalizedName || city.name);
citiesMap.set(normalizedKey, { ... });
```

**Проблема:**
- Ключ в Map создаётся из `city.normalizedName` или `city.name`
- Для "Олёкминск": `normalizedName = "олекминск"` → ключ = `normalizeCityName("олекминск")` = `"олекминск"` ✅
- Для "Якутск": `normalizedName = "якутск"` → ключ = `normalizeCityName("якутск")` = `"якутск"` ✅

**Диагноз:** Ключи создаются правильно, проблема не в этом.

### 4.4 city-normalizer.ts - Проблема с нормализацией "Олёкминск"

**Файл:** `backend/src/shared/utils/city-normalizer.ts`  
**Строки:** 40-44

**Код:**
```typescript
normalized = normalized
  .replace(/ё/g, 'е')  // "ё" → "е"
  .replace(/ъ/g, '')
  .replace(/ь/g, '');  // "ь" → удаляется
```

**Проверка:**
- `normalizeCityName("Олёкминск")` → `"олекминск"` (ё→е, ь удалён)
- В справочнике `normalizedName = "олекминск"` ✅
- Ключ в Map = `"олекминск"` ✅
- `getUnifiedCity("Олёкминск")` → нормализует → `"олекминск"` → находит ✅

**Диагноз:** Нормализация работает правильно, проблема не в этом.

---

## 5. Полный список проблем

### 5.1 Критические проблемы

**Проблема #1: Отсутствие городов в справочнике**

**Местоположение:** `backend/data/mock/yakutia-cities-reference.json`

**Описание:**
- Города "Чурапча", "Амга", "Томмот" отсутствуют в справочнике
- Эти города не могут появиться в ответе API, так как их нет в unified reference

**Влияние:**
- Эти города никогда не появятся в `/api/v1/cities`, пока не будут добавлены в справочник

**Решение:**
- Добавить отсутствующие города в `yakutia-cities-reference.json`

---

**Проблема #2: Возможная проблема с поиском в unified reference**

**Местоположение:** `backend/src/presentation/controllers/CitiesController.ts`, строки 153, 207

**Описание:**
- Если `stop.cityId` содержит значение, которое не находится в unified reference через `getUnifiedCity()`, город не добавляется из остановок
- Город должен добавиться в финальном шаге, но если в базе нет остановок для города, и виртуальная остановка не создана, город всё равно должен добавиться

**Влияние:**
- Если `stop.cityId` неправильный (не из unified reference), город не найдётся при обработке остановок
- Но должен добавиться в финальном шаге

**Решение:**
- Проверить, что все `stop.cityId` в базе соответствуют городам из unified reference
- Проверить, что виртуальные остановки создаются для всех городов из unified reference

---

### 5.2 Потенциальные проблемы

**Проблема #3: Проверка `!normalizedCitiesMap.has(normalized)` может пропускать города**

**Местоположение:** `backend/src/presentation/controllers/CitiesController.ts`, строки 189-190, 243-244

**Описание:**
- Проверка `!normalizedCitiesMap.has(normalized)` предотвращает добавление дубликатов
- Но это происходит ДО финального шага, где все города из unified reference добавляются БЕЗ проверки

**Влияние:**
- Минимальное, так как финальный шаг должен добавить все города из unified reference

**Решение:**
- Убрать проверку `has()` в финальном шаге (уже сделано)
- Убедиться, что финальный шаг выполняется всегда

---

**Проблема #4: Нормализация может создавать конфликты**

**Местоположение:** `backend/src/shared/utils/city-normalizer.ts`, строки 40-44

**Описание:**
- `normalizeCityName()` удаляет "ё" → "е" и "ь" → ""
- Это может создавать конфликты для городов с похожими названиями

**Влияние:**
- Минимальное, так как в справочнике нет конфликтующих названий

**Решение:**
- Убедиться, что все города в справочнике имеют уникальные `normalizedName`

---

## 6. Рекомендации по исправлению

### 6.1 Немедленные действия

1. **Добавить отсутствующие города в справочник:**
   - Добавить "Чурапча", "Амга", "Томмот" в `yakutia-cities-reference.json`

2. **Проверить данные в базе:**
   - Проверить, что все `stop.cityId` соответствуют городам из unified reference
   - Проверить, что виртуальные остановки созданы для всех городов из unified reference

3. **Проверить логи CitiesController:**
   - Проверить логи на наличие предупреждений о пропущенных городах
   - Проверить, что финальный шаг выполняется и добавляет все города из unified reference

### 6.2 Долгосрочные улучшения

1. **Улучшить логирование:**
   - Добавить детальное логирование для каждого города при обработке
   - Логировать, почему город не был добавлен (не найден в unified reference, уже был добавлен, и т.д.)

2. **Добавить валидацию:**
   - Валидировать, что все города из unified reference присутствуют в ответе API
   - Выбрасывать ошибку, если город из unified reference отсутствует в ответе

3. **Улучшить обработку ошибок:**
   - Обрабатывать случаи, когда `getUnifiedCity()` не находит город
   - Логировать предупреждения для таких случаев

---

## 7. Итоговый диагноз

### 7.1 Основная причина проблемы

**Проблема:** Города "Якутск", "Олёкминск", "Среднеколымск" присутствуют в unified reference, но не попадают в ответ API.

**Вероятные причины:**

1. **Неправильные `stop.cityId` в базе данных:**
   - Если `stop.cityId` содержит значение, которое не находится в unified reference через `getUnifiedCity()`, город не добавляется из остановок
   - Город должен добавиться в финальном шаге, но если в базе нет остановок для города, и виртуальная остановка не создана, город всё равно должен добавиться

2. **Виртуальные остановки не созданы:**
   - Если для города нет реальных остановок, и виртуальная остановка не создана, город не появится при обработке остановок
   - Но должен добавиться в финальном шаге

3. **Ошибка в финальном шаге:**
   - Если финальный шаг не выполняется или выполняется с ошибкой, города из unified reference не добавляются

### 7.2 Что нужно проверить

1. **Проверить данные в базе:**
   ```sql
   SELECT DISTINCT city_id FROM stops WHERE city_id IS NOT NULL;
   SELECT DISTINCT city_id FROM virtual_stops WHERE city_id IS NOT NULL;
   ```

2. **Проверить логи CitiesController:**
   - Проверить логи на наличие предупреждений о пропущенных городах
   - Проверить, что финальный шаг выполняется и добавляет все города из unified reference

3. **Проверить виртуальные остановки:**
   - Проверить, что виртуальные остановки созданы для всех городов из unified reference

### 7.3 Точные места для исправления

**Нет критических мест для исправления в коде.** Проблема скорее всего в данных:
- Неправильные `stop.cityId` в базе данных
- Отсутствие виртуальных остановок для некоторых городов
- Ошибка в финальном шаге добавления городов из unified reference

**Рекомендация:** Проверить данные в базе и логи CitiesController для точной диагностики.

---

## 8. Заключение

**Статус:** Диагностика завершена. Найдены потенциальные проблемы в логике обработки, но основная проблема скорее всего в данных (неправильные `stop.cityId` или отсутствие виртуальных остановок).

**Следующие шаги:**
1. Проверить данные в базе данных
2. Проверить логи CitiesController
3. Добавить отсутствующие города в справочник (Чурапча, Амга, Томмот)
4. Убедиться, что виртуальные остановки созданы для всех городов из unified reference








