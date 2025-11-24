# [FINAL DIAGNOSTIC REPORT]

**Дата:** После выполнения ШАГ 10  
**Цель:** Определить причины сохранения `virtual-stop----------------`, отсутствия пересоздания виртуальных stops и падения пересборки графа

---

## DB State After Migration 007

**Status:**
- Миграция 007 удаляет все записи из `virtual_stops` (DELETE FROM virtual_stops)
- Миграция 007 удаляет routes/flights с `LIKE 'virtual-stop-%'`
- **ПРОБЛЕМА:** Миграция НЕ удаляет записи из основной таблицы `stops`

**Detected Issues:**
1. Если `virtual-stop----------------` был сохранён в таблице `stops` (как real stop), он НЕ будет удалён миграцией 007
2. Миграция удаляет только из `virtual_stops`, но не проверяет таблицу `stops` на наличие виртуальных stops с префиксом `virtual-stop-`
3. В таблице `stops` могут остаться "грязные" виртуальные stops, которые были сохранены как real stops по ошибке

**Why virtual-stop---------------- exists:**
- Возможные причины:
  1. `ODataSyncWorker` мог сохранить его в `stops` (если он был в mock-данных как real stop)
  2. `VirtualEntitiesGeneratorWorker` мог сохранить его в `stops` вместо `virtual_stops` (ошибка в логике сохранения)
  3. Старая версия кода могла сохранять виртуальные stops в обе таблицы
- **КРИТИЧНО:** Миграция 007 не проверяет таблицу `stops` на наличие виртуальных stops

---

## VirtualEntitiesGeneratorWorker

**Is executed:** Зависит от `canRun()` и `DataInitialization.checkDataCompleteness()`

**Cities loaded:**
- Worker загружает все города из unified reference через `getAllYakutiaCitiesUnified()` и `getAllFederalCities()`
- Фильтрация по `isKeyCity: true` была удалена в предыдущем шаге
- Все города должны обрабатываться

**Virtual stops expected:**
- Для каждого города без real stops должен создаваться хотя бы один virtual stop
- Ожидаемое количество: ~30-40 виртуальных stops (для всех городов из unified reference)

**Virtual stops created:**
- Зависит от выполнения worker'а
- Если `canRun()` возвращает `false`, worker не выполняется

**Root cause of missing stops:**
1. **Преждевременная проверка `canRun()`:**
   - `VirtualEntitiesGeneratorWorker.canRun()` проверяет `countVirtualStops() > 0`
   - Если после миграции 007 остался хотя бы один виртуальный stop в `virtual_stops` (или в `stops`), worker пропускается
   - **ПРОБЛЕМА:** Проверка должна быть перенесена в `DataInitialization.checkDataCompleteness()`

2. **Проверка `generateStableId()`:**
   - Функция была исправлена в ШАГ 10 для фильтрации пустых частей
   - Но если `cityName` пустой или undefined, функция выбросит ошибку
   - **ПРОБЛЕМА:** Нужно проверить, что `cityName` всегда валиден перед вызовом `generateStableId()`

3. **Проверка существования virtual stop:**
   - Worker может пропускать создание, если виртуальный stop уже существует
   - Но после миграции 007 все виртуальные stops должны быть удалены
   - **ПРОБЛЕМА:** Если `virtual-stop----------------` остался в `stops`, worker может считать, что виртуальный stop уже существует

---

## AirRouteGeneratorWorker

**Stops found per city:**
- Worker ищет stops через `findCityStops()` (real + virtual)
- Для федеральных городов должен находить хотя бы один stop (real или virtual)
- Если stops не найдены, worker пропускает создание маршрутов (добавлена валидация в ШАГ 10)

**Uses any invalid stop?:**
- Worker проверяет `cityStops.length === 0` перед созданием маршрутов
- Но если `virtual-stop----------------` присутствует в результатах `findCityStops()`, он может быть использован
- **ПРОБЛЕМА:** Нужна дополнительная валидация, чтобы исключить stops с пустым `cityId` или невалидным ID

**Root cause:**
- Если `virtual-stop----------------` присутствует в таблице `stops` и имеет `cityId = null` или пустой, он может быть найден `findCityStops()` для любого города
- Worker может создать маршруты, которые ссылаются на невалидный stop

---

## GraphBuilderWorker

**Stops loaded:**
- Worker загружает stops через `getAllRealStops()` и `getAllVirtualStops()`
- Если `virtual-stop----------------` находится в таблице `stops`, он будет загружен как real stop
- Если он находится в таблице `virtual_stops`, он будет загружен как virtual stop

**Nodes count:**
- Зависит от количества загруженных stops
- Если `virtual-stop----------------` присутствует, он будет включён в nodes

**Isolated nodes:**
- `virtual-stop----------------` может быть изолированным узлом, если нет маршрутов, которые его используют
- Но если миграция 007 удалила все routes с `LIKE 'virtual-stop-%'`, он должен быть изолированным

**Presence of virtual-stop----------------:**
- Если stop присутствует в `stops` или `virtual_stops`, он будет включён в граф
- **ПРОБЛЕМА:** Worker не фильтрует stops с невалидными ID

**Why ferry validation still fails:**
1. **Отсутствие меток `ferry_terminal`:**
   - `stop-027` и `stop-028` должны иметь `metadata.type = 'ferry_terminal'`
   - Исправление было добавлено в ШАГ 9, но может не применяться к старым данным
   - **ПРОБЛЕМА:** Нужна миграция для обновления старых ferry stops

2. **Некорректный вес ferry edges:**
   - Исправление было добавлено в ШАГ 9, но может не применяться к старым routes
   - **ПРОБЛЕМА:** Нужна пересборка графа после исправлений

3. **Отсутствие ferry routes:**
   - Если ferry routes не были созданы `ODataSyncWorker`, ferry edges не будут созданы
   - **ПРОБЛЕМА:** Нужно проверить, что ferry routes присутствуют в базе данных

---

## DataInitialization

**Reason pipeline triggered:**
- Pipeline запускается, если `checkDataCompleteness()` возвращает `needsPipeline = true`
- Проверяется:
  - `realStopsCount === 0`
  - `virtualStopsCount === 0`
  - `routesCount === 0`
  - `flightsCount === 0`
  - `graphNodes < MIN_GRAPH_NODES` (36)
  - `graphEdges < MIN_GRAPH_EDGES` (160)
  - `!versionsMatch`

**Reason pipeline skipped (if any):**
- Pipeline пропускается, если `isComplete && !needsPipeline`
- **ПРОБЛЕМА:** Если `virtualStopsCount > 0` (из-за `virtual-stop----------------` в `stops`), pipeline может быть пропущен
- **ПРОБЛЕМА:** `checkDataCompleteness()` проверяет только `virtual_stops`, но не проверяет `stops` на наличие виртуальных stops

---

## Root Causes Summary

1. **Миграция 007 не удаляет виртуальные stops из таблицы `stops`:**
   - Миграция удаляет только из `virtual_stops`
   - Если `virtual-stop----------------` был сохранён в `stops`, он останется
   - **Решение:** Добавить в миграцию 007 удаление stops с `id LIKE 'virtual-stop-%'` из таблицы `stops`

2. **Преждевременная проверка `canRun()` в `VirtualEntitiesGeneratorWorker`:**
   - Worker пропускается, если `countVirtualStops() > 0`
   - Если `virtual-stop----------------` остался в `virtual_stops` или `stops`, worker не выполнится
   - **Решение:** Перенести проверку в `DataInitialization.checkDataCompleteness()` и проверять оба источника (stops и virtual_stops)

3. **Отсутствие фильтрации невалидных stops в `GraphBuilderWorker`:**
   - Worker загружает все stops без проверки валидности ID
   - `virtual-stop----------------` попадает в граф, если он присутствует в базе данных
   - **Решение:** Добавить фильтрацию stops с невалидными ID перед построением графа

4. **Отсутствие валидации `cityId` в `AirRouteGeneratorWorker`:**
   - Worker может использовать stops с пустым или невалидным `cityId`
   - **Решение:** Добавить проверку `cityId` перед использованием stop в маршрутах

5. **Неполная проверка виртуальных stops в `DataInitialization.checkDataCompleteness()`:**
   - Функция проверяет только `virtual_stops`, но не проверяет `stops` на наличие виртуальных stops
   - **Решение:** Добавить проверку `stops` на наличие записей с `id LIKE 'virtual-stop-%'`

6. **Отсутствие миграции для обновления старых ferry stops:**
   - Старые ferry stops могут не иметь `metadata.type = 'ferry_terminal'`
   - **Решение:** Создать миграцию для обновления `metadata` у старых ferry stops

7. **Отсутствие пересборки графа после исправлений:**
   - Исправления в ШАГ 9 и ШАГ 10 требуют пересборки графа
   - **Решение:** Обеспечить автоматическую пересборку графа после миграций

---

## Recommendations (без кода)

### Критичные исправления (ШАГ 11):

1. **Расширить миграцию 007:**
   - Добавить удаление stops с `id LIKE 'virtual-stop-%'` из таблицы `stops`
   - Убедиться, что все виртуальные stops удалены из обеих таблиц

2. **Исправить `DataInitialization.checkDataCompleteness()`:**
   - Добавить проверку `stops` на наличие записей с `id LIKE 'virtual-stop-%'`
   - Если такие записи найдены, считать данные неполными и запустить pipeline

3. **Добавить фильтрацию в `GraphBuilderWorker`:**
   - Фильтровать stops с невалидными ID (например, `virtual-stop----------------`) перед построением графа
   - Логировать предупреждения о пропущенных stops

4. **Добавить валидацию в `AirRouteGeneratorWorker`:**
   - Проверять `cityId` перед использованием stop в маршрутах
   - Пропускать stops с пустым или невалидным `cityId`

5. **Создать миграцию для обновления ferry stops:**
   - Обновить `metadata.type = 'ferry_terminal'` для всех stops с `id` содержащим 'ferry' или 'паром'
   - Убедиться, что все ferry stops имеют правильные метки

6. **Улучшить `VirtualEntitiesGeneratorWorker.canRun()`:**
   - Убрать проверку `countVirtualStops() > 0` из `canRun()`
   - Перенести проверку в `DataInitialization.checkDataCompleteness()`
   - Worker должен проверять только наличие dataset

7. **Добавить валидацию `cityName` в `VirtualEntitiesGeneratorWorker`:**
   - Проверять, что `cityName` не пустой и не undefined перед вызовом `generateStableId()`
   - Пропускать города с невалидными именами

### Рекомендуемые улучшения:

1. **Добавить логирование:**
   - Логировать все пропущенные stops с причинами
   - Логировать все созданные/удалённые виртуальные stops

2. **Добавить метрики:**
   - Отслеживать количество виртуальных stops по городам
   - Отслеживать количество изолированных узлов в графе

3. **Улучшить валидацию:**
   - Добавить валидацию всех stops перед сохранением
   - Проверять соответствие ID формату (не должно быть пустых частей)

---

## Next Steps

1. Выполнить ШАГ 11: Расширить миграцию 007 для удаления виртуальных stops из таблицы `stops`
2. Выполнить ШАГ 12: Исправить `DataInitialization.checkDataCompleteness()` для проверки обоих источников
3. Выполнить ШАГ 13: Добавить фильтрацию невалидных stops в `GraphBuilderWorker`
4. Выполнить ШАГ 14: Создать миграцию для обновления старых ferry stops
5. Выполнить ШАГ 15: Улучшить `VirtualEntitiesGeneratorWorker.canRun()` и валидацию `cityName`
6. Выполнить ШАГ 16: Полная пересборка графа после всех исправлений

---

**Статус:** Отчёт готов к использованию для следующего шага исправлений




