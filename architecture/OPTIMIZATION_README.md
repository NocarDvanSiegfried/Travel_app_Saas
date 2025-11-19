# Backend Optimization Architecture

## 📖 Quick Navigation

### **Main Documents**

1. **[Optimized Backend Architecture](./optimized-backend-architecture.md)** ⭐
   - Полный обзор трехуровневой архитектуры
   - PostgreSQL, Redis, MinIO
   - Жизненный цикл данных
   - Метрики производительности

2. **[Redis Graph Structure](./redis-graph-structure.md)**
   - Детальная структура хранения графа
   - Adjacency list + edge weights + metadata
   - Performance характеристики
   - Примеры использования

3. **[MinIO Storage Structure](./minio-storage-structure.md)**
   - Bucket организация
   - Lifecycle policies
   - Backup & recovery
   - Security & access control

4. **[Background Workers Architecture](./background-workers-architecture.md)**
   - Worker 1: OData Sync
   - Worker 2: Virtual Entities Generator
   - Worker 3: Graph Builder
   - Orchestration flow

### **Implementation Guides**

5. **[Implementation Plan](../OPTIMIZATION_IMPLEMENTATION_PLAN.md)**
   - Пошаговый план реализации
   - Оценки времени
   - Чек-листы
   - Success metrics

6. **[Optimization Summary](../BACKEND_OPTIMIZATION_SUMMARY.md)**
   - Полный summary всех изменений
   - Что было создано
   - Метрики и результаты
   - Следующие шаги

---

## 🎯 Цель оптимизации

Переработать backend так, чтобы:

- ✅ Backend **не пересоздавал** данные при старте
- ✅ Backend **не генерировал** виртуальные сущности при запросах
- ✅ Backend **не строил** граф при каждом запросе
- ✅ Backend был **readonly** и **мгновенным**
- ✅ Вся тяжелая работа была вынесена в **фоновые воркеры**

---

## 🏗️ Трехуровневая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPTIMIZED BACKEND                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │    Redis     │  │    MinIO     │
│              │  │              │  │              │
│ Persistent   │  │  In-Memory   │  │   Object     │
│   Storage    │  │    Graph     │  │   Storage    │
└──────────────┘  └──────────────┘  └──────────────┘
      ▲                  ▲                  ▲
      │                  │                  │
      └──────────────────┴──────────────────┘
                         │
            ┌────────────▼────────────┐
            │   Backend API (Fast)    │
            │   - Read-only           │
            │   - No generation       │
            │   - < 300ms startup     │
            └─────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │   Background Workers    │
            │   - OData sync          │
            │   - Virtual generation  │
            │   - Graph building      │
            └─────────────────────────┘
```

---

## 📊 Что хранится где

### **PostgreSQL** (Permanent Storage)

| Таблица | Что хранит | Обновляется |
|---------|-----------|-------------|
| `stops` | Реальные остановки | Worker 1 |
| `virtual_stops` | Виртуальные остановки | Worker 2 (один раз) |
| `routes` | Реальные маршруты | Worker 1 |
| `virtual_routes` | Виртуальные соединения | Worker 2 (один раз) |
| `flights` | Рейсы (real + virtual) | Worker 1, 2 |
| `datasets` | Метаданные датасетов | Worker 1 |
| `graphs` | Метаданные графов | Worker 3 |

### **Redis** (Fast Graph)

| Ключ | Что хранит | Для чего |
|------|-----------|----------|
| `graph:version` | Версия графа | Версионирование |
| `graph:meta` | Метаданные | Статистика |
| `graph:nodes` | Все узлы | Список ID |
| `graph:neighbors:{id}` | Соседи узла | Adjacency list |
| `graph:edge:{from}:{to}` | Вес ребра | Duration (min) |
| `graph:edge:meta:{from}:{to}` | Метаданные ребра | Distance, transport type |

### **MinIO** (Long-term Storage)

| Путь | Что хранит | Для чего |
|------|-----------|----------|
| `datasets/raw-v*.json` | Полные датасеты | Recovery |
| `datasets/odata-*.json` | OData бэкапы | Debugging |
| `datasets/virtual-*.json` | Виртуальные сущности | Recovery |
| `graphs/export-v*.json` | Графы | Recovery |
| `archives/*.tar.gz` | Архивы | Long-term |

---

## ⚙️ Background Workers

### **Worker 1: OData Sync** (каждые 6 часов)

```
OData API → Hash check → Parse → PostgreSQL → MinIO → Trigger Worker 2
```

**Результат:** Актуальные данные из OData в PostgreSQL

---

### **Worker 2: Virtual Entities** (при изменениях датасета)

```
PostgreSQL real data → Generate virtual → PostgreSQL → MinIO → Trigger Worker 3
```

**Результат:** Виртуальные остановки и маршруты для полного покрытия

---

### **Worker 3: Graph Builder** (при новых виртуальных сущностях)

```
PostgreSQL all data → Build graph → Redis → PostgreSQL metadata → MinIO → Switch version
```

**Результат:** Готовый граф в Redis для мгновенного поиска

---

## 🚀 Новый Backend Startup

```typescript
async function startBackend() {
  // 1. Connect to PostgreSQL (50ms)
  await postgres.connect();
  
  // 2. Connect to Redis (50ms)
  await redis.connect();
  
  // 3. Load graph version (< 1ms)
  const graphVersion = await redis.get('graph:version');
  
  // 4. Verify graph exists
  if (!graphVersion) {
    console.warn('No graph, run Worker 3');
  } else {
    console.log(`Graph ${graphVersion} ready`);
  }
  
  // 5. Start API server (100ms)
  app.listen(PORT);
  
  // Total: < 300ms ✅
}
```

**Что НЕ делается:**
- ❌ Загрузка OData
- ❌ Создание виртуальных остановок
- ❌ Создание виртуальных маршрутов
- ❌ Построение графа
- ❌ Обработка датасетов

---

## 🔍 Новый BuildRouteUseCase

```typescript
async function buildRoute(from: string, to: string): Promise<Route> {
  // 1. Get graph version (< 1ms)
  const version = await graphRepo.getVersion();
  
  // 2. Find path in graph (< 5ms)
  const path = await pathfinder.findPath(from, to);
  
  // 3. Build segments (< 2ms)
  const segments = await buildSegments(path);
  
  // 4. Return route (< 1ms)
  return new Route(segments);
  
  // Total: < 10ms ✅
}
```

**Что НЕ делается:**
- ❌ Загрузка датасета
- ❌ Генерация виртуальных узлов
- ❌ Построение графа
- ❌ Обновление edgesMap

---

## 📈 Метрики производительности

### **До оптимизации:**

| Операция | Время |
|----------|-------|
| Backend startup | 5-10 seconds |
| Route search | 200-500ms |
| Graph build | Every request |

### **После оптимизации:**

| Операция | Время | Улучшение |
|----------|-------|-----------|
| Backend startup | < 300ms | **30x faster** |
| Route search | < 5ms | **100x faster** |
| Graph build | Once by Worker 3 | **∞ faster** |

---

## 🎯 Следующие шаги

1. **Изучить документы:**
   - Прочитать [Optimized Backend Architecture](./optimized-backend-architecture.md)
   - Понять [Redis Graph Structure](./redis-graph-structure.md)
   - Изучить [Background Workers Architecture](./background-workers-architecture.md)

2. **Реализация:**
   - Следовать [Implementation Plan](../OPTIMIZATION_IMPLEMENTATION_PLAN.md)
   - Реализовать PostgreSQL repositories
   - Реализовать Redis graph repository
   - Реализовать background workers

3. **Тестирование:**
   - Unit tests для repositories
   - Integration tests для workers
   - E2E tests для full pipeline

4. **Deployment:**
   - Run migration
   - Deploy new code
   - Run workers
   - Verify performance

---

## 💡 Ключевые преимущества

1. **Скорость**
   - Startup: 30x faster
   - Route search: 100x faster
   - Стабильная производительность

2. **Надежность**
   - Данные в PostgreSQL (persistent)
   - Граф в Redis (fast)
   - Бэкапы в MinIO (recovery)

3. **Масштабируемость**
   - Backend может масштабироваться горизонтально
   - Воркеры запускаются независимо
   - Готово к production нагрузке

4. **Maintainability**
   - Clean Architecture
   - Хорошо документировано
   - Легко тестировать

---

## 📚 Дополнительная документация

- [Database ERD](./database-erd.md) - Схема БД
- [System Architecture](./system-architecture.md) - Общая архитектура
- [Backend Architecture](./backend-architecture.md) - Backend детали
- [API Contracts](./api-contracts.md) - API спецификации

---

## 🎉 Результат

**Создана полная архитектура оптимизированного backend:**

- ✅ PostgreSQL для постоянного хранения
- ✅ Redis для быстрого графа
- ✅ MinIO для бэкапов
- ✅ 3 фоновых воркера для обработки
- ✅ Fast readonly API (< 10ms)
- ✅ Fast startup (< 300ms)
- ✅ Scalable & maintainable

**Готово к реализации!** 🚀

