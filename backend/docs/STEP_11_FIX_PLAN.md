# [STEP 11 — FIX PLAN]

**Цель:** Подготовить чёткий пакет исправлений для устранения всех критичных проблем из FINAL_DIAGNOSTIC_REPORT.md

**Формат:** Только стратегия и структурированный план действий, без кода

---

## 1. Migration 007 Extension

### Что нужно удалить из таблицы stops:
- Все записи с `id LIKE 'virtual-stop-%'`
- Все записи с `id` содержащим множественные дефисы подряд (например, `virtual-stop----------------`)
- Все записи с пустым или невалидным `city_id`, если их `id` начинается с `virtual-stop-`

### Какие записи подпадают под маску virtual-stop-%:
- Точное совпадение: `id LIKE 'virtual-stop-%'` (любые символы после префикса)
- Специфический случай: `id = 'virtual-stop----------------'` (множественные дефисы)
- Варианты с дополнительными символами: `virtual-stop-{cityName}`, `virtual-stop-{cityName}-{suffix}`

### Как убедиться, что удалены ВСЕ виртуальные stops из всех таблиц:
1. **Перед удалением:**
   - Выполнить `SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%'` — зафиксировать количество
   - Выполнить `SELECT COUNT(*) FROM virtual_stops` — должно быть 0 (уже удалено в SECTION 1)
   - Выполнить `SELECT id FROM stops WHERE id LIKE 'virtual-stop-%'` — получить список всех ID для логирования

2. **Удаление:**
   - Выполнить `DELETE FROM stops WHERE id LIKE 'virtual-stop-%'`
   - Выполнить `DELETE FROM stops WHERE id ~ '^virtual-stop-.*-+.*$'` (регулярное выражение для множественных дефисов)

3. **После удаления:**
   - Выполнить `SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%'` — должно быть 0
   - Выполнить `SELECT COUNT(*) FROM routes WHERE from_stop_id LIKE 'virtual-stop-%' OR to_stop_id LIKE 'virtual-stop-%'` — должно быть 0 (уже удалено в SECTION 8)
   - Выполнить `SELECT COUNT(*) FROM flights WHERE from_stop_id LIKE 'virtual-stop-%' OR to_stop_id LIKE 'virtual-stop-%'` — должно быть 0

### Как гарантировать отсутствие virtual-stop----------------:
1. **Прямое удаление:**
   - Выполнить `DELETE FROM stops WHERE id = 'virtual-stop----------------'` (если существует)
   - Выполнить `DELETE FROM stops WHERE id LIKE 'virtual-stop-%' AND LENGTH(id) - LENGTH(REPLACE(id, '-', '')) > 10` (удалить все с более чем 10 дефисами)

2. **Проверка после удаления:**
   - Выполнить `SELECT id FROM stops WHERE id LIKE 'virtual-stop-%' AND (city_id IS NULL OR city_id = '')` — должно быть пусто
   - Выполнить `SELECT id FROM stops WHERE id ~ '^virtual-stop-+$'` (только дефисы) — должно быть пусто

### План миграции:

**Структура новой секции (SECTION 10):**
1. **Проверка перед удалением:**
   - Записать количество виртуальных stops в `stops` в переменную или комментарий
   - Записать список всех ID для аудита

2. **Удаление виртуальных stops из stops:**
   - `DELETE FROM stops WHERE id LIKE 'virtual-stop-%'`
   - `DELETE FROM stops WHERE id ~ '^virtual-stop-.*-+.*$'` (множественные дефисы)
   - `DELETE FROM stops WHERE id = 'virtual-stop----------------'` (специфический случай)

3. **Проверка после удаления:**
   - Убедиться, что `SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%'` возвращает 0
   - Убедиться, что все связанные routes и flights уже удалены (SECTION 8)

4. **Защита реальных данных:**
   - НЕ удалять stops с `id` НЕ начинающимся с `virtual-stop-`
   - НЕ удалять stops из mock-данных (route-001 до route-041 используют stops с ID `stop-001`, `stop-002`, etc.)
   - Проверить, что удаляются только stops с префиксом `virtual-stop-`

**Что проверяется до/после:**
- **До:** Количество виртуальных stops в `stops`, список ID
- **После:** Количество виртуальных stops в `stops` (должно быть 0), отсутствие связанных routes/flights

**Как убедиться, что не удаляются реальные данные:**
- Использовать только `WHERE id LIKE 'virtual-stop-%'` — это гарантирует удаление только виртуальных stops
- Проверить, что mock-данные используют ID вида `stop-001`, `stop-002`, etc. (не начинаются с `virtual-stop-`)
- После миграции проверить, что количество real stops не изменилось (только виртуальные были удалены)

---

## 2. DataInitialization.checkDataCompleteness() Fixes

### Какие дополнительные проверки нужно добавить:
1. **Проверка виртуальных stops в таблице stops:**
   - Выполнить `SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%'`
   - Если количество > 0, добавить в `reasons`: `"Found virtual stops in stops table (should be in virtual_stops only)"`
   - Установить `needsPipeline = true`

2. **Проверка невалидных stops:**
   - Выполнить `SELECT COUNT(*) FROM stops WHERE (city_id IS NULL OR city_id = '') AND id LIKE 'virtual-stop-%'`
   - Если количество > 0, добавить в `reasons`: `"Found invalid virtual stops with empty city_id"`
   - Установить `needsPipeline = true`

3. **Проверка специфического случая virtual-stop----------------:**
   - Выполнить `SELECT COUNT(*) FROM stops WHERE id = 'virtual-stop----------------' OR id ~ '^virtual-stop-+$'`
   - Если количество > 0, добавить в `reasons`: `"Found invalid virtual stop with empty city name"`
   - Установить `needsPipeline = true`

### Как изменить логику needsPipeline:
1. **Добавить проверки ДО существующих проверок:**
   - Сначала проверить наличие виртуальных stops в `stops`
   - Затем проверить количество виртуальных stops в `virtual_stops`
   - Если виртуальные stops найдены в `stops`, это критическая ошибка — pipeline ОБЯЗАН запуститься

2. **Изменить условие `isComplete`:**
   - Добавить проверку: `virtualStopsInStopsTable === 0` (новое поле)
   - `isComplete` должен быть `false`, если `virtualStopsInStopsTable > 0`
   - Даже если `virtualStopsCount > 0` в `virtual_stops`, но есть виртуальные stops в `stops`, данные считаются неполными

3. **Приоритет проверок:**
   - Критичные проверки (виртуальные stops в `stops`) — выполняются первыми
   - Обычные проверки (количество stops, routes, flights) — выполняются после критичных

### Что считать неполными данными:
1. **Критичные случаи (pipeline ОБЯЗАН запуститься):**
   - Виртуальные stops найдены в таблице `stops` (должны быть только в `virtual_stops`)
   - Найден `virtual-stop----------------` или аналогичные невалидные stops
   - Виртуальные stops с пустым `city_id`

2. **Обычные случаи (pipeline запускается, если данные неполные):**
   - `realStopsCount === 0` или `realStopsCount < MIN_STOPS`
   - `virtualStopsCount === 0` (в `virtual_stops`)
   - `routesCount === 0` или `routesCount < MIN_ROUTES`
   - `flightsCount === 0` или `flightsCount < MIN_FLIGHTS`
   - Граф отсутствует, пуст или слишком мал
   - Версии не совпадают

### Когда pipeline обязан запускаться:
1. **Всегда запускается, если:**
   - Найдены виртуальные stops в таблице `stops`
   - Найден `virtual-stop----------------` или аналогичные невалидные stops
   - Виртуальные stops с пустым `city_id` найдены в `stops`

2. **Запускается, если данные неполные:**
   - Любая из обычных проверок не проходит (см. выше)

3. **НЕ запускается, только если:**
   - Все критичные проверки пройдены (нет виртуальных stops в `stops`)
   - Все обычные проверки пройдены (достаточно stops, routes, flights, граф корректен)
   - Версии совпадают

---

## 3. VirtualEntitiesGeneratorWorker.canRun() Fixes

### Когда worker должен запускаться:
1. **Всегда запускается, если:**
   - Dataset существует (`latestDataset !== null`)
   - Базовый `canRun()` возвращает `true` (worker не занят)

2. **НЕ должен проверять количество виртуальных stops:**
   - Убрать проверку `countVirtualStops() > 0`
   - Эта проверка должна быть в `DataInitialization.checkDataCompleteness()`

3. **Worker должен полагаться на DataInitialization:**
   - Если `DataInitialization` решил запустить pipeline, worker должен выполниться
   - Worker не должен самостоятельно решать, нужны ли виртуальные stops

### Какие проверки нужно убрать:
1. **Убрать проверку `countVirtualStops() > 0`:**
   - Строка `if (virtualStopsCount > 0) { return false; }` должна быть удалена
   - Эта логика переносится в `DataInitialization.checkDataCompleteness()`

2. **Убрать логирование "Virtual entities already exist":**
   - Сообщение `'Virtual entities already exist (${virtualStopsCount} stops) - skipping'` больше не нужно
   - Worker не должен пропускать выполнение на основе количества виртуальных stops

### Какие проверки перенести в DataInitialization:
1. **Проверка количества виртуальных stops:**
   - Перенести в `checkDataCompleteness()`
   - Проверять как `virtual_stops`, так и `stops` на наличие виртуальных stops

2. **Проверка валидности виртуальных stops:**
   - Перенести в `checkDataCompleteness()`
   - Проверять наличие невалидных stops (пустой `city_id`, невалидный ID)

3. **Проверка соответствия dataset версии:**
   - Оставить в `canRun()`, но упростить
   - Worker должен проверять только наличие dataset, не его содержимое

### Как гарантировать, что virtual stops всегда пересоздаются после очистки:
1. **Worker должен всегда выполняться после очистки:**
   - Если `DataInitialization` запустил pipeline, worker должен выполниться
   - Worker не должен пропускать выполнение на основе существующих виртуальных stops

2. **Логика пересоздания:**
   - Worker должен удалять старые виртуальные stops перед созданием новых (если нужно)
   - Или использовать `ON CONFLICT` для обновления существующих
   - Но это должно быть в `executeWorkerLogic()`, а не в `canRun()`

3. **Защита от дублирования:**
   - Если виртуальные stops уже существуют и валидны, worker может их обновить
   - Но не должен пропускать выполнение только потому, что они существуют

---

## 4. GraphBuilderWorker Filters

### Какие условия делать для фильтрации invalid stops:
1. **Проверка ID:**
   - Исключить stops с `id LIKE 'virtual-stop-%'` И `city_id IS NULL`
   - Исключить stops с `id = 'virtual-stop----------------'` или аналогичными
   - Исключить stops с `id` содержащим только дефисы после префикса `virtual-stop-`

2. **Проверка cityId:**
   - Исключить stops с `city_id IS NULL` И `id LIKE 'virtual-stop-%'`
   - Исключить stops с `city_id = ''` (пустая строка)
   - Исключить stops с `city_id` не проходящим валидацию `isCityInUnifiedReference()`

3. **Проверка имени:**
   - Исключить stops с `name IS NULL` или `name = ''`
   - Исключить stops с `name` содержащим только пробелы

4. **Проверка координат:**
   - Исключить stops с `latitude IS NULL` или `longitude IS NULL`
   - Исключить stops с координатами вне допустимого диапазона (latitude: -90..90, longitude: -180..180)

### Что считать invalid stop:
1. **Критичные случаи (обязательно исключить):**
   - `id = 'virtual-stop----------------'` или аналогичные (только дефисы)
   - `id LIKE 'virtual-stop-%'` И `city_id IS NULL`
   - `id LIKE 'virtual-stop-%'` И `city_id = ''`
   - `name IS NULL` или `name = ''`
   - `latitude IS NULL` или `longitude IS NULL`

2. **Предупреждения (можно исключить или логировать):**
   - `city_id` не проходит валидацию `isCityInUnifiedReference()`
   - Координаты вне допустимого диапазона
   - `name` содержит только пробелы

### Когда stop должен игнорироваться:
1. **Всегда игнорируется, если:**
   - `id = 'virtual-stop----------------'` или аналогичные
   - `id LIKE 'virtual-stop-%'` И (`city_id IS NULL` ИЛИ `city_id = ''`)
   - `name IS NULL` или `name = ''`
   - `latitude IS NULL` или `longitude IS NULL`

2. **Игнорируется с предупреждением, если:**
   - `city_id` не проходит валидацию `isCityInUnifiedReference()`
   - Координаты вне допустимого диапазона

3. **НЕ игнорируется, если:**
   - Stop имеет валидный `id`, `city_id`, `name`, координаты
   - Stop проходит все проверки валидности

### Как это логировать:
1. **Уровень ERROR:**
   - Логировать все исключённые stops с причиной исключения
   - Формат: `"Excluding invalid stop: {id}, reason: {reason}"`
   - Пример: `"Excluding invalid stop: virtual-stop----------------, reason: empty city_id"`

2. **Уровень WARN:**
   - Логировать stops с предупреждениями (невалидный `city_id`, координаты вне диапазона)
   - Формат: `"Warning for stop: {id}, issue: {issue}"`
   - Пример: `"Warning for stop: stop-xxx, issue: city_id not in unified reference"`

3. **Итоговая статистика:**
   - Логировать общее количество загруженных stops
   - Логировать количество исключённых stops
   - Логировать количество stops с предупреждениями
   - Формат: `"Loaded {total} stops, excluded {excluded} invalid stops, {warnings} warnings"`

---

## 5. AirRouteGeneratorWorker Checks

### Как валидировать stop перед использованием:
1. **Проверка перед использованием в маршрутах:**
   - Проверить, что `stop.id` не начинается с `virtual-stop-` И не имеет пустой `city_id`
   - Проверить, что `stop.cityId` не пустой и не `null`
   - Проверить, что `stop.cityId` проходит валидацию `isCityInUnifiedReference()`

2. **Проверка перед созданием route:**
   - Убедиться, что `fromStop.cityId` и `toStop.cityId` оба валидны
   - Убедиться, что оба stops не являются невалидными виртуальными stops

3. **Проверка перед созданием flight:**
   - Убедиться, что `fromStopId` и `toStopId` ссылаются на валидные stops
   - Убедиться, что stops существуют в базе данных

### Как исключать stop с невалидным cityId:
1. **Фильтрация в `findCityStops()`:**
   - После получения stops из репозитория, отфильтровать stops с пустым `cityId`
   - Отфильтровать stops с `cityId`, не проходящим валидацию `isCityInUnifiedReference()`
   - Отфильтровать stops с `id LIKE 'virtual-stop-%'` И пустым `cityId`

2. **Проверка перед использованием:**
   - Перед созданием `forwardRoute` и `backwardRoute`, проверить `cityStops.length > 0`
   - Если после фильтрации `cityStops.length === 0`, пропустить город с предупреждением

3. **Валидация каждого stop:**
   - Для каждого stop в `cityStops`, проверить `stop.cityId !== null && stop.cityId !== ''`
   - Проверить `isCityInUnifiedReference(normalizeCityName(stop.cityId))`

### Как логировать пропуски:
1. **Уровень WARN:**
   - Логировать пропуск города, если `cityStops.length === 0` после фильтрации
   - Формат: `"City "${cityName}" has no valid stops after filtering - skipping"`
   - Пример: `"City "Санкт-Петербург" has no valid stops after filtering - skipping"`

2. **Уровень INFO:**
   - Логировать количество валидных stops для каждого города
   - Формат: `"City "${cityName}" has {count} valid stops"`
   - Пример: `"City "Москва" has 2 valid stops"`

3. **Уровень DEBUG (опционально):**
   - Логировать причины исключения stops (если нужно для отладки)
   - Формат: `"Excluding stop {id} for city {cityName}, reason: {reason}"`

---

## 6. Ferry Migration

### Какие stops нужно обновлять:
1. **По ID:**
   - `stop-027` (Паромная переправа Нижний Бестях)
   - `stop-028` (Паромная переправа Якутск)
   - Любые stops с `id` содержащим 'ferry', 'паром', 'переправа', 'пристань'

2. **По типу:**
   - Все stops с `type = 'ferry_terminal'` в mock-данных
   - Все stops, которые были сохранены с `metadata.type = 'ferry_terminal'` (если уже есть)

3. **По имени:**
   - Все stops с `name` содержащим 'паром', 'ferry', 'переправа', 'пристань'

### По каким признакам:
1. **Прямое указание типа:**
   - `type = 'ferry_terminal'` в исходных данных (mock-данные)
   - `metadata.type = 'ferry_terminal'` в базе данных (если уже есть)

2. **По ID:**
   - `id LIKE '%ferry%'` или `id LIKE '%паром%'`
   - `id LIKE '%переправа%'` или `id LIKE '%пристань%'`

3. **По имени:**
   - `name ILIKE '%паром%'` или `name ILIKE '%ferry%'`
   - `name ILIKE '%переправа%'` или `name ILIKE '%пристань%'`

### Какие значения metadata должны быть:
1. **Обязательное поле:**
   - `metadata.type = 'ferry_terminal'` (строка)

2. **Структура metadata:**
   - Если `metadata` уже существует, добавить/обновить только поле `type`
   - Если `metadata` не существует, создать новый объект с `{ type: 'ferry_terminal' }`
   - Сохранить остальные поля `metadata`, если они есть (например, `address`)

3. **Формат обновления:**
   - Использовать `jsonb_set()` или `jsonb_build_object()` для обновления
   - Убедиться, что существующие поля не перезаписываются

### Как убедиться, что ferry edges будут корректно созданы:
1. **Проверка после миграции:**
   - Выполнить `SELECT id, name, metadata FROM stops WHERE metadata->>'type' = 'ferry_terminal'`
   - Убедиться, что `stop-027` и `stop-028` имеют `metadata.type = 'ferry_terminal'`
   - Убедиться, что все ferry stops имеют правильные метки

2. **Проверка в GraphBuilderWorker:**
   - `GraphBuilderWorker` должен распознавать stops с `metadata.type = 'ferry_terminal'`
   - Ferry edges должны создаваться только между stops с `metadata.type = 'ferry_terminal'`
   - Вес ferry edges должен рассчитываться через `calculateFerryWeight()`

3. **Проверка валидации:**
   - `validateFerryEdges()` должна проверять, что все ferry edges соединяют ferry terminals
   - Валидация должна проходить успешно после миграции

---

## 7. Global Plan (Steps 12–16)

### ШАГ 12: Расширение миграции 007
**Цель:** Удалить все виртуальные stops из таблицы `stops`

**Действия:**
1. Добавить SECTION 10 в миграцию 007
2. Добавить проверки до/после удаления
3. Убедиться, что реальные данные не затронуты
4. Протестировать миграцию на тестовой базе

**Критерии готовности:**
- Миграция удаляет все виртуальные stops из `stops`
- Реальные stops не затронуты
- После миграции `SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%'` возвращает 0

### ШАГ 13: Исправление DataInitialization.checkDataCompleteness()
**Цель:** Добавить проверки виртуальных stops в `stops` и улучшить логику `needsPipeline`

**Действия:**
1. Добавить проверку `SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%'`
2. Добавить проверку невалидных stops (пустой `city_id`)
3. Изменить логику `isComplete` и `needsPipeline`
4. Добавить новые поля в возвращаемый объект (`virtualStopsInStopsTable`)

**Критерии готовности:**
- Pipeline запускается, если найдены виртуальные stops в `stops`
- Pipeline запускается, если найден `virtual-stop----------------`
- Pipeline не запускается только при полностью валидных данных

### ШАГ 14: Исправление VirtualEntitiesGeneratorWorker.canRun()
**Цель:** Убрать преждевременную проверку и перенести логику в DataInitialization

**Действия:**
1. Убрать проверку `countVirtualStops() > 0` из `canRun()`
2. Убрать логирование "Virtual entities already exist"
3. Упростить `canRun()` до проверки только dataset
4. Убедиться, что worker всегда выполняется после очистки

**Критерии готовности:**
- Worker не пропускает выполнение на основе количества виртуальных stops
- Worker полагается на `DataInitialization` для решения о запуске
- Worker всегда выполняется после очистки данных

### ШАГ 15: Добавление фильтрации в GraphBuilderWorker
**Цель:** Исключить невалидные stops из графа

**Действия:**
1. Добавить фильтрацию stops с невалидными ID перед построением графа
2. Добавить проверки `cityId`, `name`, координат
3. Добавить логирование исключённых stops
4. Добавить итоговую статистику

**Критерии готовности:**
- `virtual-stop----------------` не попадает в граф
- Невалидные stops исключаются с логированием
- Граф строится только из валидных stops

### ШАГ 16: Исправление AirRouteGeneratorWorker
**Цель:** Добавить валидацию stops перед использованием в маршрутах

**Действия:**
1. Добавить фильтрацию stops с невалидным `cityId` в `findCityStops()`
2. Добавить проверки перед созданием routes
3. Добавить логирование пропусков городов
4. Убедиться, что невалидные stops не используются

**Критерии готовности:**
- Stops с пустым `cityId` не используются в маршрутах
- Stops с невалидным `cityId` исключаются
- Логируются пропуски городов без валидных stops

### ШАГ 17: Миграция для ferry-terminal metadata
**Цель:** Обновить старые ferry stops с правильными метками

**Действия:**
1. Создать новую миграцию (008) для обновления ferry stops
2. Найти все ferry stops по ID, типу, имени
3. Обновить `metadata.type = 'ferry_terminal'` для всех найденных stops
4. Проверить, что все ferry stops имеют правильные метки

**Критерии готовности:**
- Все ferry stops имеют `metadata.type = 'ferry_terminal'`
- `stop-027` и `stop-028` имеют правильные метки
- Ferry edges корректно создаются в GraphBuilderWorker

### ШАГ 18: Полная пересборка графа
**Цель:** Убедиться, что после всех исправлений граф пересобирается корректно

**Действия:**
1. Выполнить все миграции (007, 008)
2. Запустить pipeline через `DataInitialization`
3. Проверить, что все workers выполнились успешно
4. Проверить, что граф построен корректно (≥ 36 nodes, ≥ 160 edges)
5. Проверить, что `virtual-stop----------------` отсутствует в графе
6. Проверить, что ferry edges созданы корректно
7. Проверить контрольные маршруты (Верхоянск → Мирный)

**Критерии готовности:**
- Граф построен успешно
- Все валидации проходят
- Контрольные маршруты находятся
- Нет невалидных stops в графе

---

## Итоговый порядок выполнения:

1. **ШАГ 12** — Расширение миграции 007 (удаление виртуальных stops из `stops`)
2. **ШАГ 13** — Исправление `DataInitialization.checkDataCompleteness()`
3. **ШАГ 14** — Исправление `VirtualEntitiesGeneratorWorker.canRun()`
4. **ШАГ 15** — Добавление фильтрации в `GraphBuilderWorker`
5. **ШАГ 16** — Исправление `AirRouteGeneratorWorker`
6. **ШАГ 17** — Миграция для ferry-terminal metadata
7. **ШАГ 18** — Полная пересборка графа и финальная проверка

---

**Статус:** План готов к выполнению. Все шаги структурированы, критерии готовности определены.





