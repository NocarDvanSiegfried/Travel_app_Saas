# Docker Setup Guide

## Обзор исправлений

Все проблемы с Docker и Docker Compose были исправлены. Проект готов к запуску в контейнерах.

## Исправленные проблемы

### 1. Backend Dockerfile
- ✅ Добавлена правильная структура multi-stage build (deps → deps-dev → builder → development/production)
- ✅ Добавлено копирование `tsconfig.json` во все необходимые stages
- ✅ Добавлена поддержка path aliases через `tsconfig-paths`
- ✅ Исправлена команда запуска для development (nodemon + ts-node с tsconfig-paths)
- ✅ Исправлена команда запуска для production (node с tsconfig-paths)
- ✅ Добавлено копирование `data` папки для mock-данных

### 2. Frontend Dockerfile
- ✅ Оптимизирована структура multi-stage build
- ✅ Исправлена настройка `next.config.js` для standalone output
- ✅ Исправлена команда запуска для production
- ✅ Добавлена правильная обработка standalone build

### 3. Docker Compose
- ✅ Исправлены healthcheck команды (используют wget, который установлен в alpine)
- ✅ Исправлены volume маппинги для hot reload
- ✅ Добавлены все необходимые environment variables
- ✅ Исправлена настройка CORS для работы с Docker сетью
- ✅ Добавлены правильные зависимости между сервисами
- ✅ Исправлен NEXT_PUBLIC_API_URL для работы в браузере

### 4. TypeScript Path Aliases
- ✅ Добавлен `tsconfig-paths` в dependencies и devDependencies
- ✅ Обновлены npm scripts для использования tsconfig-paths
- ✅ Добавлена конфигурация ts-node в tsconfig.json
- ✅ Исправлены пути в runtime через tsconfig-paths/register

### 5. Дополнительные улучшения
- ✅ Созданы `.dockerignore` файлы для оптимизации сборки
- ✅ Добавлена поддержка множественных CORS origins
- ✅ Исправлены пути к mock-данным в сервисах

## Команды для запуска

### Разработка (Development)

```bash
# Сборка всех контейнеров
docker compose build --no-cache

# Запуск всех сервисов
docker compose up

# Запуск в фоновом режиме
docker compose up -d

# Просмотр логов
docker compose logs -f

# Остановка всех сервисов
docker compose down

# Остановка с удалением volumes
docker compose down -v
```

### Production

```bash
# Сборка production образов
docker compose -f docker-compose.yml build --target production backend
docker compose -f docker-compose.yml build --target runner frontend

# Запуск production (требует изменения target в docker-compose.yml)
# Или используйте отдельный docker-compose.prod.yml
```

## Структура сервисов

### Backend
- **Порт**: 5000
- **Healthcheck**: `http://localhost:5000/api/v1/health`
- **Зависимости**: PostgreSQL, MinIO
- **Volumes**: 
  - `./backend/src:/app/src` (hot reload)
  - `./backend/data:/app/data` (mock data)
  - `/app/node_modules` (изолированные зависимости)

### Frontend
- **Порт**: 3000
- **Healthcheck**: `http://localhost:3000`
- **Зависимости**: Backend
- **Volumes**:
  - `./frontend/src:/app/src` (hot reload)
  - `/app/node_modules` (изолированные зависимости)
  - `/app/.next` (кэш Next.js)

### PostgreSQL
- **Порт**: 5432
- **База данных**: `travel_app`
- **Пользователь**: `travel_user`
- **Пароль**: `travel_password` (измените в production!)

### MinIO
- **API Порт**: 9000
- **Console Порт**: 9001
- **Access Key**: `minioadmin` (измените в production!)
- **Secret Key**: `minioadmin` (измените в production!)

## Переменные окружения

Создайте `.env` файл в корне проекта (опционально):

```env
# Database
POSTGRES_DB=travel_app
POSTGRES_USER=travel_user
POSTGRES_PASSWORD=travel_password
POSTGRES_PORT=5432

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

# Backend
BACKEND_PORT=5000
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000,http://frontend:3000

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Проверка работоспособности

После запуска проверьте:

1. **Backend Health**: `http://localhost:5000/api/v1/health`
2. **Frontend**: `http://localhost:3000`
3. **MinIO Console**: `http://localhost:9001` (minioadmin/minioadmin)
4. **PostgreSQL**: `psql -h localhost -U travel_user -d travel_app`

## Troubleshooting

### Backend не запускается
- Проверьте логи: `docker compose logs backend`
- Убедитесь, что PostgreSQL и MinIO запущены
- Проверьте переменные окружения

### Frontend не подключается к Backend
- Убедитесь, что `NEXT_PUBLIC_API_URL` указывает на правильный адрес
- Проверьте CORS настройки в backend
- Проверьте, что backend доступен: `curl http://localhost:5000/api/v1/health`

### Path aliases не работают
- Убедитесь, что `tsconfig-paths` установлен
- Проверьте, что `tsconfig.json` скопирован в контейнер
- Проверьте команду запуска (должна включать `-r tsconfig-paths/register`)

### Hot reload не работает
- Убедитесь, что volumes правильно смонтированы
- Проверьте, что nodemon установлен и запущен
- Проверьте логи на наличие ошибок

## Production Deployment

Для production:

1. Измените все секретные ключи
2. Используйте production targets в Dockerfile
3. Настройте правильные CORS origins
4. Используйте внешнюю базу данных (не в Docker)
5. Настройте SSL/TLS
6. Используйте reverse proxy (nginx/traefik)
7. Настройте мониторинг и логирование

