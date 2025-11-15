# Как работает Travel App SaaS

## 🏗️ Архитектура системы

Проект построен на **микросервисной архитектуре** с использованием Docker Compose:

```
┌─────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ                         │
│              (Браузер: localhost:3000)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  Next.js 14 (App Router) + React 18 + TypeScript       │
│  Tailwind CSS для стилей                                │
│  - Главная страница с поиском                           │
│  - Навигация (маршруты, отели, авто, услуги)            │
│  - Карта России                                         │
│  - Кнопка помощника (мамонтёнок)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP запросы (REST API)
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND API                          │
│  Node.js + Express + TypeScript                        │
│  Clean Architecture (Domain/Application/Infrastructure) │
│  - REST API endpoints (/api/v1/*)                       │
│  - JWT авторизация                                      │
│  - Валидация данных                                     │
│  - Обработка ошибок                                     │
└───────┬───────────────────────────────┬─────────────────┘
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   PostgreSQL     │          │      MinIO       │
│   (База данных)  │          │  (Файловое      │
│                  │          │   хранилище)     │
│  - users         │          │                  │
│  - orders        │          │  - Изображения   │
│  - passengers    │          │  - Иконки        │
│  - services      │          │  - Документы     │
└──────────────────┘          └──────────────────┘
```

## 🚀 Как запускается

### 1. Запуск через Docker Compose

```bash
docker compose up --build
```

Эта команда запускает **4 сервиса одновременно**:

1. **PostgreSQL** (порт 5432)
   - База данных для хранения пользователей и заказов
   - Автоматически создаёт таблицы при первом запуске

2. **MinIO** (порты 9000, 9001)
   - S3-совместимое хранилище для файлов
   - Консоль управления: http://localhost:9001

3. **Backend API** (порт 5000)
   - Express сервер с REST API
   - Подключается к PostgreSQL и MinIO
   - Health check: http://localhost:5000/health

4. **Frontend** (порт 3000)
   - Next.js приложение
   - SSR (Server-Side Rendering)
   - Горячая перезагрузка в режиме разработки

### 2. Что происходит при запуске

```
1. Docker Compose читает docker-compose.yml
   ↓
2. Создаёт сеть travel-app-network
   ↓
3. Запускает PostgreSQL → ждёт готовности (healthcheck)
   ↓
4. Запускает MinIO → ждёт готовности (healthcheck)
   ↓
5. Запускает Backend → подключается к БД и MinIO
   ↓
6. Backend выполняет миграции БД (создаёт таблицы)
   ↓
7. Запускает Frontend → подключается к Backend API
   ↓
8. Все сервисы готовы! ✅
```

## 📱 Как работает Frontend

### Главная страница (`/`)

**Что отображается:**
- **Header** - логотип, профиль, настройки
- **Заголовок** - "Путешествия, которые соединяют Якутию и Россию"
- **Поисковая форма** - поля: Откуда, Куда, Когда, Обратно, Пассажиры, Класс
- **Навигационные табы** - Маршруты, Гостиницы, Авто, Услуги, Мамонтёнок, Избранное
- **Карта России** - интерактивная SVG карта с масштабированием
- **Кнопка мамонтёнка** - анимированная кнопка помощника

**Технологии:**
- **Next.js App Router** - маршрутизация
- **React Server Components** - серверный рендеринг
- **Tailwind CSS** - стилизация (якутская цветовая палитра)
- **SVG иконки** - современные векторные иконки

**Состояние:**
- ✅ UI полностью готов
- ✅ Стили применены
- ⚠️ Логика поиска пока не подключена к API

## 🔌 Как работает Backend

### Структура (Clean Architecture)

```
backend/src/
├── domain/              # Бизнес-логика (чистая)
│   ├── entities/        # Сущности (User, Order)
│   └── repositories/    # Интерфейсы репозиториев
│
├── application/         # Use Cases (применение бизнес-логики)
│   └── use-cases/       # GetHealthUseCase, RegisterUser, etc.
│
├── infrastructure/      # Внешние зависимости
│   ├── database/        # PostgreSQL подключение
│   ├── repositories/    # Реализация репозиториев
│   └── storage/         # MinIO клиент
│
└── presentation/        # API слой
    ├── controllers/     # Обработчики запросов
    ├── routes/          # Маршруты API
    └── middleware/      # Middleware (auth, validation)
```

### API Endpoints (текущее состояние)

**Работает:**
- `GET /health` - проверка работоспособности
- `GET /api/v1/` - информация об API

**Планируется (по архитектуре):**
- `POST /api/v1/auth/register` - регистрация
- `POST /api/v1/auth/login` - вход
- `GET /api/v1/routes/search` - поиск маршрутов
- `POST /api/v1/orders` - создание заказа
- `GET /api/v1/orders` - список заказов
- И другие (см. `architecture/api-contracts.md`)

## 💾 Как работает база данных

### PostgreSQL

**Таблицы (создаются автоматически):**

1. **users**
   - id, email, password_hash, name, created_at, updated_at

2. **orders**
   - id, user_id, route_id, total_price, status, created_at

3. **order_passengers**
   - id, order_id, name, document_number, birth_date

4. **order_services**
   - id, order_id, service_type, service_data, price

**Миграции:**
- Автоматически выполняются при запуске Backend
- Файлы в `backend/src/infrastructure/database/migrations/`

## 📦 Как работает файловое хранилище

### MinIO (S3-compatible)

**Структура bucket:**
```
travel-app/
├── icons/           # Иконки транспорта
│   ├── transport/
│   │   ├── plane.png
│   │   ├── train.png
│   │   └── ship.png
│   └── cities/
│       └── yakutsk.png
│
├── images/          # Изображения маршрутов
│   └── routes/
│
└── documents/       # Документы пользователей
```

**Доступ:**
- Публичные файлы: прямой URL
- Приватные файлы: через Backend API с авторизацией

## 🔄 Как происходит взаимодействие

### Пример: Поиск маршрутов (когда будет реализовано)

```
1. Пользователь заполняет форму поиска
   ↓
2. Frontend отправляет запрос:
   GET /api/v1/routes/search?from=Якутск&to=Москва&date=2024-01-15
   ↓
3. Backend получает запрос
   ↓
4. Backend читает mock-данные из /backend/data/routes.json
   ↓
5. Backend фильтрует маршруты по параметрам
   ↓
6. Backend возвращает JSON с маршрутами
   ↓
7. Frontend отображает результаты
```

### Пример: Создание заказа (когда будет реализовано)

```
1. Пользователь выбирает маршрут
   ↓
2. Frontend проверяет авторизацию (JWT токен)
   ↓
3. Если не авторизован → редирект на /login
   ↓
4. Пользователь заполняет данные пассажиров
   ↓
5. Frontend отправляет:
   POST /api/v1/orders
   {
     "routeId": "123",
     "passengers": [...],
     "services": [...]
   }
   ↓
6. Backend валидирует данные
   ↓
7. Backend создаёт транзакцию в PostgreSQL
   ↓
8. Backend сохраняет заказ в таблицу orders
   ↓
9. Backend возвращает созданный заказ
   ↓
10. Frontend показывает подтверждение
```

## 🎨 Стилизация

### Якутская цветовая палитра

**Цвета (Tailwind):**
- `yakutia-turquoise` (#1aaac2) - основной бирюзовый
- `yakutia-blue` (#87CEEB) - голубой
- `yakutia-graphite` (#223344) - тёмный графит
- `yakutia-border-light` (#c7eef5) - светлая рамка

**Фон:**
- Градиент: `#8ad0e0 → #5bb9cb`
- Якутский паттерн (диагональные линии)
- Мягкая виньетка

**Компоненты:**
- `.yakutia-card` - блоки с тенью и рамкой
- `.yakutia-transition` - плавные переходы
- `.yakutia-sway` - анимация покачивания

## 📊 Текущее состояние проекта

### ✅ Реализовано

1. **Инфраструктура:**
   - Docker Compose конфигурация
   - PostgreSQL с миграциями
   - MinIO хранилище
   - Сеть между сервисами

2. **Frontend:**
   - Главная страница с UI
   - Поисковая форма (UI)
   - Навигация с SVG иконками
   - Карта России (SVG)
   - Кнопка мамонтёнка с анимацией
   - Якутская стилизация

3. **Backend:**
   - Базовая структура (Clean Architecture)
   - Health check endpoint
   - Подключение к PostgreSQL
   - Подключение к MinIO
   - Миграции БД

### ⚠️ В разработке

1. **API Endpoints:**
   - Авторизация (register/login)
   - Поиск маршрутов
   - Создание заказов
   - Получение заказов

2. **Mock данные:**
   - routes.json
   - cities.json
   - weather.json
   - attractions.json

3. **Функциональность:**
   - Интеграция формы поиска с API
   - Авторизация пользователей
   - Создание заказов
   - Помощник мамонтёнок (логика)

## 🧪 Как протестировать

### 1. Проверка Frontend

```bash
# Откройте в браузере
http://localhost:3000

# Должны увидеть:
- Главную страницу с поисковой формой
- Навигационные табы
- Карту России
- Кнопку мамонтёнка
```

### 2. Проверка Backend

```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api/v1/
```

### 3. Проверка БД

```bash
# Подключение к PostgreSQL
docker exec -it travel-app-postgres psql -U travel_user -d travel_app

# Список таблиц
\dt

# Выход
\q
```

### 4. Проверка MinIO

```bash
# Откройте в браузере
http://localhost:9001

# Логин: minioadmin
# Пароль: minioadmin
```

## 🔧 Разработка

### Локальная разработка (без Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev  # Запуск на порту 5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Запуск на порту 3000
```

**Важно:** Нужно запустить PostgreSQL и MinIO через Docker:
```bash
docker compose up postgres minio
```

## 📚 Дополнительная информация

- **Архитектура:** `architecture/README.md`
- **API контракты:** `architecture/api-contracts.md`
- **UX Flow:** `architecture/ux-flow.md`
- **Быстрый старт:** `QUICKSTART.md`

## 🎯 Следующие шаги

1. Реализовать API endpoints для авторизации
2. Добавить mock-данные (routes.json, cities.json)
3. Интегрировать форму поиска с Backend
4. Реализовать создание заказов
5. Добавить логику помощника мамонтёнка



