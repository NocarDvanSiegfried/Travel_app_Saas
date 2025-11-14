# Архитектура Backend API (Clean Architecture)

## 1. Общие принципы Clean Architecture

### 1.1 Правило зависимостей (Dependency Rule)
**Зависимости направлены внутрь:**
- Внешние слои зависят от внутренних
- Внутренние слои не зависят от внешних
- Domain Layer не имеет зависимостей

```
Presentation → Application → Domain
Infrastructure → Application → Domain
```

### 1.2 Инверсия зависимостей (Dependency Inversion)
- Интерфейсы определены в Domain/Application слоях
- Реализации находятся в Infrastructure слое
- Зависимости через абстракции, а не конкретные реализации

### 1.3 Разделение ответственности (Separation of Concerns)
- Каждый слой имеет четкую ответственность
- Нет смешивания бизнес-логики и инфраструктуры
- UI-логика отделена от бизнес-логики

### 1.4 Структура слоев
Backend построен на принципах Clean Architecture с четким разделением на слои:

- **Domain Layer** — бизнес-логика и сущности (ядро)
- **Application Layer** — use cases и бизнес-правила
- **Infrastructure Layer** — внешние зависимости (БД, S3, файлы)
- **Presentation Layer** — API endpoints и HTTP-обработка

## 2. Структура слоев

### 2.1 Domain Layer (Ядро)
**Ответственность:** Бизнес-логика, сущности, интерфейсы

**Принципы Domain Layer:**
- Содержит только бизнес-логику
- Не зависит от фреймворков
- Не зависит от БД
- Имеет уникальный идентификатор
- Может содержать доменные события

#### Сущности (Entities)
**Характеристики:**
- Содержат только бизнес-логику
- Не зависят от фреймворков
- Не зависят от БД
- Имеют уникальный идентификатор
- Могут содержать доменные события

**Сущности проекта:**
- `User` — пользователь системы
- `Route` — маршрут транспорта
- `Order` — заказ билетов
- `Insurance` — страховка
- `PremiumSupport` — премиальная поддержка
- `Attraction` — достопримечательность
- `Event` — региональное событие

**Базовые классы:**
- `BaseEntity` — базовая сущность с ID и доменными событиями
- `BaseAuditableEntity` — сущность с аудитом (Created, CreatedBy, LastModified, LastModifiedBy)

#### Value Objects
**Характеристики:**
- Неизменяемые (immutable)
- Определяются по значению, а не по идентификатору
- Содержат валидацию

**Value Objects проекта:**
- `Coordinates` — координаты места
- `Price` — цена с валютой
- `WeatherCondition` — погодные условия
- `RiskLevel` — уровень риска задержки

#### Интерфейсы репозиториев
**Принципы:**
- Определены в Domain или Application слое
- Абстракции, не конкретные реализации
- Ориентированы на домен, а не на БД

**Интерфейсы проекта:**
- `IUserRepository`
- `IRouteRepository`
- `IOrderRepository`
- `IInsuranceRepository`
- `IAttractionRepository`
- `IEventRepository`
- `IWeatherRepository`
- `IFileStorage` (S3)

#### Доменные события (Domain Events)
**Назначение:**
- Уведомление о важных изменениях в домене
- Декомпозиция бизнес-процессов
- Интеграция между bounded contexts

**Доменные события проекта:**
- `RouteSearched` — маршрут найден
- `OrderCreated` — заказ создан
- `InsuranceSelected` — страховка выбрана
- `RiskDetected` — риск обнаружен

**Обработка событий:**
- События добавляются в сущность через `AddDomainEvent()`
- Автоматически диспатчатся через EF Core Interceptor
- Обрабатываются через MediatR handlers

### 2.2 Application Layer (Use Cases)
**Ответственность:** Бизнес-правила и use cases

**Принципы Application Layer:**
- Один use case = одна бизнес-операция
- Независимы друг от друга
- Легко тестируются
- Используют интерфейсы, а не конкретные реализации

#### CQRS (Command Query Responsibility Segregation)
**Разделение:**
- **Commands** — изменяют состояние (CreateOrder, UpdateUser)
- **Queries** — только читают данные (GetRoutes, GetUserProfile)

**Преимущества:**
- Четкое разделение операций чтения и записи
- Оптимизация для каждого типа операций
- Масштабируемость

#### Use Cases (Commands/Queries)

**Маршруты:**
- `SearchRoutesQuery` — поиск маршрутов
- `GetRouteDetailsQuery` — детали маршрута
- `GetRouteMapQuery` — карта маршрута

**Пользователи:**
- `RegisterUserCommand` — регистрация
- `LoginUserCommand` — вход
- `GetUserProfileQuery` — профиль пользователя
- `UpdateUserProfileCommand` — обновление профиля

**Заказы:**
- `CreateOrderCommand` — создание заказа
- `GetUserOrdersQuery` — заказы пользователя
- `CancelOrderCommand` — отмена заказа

**Страховка:**
- `GetInsuranceOptionsQuery` — варианты страховки
- `SelectInsuranceCommand` — выбор страховки

**Премиальная поддержка:**
- `GetPremiumSupportOptionsQuery` — варианты поддержки
- `ActivatePremiumSupportCommand` — активация поддержки

**Помощник (мамонтёнок):**
- `GetAssistantResponseQuery` — ответ помощника
- `GetWeatherInfoQuery` — информация о погоде
- `GetRiskAssessmentQuery` — оценка рисков
- `GetFactsQuery` — факты о регионе

**Достопримечательности:**
- `GetAttractionsQuery` — список достопримечательностей
- `GetAttractionDetailsQuery` — детали достопримечательности

**События:**
- `GetEventsQuery` — список событий
- `GetEventDetailsQuery` — детали события

**Гостиницы и авто:**
- `GetHotelsQuery` — список гостиниц
- `GetCarRentalsQuery` — аренда авто

#### Pipeline Behaviors (MediatR)
**Порядок выполнения:**
1. **LoggingBehavior** — логирование запросов
2. **ExceptionBehavior** — обработка исключений
3. **AuthorizationBehavior** — проверка прав доступа
4. **ValidationBehavior** — валидация входных данных
5. **PerformanceBehavior** — мониторинг производительности

**Преимущества:**
- Cross-cutting concerns в одном месте
- Переиспользование логики
- Легкое добавление новых behaviors

#### Сервисы (Services)
- `RouteService` — логика поиска маршрутов
- `WeatherService` — обработка погодных данных
- `AssistantService` — логика помощника
- `InsuranceService` — расчет страховки
- `RiskAssessmentService` — оценка рисков
- `PaymentService` — обработка платежей (будущее)

#### DTOs (Data Transfer Objects)
**Назначение:**
- Передача данных между слоями
- Защита доменной модели
- Оптимизация для API

**Принципы:**
- Только данные, без логики
- Валидация через FluentValidation
- Маппинг через AutoMapper

**DTOs проекта:**
- `RouteDto`
- `UserDto`
- `OrderDto`
- `InsuranceDto`
- `AttractionDto`
- `EventDto`
- `WeatherDto`
- `AssistantResponseDto`

### 2.3 Infrastructure Layer
**Ответственность:** Внешние зависимости и их реализация

#### Репозитории (Repositories)
- `PostgreSQLUserRepository` — реализация IUserRepository
- `MockRouteRepository` — реализация IRouteRepository (mock-данные)
- `PostgreSQLOrderRepository` — реализация IOrderRepository
- `PostgreSQLInsuranceRepository` — реализация IInsuranceRepository
- `MockAttractionRepository` — реализация IAttractionRepository
- `MockEventRepository` — реализация IEventRepository
- `MockWeatherRepository` — реализация IWeatherRepository
- `S3FileStorage` — реализация IFileStorage

#### Внешние сервисы
- `PostgreSQLClient` — клиент БД
- `S3Client` — клиент MinIO/S3
- `MockDataLoader` — загрузка mock-данных из файлов

#### Конфигурация
- `DatabaseConfig` — настройки БД
- `S3Config` — настройки S3
- `JWTConfig` — настройки JWT
- `AppConfig` — общие настройки

### 2.4 Presentation Layer (API)
**Ответственность:** HTTP endpoints и обработка запросов

#### Контроллеры/Роуты
- `RoutesController` — `/api/routes`
- `AuthController` — `/api/auth`
- `UsersController` — `/api/users`
- `OrdersController` — `/api/orders`
- `InsuranceController` — `/api/insurance`
- `PremiumSupportController` — `/api/premium-support`
- `AssistantController` — `/api/assistant`
- `AttractionsController` — `/api/attractions`
- `EventsController` — `/api/events`
- `HotelsController` — `/api/hotels`
- `CarRentalsController` — `/api/car-rentals`

#### Middleware
- `AuthenticationMiddleware` — проверка JWT
- `ErrorHandlingMiddleware` — обработка ошибок
- `LoggingMiddleware` — логирование запросов
- `ValidationMiddleware` — валидация входных данных
- `CorsMiddleware` — CORS настройки

#### DTOs для API
- Request DTOs (входные данные)
- Response DTOs (выходные данные)
- Error DTOs (ошибки)

## 3. Поток обработки запроса

### 3.1 Пример: Поиск маршрутов

```
1. HTTP Request → Presentation Layer
   GET /api/routes?from=Yakutsk&to=Moscow&date=2024-01-15

2. RoutesController → Application Layer
   SearchRoutesQuery

3. RouteService (Application) → Domain
   - Валидация параметров
   - Применение бизнес-правил
   - Вызов репозитория

4. MockRouteRepository (Infrastructure) → Domain
   - Чтение mock-данных
   - Фильтрация по параметрам
   - Возврат результатов

5. Application Layer → Presentation Layer
   RouteDto[]

6. Presentation Layer → HTTP Response
   JSON с маршрутами
```

## 4. Mock-данные в MVP

### 4.1 Структура mock-данных
- `data/routes.json` — маршруты
- `data/cities.json` — города
- `data/weather.json` — погодные условия
- `data/hotels.json` — гостиницы
- `data/car-rentals.json` — аренда авто
- `data/attractions.json` — достопримечательности
- `data/events.json` — события
- `data/facts.json` — факты для помощника

### 4.2 Загрузка mock-данных
- При старте приложения
- Кэширование в памяти
- Возможность перезагрузки через API (dev)

## 5. Работа с базой данных

### 5.1 PostgreSQL схемы

**users:**
- id, email, password_hash, created_at, updated_at

**sessions:**
- id, user_id, token, expires_at, created_at

**orders:**
- id, user_id, route_id, status, total_price, created_at, updated_at

**order_items:**
- id, order_id, service_type, service_id, price

**insurance_selections:**
- id, order_id, insurance_type, price, created_at

**premium_support_activations:**
- id, user_id, order_id, activated_at, expires_at

### 5.2 Миграции
- Версионирование схемы БД
- Автоматическое применение при старте (dev)
- Ручное применение в production

## 6. Работа с S3 (MinIO)

### 6.1 Структура хранилища
```
bucket/
├── icons/
│   ├── mammoth/          # иконки мамонтёнка
│   ├── transport/        # иконки транспорта
│   └── attractions/      # иконки достопримечательностей
├── images/
│   ├── places/           # изображения мест
│   ├── monuments/         # памятники
│   └── events/            # события
└── documents/             # PDF и другие документы
```

### 6.2 Операции
- Загрузка файлов
- Получение URL для доступа
- Удаление файлов
- Список файлов

## 7. Валидация

### 7.1 FluentValidation
**Принципы:**
- Валидация в Application слое
- Отдельные валидаторы для каждого Command/Query
- Возврат понятных ошибок

**Структура:**
```
Application/
├── Routes/
│   ├── Commands/
│   │   └── CreateRoute/
│   │       └── CreateRouteValidator.cs
```

## 8. Аудит и отслеживание изменений

### 8.1 BaseAuditableEntity
**Поля:**
- Created — дата создания
- CreatedBy — кто создал
- LastModified — дата изменения
- LastModifiedBy — кто изменил

**Автоматическое заполнение:**
- Через EF Core Interceptor
- Прозрачно для бизнес-логики

## 9. Безопасность

### 9.1 Аутентификация
- JWT токены
- Хранение в PostgreSQL (sessions)
- Refresh tokens (будущее)

### 9.2 Авторизация
- Проверка прав доступа через AuthorizationBehavior
- Role-based authorization (роли)
- Policy-based authorization (политики)
- Изоляция данных по user_id
- Роли пользователей (будущее)

### 9.3 Валидация и защита
- Валидация входных данных (FluentValidation)
- Санитизация строк
- Защита от SQL-инъекций (ORM)
- Защита от XSS

## 10. Обработка ошибок

### 10.1 Типы исключений
- **ValidationException** — ошибки валидации (400)
- **NotFoundException** — ресурс не найден (404)
- **UnauthorizedException** — не авторизован (401)
- **ForbiddenException** — нет доступа (403)
- **BusinessLogicException** — ошибки бизнес-логики (400)
- **InfrastructureError** — ошибки инфраструктуры (500)

### 10.2 Централизованная обработка
- Global Exception Handler
- Преобразование исключений в HTTP ответы
- Логирование ошибок
- Возврат понятных сообщений клиенту
- Не раскрывать внутренние детали

## 11. Логирование

### 11.1 Уровни логирования
- ERROR — критические ошибки
- WARN — предупреждения
- INFO — информационные сообщения
- DEBUG — отладочная информация

### 11.2 Что логировать
- Входящие запросы (через LoggingBehavior)
- Исходящие ответы
- Ошибки
- Бизнес-события (доменные события)
- Время выполнения запросов (через PerformanceBehavior)

## 12. Тестирование

### 12.1 Типы тестов
- Unit tests — тестирование отдельных компонентов
- Integration tests — тестирование интеграций
- E2E tests — тестирование полных сценариев

### 12.2 Принципы тестирования
- Легкое создание моков благодаря интерфейсам
- Независимость тестов
- Быстрые unit тесты
- Медленные integration тесты отдельно

### 12.3 Покрытие
- Domain Layer — 100%
- Application Layer — 80%+
- Infrastructure Layer — 70%+
- Presentation Layer — 60%+

## 13. Масштабирование

### 13.1 Горизонтальное масштабирование
- Stateless API — можно масштабировать горизонтально
- Shared session storage (Redis) — для сессий
- Load balancer — распределение нагрузки

### 13.2 Вертикальное масштабирование
- Оптимизация запросов к БД
- Кэширование
- Асинхронная обработка

### 13.3 Оптимизация
- Кэширование часто запрашиваемых данных
- Индексы в БД
- Пагинация результатов
- Ленивая загрузка данных

## 14. Чистота кода (SOLID принципы)

### 14.1 SOLID
- **S**ingle Responsibility — один класс, одна ответственность
- **O**pen/Closed — открыт для расширения, закрыт для изменения
- **L**iskov Substitution — подтипы должны заменять базовые типы
- **I**nterface Segregation — маленькие интерфейсы
- **D**ependency Inversion — зависимости через абстракции

### 14.2 DRY (Don't Repeat Yourself)
- Переиспользование кода
- Общие утилиты
- Базовые классы

### 14.3 KISS (Keep It Simple, Stupid)
- Простота решений
- Избегание преждевременной оптимизации
- Понятный код
