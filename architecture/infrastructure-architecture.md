# Архитектура инфраструктуры

## 1. Общие принципы

### 1.1 Контейнеризация
Все компоненты системы разворачиваются в отдельных Docker-контейнерах:
- Изоляция компонентов
- Легкое масштабирование
- Простое управление зависимостями
- Консистентная среда разработки и production

### 1.2 Оркестрация
Docker Compose управляет всеми сервисами:
- Автоматический запуск зависимостей
- Управление сетями
- Управление томами
- Переменные окружения

## 2. Компоненты инфраструктуры

### 2.1 Frontend Container
**Образ:** Node.js или Nginx

**Конфигурация:**
- Статические файлы React-приложения
- Nginx для раздачи статики (production)
- Development server (development)

**Порты:**
- 3000 (development)
- 80 (production)

**Зависимости:**
- Backend API (через HTTP)

**Переменные окружения:**
- `REACT_APP_API_URL` — URL Backend API
- `REACT_APP_ENV` — окружение (development/production)

### 2.2 Backend API Container
**Образ:** Node.js

**Конфигурация:**
- Express/Fastify сервер
- TypeScript компиляция
- Hot reload (development)

**Порты:**
- 5000 (API)

**Зависимости:**
- PostgreSQL
- MinIO
- Redis

**Переменные окружения:**
- `DATABASE_URL` — строка подключения к PostgreSQL
- `S3_ENDPOINT` — endpoint MinIO
- `S3_ACCESS_KEY` — ключ доступа
- `S3_SECRET_KEY` — секретный ключ
- `S3_BUCKET` — имя bucket
- `REDIS_HOST` — хост Redis
- `REDIS_PORT` — порт Redis
- `REDIS_PASSWORD` — пароль Redis
- `REDIS_DB` — номер базы данных Redis
- `REDIS_TTL_DEFAULT` — время жизни кеша по умолчанию (секунды)
- `REDIS_TTL_ROUTES` — время жизни кеша маршрутов
- `REDIS_TTL_HOTELS` — время жизни кеша гостиниц
- `REDIS_TTL_TRANSPORT` — время жизни кеша транспорта
- `REDIS_TTL_FAVORITES` — время жизни кеша избранного
- `REDIS_TTL_SESSION` — время жизни сессий пользователей
- `JWT_SECRET` — секрет для JWT
- `NODE_ENV` — окружение

### 2.3 PostgreSQL Container
**Образ:** postgres:latest

**Конфигурация:**
- Версия: PostgreSQL 15+
- Кодировка: UTF-8
- Локаль: en_US.UTF-8

**Порты:**
- 5432 (внутренний)

**Тома:**
- `postgres_data` — данные БД

**Переменные окружения:**
- `POSTGRES_DB` — имя базы данных
- `POSTGRES_USER` — пользователь
- `POSTGRES_PASSWORD` — пароль

**Инициализация:**
- SQL-скрипты в `/docker-entrypoint-initdb.d/`
- Миграции при первом запуске

### 2.4 MinIO Container
**Образ:** minio/minio:latest

**Конфигурация:**
- S3-совместимое хранилище
- Минимальная конфигурация для MVP

**Порты:**
- 9000 (API)
- 9001 (Console)

**Тома:**
- `minio_data` — данные хранилища

**Переменные окружения:**
- `MINIO_ROOT_USER` — root пользователь
- `MINIO_ROOT_PASSWORD` — root пароль

**Buckets:**
- `travel-app` — основной bucket
  - `icons/` — иконки
  - `images/` — изображения
  - `documents/` — документы

### 2.5 Redis Container
**Образ:** redis:7-alpine

**Конфигурация:**
- In-memory хранилище для кеширования
- Персистентность через AOF (Append Only File)
- Пароль для безопасности

**Порты:**
- 6379 (Redis API)

**Тома:**
- `redis_data` — данные Redis (AOF файлы)

**Переменные окружения:**
- `REDIS_PASSWORD` — пароль для доступа к Redis

**Использование:**
- Кеширование результатов поиска маршрутов
- Кеширование данных о гостиницах
- Кеширование данных транспорта
- Кеширование раздела "Путешествуйте выгодно"
- Хранение пользовательских сессий
- Хранение черновиков заказов
- Хранение состояния фильтров

### 2.5 MinIO Console Container
**Образ:** minio/mc:latest (или встроенная консоль)

**Конфигурация:**
- Web-интерфейс для управления MinIO
- Доступ через браузер

**Порты:**
- 9001 (через MinIO)

## 3. Docker Compose конфигурация

### 3.1 Структура docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    # Frontend конфигурация
    
  backend:
    # Backend конфигурация
    
  postgres:
    # PostgreSQL конфигурация
    
  minio:
    # MinIO конфигурация
    
  redis:
    # Redis конфигурация
```

### 3.2 Сети
- `travel-app-network` — внутренняя сеть для всех сервисов
- Изоляция от внешней сети
- Доступ только через определенные порты

### 3.3 Тома
- `postgres_data` — персистентные данные PostgreSQL
- `minio_data` — персистентные данные MinIO
- `redis_data` — персистентные данные Redis (AOF)
- `backend_mock_data` — mock-данные для Backend

## 4. Переменные окружения

### 4.1 .env файл
Все настройки через переменные окружения:
- Ничего не хардкодится
- Разные конфигурации для dev/prod
- Безопасное хранение секретов

### 4.2 Пример .env
```env
# Database
POSTGRES_DB=travel_app
POSTGRES_USER=travel_user
POSTGRES_PASSWORD=secure_password

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0
REDIS_TTL_DEFAULT=3600
REDIS_TTL_ROUTES=1800
REDIS_TTL_HOTELS=1800
REDIS_TTL_TRANSPORT=1800
REDIS_TTL_FAVORITES=3600
REDIS_TTL_SESSION=86400

# Backend
DATABASE_URL=postgresql://travel_user:secure_password@postgres:5432/travel_app
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=travel-app
JWT_SECRET=your-secret-key

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

### 4.3 .env.example
Шаблон для разработчиков:
- Все переменные без значений
- Комментарии с описанием
- Примеры значений

## 5. Персистентность данных

### 5.1 PostgreSQL
- Данные хранятся в Docker volume
- Автоматическое создание при первом запуске
- Резервное копирование (будущее)

### 5.2 MinIO
- Файлы хранятся в Docker volume
- Структура bucket'ов
- Резервное копирование (будущее)

### 5.3 Redis
- Данные хранятся в памяти
- Персистентность через AOF (Append Only File)
- Автоматическое восстановление при перезапуске
- TTL для автоматической очистки устаревших данных

### 5.4 Mock-данные
- Хранятся в volume или в образе
- Загружаются при старте Backend
- Возможность обновления без пересборки

## 6. Сетевая архитектура

### 6.1 Внутренняя сеть
- Все сервисы в одной Docker сети
- Доступ по именам сервисов (DNS)
- Изоляция от внешней сети

### 6.2 Публичные порты
- Frontend: 3000 (dev) / 80 (prod)
- Backend: 5000
- MinIO Console: 9001

### 6.3 Внутренние порты
- PostgreSQL: 5432 (только внутри сети)
- MinIO API: 9000 (только внутри сети)
- Redis: 6379 (только внутри сети, опционально публичный для разработки)

## 7. Безопасность

### 7.1 Изоляция
- Каждый сервис в отдельном контейнере
- Минимальные права доступа
- Нет root-доступа где не нужно

### 7.2 Секреты
- Переменные окружения для секретов
- .env файл в .gitignore
- Использование Docker secrets (production)

### 7.3 Сеть
- Изоляция внутренней сети
- Ограничение публичных портов
- Firewall правила (production)

## 8. Мониторинг и логирование

### 8.1 Логирование
- Логи каждого контейнера
- Централизованное логирование (будущее)
- Ротация логов

### 8.2 Мониторинг
- Health checks для каждого сервиса
- Метрики производительности (будущее)
- Алерты (будущее)

### 8.3 Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 9. Развертывание

### 9.1 Development
```bash
docker-compose up
```
- Автоматический запуск всех сервисов
- Hot reload для Frontend и Backend
- Автоматическая инициализация БД

### 9.2 Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```
- Оптимизированные образы
- Nginx для Frontend
- Production настройки
- SSL сертификаты (будущее)

## 10. Масштабирование

### 10.1 Горизонтальное масштабирование
- Frontend: несколько инстансов за Nginx
- Backend: несколько инстансов за балансировщиком
- PostgreSQL: репликация (master-slave)
- MinIO: распределенное хранилище

### 10.2 Вертикальное масштабирование
- Увеличение ресурсов контейнеров
- Оптимизация запросов к БД
- Кэширование

## 11. Резервное копирование

### 11.1 PostgreSQL
- Регулярные дампы БД
- Автоматическое резервное копирование (будущее)
- Восстановление из бэкапа

### 11.2 MinIO
- Репликация данных
- Резервное копирование файлов
- Восстановление из бэкапа

## 12. Миграция на Kubernetes (будущее)

### 12.1 Преимущества
- Автомасштабирование
- Self-healing
- Rolling updates
- Service discovery

### 12.2 Компоненты
- Deployments для Frontend и Backend
- StatefulSets для PostgreSQL и MinIO
- Services для доступа
- Ingress для маршрутизации
- ConfigMaps и Secrets для конфигурации

## 13. CI/CD (будущее)

### 13.1 Pipeline
- Автоматическая сборка образов
- Тестирование
- Развертывание в staging
- Развертывание в production

### 13.2 Инструменты
- GitHub Actions / GitLab CI
- Docker Hub / Container Registry
- Kubernetes для развертывания

## 14. Оптимизация

### 14.1 Образы
- Минимальные базовые образы
- Multi-stage builds
- Кэширование слоев

### 14.2 Ресурсы
- Ограничение CPU и памяти
- Мониторинг использования ресурсов
- Оптимизация запросов

## 15. Troubleshooting

### 15.1 Логи
- Просмотр логов контейнеров
- Централизованное логирование
- Поиск по логам

### 15.2 Отладка
- Подключение к контейнерам
- Проверка сетевого подключения
- Проверка состояния сервисов


