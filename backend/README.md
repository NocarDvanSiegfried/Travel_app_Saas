# Travel App Backend

Backend API built with Clean Architecture principles.

## Structure

```
src/
├── domain/           # Domain layer (entities, interfaces)
├── application/      # Application layer (use cases)
├── infrastructure/   # Infrastructure layer (repositories, external services)
└── presentation/     # Presentation layer (controllers, routes, middleware)
```

## Quick Start

### Development (Docker)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

### Development (Local)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```bash
# Build project
npm run build

# Start production server
npm start
```

## Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Детальное руководство по развертыванию
- **[MONITORING.md](./MONITORING.md)** - Руководство по мониторингу и метрикам
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Решение типичных проблем

## API Documentation

- **Swagger UI**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/health
- **Metrics**: http://localhost:5000/api/v1/metrics

## Environment Variables

См. [DEPLOYMENT.md](./DEPLOYMENT.md#переменные-окружения) для полного списка переменных окружения.

Основные переменные:
- `NODE_ENV` - Окружение (development, production)
- `PORT` - Порт сервера (по умолчанию: 5000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Настройки PostgreSQL
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Настройки Redis
- `JWT_SECRET` - Секретный ключ для JWT токенов

## Scripts

```bash
# Development
npm run dev              # Запуск в режиме разработки
npm run docker:dev       # Запуск в Docker (development)

# Build
npm run build            # Сборка TypeScript
npm start                # Запуск production сервера
npm run docker:start     # Запуск в Docker (production)

# Code Quality
npm run lint             # Запуск ESLint
npm run type-check       # Проверка TypeScript типов

# Testing
npm test                 # Запуск всех тестов
npm run test:unit        # Запуск unit тестов
npm run test:integration # Запуск integration тестов
npm run test:coverage    # Запуск тестов с покрытием
```

## Health Checks

```bash
# Liveness probe
curl http://localhost:5000/health/live

# Readiness probe
curl http://localhost:5000/health/ready

# Detailed health check
curl http://localhost:5000/health
```

## Monitoring

Метрики Prometheus доступны по адресу:
```bash
curl http://localhost:5000/api/v1/metrics
```

См. [MONITORING.md](./MONITORING.md) для настройки мониторинга и алертов.

## Troubleshooting

См. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) для решения типичных проблем.



