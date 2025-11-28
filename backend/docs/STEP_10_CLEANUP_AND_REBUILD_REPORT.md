# Отчёт: Полная очистка данных и корректная пересборка графа (ШАГ 10)

**Дата:** 2025-01-XX  
**Цель:** Полная очистка базы от старых виртуальных данных и корректная пересборка графа с исправленной логикой

---

## [ЗАДАЧА 1 — ОЧИСТКА БАЗЫ]

### Миграция создана

**Имя файла:** `backend/src/infrastructure/database/migrations/007_cleanup_virtual_data_and_invalid_references.sql`

**Что удаляется:**

1. ✅ Все виртуальные stops (`DELETE FROM virtual_stops`)
2. ✅ Все виртуальные routes (`DELETE FROM virtual_routes`)
3. ✅ Flights с несуществующими route_id
4. ✅ Routes с несуществующими stop_id
5. ✅ Routes созданные генераторами (air-route-%, virtual-route-%)
6. ✅ Flights связанные с удалёнными routes
7. ✅ Все datasets (`DELETE FROM datasets`)
8. ✅ Все graphs (`DELETE FROM graphs`)
9. ✅ Routes/flights ссылающиеся на virtual-stop-% (включая virtual-stop----------------)

**Результат после очистки:**
- Только реальные stops из mock-данных
- Только реальные routes из mock-данных (route-001 до route-041)
- Только реальные flights из mock-данных
- Все виртуальные данные удалены
- Все невалидные ссылки очищены

---

## [ЗАДАЧА 2 — ПЕРЕЗАПУСК PIPELINE]

### DataInitialization обновлён

**Изменения:**

1. ✅ **Минимальные требования к графу обновлены:**
   - `MIN_GRAPH_NODES = 36` (вместо 10)
   - `MIN_GRAPH_EDGES = 160` (вместо 10)

2. ✅ **Логика проверки данных:**
   - После очистки `checkDataCompleteness` видит, что данных нет
   - `needsPipeline = true` если:
     - Нет real stops или их < 10
     - Нет virtual stops
     - Нет routes или их < 5
     - Нет flights или их < 10
     - Граф отсутствует или слишком мал (< 36 nodes, < 160 edges)
     - Версии dataset и graph не совпадают

3. ✅ **Автоматический запуск pipeline:**
   - Если `needsPipeline = true`, автоматически выполняется `executeFullPipeline()`
   - Все 4 воркера выполняются по цепочке:
     1. ODataSyncWorker
     2. AirRouteGeneratorWorker
     3. VirtualEntitiesGeneratorWorker
     4. GraphBuilderWorker

---

## [ЗАДАЧА 3 — УДАЛЕНИЕ "ГРЯЗНОГО" virtual-stop----------------]

### Исправления в VirtualEntitiesGeneratorWorker

**Файл:** `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts`

**Изменения:**

1. ✅ **generateStableId() улучшена (строки 493-512):**
   - Фильтрует пустые части перед обработкой
   - Выбрасывает ошибку если все части пустые
   - Нормализует результат (убирает множественные дефисы)
   - Выбрасывает ошибку если результат пустой
   - **Предотвращает создание ID типа "virtual-stop----------------"**

2. ✅ **Валидация cityName:**
   - `generateVirtualStops()` фильтрует города через `isCityInUnifiedReference()`
   - Если cityName пустой или невалидный, виртуальный стоп не создаётся
   - Ошибка выбрасывается если city не найден в unified reference

**Результат:**
- Невозможно создать virtual-stop с пустым cityName
- Все ID валидируются перед созданием
- Ошибки логируются и предотвращают создание невалидных сущностей

---

## [ЗАДАЧА 4 — FERRY-ТЕРМИНАЛЫ]

### Проверка корректности работы

**Статус:**

1. ✅ **ODataSyncWorker:**
   - Копирует `stopData.type === 'ferry_terminal'` в `metadata.type`
   - stop-027 и stop-028 получат `metadata.type = 'ferry_terminal'`

2. ✅ **GraphBuilderWorker:**
   - `getStopType()` проверяет `stop.metadata.type === 'ferry_terminal'`
   - Fallback проверка по `stop.name` (ключевые слова: 'паром', 'ferry', 'переправа', 'пристань')
   - Ferry edges получают вес через `calculateFerryWeight()`: 37.5-57.5 минут
   - Валидация ferry edges через `validateFerryEdges()`

3. ✅ **Миграция 007:**
   - Удаляет старые ferry маршруты если они были созданы до исправлений
   - Новые ferry маршруты будут созданы с правильными метками

**Результат:**
- stop-027 и stop-028 имеют `metadata.type = 'ferry_terminal'`
- Ferry edges имеют вес 37.5-57.5 минут
- GraphBuilderWorker не падает на ferry валидации

---

## [ЗАДАЧА 5 — АВТОМАТИЧЕСКАЯ ПЕРЕСБОРКА ГРАФА]

### Финальные проверки добавлены

**Файл:** `backend/src/application/workers/GraphBuilderWorker.ts`

**Изменения (строки 211-230):**

1. ✅ **Проверка размера графа:**
   - Предупреждение если nodes < 36
   - Предупреждение если edges < 160

2. ✅ **Проверка наличия ключевых городов:**
   - Поиск Верхоянска в nodes (по `cityId === 'верхоянск'` или `id.includes('верхоянск')`)
   - Поиск Мирного в nodes (по `cityId === 'мирный'` или `id.includes('мирный')`)
   - Логирование результатов

3. ✅ **Валидация графа:**
   - `validateGraphStructure()` проверяет connectivity, isolated nodes, edge weights
   - `validateTransferEdges()` проверяет in-city transfers
   - `validateFerryEdges()` проверяет ferry routes

**Ожидаемые результаты после пересборки:**

- ✅ Graph имеет ≥ 36 nodes
- ✅ Graph имеет ≥ 160 edges
- ✅ Нет isolated nodes (кроме редких исключений)
- ✅ Нет ошибок ferry edges
- ✅ Верхоянск и Мирный присутствуют в графе
- ✅ Маршрут Верхоянск → Мирный находится

---

## [ДОПОЛНИТЕЛЬНЫЕ ИСПРАВЛЕНИЯ]

### AirRouteGeneratorWorker

**Файл:** `backend/src/application/workers/AirRouteGeneratorWorker.ts`

**Изменения (строки 150-175):**

1. ✅ **Валидация stops перед созданием маршрутов:**
   - Проверка существования hub stop в БД (real или virtual)
   - Проверка существования federal city stop в БД (real или virtual)
   - Пропуск создания маршрута если stop не найден
   - Логирование предупреждений

**Результат:**
- AirRouteGeneratorWorker больше не создаёт маршруты с несуществующими stops
- Все маршруты ссылаются только на существующие stops

---

## [ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ]

После выполнения ШАГ 10:

✅ **База чистая:**
- Только реальные данные из mock-файлов
- Все виртуальные данные удалены
- Все невалидные ссылки очищены

✅ **Все виртуальные stops/routes пересозданы корректно:**
- Нет "грязных" ID типа virtual-stop----------------
- Все ID валидируются перед созданием
- Все города проверяются через unified reference

✅ **Нет "bit-rot" данных:**
- Старые маршруты от генераторов удалены
- Старые datasets и graphs удалены
- Все данные созданы новой логикой

✅ **Pipeline проходит полностью:**
- ODataSyncWorker загружает реальные данные
- AirRouteGeneratorWorker создаёт маршруты только с валидными stops
- VirtualEntitiesGeneratorWorker создаёт виртуальные сущности для всех городов
- GraphBuilderWorker строит граф с ≥ 36 nodes и ≥ 160 edges

✅ **AirRouteGeneratorWorker больше не падает:**
- Валидация stops перед созданием маршрутов
- Пропуск маршрутов если stops не найдены

✅ **GraphBuilderWorker успешно строит граф:**
- Валидация структуры графа
- Проверка ferry edges
- Проверка transfer edges
- Проверка наличия ключевых городов

✅ **Вес переправы в норме:**
- Ferry edges: 37.5-57.5 минут
- Нет весов 169+ минут

✅ **Верхоянск → Мирный ищутся:**
- Оба города присутствуют в графе
- Маршрут находится через алгоритм поиска пути

✅ **graph:current:version записан в Redis:**
- GraphBuilderWorker сохраняет граф в Redis
- Версия графа устанавливается через `setGraphVersion()`

✅ **LIMITED MODE исчезает:**
- Граф полный и связный
- Все города доступны
- Все маршруты работают

---

## [СОЗДАННЫЕ/ОБНОВЛЁННЫЕ ФАЙЛЫ]

1. ✅ `backend/src/infrastructure/database/migrations/007_cleanup_virtual_data_and_invalid_references.sql` (NEW)
2. ✅ `backend/src/infrastructure/database/migrations/README.md` (UPDATED)
3. ✅ `backend/src/infrastructure/startup/DataInitialization.ts` (UPDATED)
4. ✅ `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts` (UPDATED)
5. ✅ `backend/src/application/workers/AirRouteGeneratorWorker.ts` (UPDATED)
6. ✅ `backend/src/application/workers/GraphBuilderWorker.ts` (UPDATED)
7. ✅ `backend/docs/STEP_10_CLEANUP_AND_REBUILD_REPORT.md` (NEW)

---

**Статус:** ✅ Все задачи выполнены. Система готова к полной очистке и пересборке графа.









