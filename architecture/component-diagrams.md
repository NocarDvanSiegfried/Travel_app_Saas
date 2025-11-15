# Диаграммы взаимодействия компонентов

## 1. Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Travel App SaaS                          │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │  Frontend    │─────────▶│  Backend API │                │
│  │  (React)     │  HTTP    │  (Node.js)   │                │
│  │              │◀─────────│              │                │
│  └──────────────┘          └──────┬───────┘                │
│                                    │                        │
│                           ┌────────┴────────┐              │
│                           │                 │              │
│                    ┌──────▼──────┐  ┌──────▼──────┐        │
│                    │ PostgreSQL  │  │   MinIO     │        │
│                    │             │  │   (S3)      │        │
│                    └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 2. Слои Backend (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                  Presentation Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Routes   │  │  Auth   │  │ Orders   │  │Assistant │   │
│  │Controller│  │Controller│  │Controller│  │Controller│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼─────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │RouteService  │  │OrderService  │  │Assistant    │       │
│  │              │  │              │  │Service      │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │SearchRoutes  │  │CreateOrder   │  │GetAssistant │      │
│  │Query         │  │Command       │  │Response      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Domain Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  User    │  │  Route   │  │  Order   │  │Insurance│     │
│  │ Entity   │  │  Entity  │  │  Entity  │  │ Entity  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │IUserRepo│  │IRouteRepo│  │IOrderRepo│                   │
│  │Interface│  │Interface │  │Interface │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │PostgreSQL    │  │  MockRoute   │  │  S3File      │       │
│  │UserRepo      │  │  Repository  │  │  Storage     │       │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘       │
│         │                                    │              │
│  ┌──────▼───────┐                    ┌──────▼───────┐     │
│  │ PostgreSQL   │                    │    MinIO      │     │
│  │   Client    │                    │    Client     │     │
│  └─────────────┘                    └───────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 3. Поток поиска маршрутов

```
User → Frontend → Backend API → Application → Domain → Infrastructure
                                                              │
                                                              ▼
                                                          Mock Data
                                                              │
                                                              ▼
User ← Frontend ← Backend API ← Application ← Domain ← Infrastructure
```

**Детальный поток:**

```
1. User вводит параметры поиска
   │
   ▼
2. Frontend: RouteSearchForm отправляет запрос
   │
   ▼
3. Backend: RoutesController получает запрос
   GET /api/routes?from=Yakutsk&to=Moscow&date=2024-01-15
   │
   ▼
4. Application: SearchRoutesQuery создается
   │
   ▼
5. Application: RouteService обрабатывает запрос
   - Валидация параметров
   - Применение бизнес-правил
   │
   ▼
6. Infrastructure: MockRouteRepository вызывается
   │
   ▼
7. Infrastructure: Чтение mock-данных из файла
   │
   ▼
8. Infrastructure: Фильтрация по параметрам
   │
   ▼
9. Application: Преобразование в RouteDto
   │
   ▼
10. Backend: RoutesController возвращает JSON
    │
    ▼
11. Frontend: RouteList отображает результаты
    │
    ▼
12. User видит список маршрутов
```

## 4. Поток авторизации

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Вводит email/password
     ▼
┌─────────────────┐
│  Frontend       │
│  LoginForm      │
└────┬────────────┘
     │ 2. POST /api/auth/login
     ▼
┌─────────────────┐
│  Backend API    │
│  AuthController │
└────┬────────────┘
     │ 3. LoginUserCommand
     ▼
┌─────────────────┐
│  Application    │
│  AuthService    │
└────┬────────────┘
     │ 4. Проверка credentials
     ▼
┌─────────────────┐
│ Infrastructure  │
│ PostgreSQLUser  │
│ Repository      │
└────┬────────────┘
     │ 5. SELECT * FROM users WHERE email = ?
     ▼
┌─────────────────┐
│  PostgreSQL     │
└────┬────────────┘
     │ 6. Возвращает user
     ▼
┌─────────────────┐
│  Application    │
│  Генерация JWT │
└────┬────────────┘
     │ 7. Создание сессии в БД
     ▼
┌─────────────────┐
│ Infrastructure  │
│ Сохранение      │
│ session         │
└────┬────────────┘
     │ 8. INSERT INTO sessions
     ▼
┌─────────────────┐
│  Backend API    │
│  Возврат JWT    │
└────┬────────────┘
     │ 9. { token: "jwt_token" }
     ▼
┌─────────────────┐
│  Frontend       │
│  Сохранение     │
│  токена         │
└────┬────────────┘
     │ 10. localStorage.setItem('token', ...)
     ▼
┌─────────┐
│  User    │ Авторизован
└─────────┘
```

## 5. Поток создания заказа

```
User → Frontend → Backend API → Application → Domain → Infrastructure
                                                              │
                                                              ▼
                                                          PostgreSQL
                                                              │
                                                              ▼
User ← Frontend ← Backend API ← Application ← Domain ← Infrastructure
```

**Детальный поток:**

```
1. User выбирает маршрут и услуги
   │
   ▼
2. Frontend: RouteDetailsPage отправляет CreateOrderCommand
   │
   ▼
3. Backend: OrdersController получает запрос
   POST /api/orders
   │
   ▼
4. Application: CreateOrderCommand создается
   │
   ▼
5. Application: OrderService обрабатывает
   - Валидация данных
   - Расчет общей стоимости
   - Применение бизнес-правил
   │
   ▼
6. Domain: Order Entity создается
   │
   ▼
7. Infrastructure: PostgreSQLOrderRepository
   │
   ▼
8. Infrastructure: INSERT INTO orders
   │
   ▼
9. Infrastructure: INSERT INTO order_items
   │
   ▼
10. Application: OrderDto создается
    │
    ▼
11. Backend: OrdersController возвращает OrderDto
    │
    ▼
12. Frontend: Отображение подтверждения заказа
    │
    ▼
13. User видит подтверждение
```

## 6. Поток работы помощника (мамонтёнка)

```
User → Frontend → Backend API → Application → Domain → Infrastructure
                                                              │
                                                              ▼
                                                          Mock Data
                                                              │
                                                              ▼
User ← Frontend ← Backend API ← Application ← Domain ← Infrastructure
```

**Детальный поток:**

```
1. User открывает диалог с помощником
   │
   ▼
2. Frontend: AssistantWidget отправляет запрос
   GET /api/assistant/response?routeId=123&message="Привет"
   │
   ▼
3. Backend: AssistantController получает запрос
   │
   ▼
4. Application: GetAssistantResponseQuery создается
   │
   ▼
5. Application: AssistantService обрабатывает
   - Анализ контекста (маршрут, погода, риски)
   - Генерация ответа
   │
   ▼
6. Application: WeatherService получает погоду
   │
   ▼
7. Infrastructure: MockWeatherRepository
   │
   ▼
8. Application: RiskAssessmentService оценивает риски
   │
   ▼
9. Application: Формирование ответа помощника
   - Текст сообщения
   - Погодная информация
   - Предупреждения о рисках
   - Факты о регионе
   - Предложения (страховка, поддержка)
   │
   ▼
10. Backend: AssistantController возвращает AssistantResponseDto
    │
    ▼
11. Frontend: AssistantDialog отображает ответ
    │
    ▼
12. User видит ответ мамонтёнка
```

## 7. Поток загрузки изображений

```
Frontend → Backend API → Infrastructure → MinIO
                                        │
                                        ▼
Frontend ← Backend API ← Infrastructure ← MinIO (URL)
```

**Детальный поток:**

```
1. Frontend: Компонент запрашивает изображение
   GET /api/attractions/123/image
   │
   ▼
2. Backend: AttractionsController получает запрос
   │
   ▼
3. Application: GetAttractionImageQuery
   │
   ▼
4. Infrastructure: S3FileStorage.getUrl()
   │
   ▼
5. Infrastructure: MinIO Client генерирует presigned URL
   │
   ▼
6. Backend: Возвращает URL изображения
   { "imageUrl": "http://minio:9000/bucket/images/123.jpg" }
   │
   ▼
7. Frontend: Загружает изображение напрямую из MinIO
   <img src="http://minio:9000/bucket/images/123.jpg" />
   │
   ▼
8. MinIO: Отдает изображение
   │
   ▼
9. Frontend: Отображает изображение пользователю
```

## 8. Схема данных (PostgreSQL)

```
┌─────────────┐
│   users     │
├─────────────┤
│ id (PK)     │
│ email       │
│ password    │
│ created_at  │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│  sessions   │
├─────────────┤
│ id (PK)     │
│ user_id(FK) │
│ token       │
│ expires_at  │
└─────────────┘

┌─────────────┐
│   orders    │
├─────────────┤
│ id (PK)     │
│ user_id(FK) │
│ route_id    │
│ status      │
│ total_price │
│ created_at  │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐
│  order_items     │
├──────────────────┤
│ id (PK)          │
│ order_id (FK)    │
│ service_type     │
│ service_id       │
│ price            │
└──────────────────┘

┌─────────────────────┐
│ insurance_selections │
├─────────────────────┤
│ id (PK)             │
│ order_id (FK)       │
│ insurance_type      │
│ price               │
│ created_at          │
└─────────────────────┘

┌──────────────────────────┐
│ premium_support_activations│
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK)             │
│ order_id (FK)            │
│ activated_at             │
│ expires_at               │
└──────────────────────────┘
```

## 9. Схема хранилища MinIO

```
travel-app (bucket)
│
├── icons/
│   ├── mammoth/
│   │   ├── mammoth-happy.png
│   │   ├── mammoth-sad.png
│   │   └── mammoth-thinking.png
│   ├── transport/
│   │   ├── bus.png
│   │   ├── train.png
│   │   └── plane.png
│   └── attractions/
│       ├── monument.png
│       └── landmark.png
│
├── images/
│   ├── places/
│   │   ├── yakutsk-1.jpg
│   │   └── moscow-1.jpg
│   ├── monuments/
│   │   ├── monument-1.jpg
│   │   └── monument-2.jpg
│   └── events/
│       ├── event-1.jpg
│       └── event-2.jpg
│
└── documents/
    └── (будущее)
```

## 10. Сетевая схема Docker

```
┌─────────────────────────────────────────────────┐
│         Docker Network: travel-app-network      │
│                                                 │
│  ┌──────────────┐                              │
│  │  Frontend    │ :3000 (exposed)              │
│  │  10.0.0.2    │                              │
│  └──────┬───────┘                              │
│         │                                       │
│  ┌──────▼───────┐                              │
│  │  Backend     │ :5000 (exposed)             │
│  │  10.0.0.3    │                              │
│  └──────┬───────┘                              │
│         │                                       │
│    ┌────┴────┐                                 │
│    │         │                                 │
│ ┌──▼───┐  ┌──▼────┐                            │
│ │Postgr│  │ MinIO │ :9000, :9001 (exposed)    │
│ │es    │  │       │                            │
│ │10.0.0│  │10.0.0.│                            │
│ │.4    │  │5      │                            │
│ └──────┘  └───────┘                            │
└─────────────────────────────────────────────────┘
```

## 11. Последовательность операций при старте

```
1. Docker Compose запускается
   │
   ▼
2. PostgreSQL контейнер стартует
   - Инициализация БД
   - Применение миграций
   │
   ▼
3. MinIO контейнер стартует
   - Создание bucket'ов
   - Настройка доступа
   │
   ▼
4. Backend контейнер стартует
   - Подключение к PostgreSQL
   - Подключение к MinIO
   - Загрузка mock-данных
   - Запуск HTTP-сервера
   │
   ▼
5. Frontend контейнер стартует
   - Сборка React-приложения
   - Запуск dev-сервера или Nginx
   │
   ▼
6. Все сервисы готовы
   - Frontend доступен на :3000
   - Backend доступен на :5000
   - MinIO Console на :9001
```

