# Quick Start Guide

## Предварительные требования

- Docker Desktop установлен и запущен
- Docker Compose установлен

## Запуск проекта

### 1. Настройка переменных окружения

```bash
# Скопируйте .env.example в .env
cp .env.example .env

# При необходимости отредактируйте .env
```

### 2. Запуск всех сервисов

```bash
docker compose up --build
```

Эта команда:
- Соберет Docker образы для backend и frontend
- Запустит PostgreSQL
- Запустит MinIO
- Запустит Backend API
- Запустит Frontend

### 3. Проверка работоспособности

После запуска проверьте:

- **Frontend:** http://localhost:3000
- **Backend Health:** http://localhost:5000/health
- **Backend API:** http://localhost:5000/api/v1/
- **MinIO Console:** http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`

### 4. Остановка сервисов

```bash
docker compose down
```

### 5. Остановка с удалением данных

```bash
docker compose down -v
```

## Структура проекта

```
.
├── backend/          # Backend API (Node.js/TypeScript, Clean Architecture)
├── frontend/         # Frontend (Next.js 14, App Router)
├── architecture/     # Архитектурная документация
├── docker-compose.yml
└── .env.example
```

## Разработка

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

### Проблемы с портами

Если порты заняты, измените их в `.env`:
- `FRONTEND_PORT=3001`
- `BACKEND_PORT=5001`
- `POSTGRES_PORT=5433`

### Проблемы с базой данных

Если PostgreSQL не запускается:
```bash
docker compose down -v
docker compose up --build
```

### Проблемы с MinIO

Если MinIO не запускается, проверьте логи:
```bash
docker compose logs minio
```

## Дополнительная информация

См. [README.md](./README.md) и [architecture/README.md](./architecture/README.md) для подробной документации.



