# Backend API - Северный Маршрут

Backend MVP для мультимодального сервиса маршрутизации, построенный по принципам Clean Architecture и Domain Driven Design.

## 🏗 Архитектура

Проект следует Clean Architecture с разделением на слои:

- **domain/** - Бизнес-логика, entities, value-objects, repository interfaces
- **application/** - Use-cases, DTOs, сервисы
- **infrastructure/** - Реализации репозиториев, БД, хранилище
- **presentation/** - Controllers, routes, middleware
- **shared/** - Общие утилиты, ошибки, конфигурация

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- PostgreSQL 14+
- MinIO (S3-совместимое хранилище)

### Установка

```bash
# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env

# Настройка переменных окружения в .env
```

### Запуск

```bash
# Development режим
npm run dev

# Production сборка
npm run build
npm start
```

## 📋 API Endpoints

### Health Check

```
GET /api/v1/health
```

Проверяет состояние БД и MinIO.

### Аутентификация

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/profile (требует аутентификации)
```

### Маршруты

```
GET /api/v1/routes/search?from=Москва&to=Якутск&date=2024-06-15&preference=fast
GET /api/v1/routes/:id
```

**Параметры поиска:**
- `from` - город отправления
- `to` - город назначения
- `date` - дата в формате YYYY-MM-DD
- `preference` - предпочтение: `fast`, `cheap`, `reliable`

### Заказы

```
POST /api/v1/orders (требует аутентификации)
GET  /api/v1/orders/my (требует аутентификации)
```

### Хранилище

```
POST /api/v1/storage/avatar (требует аутентификации)
```

## 🔐 Аутентификация

Используйте JWT токен в заголовке:

```
Authorization: Bearer <access_token>
```

## 📊 Mock Data

Mock данные для маршрутов находятся в `data/mock-data/`:

- `cities.json` - города
- `segments.json` - сегменты маршрутов
- `routes.json` - мультимодальные маршруты
- `events.json` - события (погода, задержки и т.д.)

### Тестовые сценарии

**Сценарий 1:** Москва → Якутск (авиа) → Олёкминск (речной)
```
GET /api/v1/routes/search?from=Москва&to=Олёкминск&date=2024-06-15
```

**Сценарий 2:** Москва → Якутск (ЖД) → Сангар (речной)
```
GET /api/v1/routes/search?from=Москва&to=Сангар&date=2024-06-15&preference=cheap
```

## 🗄 База данных

Миграции находятся в `src/infrastructure/database/migrations/`:

- `001_create_users_table.sql`
- `002_create_orders_tables.sql`

Миграции выполняются автоматически при запуске приложения.

## 📦 Структура проекта

```
backend/
├── src/
│   ├── domain/           # Domain слой
│   ├── application/      # Application слой
│   ├── infrastructure/   # Infrastructure слой
│   ├── presentation/     # Presentation слой
│   ├── shared/           # Shared слой
│   └── index.ts          # Entry point
├── data/
│   └── mock-data/        # Mock данные
├── package.json
├── tsconfig.json
└── .env.example
```

## 🧪 Use Cases

- `SearchRoutesUseCase` - поиск мультимодальных маршрутов
- `GetRouteDetailsUseCase` - детали маршрута
- `CreateOrderUseCase` - создание заказа
- `GetUserOrdersUseCase` - заказы пользователя
- `RegisterUserUseCase` - регистрация
- `LoginUserUseCase` - вход
- `UpdateAvatarUseCase` - обновление аватара
- `HealthCheckUseCase` - проверка здоровья системы

## 🔧 Конфигурация

Все настройки через переменные окружения (см. `.env.example`):

- **Database**: PostgreSQL connection settings
- **JWT**: Secret keys и время жизни токенов
- **MinIO**: S3-совместимое хранилище для аватаров
- **Server**: Port, CORS, API version

## 📝 Примеры запросов

### Регистрация

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "Иван Иванов",
    "phone": "+79991234567"
  }'
```

### Поиск маршрутов

```bash
curl "http://localhost:5000/api/v1/routes/search?from=Москва&to=Якутск&date=2024-06-15&preference=fast"
```

### Создание заказа (требует токен)

```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "route-msk-ykt-olk",
    "passengers": [
      {
        "fullName": "Иван Иванов",
        "documentNumber": "1234567890"
      }
    ],
    "services": [
      {
        "serviceType": "insurance",
        "serviceId": "ins-001",
        "name": "Страховка",
        "priceAmount": 500,
        "priceCurrency": "RUB"
      }
    ]
  }'
```

## 🐛 Обработка ошибок

Все ошибки возвращаются в стандартном формате:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📚 Дополнительная информация

- TypeScript строгая типизация
- Zod для валидации входных данных
- Clean Architecture принципы
- Domain Driven Design подход
- RESTful API v1
