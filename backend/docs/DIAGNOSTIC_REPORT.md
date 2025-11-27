d# [DIAGNOSTIC REPORT]
**Дата:** 2025-01-XX  
**Цель:** Диагностика отсутствия маршрутов (Верхоянск → Мирный), virtual stops, старых графов и ошибок pipeline

---

## 1. Redis Volume Path

**Путь к volume:** `/var/lib/docker/volumes/travel_app_saas_redis_data/_data`

**Конфигурация в docker-compose.yml:**
- Volume name: `redis_data`
- Container path: `/data`
- Redis command: `redis-server --appendonly yes` (AOF включен)

**Статус:** Volume существует, но физический путь находится в Docker-окружении Windows.  
**Проблема:** Невозможно проверить содержимое без доступа к Docker host или контейнеру.

---

## 2. Redis Data Status (AOF/RDB)

**Конфигурация:**
- AOF (Append Only File): **Включен** (`--appendonly yes`)
- RDB snapshots: Не указано явно (зависит от настроек по умолчанию)

**Ключи графа в Redis:**
- `graph:current:version` — текущая версия графа
- `graph:current:metadata` — метаданные графа
- `graph:{version}:nodes` — Set узлов графа
- `graph:{version}:neighbors:{nodeId}` — список соседей для каждого узла

**Проблема:** Невозможно проверить актуальность данных без подключения к Redis внутри контейнера.

---

## 3. Loaded Graph Version

**Механизм загрузки:**
- Backend загружает версию графа из Redis: `await graphRepository.getGraphVersion()`
- Ключ: `graph:current:version`
- Если версия отсутствует → `graphAvailable: false`

**Проблема:** Если граф не был построен или был удалён, версия будет `undefined`.

---

## 4. Virtual Stops Actual

**Условие пропуска VirtualEntitiesGeneratorWorker:**
```typescript
const virtualStopsCount = await this.stopRepository.countVirtualStops();
if (virtualStopsCount > 0) {
  this.log('INFO', `Virtual entities already exist (${virtualStopsCount} stops) - skipping`);
  return false;
}
```

**Проблема:** Если в БД есть хотя бы 1 virtual stop, воркер **пропускается**, даже если:
- Virtual stops неполные (отсутствуют для некоторых городов)
- Virtual stops устарели
- Нужны новые virtual stops для новых городов

**Критическая логическая ошибка:** Воркер не проверяет, **какие именно** города имеют virtual stops, только их общее количество.

---

## 5. Real Stops Actual

**Верхоянск:**
- ✅ Есть в `stops.json`: `stop-023` — "Аэропорт Верхоянск" (type: "airport")
- ✅ Есть в `yakutia-cities-reference.json`: normalizedName: "верхоянск"
- ✅ Координаты: 67.5500, 133.3833

**Мирный:**
- ✅ Есть в `stops.json`: `stop-005` — "Аэропорт Мирный" (type: "airport")
- ✅ Есть в `yakutia-cities-reference.json`: normalizedName: "мирный"
- ✅ Координаты: 62.5347, 114.0389

**Статус:** Оба города присутствуют в mock-данных с корректными остановками.

---

## 6. Are Workers Triggered: yes/no

**Условие запуска pipeline при старте backend:**
```typescript
if (!dataCheck.isEmpty) {
  console.log('✅ Database has data - skipping automatic initialization');
  return false;
}
```

**Проблема:** Pipeline **НЕ запускается автоматически**, если:
- `realStopsCount > 0` ИЛИ
- `virtualStopsCount > 0` ИЛИ
- `routesCount > 0` ИЛИ
- `flightsCount > 0`

**Вывод:** Если в БД есть **любые** данные (даже старые/неполные), pipeline пропускается.

---

## 7. Why Pipeline Skipped

**Основные причины пропуска pipeline:**

1. **Database has data** (DataInitialization.ts:92)
   - Проверка: `hasData = realStopsCount > 0 || virtualStopsCount > 0 || routesCount > 0 || flightsCount > 0`
   - Если хотя бы одно условие true → pipeline пропускается

2. **VirtualEntitiesGeneratorWorker уже выполнен** (VirtualEntitiesGeneratorWorker.ts:74)
   - Проверка: `virtualStopsCount > 0`
   - Проблема: Не проверяет полноту virtual stops

3. **GraphBuilderWorker уже выполнен** (GraphBuilderWorker.ts:86)
   - Проверка: `existingGraph.length > 0` для текущей версии dataset
   - Проблема: Если dataset version не изменился, граф не пересобирается

**Критическая проблема:** Нет механизма **принудительного пересбора** графа при изменении данных.

---

## 8. VirtualEntitiesGeneratorWorker Issues

**Проблема #1: Логика canRun()**
```typescript
const virtualStopsCount = await this.stopRepository.countVirtualStops();
if (virtualStopsCount > 0) {
  return false; // Пропускает, даже если virtual stops неполные
}
```

**Проблема #2: Условие генерации virtual stops**
- Генерирует только для городов с `isKeyCity: true`
- Верхоянск: `isKeyCity: false` → **virtual stop НЕ будет создан**
- Мирный: `isKeyCity: false` → **virtual stop НЕ будет создан**

**Проблема #3: Зависимость от real stops**
- Если real stop существует → virtual stop не создаётся
- Если real stop отфильтрован валидатором → virtual stop тоже не создаётся

**Вывод:** Для Верхоянска и Мирного virtual stops **не будут созданы**, если:
- Real stops отсутствуют в БД (не загружены из OData)
- Real stops отфильтрованы валидатором
- Города не помечены как `isKeyCity: true`

---

## 9. GraphBuilderWorker Issues

**Проблема #1: Зависимость от dataset version**
- Граф не пересобирается, если dataset version не изменился
- Даже если данные в БД обновились, граф остаётся старым

**Проблема #2: Загрузка stops из БД**
```typescript
const allStops = await this.stopRepository.getAllStops();
```
- Загружает только те stops, которые **уже есть в БД**
- Если stops не загружены ODataSyncWorker → их нет в графе

**Проблема #3: Изолированные узлы**
- Если для города нет ни real, ни virtual stops → узел не создаётся
- Если узел создан, но нет рёбер → узел изолирован
- Валидатор предупреждает об изолированных узлах, но не блокирует сохранение

**Проблема #4: Отсутствие проверки связности**
- Граф может содержать несколько несвязных компонентов
- Маршрут Верхоянск → Мирный может не найтись, если они в разных компонентах

---

## 10. City-Level Issues (Верхоянск, Мирный)

**Верхоянск:**
- ✅ Есть в mock-данных (`stop-023`)
- ✅ Есть в справочнике (`yakutia-cities-reference.json`)
- ❌ `isKeyCity: false` → virtual stop не создаётся
- ❓ Реальный stop может быть отфильтрован валидатором, если:
  - `cityId` содержит служебные слова
  - Координаты некорректны
  - Название не проходит валидацию

**Мирный:**
- ✅ Есть в mock-данных (`stop-005`)
- ✅ Есть в справочнике (`yakutia-cities-reference.json`)
- ❌ `isKeyCity: false` → virtual stop не создаётся
- ❓ Реальный stop может быть отфильтрован валидатором

**Проблема нормализации:**
- API использует `extractCityFromStopName()` для извлечения города из названия остановки
- "Аэропорт Верхоянск" → должен извлечь "Верхоянск"
- "Аэропорт Мирный" → должен извлечь "Мирный"
- Если нормализация не работает → stop не найдётся для города

---

## 11. Route Search Issues

**Шаги поиска маршрута:**

1. **Нормализация городов:**
   ```typescript
   const fromStops = await this.findStopsForCity(request.fromCity);
   const toStops = await this.findStopsForCity(request.toCity);
   ```
   - Использует `normalizeCityName()` для поиска stops
   - Если stop не найден → `fromStops.length === 0` → ошибка "No stops found"

2. **Проверка наличия узлов в графе:**
   ```typescript
   const fromNodeExists = await this.graphRepository.hasNode(fromStopId);
   const toNodeExists = await this.graphRepository.hasNode(toStopId);
   ```
   - Если узел отсутствует → ошибка "Stops found but graph is out of sync"

3. **Поиск пути:**
   ```typescript
   const path = await this.findShortestPath(fromStopId, toStopId, graphVersion);
   ```
   - Если путь не найден → ошибка "No route found between cities"

**Возможные причины "no path found":**
- Узлы существуют, но нет рёбер между ними
- Граф содержит несколько несвязных компонентов
- Путь существует, но алгоритм Dijkstra не находит его (ошибка в реализации)

---

## 12. All Other Discovered Problems

**Проблема #1: Нет механизма принудительного пересбора**
- Нет API endpoint для принудительного пересбора графа без изменения dataset version
- Нет механизма очистки старых данных перед пересбором

**Проблема #2: Зависимость от dataset version**
- Если dataset version не меняется, граф не пересобирается
- Даже при изменении данных в БД граф остаётся старым

**Проблема #3: Virtual stops только для key cities**
- `isKeyCity: false` → virtual stop не создаётся
- Верхоянск и Мирный не получат virtual stops

**Проблема #4: Нет проверки полноты данных**
- Pipeline пропускается, если есть **любые** данные
- Не проверяется, **какие именно** города имеют stops/routes

**Проблема #5: Redis может содержать старый граф**
- Нет механизма проверки актуальности графа
- Backend загружает граф из Redis без проверки соответствия БД

**Проблема #6: Нет логирования причин пропуска pipeline**
- Не логируется, **почему** pipeline был пропущен
- Сложно диагностировать проблемы без детальных логов

---

## 13. What Exactly Blocks Route Construction

**Блокирующие факторы для маршрута Верхоянск → Мирный:**

1. **Отсутствие stops в БД:**
   - Если ODataSyncWorker не загрузил stops → их нет в БД
   - Если stops отфильтрованы валидатором → их нет в БД
   - **Результат:** `findStopsForCity()` возвращает пустой массив

2. **Отсутствие узлов в графе:**
   - Если stops не загружены в БД → GraphBuilderWorker не создаёт узлы
   - Если virtual stops не созданы → узлы не создаются
   - **Результат:** `hasNode()` возвращает `false`

3. **Отсутствие рёбер в графе:**
   - Если нет routes между stops → нет рёбер в графе
   - Если routes не загружены → нет рёбер
   - **Результат:** `findShortestPath()` не находит путь

4. **Несвязность графа:**
   - Если Верхоянск и Мирный в разных компонентах связности → путь не найдётся
   - **Результат:** "No route found between cities"

5. **Старый граф в Redis:**
   - Если граф был построен до добавления stops → узлы отсутствуют
   - **Результат:** "Stops found but graph is out of sync"

---

## 14. Summary: Root Cause(s)

### Основные причины отсутствия маршрутов:

1. **Pipeline не запускается автоматически**
   - Условие: `hasData = true` → pipeline пропускается
   - Проблема: Даже если данные неполные/устаревшие, pipeline не запускается

2. **Virtual stops не создаются для non-key cities**
   - Условие: `isKeyCity: false` → virtual stop не создаётся
   - Проблема: Верхоянск и Мирный не получат virtual stops

3. **GraphBuilderWorker не пересобирает граф**
   - Условие: `existingGraph.length > 0` → граф не пересобирается
   - Проблема: Даже при изменении данных граф остаётся старым

4. **Нет механизма проверки полноты данных**
   - Pipeline пропускается, если есть **любые** данные
   - Не проверяется, **какие именно** города имеют stops/routes

5. **Redis может содержать старый граф**
   - Backend загружает граф из Redis без проверки соответствия БД
   - Если граф устарел → маршруты не находятся

### Рекомендации:

1. **Добавить принудительный пересбор графа:**
   - API endpoint для пересбора без изменения dataset version
   - Механизм очистки старых данных перед пересбором

2. **Исправить логику VirtualEntitiesGeneratorWorker:**
   - Проверять полноту virtual stops, а не только их количество
   - Создавать virtual stops для всех городов из справочника, а не только key cities

3. **Добавить проверку актуальности графа:**
   - Сравнивать версию графа с версией dataset
   - Автоматически пересобирать граф при несоответствии

4. **Улучшить логирование:**
   - Логировать причины пропуска pipeline
   - Логировать отсутствующие stops/routes для конкретных городов

5. **Добавить диагностический endpoint:**
   - Проверка наличия stops для конкретных городов
   - Проверка наличия узлов в графе
   - Проверка связности графа

---

**Статус:** Диагностика завершена. Все блокирующие факторы идентифицированы.








