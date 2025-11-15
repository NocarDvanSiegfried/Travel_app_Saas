# Конфигурация и переменные окружения

## 1. Общие принципы

### 1.1 Управление конфигурацией
- **Переменные окружения** для всех настроек
- **Разделение по окружениям** (dev, staging, prod)
- **Secrets** в переменных окружения, не в коде
- **Валидация** при старте приложения

### 1.2 Файлы конфигурации
- `.env` — локальная разработка (не коммитится)
- `.env.example` — пример конфигурации (коммитится)
- `.env.production` — продакшн (не коммитится)
- `docker-compose.yml` — переменные для Docker

---

## 2. Глобальный реестр переменных

### 2.1 Frontend переменные

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `REACT_APP_API_URL` | URL Backend API | `http://localhost:5000` | Да |
| `REACT_APP_API_VERSION` | Версия API | `v1` | Да |
| `REACT_APP_MAP_API_KEY` | API ключ для карты | `your-map-api-key` | Нет |
| `REACT_APP_ENV` | Окружение | `development` | Да |

---

### 2.2 Backend переменные

#### 2.2.1 Общие настройки

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `NODE_ENV` | Окружение | `development` | Да |
| `PORT` | Порт сервера | `5000` | Да |
| `API_VERSION` | Версия API | `v1` | Да |
| `LOG_LEVEL` | Уровень логирования | `info` | Да |

---

#### 2.2.2 База данных (PostgreSQL)

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `DB_HOST` | Хост БД | `localhost` | Да |
| `DB_PORT` | Порт БД | `5432` | Да |
| `DB_NAME` | Имя БД | `travel_app` | Да |
| `DB_USER` | Пользователь БД | `admin` | Да |
| `DB_PASSWORD` | Пароль БД | `***` | Да |
| `DB_SSL` | Использовать SSL | `false` | Нет |
| `DB_POOL_MIN` | Минимум соединений | `2` | Нет |
| `DB_POOL_MAX` | Максимум соединений | `10` | Нет |

---

#### 2.2.3 MinIO (S3)

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `MINIO_ENDPOINT` | Endpoint MinIO | `localhost:9000` | Да |
| `MINIO_ACCESS_KEY` | Access Key | `minioadmin` | Да |
| `MINIO_SECRET_KEY` | Secret Key | `***` | Да |
| `MINIO_BUCKET` | Имя bucket | `travel-app` | Да |
| `MINIO_USE_SSL` | Использовать SSL | `false` | Нет |
| `MINIO_REGION` | Регион | `us-east-1` | Нет |

---

#### 2.2.4 JWT

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `JWT_SECRET` | Секретный ключ | `***` | Да |
| `JWT_EXPIRES_IN` | Срок действия | `24h` | Да |
| `JWT_ALGORITHM` | Алгоритм | `HS256` | Нет |

---

#### 2.2.5 Безопасность

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `BCRYPT_SALT_ROUNDS` | Salt rounds для bcrypt | `10` | Да |
| `CORS_ORIGIN` | Разрешенные домены | `http://localhost:3000` | Да |
| `RATE_LIMIT_MAX` | Максимум запросов | `100` | Нет |
| `RATE_LIMIT_WINDOW` | Окно времени (мс) | `60000` | Нет |

---

#### 2.2.6 Mock-данные

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `MOCK_DATA_PATH` | Путь к mock-файлам | `./data` | Да |
| `MOCK_DATA_CACHE` | Кэшировать данные | `true` | Нет |

---

### 2.3 Docker Compose переменные

| Переменная | Описание | Пример | Обязательно |
|------------|----------|--------|-------------|
| `POSTGRES_DB` | Имя БД | `travel_app` | Да |
| `POSTGRES_USER` | Пользователь БД | `admin` | Да |
| `POSTGRES_PASSWORD` | Пароль БД | `***` | Да |
| `MINIO_ROOT_USER` | Root пользователь MinIO | `minioadmin` | Да |
| `MINIO_ROOT_PASSWORD` | Root пароль MinIO | `***` | Да |

---

## 3. Различия между окружениями

### 3.1 Development (Разработка)

**Характеристики:**
- Подробное логирование
- Отладочная информация
- Локальные сервисы
- Быстрая перезагрузка

**Пример `.env.development`:**
```env
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug

DB_HOST=localhost
DB_PORT=5432
DB_NAME=travel_app_dev
DB_USER=admin
DB_PASSWORD=dev_password

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:3000
```

---

### 3.2 Production (Продакшн)

**Характеристики:**
- Минимальное логирование
- Безопасные настройки
- Внешние сервисы
- Оптимизация производительности

**Пример `.env.production`:**
```env
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

DB_HOST=postgres.production.internal
DB_PORT=5432
DB_NAME=travel_app
DB_USER=app_user
DB_PASSWORD=***SECRET***

MINIO_ENDPOINT=minio.production.internal:9000
MINIO_ACCESS_KEY=***SECRET***
MINIO_SECRET_KEY=***SECRET***

JWT_SECRET=***SECRET***
JWT_EXPIRES_IN=24h

CORS_ORIGIN=https://travel-app.example.com

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

---

### 3.3 Staging (Тестирование)

**Характеристики:**
- Похоже на production
- Тестовые данные
- Расширенное логирование

**Пример `.env.staging`:**
```env
NODE_ENV=staging
PORT=5000
LOG_LEVEL=info

DB_HOST=postgres.staging.internal
DB_PORT=5432
DB_NAME=travel_app_staging
DB_USER=staging_user
DB_PASSWORD=***SECRET***

MINIO_ENDPOINT=minio.staging.internal:9000
MINIO_ACCESS_KEY=***SECRET***
MINIO_SECRET_KEY=***SECRET***

JWT_SECRET=***SECRET***
JWT_EXPIRES_IN=24h

CORS_ORIGIN=https://staging.travel-app.example.com
```

---

## 4. Правила хранения .env

### 4.1 Что коммитить

**Коммитится:**
- `.env.example` — пример конфигурации
- `docker-compose.yml` — с переменными по умолчанию
- Документация с описанием переменных

**НЕ коммитится:**
- `.env` — локальная конфигурация
- `.env.production` — продакшн конфигурация
- `.env.local` — локальные переопределения
- Файлы с секретами

---

### 4.2 .gitignore

**Пример:**
```gitignore
# Environment variables
.env
.env.local
.env.production
.env.staging
.env.*.local

# Secrets
*.secret
secrets/
```

---

## 5. Структура secrets

### 5.1 Типы secrets

**Критические (не коммитить):**
- Пароли БД
- JWT секреты
- API ключи
- Access keys для MinIO

**Менее критичные:**
- URL сервисов
- Порты
- Имена БД

---

### 5.2 Управление secrets

**Development:**
- Хранение в `.env` (локально)
- Не коммитить в Git

**Production:**
- Хранение в секретах Kubernetes/Docker
- Использование внешних систем (Vault, AWS Secrets Manager)
- Ротация секретов

---

## 6. Валидация конфигурации

### 6.1 Проверка при старте

**Пример:**
```javascript
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'JWT_SECRET'
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Валидация значений
  if (process.env.PORT && isNaN(process.env.PORT)) {
    throw new Error('PORT must be a number');
  }
  
  if (process.env.NODE_ENV && !['development', 'staging', 'production'].includes(process.env.NODE_ENV)) {
    throw new Error('NODE_ENV must be development, staging, or production');
  }
};

// Вызов при старте
validateEnv();
```

---

## 7. Примеры конфигурации

### 7.1 .env.example

```env
# Application
NODE_ENV=development
PORT=5000
API_VERSION=v1
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travel_app
DB_USER=admin
DB_PASSWORD=your_password_here
DB_SSL=false

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=travel-app
MINIO_USE_SSL=false

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
JWT_ALGORITHM=HS256

# Security
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Mock Data
MOCK_DATA_PATH=./data
MOCK_DATA_CACHE=true
```

---

### 7.2 docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    environment:
      - NODE_ENV=development
      - PORT=5000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${POSTGRES_DB}
      - DB_USER=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ROOT_USER}
      - MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - JWT_SECRET=${JWT_SECRET:-dev_secret}
      - CORS_ORIGIN=http://localhost:3000

  postgres:
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-travel_app}
      - POSTGRES_USER=${POSTGRES_USER:-admin}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}

  minio:
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin}
```

---

## 8. Безопасность

### 8.1 Защита secrets

**Правила:**
- Никогда не коммитить secrets в Git
- Использовать сильные пароли
- Ротация secrets регулярно
- Ограничение доступа к secrets

---

### 8.2 Шифрование

**Рекомендации:**
- Шифрование secrets в хранилище
- Использование TLS для подключений
- Шифрование паролей в БД (bcrypt)

---

## 9. Мониторинг конфигурации

### 9.1 Проверка конфигурации

**Метрики:**
- Валидность конфигурации при старте
- Отсутствующие переменные
- Неверные значения

---

### 9.2 Алерты

**Условия:**
- Отсутствие обязательных переменных
- Неверные значения переменных
- Истечение сроков действия secrets

---

## 10. Будущие улучшения

### 10.1 Централизованное управление
- Использование конфигурационных сервисов
- Динамическое обновление конфигурации
- Версионирование конфигурации

### 10.2 Улучшенная безопасность
- Интеграция с Vault или аналогичными системами
- Автоматическая ротация secrets
- Аудит доступа к secrets

