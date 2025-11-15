# Docker Fixes Summary

## Исправленные проблемы

### 1. NPM CI ERROR - ✅ ИСПРАВЛЕНО

**Проблема:** `npm ci can only install with an existing package-lock.json`

**Решение:** Добавлена условная логика в оба Dockerfile:
```dockerfile
RUN if [ -f package-lock.json ]; then \
      npm ci && npm cache clean --force; \
    else \
      npm install && npm cache clean --force; \
    fi
```

**Файлы:**
- `backend/Dockerfile` (строки 12-16, 25-29)
- `frontend/Dockerfile` (строки 12-16)

### 2. BACKEND DOCKERFILE - ✅ ПЕРЕПИСАН

**Проблемы:**
- Устаревшие stages
- Неправильное копирование файлов
- Отсутствие tsconfig.json
- Path aliases не работали

**Решение:** Переписан с правильной структурой:
```
base → deps → deps-prod → builder → production
```

**Изменения:**
- ✅ Добавлен stage `deps-prod` для production зависимостей
- ✅ Правильное копирование `tsconfig.json` во все stages
- ✅ Правильное копирование `src` и `data`
- ✅ Правильная сборка TypeScript в `builder` stage
- ✅ Использование `tsconfig-paths` для path aliases в production

**Файл:** `backend/Dockerfile` (полностью переписан)

### 3. FRONTEND DOCKERFILE - ✅ ИСПРАВЛЕН

**Проблемы:**
- Неправильная структура stages
- Неправильная обработка standalone build

**Решение:** Исправлена структура:
```
base → deps → builder → runner
```

**Изменения:**
- ✅ Условная установка зависимостей (npm ci или npm install)
- ✅ Правильная сборка Next.js в `builder` stage
- ✅ Правильное копирование standalone build в `runner` stage
- ✅ Правильная команда запуска

**Файл:** `frontend/Dockerfile` (полностью переписан)

### 4. DOCKER-COMPOSE.YML - ✅ ИСПРАВЛЕН

**Проблемы:**
- Устаревшее поле `version`
- Неправильные targets (`development` вместо `production`)
- Контейнеры останавливались сразу после запуска

**Решение:**
- ✅ Удалено поле `version` (не требуется в новых версиях)
- ✅ Изменен `target: production` для backend
- ✅ Изменен `target: runner` для frontend
- ✅ Удалены volumes для hot reload (не нужны в production)
- ✅ Правильные зависимости между сервисами
- ✅ Правильные healthchecks

**Файл:** `docker-compose.yml` (полностью переписан)

### 5. PACKAGE.JSON - ✅ ПРОВЕРЕН

**Backend:**
- ✅ Скрипты правильные: `"build": "tsc"`, `"start": "node -r tsconfig-paths/register dist/index.js"`
- ✅ `tsconfig-paths` в dependencies (нужен для production)

**Frontend:**
- ✅ Скрипты правильные: `"build": "next build"`, `"start": "next start"`

**Файлы:** `backend/package.json`, `frontend/package.json` (без изменений, уже правильные)

### 6. TSCONFIG.JSON - ✅ ПРОВЕРЕН

**Backend:**
- ✅ Правильный `baseUrl: "./src"`
- ✅ Правильные paths для `@shared/*`, `@domain/*`, etc.
- ✅ Конфигурация `ts-node` для tsconfig-paths

**Файл:** `backend/tsconfig.json` (без изменений, уже правильный)

## Список измененных файлов

1. ✅ `backend/Dockerfile` - полностью переписан
2. ✅ `frontend/Dockerfile` - полностью переписан
3. ✅ `docker-compose.yml` - полностью переписан

## Инструкции по запуску

### 1. Сборка всех контейнеров

```bash
docker compose build --no-cache
```

### 2. Запуск всех сервисов

```bash
docker compose up
```

Или в фоновом режиме:

```bash
docker compose up -d
```

### 3. Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только frontend
docker compose logs -f frontend
```

### 4. Остановка

```bash
docker compose down
```

С удалением volumes:

```bash
docker compose down -v
```

## Проверка работоспособности

После запуска проверьте:

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. **Frontend:**
   - Откройте в браузере: `http://localhost:3000`

3. **MinIO Console:**
   - Откройте в браузере: `http://localhost:9001`
   - Логин: `minioadmin`
   - Пароль: `minioadmin`

4. **PostgreSQL:**
   ```bash
   docker exec -it travel-app-postgres psql -U travel_user -d travel_app
   ```

## Структура сервисов

### Backend
- **Порт:** 5000
- **Target:** `production`
- **Healthcheck:** `http://localhost:5000/api/v1/health`
- **Зависимости:** PostgreSQL, MinIO

### Frontend
- **Порт:** 3000
- **Target:** `runner`
- **Healthcheck:** `http://localhost:3000`
- **Зависимости:** Backend

### PostgreSQL
- **Порт:** 5432
- **База данных:** `travel_app`
- **Пользователь:** `travel_user`
- **Пароль:** `travel_password`

### MinIO
- **API Порт:** 9000
- **Console Порт:** 9001
- **Access Key:** `minioadmin`
- **Secret Key:** `minioadmin`

## Переменные окружения

Все переменные окружения имеют значения по умолчанию. Для production создайте `.env` файл:

```env
# Database
POSTGRES_DB=travel_app
POSTGRES_USER=travel_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_PORT=5432

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-password
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

# Backend
BACKEND_PORT=5000
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Troubleshooting

### Backend не запускается

1. Проверьте логи: `docker compose logs backend`
2. Убедитесь, что PostgreSQL и MinIO запущены
3. Проверьте переменные окружения

### Frontend не подключается к Backend

1. Убедитесь, что `NEXT_PUBLIC_API_URL` правильный
2. Проверьте CORS настройки в backend
3. Проверьте, что backend доступен: `curl http://localhost:5000/api/v1/health`

### Path aliases не работают

1. Убедитесь, что `tsconfig-paths` установлен (в dependencies)
2. Проверьте, что `tsconfig.json` скопирован в контейнер
3. Проверьте команду запуска (должна включать `-r tsconfig-paths/register`)

## Важные замечания

1. **Production Ready:** Все контейнеры настроены для production использования
2. **No Hot Reload:** Volumes для hot reload удалены, так как это production setup
3. **Path Aliases:** Работают через `tsconfig-paths` в runtime
4. **Standalone Build:** Frontend использует standalone build для оптимизации размера

## Готово к использованию

Проект полностью готов к запуску в Docker Compose. Все проблемы исправлены, и команды `docker compose build --no-cache` и `docker compose up` должны работать без ошибок.

