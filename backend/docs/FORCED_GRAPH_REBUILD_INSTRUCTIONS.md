# ШАГ 3: Форсированная пересборка графа

**Дата:** 2025-01-XX  
**Цель:** Очистить старые Redis данные, перезапустить pipeline и убедиться, что новый граф построен с включением всех virtual stops/routes

---

## 1. Анализ Redis Volume и данных

### 1.1 Путь к Redis Volume

**Docker Volume:**
- **Имя volume:** `travel_app_saas_redis_data`
- **Путь в Docker:** `/var/lib/docker/volumes/travel_app_saas_redis_data/_data`
- **Путь в контейнере:** `/data`

**На Windows:**
- Физический путь находится в Docker Desktop VM
- Прямой доступ через файловую систему Windows невозможен
- Необходимо использовать Docker команды или удалить volume

### 1.2 Структура данных в Redis

**Ключи графа, хранящиеся в Redis:**
- `graph:current:version` — текущая версия графа (строка)
- `graph:current:metadata` — метаданные графа (JSON)
- `graph:{version}:nodes` — Set узлов графа для конкретной версии
- `graph:{version}:neighbors:{nodeId}` — список соседей для каждого узла (JSON)

**Redis конфигурация (docker-compose.yml):**
- `--appendonly yes` — AOF (Append Only File) включен
- Файлы AOF: `appendonly.aof` (в каталоге `/data` внутри контейнера)
- RDB snapshots: могут создаваться автоматически (файлы `dump.rdb`)

### 1.3 Файлы, которые нужно удалить

**Внутри контейнера Redis (`/data`):**
- `appendonly.aof` — файл AOF (если существует)
- `dump.rdb` — RDB snapshot (если существует)
- Любые другие файлы в `/data`

**Примечание:** Удаление volume полностью очистит все данные Redis, включая граф.

---

## 2. Последовательность шагов для пользователя

### ШАГ 1: Остановить проект

```bash
cd "C:\Users\admin\Desktop\проекты\Travel_app_Saas"
docker-compose down
```

**Ожидаемый результат:**
- Все контейнеры остановлены
- Сеть `travel-app-network` может остаться (не критично)

---

### ШАГ 2: Удалить Redis данные

**Вариант A: Удалить только Redis volume (рекомендуется)**

```bash
docker volume rm travel_app_saas_redis_data
```

**Вариант B: Удалить все volumes проекта (если нужно полное очищение)**

```bash
docker volume rm travel_app_saas_redis_data travel_app_saas_postgres_data travel_app_saas_minio_data
```

**Вариант C: Очистить только данные графа через Redis CLI (если контейнер запущен)**

```bash
# Подключиться к Redis
docker exec -it travel-app-redis redis-cli -a 123456S

# Удалить все ключи графа
KEYS graph:*
# Для каждого ключа: DEL graph:current:version, DEL graph:current:metadata, и т.д.

# Или удалить все ключи графа одной командой
redis-cli -a 123456S --scan --pattern "graph:*" | xargs redis-cli -a 123456S DEL
```

**Рекомендация:** Использовать **Вариант A** — удалить только Redis volume. Это полностью очистит Redis и заставит систему пересобрать граф.

---

### ШАГ 3: Запустить проект заново

```bash
docker-compose up -d
```

**Ожидаемый результат:**
- Все контейнеры запущены
- Redis создаст новый пустой volume
- Backend начнёт инициализацию

---

### ШАГ 4: Дождаться завершения pipeline

**Мониторинг логов backend:**

```bash
docker logs -f travel-app-backend
```

**Ожидаемые этапы в логах:**

1. **Проверка данных:**
   ```
   🔍 Checking data completeness and graph state...
   ⚠️ Data is incomplete or graph needs rebuild:
      - Graph not found in Redis
   🚀 Starting automatic data initialization...
   ```

2. **Инициализация воркеров:**
   ```
   🔧 Step 1: Initializing background workers...
   ✅ Workers initialized
   ```

3. **Выполнение pipeline:**
   ```
   🚀 Step 2: Executing full data pipeline...
   [WorkerOrchestrator] 🚀 Starting full pipeline execution...
   [WorkerOrchestrator] Step 1: Executing OData Sync Worker...
   [WorkerOrchestrator] ✅ OData Sync Worker completed
   [WorkerOrchestrator] Step 2: Executing Air Route Generator Worker...
   [WorkerOrchestrator] ✅ Air Route Generator Worker completed
   [WorkerOrchestrator] Step 3: Executing Virtual Entities Generator Worker...
   [WorkerOrchestrator] ✅ Virtual Entities Generator Worker completed
   [WorkerOrchestrator] Step 4: Executing Graph Builder Worker...
   [WorkerOrchestrator] ✅ Graph Builder Worker completed
   [WorkerOrchestrator] 🎉 Full pipeline completed in XXXms
   ```

4. **Завершение:**
   ```
   ✅ Data initialization completed successfully!
   📊 Final Data Status:
      Real stops: XX
      Virtual stops: XX
      Routes: XX
      Flights: XX
   ✅ Database populated successfully!
   ```

**Время выполнения:** Обычно 2-5 минут в зависимости от объёма данных.

---

## 3. Проверка результатов

### 3.1 Проверка через логи backend

После завершения pipeline проверьте логи на наличие:

**Virtual stops:**
```
[VirtualEntitiesGeneratorWorker] Generated XX virtual stops
```

**Graph building:**
```
[GraphBuilderWorker] Saved graph to Redis: graph-vXXXXX
[GraphBuilderWorker] Activated graph version: graph-vXXXXX
```

**Статистика графа:**
```
[GraphBuilderWorker] Graph statistics:
   - Total nodes: XX
   - Total edges: XX
   - Validation: graph=true, transfers=true, ferry=true
```

### 3.2 Проверка через API (если backend запущен)

**Проверка диагностики графа:**
```bash
curl http://localhost:5000/api/v1/routes/graph/diagnostics
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "graphAvailable": true,
  "version": "graph-vXXXXX",
  "statistics": {
    "totalNodes": 40,
    "totalEdges": 200,
    "averageEdgesPerNode": 5.0,
    "densityPercentage": 12.5
  },
  "metadata": {
    "buildTimestamp": "2025-01-XX...",
    "datasetVersion": "v1.0.0"
  }
}
```

### 3.3 Проверка через Redis CLI

```bash
# Подключиться к Redis
docker exec -it travel-app-redis redis-cli -a 123456S

# Проверить версию графа
GET graph:current:version

# Проверить метаданные
GET graph:current:metadata

# Проверить количество узлов (замените {version} на актуальную версию)
SCARD graph:{version}:nodes

# Проверить наличие узлов для Верхоянска и Мирного
SISMEMBER graph:{version}:nodes stop-023
SISMEMBER graph:{version}:nodes stop-005
```

---

## 4. Критерии успешной пересборки

### ✅ Обязательные проверки:

1. **Virtual stops > 0**
   - В логах: `Generated XX virtual stops`
   - В БД: `virtualStopsCount > 0`

2. **Nodes >= 40**
   - В логах GraphBuilderWorker: `Total nodes: XX` (где XX >= 40)
   - В API диагностике: `totalNodes >= 40`

3. **Edges >= 200**
   - В логах GraphBuilderWorker: `Total edges: XX` (где XX >= 200)
   - В API диагностике: `totalEdges >= 200`

4. **Graph version новая**
   - Версия должна быть новой (не совпадать со старой)
   - Формат: `graph-v{timestamp}`

5. **Верхоянск и Мирный присутствуют как узлы**
   - В Redis: `SISMEMBER graph:{version}:nodes stop-023` → 1 (Верхоянск)
   - В Redis: `SISMEMBER graph:{version}:nodes stop-005` → 1 (Мирный)
   - Или через API: поиск маршрута Верхоянск → Мирный должен найти путь

6. **Граф успешно пересобран**
   - В логах: `✅ Graph Builder Worker completed`
   - В логах: `Activated graph version: graph-vXXXXX`
   - В API: `graphAvailable: true`

---

## 5. Возможные проблемы и решения

### Проблема 1: Pipeline не запускается

**Симптомы:**
- В логах: `✅ Data is complete and graph is up-to-date - skipping automatic initialization`
- Но данные неполные

**Решение:**
- Проверить, что Redis volume действительно удалён
- Проверить, что БД очищена (если нужно)
- Перезапустить backend: `docker-compose restart backend`

### Проблема 2: Virtual stops не создаются

**Симптомы:**
- В логах: `Virtual entities already exist (XX stops) - skipping`

**Решение:**
- Очистить virtual stops из БД:
  ```sql
  DELETE FROM virtual_stops;
  DELETE FROM virtual_routes;
  ```
- Или удалить все данные: `docker volume rm travel_app_saas_postgres_data`

### Проблема 3: Граф слишком маленький

**Симптомы:**
- Nodes < 40 или Edges < 200

**Решение:**
- Проверить, что все воркеры выполнились успешно
- Проверить логи на ошибки валидации
- Проверить, что mock-данные загружены корректно

### Проблема 4: Верхоянск/Мирный отсутствуют в графе

**Симптомы:**
- Узлы не найдены в Redis

**Решение:**
- Проверить, что stops загружены в БД (ODataSyncWorker)
- Проверить, что virtual stops созданы (VirtualEntitiesGeneratorWorker)
- Проверить логи GraphBuilderWorker на ошибки

---

## 6. Альтернативный метод: Очистка через API

Если backend запущен, можно использовать API для принудительной пересборки:

### 6.1 Очистка данных и пересборка

```bash
# Очистить все данные и пересобрать
curl -X POST http://localhost:5000/api/v1/data/reinit

# Или только пересобрать граф
curl -X POST http://localhost:5000/api/v1/graph/rebuild
```

**Примечание:** Эти endpoints могут требовать аутентификации или быть недоступны в текущей версии.

---

## 7. Финальная проверка

После выполнения всех шагов выполните:

### 7.1 Проверка через логи

```bash
docker logs travel-app-backend | grep -E "virtual stops|Graph Builder|nodes|edges|Верхоянск|Мирный"
```

### 7.2 Проверка через API

```bash
# Проверка диагностики
curl http://localhost:5000/api/v1/routes/graph/diagnostics

# Попытка найти маршрут Верхоянск → Мирный
curl "http://localhost:5000/api/v1/routes/search?from=Верхоянск&to=Мирный&date=2025-01-20&passengers=1"
```

### 7.3 Ожидаемые результаты

- ✅ Virtual stops созданы (в логах и БД)
- ✅ Граф содержит >= 40 узлов
- ✅ Граф содержит >= 200 рёбер
- ✅ Версия графа новая
- ✅ Верхоянск и Мирный присутствуют в графе
- ✅ Маршрут Верхоянск → Мирный находится успешно

---

## 8. Резюме инструкций

**Минимальный набор команд для выполнения:**

```bash
# 1. Остановить проект
docker-compose down

# 2. Удалить Redis volume
docker volume rm travel_app_saas_redis_data

# 3. Запустить проект
docker-compose up -d

# 4. Мониторить логи
docker logs -f travel-app-backend
```

**Ожидаемое время:** 3-5 минут

**Критерии успеха:**
- Pipeline выполнен успешно
- Virtual stops > 0
- Nodes >= 40, Edges >= 200
- Верхоянск и Мирный в графе
- Маршрут Верхоянск → Мирный находится

---

**Статус:** Инструкции подготовлены. Готово к выполнению пользователем.








