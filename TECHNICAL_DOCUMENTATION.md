# Техническая документация Travel App SaaS

## 1. Общее описание проекта

### Назначение проекта

**Travel App SaaS** — это комплексная система планирования и бронирования путешествий, сфокусированная на маршрутах между Якутией и другими регионами России. Система предоставляет поиск и бронирование маршрутов, отелей, транспортных услуг, страховок и дополнительных сервисов.

### Основные модули

- **Маршруты**: Поиск и построение оптимальных транспортных маршрутов
- **Отели**: Поиск и бронирование accommodations
- **Транспорт**: Управление транспортными опциями (авиа, ж/д, авто)
- **Услуги**: Дополнительные сервисы (страховка, поддержка)
- **Избранное**: Персональные подборки пользователей
- **Контент**: Информационные страницы и галереи изображений туров

### Бизнес-логика

Система работает как агрегатор транспортных услуг, позволяя пользователям:
1. Искать маршруты между городами с различными опциями транспорта
2. Бронировать отели и дополнительные услуги
3. Получать страховую защиту для путешествий
4. Управлять личными избранными маршрутами и отелями
5. Просматривать информационный контент о турах

### Технологический стек

**Backend:**
- **Фреймворк**: Node.js 18 + Express + TypeScript
- **База данных**: PostgreSQL 15
- **Кэширование**: Redis 7
- **Файловое хранилище**: MinIO (S3-совместимое)
- **Аутентификация**: JWT + bcrypt
- **Тестирование**: Jest + Supertest

**Frontend:**
- **Фреймворк**: Next.js 14 (App Router) + React 18 + TypeScript
- **Стили**: Tailwind CSS с темой "Yakut North"
- **Управление состоянием**: React Query + Context API
- **UI компоненты**: Custom + shadcn
- **Тестирование**: Jest + Playwright

**DevOps:**
- **Контейнеризация**: Docker + Docker Compose
- **База данных**: PostgreSQL в контейнере
- **Хранилище**: MinIO в контейнере
- **Кэш**: Redis в контейнере

## 2. Архитектура

### Тип архитектуры

**Backend**: **Clean Architecture** с четким разделением на слои:
- **Domain Layer**: Бизнес-логика и сущности
- **Application Layer**: Use cases и сервисы приложений
- **Infrastructure Layer**: Внешние зависимости (БД, Redis, MinIO)
- **Presentation Layer**: API контроллеры, middleware, валидация

**Frontend**: **Feature-Based Architecture** с модульной структурой:
- **App Router**: Next.js App Router для роутинга
- **Modules**: Фичи-модули с составными компонентами
- **Shared**: Переиспользуемые компоненты и утилиты

### Структура директорий

```
Travel_app_Saas/
├── backend/                     # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── application/         # Application Layer
│   │   │   ├── route-builder/   # Построение маршрутов
│   │   │   ├── risk-engine/     # Оценка рисков
│   │   │   ├── services/        # Сервисы приложений
│   │   │   ├── use-cases/       # Use cases
│   │   │   └── workers/         # Фоновые задачи
│   │   ├── domain/              # Domain Layer
│   │   │   ├── entities/        # Сущности домена
│   │   │   └── repositories/    # Интерфейсы репозиториев
│   │   ├── infrastructure/      # Infrastructure Layer
│   │   │   ├── api/            # Внешние API клиенты
│   │   │   ├── database/       # База данных
│   │   │   ├── storage/        # Файловое хранилище
│   │   │   └── di/             # Dependency Injection
│   │   ├── presentation/        # Presentation Layer
│   │   │   ├── controllers/    # API контроллеры
│   │   │   ├── routes/         # Роуты Express
│   │   │   ├── middleware/     # Middleware
│   │   │   └── validators/     # Валидаторы
│   │   └── shared/             # Общие утилиты
│   ├── src/infrastructure/database/migrations/  # Миграции БД
│   └── Dockerfile
├── frontend/                    # Frontend (Next.js + TypeScript)
│   ├── src/
│   │   ├── app/               # App Router страницы
│   │   │   ├── routes/        # Страница маршрутов
│   │   │   ├── hotels/        # Страница отелей
│   │   │   ├── insurance/     # Страница страховок
│   │   │   └── tours/         # Страницы туров
│   │   ├── modules/           # Фичи-модули
│   │   │   ├── routes/        # Модуль маршрутов
│   │   │   ├── hotels/        # Модуль отелей
│   │   │   ├── services/      # Модуль услуг
│   │   │   ├── transport/     # Модуль транспорта
│   │   │   └── favorites/     # Модуль избранного
│   │   ├── shared/            # Shared компоненты
│   │   │   ├── ui/           # Базовые UI компоненты
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── providers/    # Context providers
│   │   ├── lib/              # Утилиты и конфигурации
│   │   └── types/            # TypeScript типы
│   └── Dockerfile
├── docker-compose.yml          # Docker сервисы
├── .env                        # Переменные окружения
└── architecture/               # Документация архитектуры
```

## 3. Backend

### Технологии

- **Node.js 18** с TypeScript
- **Express.js** как веб-фреймворк
- **PostgreSQL 15** основная БД
- **Redis 7** для кэширования и сессий
- **MinIO** S3-совместимое файловое хранилище
- **JWT** для аутентификации
- **Zod** для валидации данных
- **Jest** для тестирования

### Основные контроллеры и роуты

**Health & Monitoring:**
- `GET /health` - Проверка здоровья системы
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /metrics` - Prometheus метрики

**Routes:**
- `GET /routes/search` - Поиск маршрутов
- `GET /routes/details` - Детали маршрута
- `GET /routes/build` - Построение маршрута
- `POST /routes/risk/assess` - Оценка рисков маршрута

**Cities:**
- `GET /cities` - Получение списка городов

**Authentication:**
- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход пользователя
- `POST /auth/logout` - Выход пользователя
- `GET /auth/profile` - Профиль пользователя

**Tour Images:**
- `POST /tours/:tourId/images` - Загрузка изображений тура
- `GET /tours/:tourId/images` - Получение изображений тура
- `DELETE /tours/:tourId/images/:imageId` - Удаление изображения

**Content:**
- `GET /content/pages/*` - Статические страницы

### Основные модели данных (Domain Entities)

**Transport & Routes:**
- `RealStop` - Реальные транспортные узлы
- `VirtualStop` - Виртуальные остановки
- `Route` - Транспортные маршруты
- `VirtualRoute` - Виртуальные маршруты
- `Flight` - Авиарейсы
- `TransportDataset` - Наборы транспортных данных

**Users & Bookings:**
- `User` - Пользователи системы
- `Order` - Заказы на бронирование
- `OrderPassenger` - Пассажиры заказов
- `OrderService` - Дополнительные услуги

**Content:**
- `TourImage` - Изображения туров с вариантами
- `Dataset` - Наборы данных

### Логика аутентификации и авторизации

**Аутентификация:**
- JWT токены с сроком действия 24ч
- bcrypt для хэширования паролей
- Middleware для проверки токенов
- Защита от brute-force атак

**Авторизация:**
- Ролевая модель на основе JWT claims
- Middleware для проверки прав доступа
- Контроль доступа к эндпоинтам на основе ролей

### Схема ролей и прав

**Текущие роли:**
- `user` - Базовый пользователь (полный доступ к поиску и бронированию)
- `admin` - Администратор (полный доступ ко всем функциям)

**Права доступа:**
- Публичные эндпоинты: поиск маршрутов, городов
- Требуют аутентификации: управление профилем, избранное, загрузка изображений
- Только для admin: административные эндпоинты

### Взаимодействие с БД

**Connection Pooling:**
- Production: 50 max / 5 min connections
- Development: 20 max / 2 min connections
- Graceful shutdown с очисткой соединений

**Repository Pattern:**
- `UserRepository` - Управление пользователями
- `TourImageRepository` - Управление изображениями
- `BaseRepository` - Базовый класс репозиториев

**Database Features:**
- Transactions для консистентности данных
- Prepared statements для производительности
- Connection health monitoring

### Сервисы, middleware, utils

**Application Services:**
- `AuthService` - Аутентификация и авторизация
- `TourImageService` - Управление изображениями туров
- `ContentService` - Управление контентом
- `RiskService` - Оценка рисков маршрутов

**Middleware:**
- `auth.middleware.ts` - Проверка JWT токенов
- `error-handler.middleware.ts` - Централизованная обработка ошибок
- `request-logger.middleware.ts` - Логирование запросов
- `rate-limiter.ts` - Ограничение частоты запросов
- `security-headers.middleware.ts` - Security заголовки
- `validation.middleware.ts` - Валидация запросов

**Background Workers:**
- `GraphBuilderWorker` - Построение транспортного графа
- `VirtualEntitiesGeneratorWorker` - Генерация виртуальных сущностей
- `ODataSyncWorker` - Синхронизация с внешними OData сервисами

**Storage System:**
- `StorageManager` - Абстракция файлового хранилища
- `MinIOStorage` - MinIO провайдер
- `LocalStorage` - Fallback провайдер
- Автоматический failover между провайдерами

## 4. Frontend

### Технологии

- **Next.js 14** с App Router
- **React 18** с TypeScript
- **Tailwind CSS** для стилизации
- **React Query** для серверного состояния
- **Context API** для глобального состояния
- **Zod** для валидации форм
- **Jest** для unit тестов
- **Playwright** для E2E тестов

### Карта маршрутов

**App Router Pages:**
- `/` - Главная страница с навигацией по модулям
- `/routes` - Поиск и отображение маршрутов
- `/hotels` - Поиск и бронирование отелей
- `/insurance` - Страховые продукты
- `/tours/*` - Страницы туров и галереи
- `/about` - Информация о проекте
- `/license` - Лицензионная информация

**Dynamic Routes:**
- `/tours/[tourId]` - Детали тура
- `/tours/[tourId]/gallery` - Галерея изображений тура

### Ключевые компоненты и их назначения

**Layout Components:**
- `Header` - Шапка сайта с навигацией
- `Footer` - Подвал сайта
- `NavigationTabs` - Переключение между основными секциями

**Feature Modules:**
- `RoutesSection` - Поиск и отображение маршрутов
- `HotelsSection` - Поиск отелей
- `TransportSection` - Транспортные опции
- `ServicesSection` - Дополнительные услуги (включая страховку)
- `FavoritesSection` - Управление избранным

**Shared UI:**
- `RouteInfoBlock` - Информационный блок маршрута
- `Button`, `Sheet`, dialogs - Базовые UI компоненты (shadcn)
- `Form` компоненты с валидацией
- `Gallery` компоненты для изображений

### Основные состояния и хранилища

**React Query (Server State):**
- Кэширование ответов API
- Фоновые обновления данных
- Optimistic updates для UI
- Error handling и retry логика

**Context API (Client State):**
- `AuthContext` - Состояние аутентификации
- `AppContext` - Глобальное состояние приложения
- `ErrorBoundary` - Граничные компоненты для ошибок

### Логика аутентификации и проверка ролей

**Frontend Authentication:**
- Хранение JWT токена в localStorage/httpOnly cookies
- Автоматическое обновление токенов
- Redirect на login при отсутствии токена
- Контекст провайдер для состояния аутентификации

**Role-based UI:**
- Скрытие/показ компонентов на основе роли пользователя
- Проверка прав доступа на клиенте
- Graceful degradation для неавторизованных пользователей

## 5. База данных

### ER-диаграмма (текстовая форма)

```
Users (Пользователи)
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── full_name (VARCHAR)
├── phone (VARCHAR)
├── avatar_url (TEXT)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── last_login_at (TIMESTAMP)

Orders (Заказы)
├── id (UUID, PK)
├── user_id (UUID, FK → Users.id)
├── route_id (VARCHAR)
├── status (VARCHAR: pending/confirmed/cancelled/completed)
├── total_price_amount (DECIMAL)
├── total_price_currency (VARCHAR, DEFAULT 'RUB')
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── confirmed_at (TIMESTAMP)
└── cancelled_at (TIMESTAMP)

OrderPassengers (Пассажиры заказов)
├── id (UUID, PK)
├── order_id (UUID, FK → Orders.id)
├── full_name (VARCHAR)
├── document_number (VARCHAR)
└── created_at (TIMESTAMP)

OrderServices (Услуги в заказах)
├── id (UUID, PK)
├── order_id (UUID, FK → Orders.id)
├── service_type (VARCHAR: insurance/premium-support)
├── service_id (VARCHAR)
├── name (VARCHAR)
├── price_amount (DECIMAL)
├── price_currency (VARCHAR, DEFAULT 'RUB')
└── created_at (TIMESTAMP)

UserPreferences (Настройки пользователей)
├── user_id (UUID, PK, FK → Users.id)
├── notifications_enabled (BOOLEAN, DEFAULT true)
├── language (VARCHAR, DEFAULT 'ru')
├── theme (VARCHAR, DEFAULT 'light')
└── updated_at (TIMESTAMP)

TourImages (Изображения туров)
├── id (UUID, PK)
├── tour_id (VARCHAR, FK → virtual_routes.id)
├── key (VARCHAR) - Storage key
├── url (VARCHAR) - Public URL
├── filename (VARCHAR)
├── mime_type (VARCHAR)
├── file_size (BIGINT)
├── width (INTEGER)
├── height (INTEGER)
├── is_main (BOOLEAN, DEFAULT false)
├── sort_order (INTEGER, DEFAULT 0)
├── alt_text (TEXT)
├── variants (JSONB) - Thumbnail, optimized versions
├── uploaded_by (VARCHAR)
├── created_at (TIMESTAMP WITH TIME ZONE)
└── updated_at (TIMESTAMP WITH TIME ZONE)

VirtualRoutes (Виртуальные маршруты) - referenced by TourImages
├── id (VARCHAR, PK)
└── ... route details
```

### Основные таблицы

**Users:**
- Хранение пользовательских данных
- Email уникальный идентификатор
- Bcrypt хэширование паролей

**Orders:**
- Заказы на бронирование
- Связь с пользователями и маршрутами
- Статусы и временные метки

**TourImages:**
- Изображения для туров с вариантами
- JSONB для хранения thumbnails и optimized версий
- Автоматическая генерация вариантов при загрузке

### Связи между таблицами

- **Users 1:N Orders** - Один пользователь может иметь много заказов
- **Orders 1:N OrderPassengers** - Один заказ может иметь много пассажиров
- **Orders 1:N OrderServices** - Один заказ может иметь много дополнительных услуг
- **Users 1:1 UserPreferences** - Один пользователь имеет один набор настроек
- **VirtualRoutes 1:N TourImages** - Один маршрут может иметь много изображений

### Database Features

**Indexes:**
- Первичные ключи на всех таблицах
- Индексы на внешние ключи
- Индексы на часто запрашиваемые поля (email, created_at, status)
- Composite индексы для оптимизации запросов

**Constraints:**
- CHECK constraints для валидации данных
- FOREIGN KEY constraints с CASCADE DELETE
- UNIQUE constraints для уникальности данных

**Functions & Triggers:**
- Автоматическое обновление `updated_at` timestamp
- Функции для получения main изображения тура
- Функции для получения всех изображений тура с пагинацией

## 6. Процессы

### Как запускается проект

**Quick Start (рекомендуемый способ):**
```bash
# Запуск всех сервисов через Docker Compose
docker compose up --build
```
Запускает: Frontend (3000), Backend (5000), PostgreSQL (5432), MinIO (9000/9001), Redis (6380)

**Backend Development:**
```bash
cd backend
npm install
npm run docker:dev    # Development с hot reload через Docker
npm run build         # Компиляция TypeScript + копирование ассетов
npm run start         # Production сервер (localhost:5000)
npm run lint          # ESLint проверка
npm run type-check    # TypeScript валидация
```

**Frontend Development:**
```bash
cd frontend
npm install
npm run dev           # Development сервер (localhost:3000)
npm run build         # Production сборка
npm run start         # Production сервер
npm run lint          # ESLint проверка кода
npm run type-check    # TypeScript проверка типов
npm run format        # Prettier форматирование
```

### Скрипты

**Root package.json:**
```json
{
  "devDependencies": {
    "shadcn": "^3.5.0"
  }
}
```

**Backend скрипты:**
- `npm run docker:dev` - Development с Docker hot reload
- `npm run build` - Production сборка
- `npm run test:*` - Различные уровни тестирования
- `npm run lint` - Качество кода

**Frontend скрипты:**
- `npm run dev` - Development сервер
- `npm run test:e2e` - Playwright E2E тесты
- `npm run format` - Автоматическое форматирование кода
- Pre-commit хуки для автоматической проверки качества

### CI/CD

**GitHub Actions:**
- `.github/workflows/backend-ci.yml` - CI для backend
- `.github/workflows/backend-integration-tests.yml` - Интеграционные тесты
- Автоматический запуск тестов при push/pull request
- Проверка качества кода и TypeScript

### Механизмы миграций

**Database Migrations:**
- SQL файлы в `backend/src/infrastructure/database/migrations/`
- Порядковая нумерация: `001_`, `002_`, `003_`, `004_`
- Автоматическое выполнение при старте приложения
- Откат транзакций при ошибках

**Migration Files:**
1. `001_create_users_table.sql` - Таблица пользователей
2. `002_create_orders_tables.sql` - Заказы и связанные сущности
3. `003_optimized_storage_schema.sql` - Оптимизация хранилища
4. `004_create_tour_images_table.sql` - Изображения туров

### Сборка и деплой

**Docker Process:**
- Multi-stage Dockerfiles для оптимизации
- Development target с hot reload
- Production target с минимальным size
- Health checks для всех контейнеров

**Build Process:**
- TypeScript компиляция с генерацией source maps
- Копирование статических ассетов (SQL миграций)
- Optimized bundles для production

## 7. Бизнес-логика

### Основные сценарии использования

**Поиск маршрутов:**
1. Пользователь вводит город отправления и назначения
2. Система ищет доступные транспортные опции
3. Отображение результатов с фильтрацией и сортировкой
4. Возможность выбора и бронирования

**Бронирование отелей:**
1. Поиск отелей в городе или по маршруту
2. Просмотр детальной информации и фото
3. Выбор дат и количества гостей
4. Бронирование с подтверждением

**Дополнительные услуги:**
1. Страхование путешествий
2. Премиум поддержка
3. Трансфер и экскурсии

### Типы пользователей и их возможности

**Anonymous User (Гость):**
- Поиск маршрутов и отелей
- Просмотр контента и информации
- Ограниченный доступ к функциям

**Registered User (Зарегистрированный):**
- Полный доступ ко всем функциям
- Управление профилем и настройками
- Избранное и история бронирований
- Загрузка和管理 изображений (если есть права)

**Admin (Администратор):**
- Полный доступ к административным функциям
- Управление пользователями и контентом
- Доступ к метрикам и диагностике
- Управление конфигурацией системы

### Описание ключевых workflow

**Route Search Workflow:**
1. Валидация параметров поиска
2. Проверка кэша в Redis
3. Поиск в pre-built транспортном графе
4. Получение деталей из внешних API
5. Кэширование результатов
6. Возврат оптимизированных результатов

**Image Upload Workflow:**
1. Аутентификация пользователя
2. Валидация файла (тип, размер, MIME)
3. Генерация уникального storage key
4. Загрузка в MinIO с автоматическим failover
5. Создание thumbnails и optimized версий
6. Сохранение метаданных в PostgreSQL
7. Обновление кэша

**Authentication Workflow:**
1. Валидация credentials
2. Проверка пользователя в БД
3. Сравнение bcrypt хэшей
4. Генерация JWT токена
5. Установка в secure cookie
6. Обновление last_login timestamp

## 8. Конфигурации и переменные окружения

### Корневой .env файл

**Application Configuration:**
- `NODE_ENV=development` - Окружение приложения
- `PORT=5000` / `BACKEND_PORT=5000` / `FRONTEND_PORT=3000` - Порты сервисов
- `API_VERSION=v1` - Версия API
- `LOG_LEVEL=info` - Уровень логирования

**Database Configuration:**
- `POSTGRES_DB=travel_app` - Имя БД
- `POSTGRES_USER=travel_user` - Пользователь БД
- `POSTGRES_PASSWORD=travel_password` - Пароль БД
- `POSTGRES_PORT=5432` - Порт PostgreSQL

**Redis Configuration:**
- `REDIS_PASSWORD=123456S` - Пароль Redis
- Various TTL configurations для разных типов кэша

**MinIO Configuration:**
- `MINIO_ROOT_USER=minioadmin` / `MINIO_ROOT_PASSWORD=minioadmin` - Credentials
- `MINIO_API_PORT=9000` / `MINIO_CONSOLE_PORT=9001` - Порты
- `MINIO_BUCKET=travel-app` - Имя bucket

**Security:**
- `JWT_SECRET=dev-secret-key-change-in-production` - Секрет для JWT
- `JWT_EXPIRES_IN=24h` - Срок действия токена
- `CORS_ORIGIN=http://localhost:3000` - CORS настройки

### Backend конфигурация

**Дополнительные переменные:**
- `DB_HOST`, `DB_PORT`, `DB_NAME` - Connection параметры
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` - MinIO настройки
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- Various TTL settings для кэширования

### Frontend конфигурация

**NEXT_PUBLIC переменные:**
- `NEXT_PUBLIC_API_URL=http://localhost:5000` - URL бэкенд API
- `NEXT_PUBLIC_API_VERSION=v1` - Версия API
- `NEXT_PUBLIC_SITE_URL` - Base URL для SEO

### Использование в коде

**Environment Loading:**
```typescript
// Автоматический поиск .env файла
const rootEnvPath = path.resolve(__dirname, '../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');
```

**Docker Integration:**
Все переменные окружения передаются в Docker контейнеры через docker-compose.yml с безопасными значениями по умолчанию.

## 9. Проблемные места и особенности

### Сложные участки кода

**Route Search Optimization:**
- Pre-built граф в Redis для sub-10ms производительности
- Complex pathfinding algorithms
- Parallel database queries для оптимизации

**Storage System:**
- Multi-provider storage с automatic failover
- Image processing pipeline с multiple variants
- Background processing для тяжелых операций

**Authentication Flow:**
- JWT токены с refresh mechanism
- Role-based access control
- Secure cookie handling

### Технические долги

**Frontend:**
- Некоторые компоненты требуют рефакторинга для лучшей переиспользуемости
- Отсутствие глобальной системы управления ошибками
- Нуждается в улучшении мобильной адаптации

**Backend:**
- Некоторые legacy endpoints требуют модернизации
- Background worker system может быть улучшена
- Нуждается в лучшем monitoring и alerting

### Потенциальные баги

**Race Conditions:**
- Одновременная загрузка изображений
- Конкурентный доступ к кэшу
- Race conditions в order processing

**Error Handling:**
- Не все edge cases покрыты обработкой ошибок
- External API failures могут не обрабатываться gracefully
- Timeout handling может быть улучшен

### Устаревшие части

**Dependencies:**
- Некоторые зависимости требуют обновления
- Legacy middleware может быть заменен современными аналогами
- Testing setup может быть модернизирован

## 10. Рекомендации

### Архитектурные улучшения

**Microservices Transition:**
- Вынести image processing в отдельный сервис
- Разделить route search и booking на разные сервисы
- Внедрить service mesh для inter-service communication

**Event-Driven Architecture:**
- Внедрить message queue (RabbitMQ/Kafka)
- Event sourcing для audit trail
- CQRS pattern для complex operations

### Оптимизация производительности

**Database Optimizations:**
- Read replicas для heavy read operations
- Database sharding для масштабирования
- Connection pooling optimization

**Caching Strategy:**
- CDN для статических ассетов
- Application-level caching с Redis
- Browser caching optimization

**Frontend Optimizations:**
- Code splitting по маршрутам
- Image lazy loading
- Service worker для offline functionality

### Выделение в отдельные модули

**Standalone Services:**
- Image Processing Service
- Notification Service
- Analytics Service
- Payment Gateway Service

**Shared Libraries:**
- Common authentication library
- Validation schemas
- Utility functions
- UI component library

### Infrastructure Improvements

**Monitoring & Observability:**
- APM integration (New Relic/DataDog)
- Centralized logging (ELK stack)
- Custom dashboards

**Security Enhancements:**
- Rate limiting improvements
- API key management
- Security scanning integration
- WAF implementation

**DevOps Automation:**
- IaC с Terraform
- Automated deployment pipelines
- Blue-green deployments
- Canary releases

### Code Quality Improvements

**Testing Strategy:**
- Increase test coverage до 90%+
- E2E testing expansion
- Performance testing integration
- Contract testing

**Code Standards:**
- Linting rules strengthening
- Code review processes
- Documentation standards
- Architecture decision records (ADRs)

---

*Документация обновлена: 25 ноября 2024 года*
*Версия: 1.0*