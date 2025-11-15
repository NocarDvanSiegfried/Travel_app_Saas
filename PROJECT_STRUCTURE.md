# Структура проекта

## Общая структура

```
Travel_app_Saas/
├── backend/              # Backend API (Clean Architecture)
├── frontend/             # Frontend (Next.js 14)
├── architecture/         # Архитектурная документация
├── docker-compose.yml    # Docker Compose конфигурация
├── .env.example          # Пример переменных окружения
├── .gitignore           # Git ignore правила
└── README.md            # Основная документация
```

## Backend структура

```
backend/
├── src/
│   ├── domain/              # Domain Layer
│   │   ├── entities/         # Сущности (User, Order, Route)
│   │   └── repositories/     # Интерфейсы репозиториев
│   ├── application/          # Application Layer
│   │   └── use-cases/        # Use Cases (Commands/Queries)
│   ├── infrastructure/       # Infrastructure Layer
│   │   ├── database/         # PostgreSQL подключение и миграции
│   │   ├── repositories/     # Реализации репозиториев
│   │   └── storage/          # MinIO клиент
│   ├── presentation/         # Presentation Layer
│   │   ├── controllers/      # Контроллеры
│   │   ├── middleware/       # Middleware
│   │   └── routes/           # Маршруты API
│   └── shared/               # Общие типы и утилиты
├── data/                     # Mock-данные (JSON файлы)
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Frontend структура

```
frontend/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Глобальные стили
│   ├── components/           # React компоненты
│   ├── modules/              # Business modules (feature-based)
│   └── shared/               # Общие утилиты
│       ├── constants/        # Константы (API URLs)
│       ├── types/            # TypeScript типы
│       └── utils/            # Утилиты (API клиент)
├── Dockerfile
├── next.config.js
├── package.json
└── tsconfig.json
```

## Docker сервисы

- **postgres** - PostgreSQL 15
- **minio** - MinIO (S3-compatible storage)
- **backend** - Backend API (Node.js/Express)
- **frontend** - Frontend (Next.js)

## Принципы архитектуры

### Backend (Clean Architecture)
- **Domain Layer** - бизнес-логика, сущности, интерфейсы
- **Application Layer** - use cases, бизнес-правила
- **Infrastructure Layer** - репозитории, внешние сервисы
- **Presentation Layer** - API endpoints, middleware

### Frontend (Feature-Based)
- **App Router** - Next.js 14 App Router
- **Feature-Based** - организация по функциональным возможностям
- **Shared** - общие утилиты, типы, константы

## Запуск

```bash
docker compose up --build
```

См. [QUICKSTART.md](./QUICKSTART.md) для подробных инструкций.



