# Test Infrastructure Documentation

## Структура тестов

```
backend/src/__tests__/
├── config/                    # Конфигурация тестов
│   └── test-config.ts         # Централизованная конфигурация
├── mocks/                     # Моки внешних зависимостей
│   ├── database.mock.ts       # PostgreSQL моки
│   ├── redis.mock.ts          # Redis (redis) моки
│   ├── redis-connection.mock.ts # Redis (ioredis) моки
│   ├── osrm-client.mock.ts   # OSRM Client моки
│   ├── osrm-environment.mock.ts # OSRM окружение
│   ├── cache-service.mock.ts  # Cache Service моки
│   └── index.ts               # Централизованный экспорт
├── fixtures/                  # Тестовые данные
│   ├── cities/                # Города
│   ├── connections/           # Соединения
│   ├── routes/                # Маршруты
│   └── osrm/                  # OSRM ответы
├── unit/                      # Unit тесты
│   └── smart-routing/         # SMART ROUTING unit тесты
│       ├── algorithms/        # Алгоритмы
│       ├── validation/        # Валидация
│       ├── entities/           # Сущности
│       ├── value-objects/     # Value Objects
│       └── data/               # Данные
├── integration/               # Integration тесты
│   ├── smart-routing/         # SMART ROUTING integration тесты
│   │   ├── algorithms/        # Алгоритмы
│   │   ├── api/               # API endpoints
│   │   └── end-to-end-flow/   # End-to-end потоки
│   └── helpers/               # Вспомогательные функции
│       └── test-db.ts         # Работа с тестовой БД
├── e2e/                       # E2E тесты
│   ├── smart-routes/          # SMART ROUTES E2E
│   └── frontend/              # Frontend E2E
├── setup.ts                   # Unit тесты setup
└── README.md                  # Эта документация
```

## Типы тестов

### Unit Tests
- **Конфигурация:** `jest.config.js`
- **Setup:** `src/__tests__/setup.ts`
- **Окружение:** Полностью изолированное с моками
- **Покрытие:** 80%+ глобально, 100% для критических модулей

### Integration Tests
- **Конфигурация:** `jest.integration.config.js`
- **Setup:** `src/__tests__/integration/setup.ts`
- **Окружение:** Тестовая БД и Redis, моки OSRM по умолчанию
- **Покрытие:** 70%+ глобально

### E2E Tests
- **Конфигурация:** `jest.e2e.config.js`
- **Setup:** `src/__tests__/e2e/setup.ts`
- **Окружение:** Реальное окружение (Docker Compose)
- **Покрытие:** 50%+ глобально

## Моки

Все моки стабильные, повторяемые и изолированные от продакшена.

### Database Mock
```typescript
import { createMockPool, createMockPoolClient, createMockQueryResult } from './mocks';

const pool = createMockPool();
const client = createMockPoolClient();
const result = createMockQueryResult([{ id: 1, name: 'Test' }]);
```

### Redis Mock
```typescript
import { createMockRedisClient } from './mocks';

const redis = createMockRedisClient();
await redis.set('key', 'value');
const value = await redis.get('key');
```

### OSRM Mock
```typescript
import { setOsrmSuccessResponse, mockOsrmFetch } from './mocks/osrm-environment';

const from = new Coordinates(62.0, 129.7);
const to = new Coordinates(66.0, 129.7);
setOsrmSuccessResponse(from, to, 500000, 3600);
const result = await mockOsrmFetch({ from, to });
```

### Cache Service Mock
```typescript
import { createMockCacheService } from './mocks';

const cache = createMockCacheService();
await cache.set('key', { data: 'value' }, 3600);
const value = await cache.get('key');
```

## Запуск тестов

```bash
# Unit тесты
npm run test:unit

# Integration тесты
npm run test:integration

# E2E тесты
npm run test:e2e

# Все тесты
npm run test:all

# С покрытием
npm run test:coverage
```

## Переменные окружения

Тесты используют изолированные переменные окружения из `TEST_ENV`:
- `NODE_ENV=test`
- `LOG_LEVEL=error`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` - тестовые значения
- `DATABASE_URL` - тестовая БД
- `OSRM_URL` - OSRM сервер

**Важно:** Тесты не влияют на продакшен окружение.

## Принципы

1. **Изоляция:** Каждый тест изолирован, не зависит от других
2. **Стабильность:** Моки детерминированы, результаты повторяемы
3. **Быстрота:** Unit тесты выполняются быстро (< 10 сек)
4. **Покрытие:** Критические модули - 100%, остальные - 80%+
5. **Чистота:** После каждого теста моки очищаются




