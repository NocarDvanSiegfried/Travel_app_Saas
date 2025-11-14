# Архитектура Travel App SaaS (MVP)

## Обзор

Данная папка содержит полную архитектурную документацию проекта Travel App SaaS. Архитектура построена на принципах Clean Architecture для Backend и React Best Practices для Frontend.

## Структура документации

### 1. [Системная архитектура](./system-architecture.md)
Общее описание системы, компонентов и их взаимодействия. Включает:
- Концепцию системы
- Принципы архитектуры
- Схему взаимодействия компонентов
- Технологический стек
- Безопасность и масштабирование

### 2. [Архитектура Backend API](./backend-architecture.md)
Детальное описание Backend на основе Clean Architecture:
- Принципы Clean Architecture (правило зависимостей, инверсия зависимостей)
- Структура слоев (Domain, Application, Infrastructure, Presentation)
- Domain Layer - чистота ядра (сущности, value objects, доменные события)
- Application Layer - use cases, CQRS, Pipeline Behaviors
- Работа с PostgreSQL и S3
- Mock-данные в MVP
- Валидация, аудит, безопасность
- Обработка ошибок и логирование
- SOLID принципы и тестируемость

### 3. [Архитектура Frontend](./frontend-architecture.md)
Архитектура Frontend на React с принципами:
- Feature-Based Architecture
- Компонентная структура (Compound Components)
- Управление состоянием (Context, React Query, UI Store)
- Организация Hooks и Utils
- TypeScript Best Practices
- Разделение логики компонентов
- Lifecycle Management
- Работа с API
- Стилизация (тема "Якутский север")
- Производительность и доступность

### 4. [Архитектура инфраструктуры](./infrastructure-architecture.md)
Инфраструктурные компоненты:
- Docker контейнеры
- Docker Compose конфигурация
- PostgreSQL и MinIO
- Переменные окружения
- Развертывание и масштабирование

### 5. [Диаграммы взаимодействия](./component-diagrams.md)
Визуальные схемы и диаграммы:
- Общая архитектура системы
- Слои Backend (Clean Architecture)
- Потоки обработки запросов
- Схемы данных
- Сетевые схемы

## Ключевые принципы

### Разделение ответственности
- **Frontend** — только UI, без бизнес-логики
- **Backend** — бизнес-логика и данные
- **Инфраструктура** — хранение и сервисы

### Изоляция компонентов
- Каждый компонент в отдельном контейнере
- Взаимодействие только через четко определенные интерфейсы
- Нет прямых зависимостей между компонентами

### Clean Architecture (Backend)
- Зависимости направлены внутрь (Dependency Rule)
- Domain Layer не зависит от внешних слоев
- Инверсия зависимостей (Dependency Inversion)
- CQRS паттерн (Commands/Queries)
- Pipeline Behaviors для cross-cutting concerns
- SOLID принципы
- Легкая замена инфраструктуры
- Высокая тестируемость

**Подробнее:** [Архитектура Backend API](./backend-architecture.md)

### React Best Practices (Frontend)
- Feature-Based Architecture
- Компонентный подход
- Compound Components
- Разделение на умные и глупые компоненты
- Управление состоянием (Context, React Query, UI Store)
- Организация Hooks и Utils
- TypeScript Best Practices
- Performance оптимизация

**Подробнее:** [Архитектура Frontend](./frontend-architecture.md)

## Компоненты системы

```
┌──────────────┐
│  Frontend    │  React приложение
│  (Container) │  Порт: 3000
└──────┬───────┘
       │ HTTP/REST
       │
┌──────▼───────┐
│  Backend API │  Node.js приложение
│  (Container) │  Порт: 5000
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
┌──▼───┐ ┌─▼────┐
│Postgr│ │MinIO │  Инфраструктура
│es    │ │(S3)  │  Порты: 5432, 9000
└──────┘ └──────┘
```

## Технологический стек

### Frontend
- React 18+
- TypeScript
- React Router
- React Query / SWR
- Leaflet / Mapbox (карта)
- Axios / Fetch

### Backend
- Node.js 18+
- Express / Fastify
- TypeScript
- PostgreSQL (pg / Prisma)
- MinIO SDK / AWS SDK

### Инфраструктура
- Docker
- Docker Compose
- PostgreSQL 15+
- MinIO (S3-совместимое)

## Потоки данных

### Пользовательский запрос
1. User → Frontend
2. Frontend → Backend API (HTTP)
3. Backend → PostgreSQL / MinIO / Mock Data
4. Backend → Frontend (JSON)
5. Frontend → User (UI)

### Типы данных
- **Пользовательские данные** → PostgreSQL
- **Файлы и изображения** → MinIO (S3)
- **Mock-данные** → Backend (файлы/память)

## Безопасность

### Аутентификация
- JWT токены
- Хранение в PostgreSQL (sessions)
- Защита API endpoints

### Авторизация
- Проверка прав доступа
- Изоляция данных по user_id
- Роли пользователей (будущее)

### Защита данных
- Валидация входных данных
- Защита от SQL-инъекций (ORM)
- Защита от XSS
- CORS настройки

## Масштабирование

### Горизонтальное масштабирование
- Frontend: несколько инстансов за балансировщиком
- Backend: несколько инстансов за балансировщиком
- PostgreSQL: репликация (master-slave)
- MinIO: распределенное хранилище

### Вертикальное масштабирование
- Увеличение ресурсов контейнеров
- Оптимизация запросов к БД
- Кэширование

## Mock-данные в MVP

Backend работает с mock-файлами:
- `data/routes.json` — маршруты
- `data/cities.json` — города
- `data/weather.json` — погода
- `data/hotels.json` — гостиницы
- `data/car-rentals.json` — аренда авто
- `data/attractions.json` — достопримечательности
- `data/events.json` — события
- `data/facts.json` — факты для помощника

## Будущее развитие

### Замена mock-данных
- Интеграция с реальными API маршрутизации
- Интеграция с погодными сервисами
- Интеграция с сервисами гостиниц

### Миграция на Kubernetes
- Замена Docker Compose на Kubernetes
- Автомасштабирование
- Self-healing
- Rolling updates

### Дополнительные функции
- Платежная система
- Email-уведомления
- Мобильное приложение
- Офлайн-режим

## Цветовая тема "Якутский север"

- Ледяной голубой: `#E0F2F7`
- Северный синий: `#1E3A5F`
- Бирюза: `#4ECDC4`
- Снежный белый: `#FFFFFF`
- Фиолетовое сияние: `#9B59B6`

## Дополнительные ресурсы

- [Бизнес требования](../documentation/Бизнес%20требования.xlsx)
- [Диаграмма со связями](../documentation/Диаграмма%20со%20связями.png)
- [Краткие пояснения к диаграмме](../documentation/Краткие%20пояснения%20к%20диаграмме.docx)

## Контакты

Для вопросов по архитектуре обращайтесь к команде разработки.

