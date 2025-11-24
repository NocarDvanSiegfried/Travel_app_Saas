# ШАГ 18: Полная пересборка системы

**Цель:** Выполнить полную пересборку системы после всех исправлений (ШАГИ 12-17)

**Статус исправлений:**
- ✅ ШАГ 12: Миграция 008 создана (удаление виртуальных stops из `stops`)
- ✅ ШАГ 13: `DataInitialization.checkDataCompleteness()` обновлён
- ✅ ШАГ 14: `VirtualEntitiesGeneratorWorker.canRun()` исправлен
- ✅ ШАГ 15: Фильтрация в `GraphBuilderWorker` добавлена
- ✅ ШАГ 16: `AirRouteGeneratorWorker` исправлен
- ✅ ШАГ 17: Миграция 009 создана (ferry-terminal metadata)

---

## 1. Остановить проект

Чтобы освободить Redis volume и подготовить окружение:

```bash
# Остановить все контейнеры
docker-compose down

# Убедиться, что контейнеры остановлены
docker-compose ps

# Проверить, что backend и redis больше не занимают volume
docker volume ls
```

**Ожидаемый результат:**
- Все контейнеры остановлены
- Redis volume доступен для удаления

---

## 2. Удалить Redis volume

Важно удалить именно volume Redis, чтобы очистить:
- graph metadata
- старые виртуальные структуры
- любые остатки незавершённых pipeline

**Найти Redis volume:**
```bash
# Просмотреть список volumes
docker volume ls

# Найти volume для Redis (обычно называется travel-app-saas_redis-data или подобное)
docker volume inspect <redis-volume-name>
```

**Удалить Redis volume:**
```bash
# Удалить Redis volume
docker volume rm <redis-volume-name>

# Или если volume указан в docker-compose.yml как named volume:
# docker volume rm travel-app-saas_redis-data
```

**Проверка:**
```bash
# Убедиться, что volume удалён
docker volume ls | grep redis
# Должно быть пусто
```

**Ожидаемый результат:**
- Redis volume полностью удалён
- При следующем запуске Redis создаст новый пустой volume

---

## 3. Очистить таблицы в PostgreSQL (опционально, миграции сделают это автоматически)

У нас есть миграции:
- **007**: удаляет старые virtual данные
- **008**: убирает виртуальные stops из `stops`
- **009**: исправляет ferry metadata

Все они применяются автоматически при запуске backend.

**Перед запуском рекомендуется проверить (опционально):**

```sql
-- Проверить виртуальные stops в stops (должно быть 0 после миграции 008)
SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%';
-- Ожидаемый результат: 0

-- Проверить невалидные stops
SELECT COUNT(*) FROM stops 
WHERE (city_id IS NULL OR city_id = '') AND id LIKE 'virtual-stop-%';
-- Ожидаемый результат: 0

-- Проверить ferry stops без metadata
SELECT id, name, metadata FROM stops 
WHERE (id IN ('stop-027', 'stop-028')
   OR name ILIKE '%паром%' OR name ILIKE '%ferry%' 
   OR name ILIKE '%переправа%' OR name ILIKE '%пристань%')
  AND (metadata IS NULL OR metadata->>'type' != 'ferry_terminal');
-- Ожидаемый результат: 0 (после миграции 009)
```

**Примечание:** Если миграции ещё не применены, эти проверки покажут старые данные. Миграции применятся автоматически при запуске backend.

---

## 4. Запустить проект заново

При запуске backend:
- Миграции применяются автоматически
- `DataInitialization` проверяет состояние системы

**Запуск:**
```bash
# Запустить все контейнеры
docker-compose up -d

# Просмотреть логи backend для отслеживания процесса
docker-compose logs -f backend
```

**Backend обнаружит:**
- ✅ Пустой Redis
- ✅ Граф отсутствует
- ✅ Таблицы чистые (или будут очищены миграциями)
- ✅ Автоматически выполнит полный pipeline в правильной последовательности

---

## 5. Наблюдать логи backend

В логах должно происходить следующее:

### Шаг 1: OData Sync Worker

**Ожидаем:**
```
[odata-sync-worker] Step 1: Loading stops from mock data...
[odata-sync-worker] Loaded 35 stops
[odata-sync-worker] Step 2: Loading routes from mock data...
[odata-sync-worker] Loaded 127 routes
[odata-sync-worker] Step 3: Loading flights from mock data...
[odata-sync-worker] Loaded 261 flights
[odata-sync-worker] 0 invalid stops filtered
[odata-sync-worker] Dataset created: dataset-v{timestamp}
```

**Проверки:**
- ✅ Stops: 35
- ✅ Routes: 127
- ✅ Flights: 261
- ✅ 0 invalid stops
- ✅ Dataset создан успешно

### Шаг 2: Air Route Generator Worker

**Ожидаем:**
```
[air-route-generator-worker] Processing city: Москва...
[air-route-generator-worker] City "Москва" has 2 valid stops
[air-route-generator-worker] Generated 2 routes, 42 flights
...
[air-route-generator-worker] Generated 22 routes, 462 flights
```

**Проверки:**
- ✅ 11 федеральных городов обработано
- ✅ 22 маршрута создано (11 × 2 направления)
- ✅ 462 flights создано (22 × 21 flights per route)
- ✅ Ни одного пропуска по невалидности stops
- ✅ Нет сообщений "City has no valid stops after filtering"

### Шаг 3: Virtual Entities Generator Worker

**Ожидаем:**
```
[virtual-entities-generator-worker] Step 2: Finding cities without real stops...
[virtual-entities-generator-worker] Found 20 cities without real stops
[virtual-entities-generator-worker] Step 3: Generating virtual stops...
[virtual-entities-generator-worker] Generated 20 virtual stops
[virtual-entities-generator-worker] Step 4: Generating virtual routes...
[virtual-entities-generator-worker] Generated 900 virtual routes
```

**Проверки:**
- ✅ 20+ yakutia cities обработано
- ✅ 10 federal cities обработано
- ✅ 0 invalid stops
- ✅ ≈900 virtual routes создано
- ✅ Все stops существуют и валидны
- ✅ Нет виртуального мусора (virtual-stop----------------)

### Шаг 4: Graph Builder Worker

**Ожидаем:**
```
[graph-builder] Step 1: Loading stops from PostgreSQL...
[graph-builder] Loaded 55 stops (35 real, 20 virtual)
[graph-builder] Step 1.1: Filtering invalid stops...
[graph-builder] Valid stops after filtering: 55
[graph-builder] Step 4: Building graph structure...
[graph-builder] Built graph: 36 nodes, 160 edges
[graph-builder] Step 4.1: Validating graph structure...
[graph-builder] Validation: graph=true, transfers=true, ferry=true
```

**Проверки:**
- ✅ 36+ nodes
- ✅ 160+ edges
- ✅ Нет isolated nodes (или минимальное количество)
- ✅ Нет ошибок ferry-валидации
- ✅ Вес переправ 37.5–57.5 минут
- ✅ Верхоянск и Мирный в графе
- ✅ 0 filtered invalid stops (или минимальное количество)

---

## 6. Проверить финальный граф

**Проверка через логи:**
```
[graph-builder] Graph version: graph-v{timestamp}
[graph-builder] Graph nodes: 36
[graph-builder] Graph edges: 160
[graph-builder] Activated graph version: graph-v{timestamp}
```

**Проверка через API (опционально):**
```bash
# Проверить статус графа
curl http://localhost:5000/api/v1/routes/health

# Ожидаемый ответ:
# {
#   "graphAvailable": true,
#   "graphVersion": "graph-v{timestamp}",
#   "nodes": 36,
#   "edges": 160
# }
```

**Проверка через PostgreSQL:**
```sql
-- Проверить версию графа
SELECT * FROM graphs ORDER BY created_at DESC LIMIT 1;

-- Проверить наличие Верхоянска и Мирного в stops
SELECT id, name, city_id FROM stops 
WHERE city_id IN ('Верхоянск', 'Мирный', 'Верхоянский', 'Мирнинский')
   OR name ILIKE '%верхоянск%'
   OR name ILIKE '%мирный%';
```

**Ожидаемый результат:**
- ✅ Graph version: `graph-v{timestamp}`
- ✅ Nodes ≥ 36
- ✅ Edges ≥ 160
- ✅ Верхоянск: найден stop
- ✅ Мирный: найден stop
- ✅ `graphAvailable = true`

---

## 7. Проверить ключевой маршрут

**В frontend:**
1. Открыть страницу поиска маршрутов
2. Ввести: **Верхоянск → Мирный**
3. Выбрать любую дату
4. Нажать "Найти маршрут"

**Ожидаемый результат:**
- ✅ Маршрут найден
- ✅ Время корректное
- ✅ Нет ошибок "graph not available"
- ✅ Маршрут содержит валидные сегменты

**Дополнительные контрольные маршруты для проверки:**
- Москва → Якутск
- Москва → Чурапча
- Москва → Нижний Бестях
- Новосибирск → Якутск → Олёкминск
- Красноярск → Якутск → Мирный

---

## 8. Финальный чеклист (быстрый)

| Пункт | Ожидаемый результат | Проверка |
|-------|---------------------|----------|
| Миграции применились | Да | Логи backend: "Migration 007/008/009 applied" |
| Redis пустой перед стартом | Да | `docker volume ls` не показывает старый Redis volume |
| Pipeline запустился автоматически | Да | Логи: "Starting automatic data initialization..." |
| Все 4 воркера отработали | Да | Логи: ODataSyncWorker, AirRouteGeneratorWorker, VirtualEntitiesGeneratorWorker, GraphBuilderWorker |
| Нет ошибок валидации ferry | Да | Логи: "Validation: ferry=true" |
| Нет virtual-stop---------------- | Да | Логи: "0 invalid stops filtered" или проверка БД |
| Граф активирован | Да | Логи: "Activated graph version: graph-v{timestamp}" |
| Верхоянск → Мирный работает | Да | Frontend: маршрут найден |
| Другие контрольные маршруты работают | Да | Frontend: все маршруты найдены |

---

## 9. Дополнительные проверки (если что-то пошло не так)

### Проверка состояния базы данных

```sql
-- Проверить количество stops
SELECT 
  (SELECT COUNT(*) FROM stops WHERE id NOT LIKE 'virtual-stop-%') as real_stops,
  (SELECT COUNT(*) FROM virtual_stops) as virtual_stops;

-- Проверить количество routes
SELECT COUNT(*) FROM routes;

-- Проверить количество flights
SELECT COUNT(*) FROM flights;

-- Проверить наличие виртуальных stops в stops (должно быть 0)
SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%';
-- Ожидаемый результат: 0

-- Проверить ferry stops
SELECT id, name, metadata FROM stops 
WHERE metadata->>'type' = 'ferry_terminal';
-- Ожидаемый результат: stop-027, stop-028
```

### Проверка Redis

```bash
# Подключиться к Redis контейнеру
docker-compose exec redis redis-cli

# Проверить версию графа
GET graph:current:version

# Проверить наличие графа
EXISTS graph:current:version

# Проверить количество ключей
DBSIZE
```

### Проверка логов на ошибки

```bash
# Просмотреть все ошибки в логах backend
docker-compose logs backend | grep -i error

# Просмотреть все предупреждения
docker-compose logs backend | grep -i warn

# Просмотреть сообщения о pipeline
docker-compose logs backend | grep -i "pipeline\|worker\|graph"
```

---

## 10. Если что-то пошло не так

### Проблема: Pipeline не запустился

**Причина:** `DataInitialization` считает данные полными

**Решение:**
1. Проверить логи: `"Data is complete and graph is up-to-date - skipping automatic initialization"`
2. Проверить `checkDataCompleteness()` в логах
3. Если данные действительно неполные, но pipeline не запускается — проверить логику в `DataInitialization.ts`

### Проблема: Virtual stops не создаются

**Причина:** `VirtualEntitiesGeneratorWorker` пропускается

**Решение:**
1. Проверить логи: `"Worker can run - dataset exists"`
2. Проверить, что `canRun()` возвращает `true`
3. Проверить, что dataset существует

### Проблема: Граф не строится

**Причина:** Недостаточно валидных stops

**Решение:**
1. Проверить логи: `"Cannot build graph: only X valid stops"`
2. Проверить фильтрацию в `GraphBuilderWorker`
3. Убедиться, что stops не фильтруются ошибочно

### Проблема: Ferry edges не создаются

**Причина:** Ferry stops не имеют правильных меток

**Решение:**
1. Проверить миграцию 009: применена ли она
2. Проверить `metadata.type = 'ferry_terminal'` для stop-027 и stop-028
3. Проверить логи: `"Validation: ferry=true"`

---

## 11. Успешное завершение

После выполнения всех шагов и проверок:

✅ **Система полностью пересобрана**
✅ **Все исправления применены**
✅ **Граф построен корректно**
✅ **Контрольные маршруты работают**
✅ **Нет невалидных данных**

**Следующие шаги:**
- Система готова к использованию
- Все маршруты должны находиться корректно
- Граф стабилен и валиден

---

**Дата создания:** 2024
**Версия:** 1.0
**Статус:** Готов к выполнению




