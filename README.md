# Travel App SaaS (MVP)

Travel App SaaS - система для планирования и покупки билетов на транспорт с интеллектуальным помощником-мамонтёнком.

## Архитектура

Проект построен на принципах:
- **Clean Architecture** для Backend
- **Feature-Based Architecture** для Frontend (Next.js)
- **Docker Compose** для оркестрации сервисов

## Структура проекта

```
.
├── backend/          # Backend API (Node.js/TypeScript)
├── frontend/         # Frontend (Next.js)
├── architecture/     # Архитектурная документация
├── docker-compose.yml
└── .env.example
```

## Быстрый старт

### 1. Клонирование и настройка

```bash
# Скопируйте .env.example в .env
cp .env.example .env

# Отредактируйте .env при необходимости
```

### 2. Запуск всех сервисов

```bash
docker compose up --build
```

Это запустит:
- **Frontend** на http://localhost:3000
- **Backend API** на http://localhost:5000
- **PostgreSQL** на localhost:5432
- **MinIO** на http://localhost:9000 (API) и http://localhost:9001 (Console)

### 3. Проверка работоспособности

- Frontend: http://localhost:3000
- Backend Health: http://localhost:5000/health
- Backend API: http://localhost:5000/api/v1/
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

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

## Документация

Полная архитектурная документация находится в папке `architecture/`:
- [README.md](./architecture/README.md) - обзор архитектуры
- [API Контракты](./architecture/api-contracts.md)
- [Backend Architecture](./architecture/backend-architecture.md)
- [Frontend Architecture](./architecture/frontend-architecture.md)

## Технологический стек

- **Frontend:** Next.js 14, React 18, TypeScript
- **Backend:** Node.js 18, Express, TypeScript
- **Database:** PostgreSQL 15
- **Storage:** MinIO (S3-compatible)
- **Containerization:** Docker, Docker Compose
