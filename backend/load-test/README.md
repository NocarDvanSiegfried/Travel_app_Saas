# Load Testing

Руководство по нагрузочному тестированию Travel App Backend.

## Staging-подобное окружение

В контексте этого проекта **staging-подобное окружение** определяется как:

- **Docker Compose окружение** с полным стеком сервисов (PostgreSQL, Redis, MinIO, Backend)
- **Production-подобные настройки**: 
  - `NODE_ENV=production` или `NODE_ENV=staging`
  - Production-подобные значения для connection pooling
  - Реальные ограничения rate limiting
  - Полный middleware stack (security headers, logging, error handling)
- **Тестовая БД и Redis** с реальными данными (минимальный набор для тестирования)
- **Backend запущен на порту 5000** (или другом, указанном в переменных окружения)

**Альтернатива:** Локальный запуск backend с подключением к тестовой БД и Redis, максимально приближенный к production конфигурации.

## Инструменты

### Artillery

**Установка:**
```bash
npm install -g artillery
```

**Запуск:**
```bash
cd backend/load-test
artillery run artillery.yml
```

**Результаты:**
```bash
artillery run --output report.json artillery.yml
artillery report report.json
```

### k6

**Установка:**
- Windows: `choco install k6`
- macOS: `brew install k6`
- Linux: https://k6.io/docs/getting-started/installation/

**Запуск:**
```bash
cd backend/load-test
k6 run k6-script.js
```

**С настройками:**
```bash
BASE_URL=http://localhost:5000 k6 run k6-script.js
```

## Сценарии тестирования

### 1. Health Checks (10% трафика)
- `/health`
- `/health/live`
- `/health/ready`

### 2. Cities API (20% трафика)
- `/api/v1/cities?page=1&limit=10`

### 3. Route Search (50% трафика)
- `/api/v1/routes/search?from={city}&to={city}`

### 4. Route Build (15% трафика)
- `/api/v1/routes/build?from={city}&to={city}`

### 5. Metrics (5% трафика)
- `/api/v1/metrics`

## Метрики для мониторинга

### Производительность
- **Response Time (p50, p95, p99)** - время ответа
- **Throughput** - количество запросов в секунду
- **Error Rate** - процент ошибок

### Ресурсы
- **CPU Usage** - использование процессора
- **Memory Usage** - использование памяти
- **Database Connections** - количество соединений с БД
- **Redis Connections** - количество соединений с Redis

### Целевые показатели
- **p95 Response Time < 2s** для большинства эндпоинтов
- **Error Rate < 1%** для успешных запросов
- **Throughput > 50 req/s** для основного эндпоинта поиска маршрутов

## Интерпретация результатов

### Хорошие результаты
- p95 < 2s
- Error rate < 1%
- CPU < 80%
- Memory стабильна
- DB pool не переполнен

### Проблемы
- **Высокий response time** - оптимизировать запросы, добавить кеширование
- **Высокий error rate** - проверить логи, увеличить ресурсы
- **Переполнение DB pool** - увеличить `DB_POOL_MAX`
- **Высокий CPU** - оптимизировать код, масштабировать горизонтально

## План запуска нагрузочного теста

### Шаг 1: Подготовка окружения

1. **Запустить все сервисы через Docker Compose:**
   ```bash
   # Из корня проекта
   docker compose up -d postgres redis minio backend
   ```

2. **Проверить доступность сервисов:**
   ```bash
   # Проверить health check backend
   curl http://localhost:5000/health
   
   # Проверить health check через API
   curl http://localhost:5000/api/v1/health/ready
   ```

3. **Убедиться, что БД инициализирована:**
   - Backend автоматически запустит миграции при старте
   - Проверить логи backend: `docker compose logs backend`

4. **Проверить метрики:**
   ```bash
   curl http://localhost:5000/api/v1/metrics
   ```

### Шаг 2: Подготовка данных (опционально)

Для более реалистичного тестирования можно:
- Запустить background worker для синхронизации данных из OData (если доступен)
- Или использовать mock данные, если они настроены

**Минимальные требования:** Backend должен отвечать на health checks и базовые запросы.

### Шаг 3: Запуск нагрузочного теста

#### Вариант A: Artillery

1. **Установить Artillery (если не установлен):**
   ```bash
   npm install -g artillery
   ```

2. **Запустить тест:**
   ```bash
   cd backend/load-test
   artillery run artillery.yml
   ```

3. **Сохранить отчет:**
   ```bash
   artillery run --output report.json artillery.yml
   artillery report report.json
   ```

#### Вариант B: k6

1. **Установить k6 (если не установлен):**
   - Windows: `choco install k6`
   - macOS: `brew install k6`
   - Linux: https://k6.io/docs/getting-started/installation/

2. **Запустить тест:**
   ```bash
   cd backend/load-test
   k6 run k6-script.js
   ```

3. **С настройками:**
   ```bash
   BASE_URL=http://localhost:5000 k6 run k6-script.js
   ```

### Шаг 4: Мониторинг во время теста

**Метрики для отслеживания:**

1. **Health endpoints:**
   ```bash
   watch -n 1 'curl -s http://localhost:5000/health | jq'
   ```

2. **Prometheus метрики:**
   ```bash
   watch -n 1 'curl -s http://localhost:5000/api/v1/metrics | grep http_request_duration_seconds'
   ```

3. **Логи backend:**
   ```bash
   docker compose logs -f backend
   ```

4. **Использование ресурсов:**
   ```bash
   docker stats travel-app-backend travel-app-postgres travel-app-redis
   ```

5. **Метрики БД (если доступен psql):**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   SELECT * FROM pg_stat_database WHERE datname = 'travel_app';
   ```

### Шаг 5: Анализ результатов

**Ключевые показатели для фиксации:**

1. **Response Time:**
   - p50 (медиана)
   - p95 (95-й процентиль)
   - p99 (99-й процентиль)

2. **Throughput:**
   - Запросов в секунду (req/s)
   - Пиковая нагрузка

3. **Error Rate:**
   - Процент ошибок (4xx, 5xx)
   - Процент rate limit (429)
   - Процент таймаутов

4. **Ресурсы:**
   - Пиковое использование CPU
   - Пиковое использование памяти
   - Количество активных соединений с БД
   - Статус Redis

5. **Узкие места:**
   - Самые медленные эндпоинты
   - Проблемы с пулом соединений
   - Проблемы с Redis

### Шаг 6: Фиксация результатов

Создать файл `backend/load-test/RESULTS.md` с результатами:

```markdown
# Результаты нагрузочного тестирования

**Дата:** YYYY-MM-DD
**Окружение:** staging (docker-compose)
**Инструмент:** Artillery / k6
**Длительность:** X минут

## Метрики

### Response Time
- p50: X ms
- p95: X ms
- p99: X ms

### Throughput
- Средний: X req/s
- Пиковый: X req/s

### Error Rate
- Общий: X%
- 4xx: X%
- 5xx: X%
- 429 (Rate Limit): X%

### Ресурсы
- CPU: X%
- Memory: X MB
- DB Connections: X / X (active / max)
- Redis: connected

## Узкие места

1. [Описание проблемы]
2. [Описание проблемы]

## Рекомендации

1. [Рекомендация]
2. [Рекомендация]
```

## Рекомендации

1. **Запускайте тесты в staging окружении**, максимально похожем на продакшен
2. **Мониторьте метрики** во время тестирования
3. **Начинайте с малой нагрузки** и постепенно увеличивайте
4. **Тестируйте разные сценарии** (нормальная нагрузка, пиковая нагрузка, спайки)
5. **Документируйте результаты** для сравнения после оптимизаций
6. **Запускайте тесты регулярно** перед каждым релизом

