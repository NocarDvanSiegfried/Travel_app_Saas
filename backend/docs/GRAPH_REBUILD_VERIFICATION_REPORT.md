# [GRAPH REBUILD VERIFICATION REPORT]

**Дата проверки:** 2025-01-XX  
**Цель:** Проверка состояния системы после форсированной пересборки графа

---

## Инструкции по проверке

После выполнения команд из `FORCED_GRAPH_REBUILD_INSTRUCTIONS.md`, выполните следующие проверки:

### 1. Проверка логов backend

```bash
docker logs travel-app-backend | grep -E "pipeline|Worker|virtual|Graph|nodes|edges|Верхоянск|Мирный"
```

Или полные логи:
```bash
docker logs travel-app-backend > backend-logs.txt
```

---

## Ожидаемые результаты (на основе анализа кода)

### 1. Pipeline executed: **YES** (ожидается)

**Признаки в логах:**
- `🚀 Starting automatic data initialization...`
- `[WorkerOrchestrator] 🚀 Starting full pipeline execution...`
- `✅ Data initialization completed successfully!`

**Логика:**
- После очистки Redis, `checkDataCompleteness()` обнаружит отсутствие графа
- `needsPipeline = true` → pipeline запустится автоматически

---

### 2. Workers executed in order: **YES** (ожидается)

**Ожидаемый порядок выполнения:**

1. **OData Sync Worker**
   - Логи: `[WorkerOrchestrator] Step 1: Executing OData Sync Worker...`
   - Результат: `✅ OData Sync Worker completed`
   - Загружает real stops из mock-данных

2. **Air Route Generator Worker**
   - Логи: `[WorkerOrchestrator] Step 2: Executing Air Route Generator Worker...`
   - Результат: `✅ Air Route Generator Worker completed`
   - Создаёт air routes для федеральных городов

3. **Virtual Entities Generator Worker**
   - Логи: `[WorkerOrchestrator] Step 3: Executing Virtual Entities Generator Worker...`
   - Результат: `✅ Virtual Entities Generator Worker completed`
   - Создаёт virtual stops для всех городов без real stops

4. **Graph Builder Worker**
   - Логи: `[WorkerOrchestrator] Step 4: Executing Graph Builder Worker...`
   - Результат: `✅ Graph Builder Worker completed`
   - Пересобирает граф с новыми данными

**Проверка:**
- В логах должны быть все 4 шага
- Каждый шаг должен завершиться успешно
- `Workers executed: 4` в финальном сообщении

---

### 3. Virtual stops created: **YES** (ожидается)

**Признаки в логах:**
- `[VirtualEntitiesGeneratorWorker] Generated XX virtual stops`
- `[VirtualEntitiesGeneratorWorker] Step 3: Generating virtual stops...`

**Ожидаемое количество:**
- Зависит от количества городов без real stops
- Включая Верхоянск и Мирный (если у них нет real stops)

**Проверка через API:**
```bash
curl http://localhost:5000/api/v1/cities
```

Или через логи:
```bash
docker logs travel-app-backend | grep "virtual stops"
```

---

### 4. Virtual routes created: **YES** (ожидается)

**Признаки в логах:**
- `[VirtualEntitiesGeneratorWorker] Generated XX virtual routes`
- `[VirtualEntitiesGeneratorWorker] Step 4: Generating virtual routes...`

**Ожидаемое количество:**
- Hub-based routes: для каждого virtual stop → Якутск (туда и обратно)
- Connectivity routes: для обеспечения связности между городами

**Проверка:**
- В логах должно быть сообщение о количестве созданных virtual routes

---

### 5. Graph rebuilt: **YES** (ожидается)

**Признаки в логах:**
- `[GraphBuilderWorker] Step 5: Saving graph to Redis...`
- `[GraphBuilderWorker] Saved graph to Redis: graph-v{timestamp}`
- `[GraphBuilderWorker] Step 7: Activating new graph version...`
- `[GraphBuilderWorker] Activated graph version: graph-v{timestamp}`

**Проверка:**
- Новая версия графа должна быть создана
- Формат: `graph-v{timestamp}` (например, `graph-v1737123456789`)

---

### 6. Graph version: **graph-v{timestamp}** (ожидается)

**Ключ в Redis:**
- `graph:current:version` — содержит версию графа

**Проверка через Redis CLI:**
```bash
docker exec -it travel-app-redis redis-cli -a 123456S GET graph:current:version
```

**Проверка через API:**
```bash
curl http://localhost:5000/api/v1/routes/graph/diagnostics
```

**Ожидаемый формат:**
- `graph-v{timestamp}` где timestamp — время создания графа

---

### 7. Graph statistics: **nodes >= 40, edges >= 200** (ожидается)

**Признаки в логах:**
- `[GraphBuilderWorker] Graph built successfully: XX nodes, XX edges`
- `[GraphBuilderWorker] Validation: graph=true, transfers=true, ferry=true`

**Минимальные требования:**
- Nodes >= 40 (включая real stops, virtual stops, федеральные города)
- Edges >= 200 (включая routes, transfers, ferry connections)

**Проверка через API:**
```bash
curl http://localhost:5000/api/v1/routes/graph/diagnostics
```

**Ожидаемый ответ:**
```json
{
  "statistics": {
    "totalNodes": 40,
    "totalEdges": 200,
    "averageEdgesPerNode": 5.0,
    "densityPercentage": 12.5
  }
}
```

---

### 8. Верхоянск: **Ожидаемое состояние**

**Real stops:**
- **Ожидается:** 1 real stop
- **ID:** `stop-023`
- **Название:** "Аэропорт Верхоянск"
- **Тип:** airport
- **Координаты:** 67.5500, 133.3833

**Virtual stops:**
- **Ожидается:** 0 virtual stops (если real stop существует)
- **Или:** 1 virtual stop (если real stop не загружен)

**In graph:**
- **Ожидается:** YES
- **Node ID:** `stop-023` (если real stop) или `virtual-stop-{hash}` (если virtual stop)
- **Проверка:** `SISMEMBER graph:{version}:nodes stop-023` → 1

**Проверка через API:**
```bash
curl "http://localhost:5000/api/v1/routes/search?from=Верхоянск&to=Мирный&date=2025-01-20&passengers=1"
```

**Нормализация:**
- "Верхоянск" → `normalizeCityName("Верхоянск")` → `"верхоянск"`
- Поиск stops: `getRealStopsByCity("верхоянск")` или `getVirtualStopsByCity("верхоянск")`

---

### 9. Мирный: **Ожидаемое состояние**

**Real stops:**
- **Ожидается:** 1 real stop
- **ID:** `stop-005`
- **Название:** "Аэропорт Мирный"
- **Тип:** airport
- **Координаты:** 62.5347, 114.0389

**Virtual stops:**
- **Ожидается:** 0 virtual stops (если real stop существует)
- **Или:** 1 virtual stop (если real stop не загружен)

**In graph:**
- **Ожидается:** YES
- **Node ID:** `stop-005` (если real stop) или `virtual-stop-{hash}` (если virtual stop)
- **Проверка:** `SISMEMBER graph:{version}:nodes stop-005` → 1

**Проверка через API:**
```bash
curl "http://localhost:5000/api/v1/routes/search?from=Мирный&to=Верхоянск&date=2025-01-20&passengers=1"
```

**Нормализация:**
- "Мирный" → `normalizeCityName("Мирный")` → `"мирный"`
- Поиск stops: `getRealStopsByCity("мирный")` или `getVirtualStopsByCity("мирный")`

---

### 10. Route search result (internal analysis): **Ожидаемое поведение**

**Шаг 1: Нормализация городов**
- `fromCity = "Верхоянск"` → `normalizeCityName("Верхоянск")` → `"верхоянск"`
- `toCity = "Мирный"` → `normalizeCityName("Мирный")` → `"мирный"`

**Шаг 2: Поиск stops**
- `findStopsForCity("верхоянск")` → должен найти `stop-023` (real stop)
- `findStopsForCity("мирный")` → должен найти `stop-005` (real stop)

**Шаг 3: Проверка узлов в графе**
- `hasNode("stop-023")` → должен вернуть `true`
- `hasNode("stop-005")` → должен вернуть `true`

**Шаг 4: Поиск пути**
- `findShortestPath("stop-023", "stop-005", graphVersion)` → должен найти путь

**Ожидаемый результат:**
- **from stopId:** `stop-023` (или `virtual-stop-{hash}`)
- **to stopId:** `stop-005` (или `virtual-stop-{hash}`)
- **pathFound:** YES (если граф связный и содержит оба узла)

**Возможные пути:**
- Прямой маршрут: Верхоянск → Мирный (если есть route)
- Через Якутск: Верхоянск → Якутск → Мирный (hub-based)
- Через другие города: Верхоянск → ... → Мирный

---

## 11. Problems detected: **Список возможных проблем**

### Проблема #1: Pipeline не запустился

**Симптомы:**
- В логах: `✅ Data is complete and graph is up-to-date - skipping automatic initialization`
- Но граф отсутствует или устарел

**Причина:**
- `checkDataCompleteness()` неправильно определил состояние данных
- Redis volume не был удалён полностью

**Решение:**
- Проверить, что Redis volume действительно удалён
- Проверить логи `checkDataCompleteness()` на причины пропуска

---

### Проблема #2: Virtual stops не созданы

**Симптомы:**
- В логах: `Virtual entities already exist (XX stops) - skipping`
- Но Верхоянск/Мирный отсутствуют

**Причина:**
- Virtual stops уже существуют в БД, но неполные
- `VirtualEntitiesGeneratorWorker.canRun()` вернул `false`

**Решение:**
- Очистить virtual stops из БД перед пересборкой
- Или принудительно запустить VirtualEntitiesGeneratorWorker

---

### Проблема #3: Граф слишком маленький

**Симптомы:**
- Nodes < 40 или Edges < 200

**Причина:**
- Не все stops загружены
- Не все routes созданы
- Валидация графа выявила проблемы

**Решение:**
- Проверить логи ODataSyncWorker на ошибки загрузки
- Проверить логи VirtualEntitiesGeneratorWorker на ошибки генерации
- Проверить логи GraphBuilderWorker на ошибки валидации

---

### Проблема #4: Верхоянск/Мирный отсутствуют в графе

**Симптомы:**
- `hasNode("stop-023")` → `false`
- `hasNode("stop-005")` → `false`

**Причина:**
- Real stops не загружены из OData
- Virtual stops не созданы
- GraphBuilderWorker не включил stops в граф

**Решение:**
- Проверить, что stops загружены в БД
- Проверить, что virtual stops созданы
- Проверить логи GraphBuilderWorker на фильтрацию stops

---

### Проблема #5: Маршрут не находится

**Симптомы:**
- `findShortestPath()` возвращает пустой путь
- Ошибка: "No route found between cities"

**Причина:**
- Узлы существуют, но нет рёбер между ними
- Граф содержит несколько несвязных компонентов
- Алгоритм Dijkstra не находит путь

**Решение:**
- Проверить, что routes созданы между stops
- Проверить, что virtual routes созданы
- Проверить связность графа (BFS от Верхоянска)

---

## 12. Everything OK: **Проверка финального состояния**

### Критерии успеха:

✅ **Pipeline executed:** YES  
✅ **Workers executed in order:** YES (4 workers)  
✅ **Virtual stops created:** YES (count > 0)  
✅ **Virtual routes created:** YES (count > 0)  
✅ **Graph rebuilt:** YES  
✅ **Graph version:** новая версия (graph-v{timestamp})  
✅ **Graph statistics:** nodes >= 40, edges >= 200  
✅ **Верхоянск in graph:** YES  
✅ **Мирный in graph:** YES  
✅ **Route search:** path found (Верхоянск → Мирный)  

---

## Инструменты для проверки

### Скрипт проверки (для выполнения пользователем)

```bash
#!/bin/bash

echo "=== Graph Rebuild Verification ==="
echo ""

# 1. Проверка логов pipeline
echo "1. Checking pipeline execution..."
docker logs travel-app-backend 2>&1 | grep -E "pipeline|Worker|virtual|Graph" | tail -20

# 2. Проверка версии графа
echo ""
echo "2. Checking graph version..."
docker exec travel-app-redis redis-cli -a 123456S GET graph:current:version

# 3. Проверка метаданных графа
echo ""
echo "3. Checking graph metadata..."
docker exec travel-app-redis redis-cli -a 123456S GET graph:current:metadata | jq .

# 4. Проверка API диагностики
echo ""
echo "4. Checking API diagnostics..."
curl -s http://localhost:5000/api/v1/routes/graph/diagnostics | jq .

# 5. Проверка маршрута
echo ""
echo "5. Testing route search (Верхоянск → Мирный)..."
curl -s "http://localhost:5000/api/v1/routes/search?from=Верхоянск&to=Мирный&date=2025-01-20&passengers=1" | jq .
```

---

## Рекомендации

### Если граф слишком маленький:

1. **Проверить mock-данные:**
   - Убедиться, что `stops.json` содержит Верхоянск и Мирный
   - Убедиться, что `routes.json` содержит маршруты между ними

2. **Проверить virtual generation:**
   - Проверить логи VirtualEntitiesGeneratorWorker
   - Убедиться, что все города обрабатываются (не только key cities)

3. **Проверить логи воркеров:**
   - ODataSyncWorker: загружены ли real stops
   - VirtualEntitiesGeneratorWorker: созданы ли virtual stops
   - GraphBuilderWorker: включены ли все stops в граф

### Если Верхоянск изолирован:

1. **Проверить routes:**
   - Есть ли routes от Верхоянска к другим городам
   - Созданы ли virtual routes для связности

2. **Проверить граф:**
   - Есть ли рёбра от узла Верхоянска
   - Связан ли Верхоянск с Якутском (hub)

### Если Мирный не попал в граф:

1. **Проверить stops:**
   - Загружен ли real stop `stop-005`
   - Создан ли virtual stop (если real stop отсутствует)

2. **Проверить GraphBuilderWorker:**
   - Включён ли stop в список `allStops`
   - Создан ли узел для stop

### Если pipeline не запускался:

1. **Проверить Redis:**
   - Действительно ли volume удалён
   - Пуст ли Redis после перезапуска

2. **Проверить логи:**
   - Какие причины указаны в `checkDataCompleteness()`
   - Почему `needsPipeline = false`

---

## Финальный чеклист

После выполнения всех проверок заполните:

- [ ] Pipeline executed: YES/NO
- [ ] Workers executed: 4/0
- [ ] Virtual stops created: YES/NO (count: ___)
- [ ] Virtual routes created: YES/NO (count: ___)
- [ ] Graph rebuilt: YES/NO
- [ ] Graph version: `graph-v_______`
- [ ] Graph nodes: ___ (>= 40?)
- [ ] Graph edges: ___ (>= 200?)
- [ ] Верхоянск in graph: YES/NO
- [ ] Мирный in graph: YES/NO
- [ ] Route Верхоянск → Мирный: FOUND/NOT FOUND
- [ ] Everything OK: YES/NO

---

**Статус:** Отчёт подготовлен. Готов к использованию после выполнения команд пересборки.










