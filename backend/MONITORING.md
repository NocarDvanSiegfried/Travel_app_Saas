# Monitoring Guide

Руководство по мониторингу Travel App Backend в продакшене.

## Содержание

- [Метрики Prometheus](#метрики-prometheus)
- [Health Checks](#health-checks)
- [Логирование](#логирование)
- [Алерты](#алерты)
- [Дашборды](#дашборды)

## Метрики Prometheus

### Endpoint

Метрики доступны по адресу:
```
GET /api/v1/metrics
```

### HTTP Метрики

#### `http_requests_total`
Общее количество HTTP запросов.

**Labels:**
- `method` - HTTP метод (GET, POST, etc.)
- `path` - путь запроса

**Пример:**
```
http_requests_total{method="GET",path="/api/v1/routes/search"} 1234
```

#### `http_request_duration_seconds`
Длительность HTTP запросов в секундах.

**Labels:**
- `method` - HTTP метод
- `path` - путь запроса
- `status` - HTTP статус код

**Buckets:** 0.05, 0.1, 0.5, 1, 2, 5, 10

**Пример:**
```
http_request_duration_seconds_bucket{method="GET",path="/api/v1/routes/search",status="200",le="0.5"} 1000
```

#### `http_responses_total`
Общее количество HTTP ответов.

**Labels:**
- `method` - HTTP метод
- `path` - путь запроса
- `status` - HTTP статус код

**Пример:**
```
http_responses_total{method="GET",path="/api/v1/routes/search",status="200"} 1200
http_responses_total{method="GET",path="/api/v1/routes/search",status="500"} 5
```

### Database Метрики

#### `db_query_duration_seconds`
Длительность запросов к БД в секундах.

**Labels:**
- `query_name` - имя запроса
- `status` - статус (success, error)

**Buckets:** 0.01, 0.05, 0.1, 0.5, 1, 2

#### `db_pool_total_connections`
Общее количество соединений в пуле PostgreSQL.

#### `db_pool_idle_connections`
Количество свободных соединений в пуле.

#### `db_pool_waiting_clients`
Количество клиентов, ожидающих соединение.

**Алерт:** Если `db_pool_waiting_clients > 5`, возможно, нужно увеличить `DB_POOL_MAX`.

### Redis Метрики

#### `redis_command_duration_seconds`
Длительность команд Redis в секундах.

**Labels:**
- `command` - команда Redis (GET, SET, etc.)
- `status` - статус (success, error)

**Buckets:** 0.001, 0.005, 0.01, 0.05, 0.1, 0.5

#### `redis_connection_status`
Статус подключения к Redis (1 = connected, 0 = disconnected).

**Алерт:** Если `redis_connection_status == 0`, Redis недоступен.

### Application Метрики

#### `graph_build_duration_seconds`
Длительность построения графа маршрутов в секундах.

**Labels:**
- `status` - статус (success, error)

**Buckets:** 1, 5, 10, 30, 60, 120, 300

#### `graph_nodes_total`
Общее количество узлов в графе маршрутов.

#### `graph_edges_total`
Общее количество рёбер в графе маршрутов.

#### `worker_last_execution_timestamp_seconds`
Временная метка последнего успешного выполнения воркера.

**Labels:**
- `worker_name` - имя воркера (graph-builder, odata-sync, etc.)

#### `worker_execution_duration_seconds`
Длительность выполнения воркера в секундах.

**Labels:**
- `worker_name` - имя воркера
- `status` - статус (success, error)

#### `worker_errors_total`
Общее количество ошибок воркеров.

**Labels:**
- `worker_name` - имя воркера
- `error_type` - тип ошибки

## Health Checks

### Endpoints

#### `/health/live`
Liveness probe для Kubernetes/Docker.

**Response:**
```json
{
  "status": "UP",
  "timestamp": "2024-12-19T12:00:00.000Z",
  "uptime": 3600
}
```

**Status Code:** 200 (всегда, если сервер запущен)

#### `/health/ready`
Readiness probe для Kubernetes/Docker.

**Response:**
```json
{
  "status": "READY",
  "timestamp": "2024-12-19T12:00:00.000Z",
  "details": {
    "postgresConnected": true,
    "redisConnected": true,
    "graphAvailable": true
  }
}
```

**Status Code:**
- 200 - готов к обработке запросов
- 503 - не готов (критичные зависимости недоступны)

#### `/health`
Детальная проверка здоровья всех компонентов.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-12-19T12:00:00.000Z",
  "uptime": 3600,
  "startup": {
    "totalDurationMs": 5000,
    "postgresConnected": true,
    "redisConnected": true,
    "graphAvailable": true,
    "graphVersion": "v1.0.0"
  },
  "dependencies": {
    "postgres": {
      "connected": true,
      "pool": {
        "total": 10,
        "idle": 5,
        "waiting": 0
      }
    },
    "redis": {
      "connected": true,
      "status": "ready"
    },
    "graph": {
      "available": true,
      "version": "v1.0.0",
      "nodes": 1000,
      "edges": 5000,
      "lastBuilt": "2024-12-19T10:00:00.000Z"
    }
  }
}
```

**Status Code:**
- 200 - все компоненты работают нормально
- 503 - деградированный режим (некоторые компоненты недоступны)

## Логирование

### Уровни логирования

Установите уровень логирования через переменную окружения:
```bash
LOG_LEVEL=debug|info|warn|error
```

### Формат логов

Логи выводятся в JSON формате для удобного парсинга:

```json
{
  "timestamp": "2024-12-19T12:00:00.000Z",
  "level": "info",
  "message": "Request completed",
  "module": "RequestLoggerMiddleware",
  "context": {
    "method": "GET",
    "path": "/api/v1/routes/search",
    "statusCode": 200,
    "duration": "45ms",
    "ip": "127.0.0.1"
  }
}
```

### Включение логирования запросов

```bash
LOG_REQUESTS=true
```

### Структурированные логи

Все логи содержат:
- `timestamp` - временная метка
- `level` - уровень логирования
- `message` - сообщение
- `module` - модуль, который создал лог
- `context` - дополнительный контекст (опционально)

## Алерты

### Рекомендуемые алерты

#### 1. Высокий уровень ошибок HTTP

```yaml
alert: HighHTTPErrorRate
expr: rate(http_responses_total{status=~"5.."}[5m]) > 0.05
for: 5m
labels:
  severity: critical
annotations:
  summary: "Высокий уровень ошибок HTTP (5xx)"
  description: "Более 5% запросов возвращают ошибки 5xx"
```

#### 2. Медленные запросы

```yaml
alert: SlowHTTPRequests
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
labels:
  severity: warning
annotations:
  summary: "Медленные HTTP запросы"
  description: "95-й перцентиль длительности запросов превышает 2 секунды"
```

#### 3. Недоступность БД

```yaml
alert: DatabaseUnavailable
expr: db_pool_total_connections == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "База данных недоступна"
  description: "Нет активных соединений с PostgreSQL"
```

#### 4. Переполнение пула БД

```yaml
alert: DatabasePoolExhausted
expr: db_pool_waiting_clients > 10
for: 2m
labels:
  severity: warning
annotations:
  summary: "Переполнение пула соединений БД"
  description: "Более 10 клиентов ожидают соединение с БД"
```

#### 5. Недоступность Redis

```yaml
alert: RedisUnavailable
expr: redis_connection_status == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "Redis недоступен"
  description: "Потеряно соединение с Redis"
```

#### 6. Ошибки воркеров

```yaml
alert: WorkerErrors
expr: rate(worker_errors_total[5m]) > 0.1
for: 5m
labels:
  severity: warning
annotations:
  summary: "Ошибки воркеров"
  description: "Более 0.1 ошибок воркеров в секунду"
```

#### 7. Граф не обновляется

```yaml
alert: GraphNotUpdated
expr: (time() - worker_last_execution_timestamp_seconds{worker_name="graph-builder"}) > 3600
for: 10m
labels:
  severity: warning
annotations:
  summary: "Граф маршрутов не обновляется"
  description: "Граф не обновлялся более 1 часа"
```

## Дашборды

### Рекомендуемые дашборды Grafana

#### 1. HTTP Metrics Dashboard

**Панели:**
- Request Rate (запросов/сек)
- Request Duration (p50, p95, p99)
- Error Rate (4xx, 5xx)
- Top Endpoints by Request Count
- Top Endpoints by Duration

#### 2. Database Dashboard

**Панели:**
- Connection Pool Usage
- Query Duration (p50, p95, p99)
- Query Rate
- Waiting Clients
- Database Size

#### 3. Redis Dashboard

**Панели:**
- Connection Status
- Command Duration
- Command Rate
- Memory Usage
- Hit Rate

#### 4. Application Dashboard

**Панели:**
- Graph Statistics (nodes, edges)
- Graph Build Duration
- Worker Execution Status
- Worker Errors
- Uptime

### Пример запроса PromQL

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_responses_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database pool utilization
db_pool_total_connections / db_pool_max_connections * 100
```

## Интеграция с мониторингом

### Prometheus

Добавьте в `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'travel-app-backend'
    scrape_interval: 15s
    metrics_path: '/api/v1/metrics'
    static_configs:
      - targets: ['localhost:5000']
```

### Grafana

1. Создайте Prometheus data source
2. Импортируйте дашборды (см. выше)
3. Настройте алерты (см. раздел "Алерты")

### ELK Stack (для логов)

Настройте Filebeat для отправки логов в Elasticsearch:

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/travel-app-backend/*.log
    json.keys_under_root: true
    json.add_error_key: true
```

## Best Practices

1. **Мониторьте ключевые метрики** каждые 15 секунд
2. **Настройте алерты** для критичных метрик
3. **Храните логи** минимум 30 дней
4. **Создайте дашборды** для быстрого обзора состояния системы
5. **Регулярно проверяйте** метрики производительности
6. **Настройте уведомления** для критичных алертов (email, Slack, PagerDuty)

