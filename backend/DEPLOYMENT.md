# Deployment Guide

Детальное руководство по развертыванию Travel App Backend в продакшене.

## Содержание

- [Требования к окружению](#требования-к-окружению)
- [Переменные окружения](#переменные-окружения)
- [Процесс деплоя](#процесс-деплоя)
- [Проверка работоспособности](#проверка-работоспособности)
- [Откат изменений](#откат-изменений)

## Требования к окружению

### Системные требования

- **Node.js**: версия 20.x или выше
- **PostgreSQL**: версия 15.x или выше
- **Redis**: версия 7.x или выше
- **Docker**: версия 20.x или выше (опционально, для контейнеризации)
- **Минимум 2GB RAM** для работы приложения
- **Минимум 10GB свободного места** на диске для БД и логов

### Сетевые требования

- Порт **5000** должен быть доступен для входящих HTTP-запросов
- Доступ к **PostgreSQL** (порт 5432)
- Доступ к **Redis** (порт 6379)
- Доступ к **OData API** (если используется внешний источник данных)

## Переменные окружения

### Обязательные переменные

```bash
# Node.js
NODE_ENV=production
PORT=5000
API_VERSION=v1

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travel_app
DB_USER=travel_user
DB_PASSWORD=<secure-password>
DB_POOL_MAX=50
DB_POOL_MIN=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>
REDIS_DB=0

# JWT
JWT_SECRET=<secure-random-secret>
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Опциональные переменные

```bash
# Логирование
LOG_LEVEL=info
LOG_REQUESTS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_ROUTE_SEARCH_MAX=20
RATE_LIMIT_ROUTE_RISK_MAX=10

# Database Pool
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Redis TTL
REDIS_TTL_DEFAULT=3600
REDIS_TTL_ROUTES=1800
REDIS_TTL_HOTELS=1800
REDIS_TTL_TRANSPORT=1800
REDIS_TTL_FAVORITES=3600
REDIS_TTL_SESSION=86400

# OData API (если используется)
ODATA_BASE_URL=https://api.example.com
ODATA_USERNAME=username
ODATA_PASSWORD=password
ODATA_TIMEOUT=30000
```

### Создание .env файла

Создайте файл `.env` в корне проекта `backend/`:

```bash
cp .env.example .env
# Отредактируйте .env и установите все необходимые значения
```

**⚠️ ВАЖНО:** Никогда не коммитьте `.env` файл в репозиторий!

## Процесс деплоя

### Вариант 1: Docker Compose (рекомендуется)

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd Travel_app_Saas
   ```

2. **Настройте переменные окружения:**
   ```bash
   cp .env.example .env
   # Отредактируйте .env
   ```

3. **Соберите и запустите контейнеры:**
   ```bash
   docker compose up -d --build
   ```

4. **Проверьте логи:**
   ```bash
   docker compose logs -f backend
   ```

5. **Проверьте работоспособность:**
   ```bash
   curl http://localhost:5000/health
   ```

### Вариант 2: Ручной деплой

1. **Установите зависимости:**
   ```bash
   cd backend
   npm ci --production
   ```

2. **Соберите проект:**
   ```bash
   npm run build
   ```

3. **Запустите миграции БД:**
   ```bash
   # Миграции выполняются автоматически при старте приложения
   # Или вручную, если нужно:
   npm run migrate
   ```

4. **Запустите приложение:**
   ```bash
   npm start
   ```

5. **Используйте process manager (PM2, systemd, etc.):**
   ```bash
   # PM2
   pm2 start dist/index.js --name travel-app-backend
   pm2 save
   pm2 startup
   ```

### Вариант 3: Kubernetes

1. **Создайте ConfigMap и Secret:**
   ```bash
   kubectl create configmap backend-config --from-env-file=.env
   kubectl create secret generic backend-secrets --from-literal=jwt-secret=<secret>
   ```

2. **Примените манифесты:**
   ```bash
   kubectl apply -f k8s/
   ```

3. **Проверьте статус:**
   ```bash
   kubectl get pods
   kubectl logs -f deployment/backend
   ```

## Проверка работоспособности

### 1. Health Checks

```bash
# Liveness probe
curl http://localhost:5000/health/live

# Readiness probe
curl http://localhost:5000/health/ready

# Detailed health check
curl http://localhost:5000/health
```

**Ожидаемый ответ:**
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
      "edges": 5000
    }
  }
}
```

### 2. API Endpoints

```bash
# Получить список городов
curl http://localhost:5000/api/v1/cities?page=1&limit=10

# Поиск маршрутов
curl "http://localhost:5000/api/v1/routes/search?from=Москва&to=Санкт-Петербург"

# Метрики Prometheus
curl http://localhost:5000/api/v1/metrics

# Swagger документация
curl http://localhost:5000/api-docs
```

### 3. Проверка логов

```bash
# Docker
docker compose logs backend | tail -100

# PM2
pm2 logs travel-app-backend

# Systemd
journalctl -u travel-app-backend -f
```

### 4. Проверка метрик

Откройте Prometheus метрики:
```bash
curl http://localhost:5000/api/v1/metrics
```

Проверьте ключевые метрики:
- `http_requests_total` - общее количество запросов
- `http_request_duration_seconds` - длительность запросов
- `db_pool_total_connections` - количество соединений с БД
- `redis_connection_status` - статус подключения к Redis

## Откат изменений

### Docker Compose

```bash
# Остановите текущую версию
docker compose down

# Откатитесь к предыдущей версии
git checkout <previous-commit>
docker compose up -d --build
```

### PM2

```bash
# Откатитесь к предыдущей версии
git checkout <previous-commit>
npm run build
pm2 restart travel-app-backend
```

### Kubernetes

```bash
# Откатите deployment
kubectl rollout undo deployment/backend

# Проверьте историю
kubectl rollout history deployment/backend
```

## Обновление приложения

1. **Создайте резервную копию БД:**
   ```bash
   pg_dump -U travel_user travel_app > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Остановите приложение:**
   ```bash
   docker compose stop backend
   # или
   pm2 stop travel-app-backend
   ```

3. **Обновите код:**
   ```bash
   git pull origin main
   ```

4. **Установите зависимости:**
   ```bash
   npm ci --production
   ```

5. **Соберите проект:**
   ```bash
   npm run build
   ```

6. **Запустите миграции (если есть):**
   ```bash
   npm run migrate
   ```

7. **Запустите приложение:**
   ```bash
   docker compose up -d --build backend
   # или
   pm2 restart travel-app-backend
   ```

8. **Проверьте работоспособность:**
   ```bash
   curl http://localhost:5000/health
   ```

## Безопасность

### Рекомендации

1. **Используйте HTTPS** в продакшене
2. **Установите сильные пароли** для БД и Redis
3. **Ограничьте доступ** к портам БД и Redis только с сервера приложения
4. **Регулярно обновляйте зависимости:**
   ```bash
   npm audit
   npm update
   ```
5. **Используйте секреты** для хранения чувствительных данных (Kubernetes Secrets, AWS Secrets Manager, etc.)
6. **Настройте firewall** для ограничения доступа
7. **Включите rate limiting** для защиты от DDoS
8. **Мониторьте логи** на предмет подозрительной активности

## Troubleshooting

См. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) для решения типичных проблем.

## Мониторинг

См. [MONITORING.md](./MONITORING.md) для настройки мониторинга и алертов.

