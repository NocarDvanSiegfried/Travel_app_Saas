# Redis Cache Module

## Описание

Модуль для работы с Redis кешем в проекте Travel App. Обеспечивает кеширование результатов запросов, пользовательских сессий и временных данных.

## Структура

```
backend/src/infrastructure/cache/
├── RedisConnection.ts      # Singleton для подключения к Redis
├── ICacheService.ts        # Интерфейс сервиса кеширования
├── RedisCacheService.ts    # Реализация сервиса кеширования
├── CacheKeyBuilder.ts      # Построитель ключей кеша
└── index.ts                # Экспорты
```

## Использование

### 1. Инициализация

Redis автоматически инициализируется при старте backend сервера в `src/index.ts`.

### 2. Использование в Use Cases

```typescript
import { RedisCacheService } from '../../infrastructure/cache/RedisCacheService';
import { CacheKeyBuilder } from '../../infrastructure/cache/CacheKeyBuilder';
import { CacheDecorator } from '../use-cases/CacheDecorator';

const cacheService = new RedisCacheService();
const cache = new CacheDecorator();
const routesTTL = parseInt(process.env.REDIS_TTL_ROUTES || '1800', 10);

// Кеширование результата поиска маршрутов
async function searchRoutes(from: string, to: string, date: string) {
  const cacheKey = CacheKeyBuilder.routes.search(from, to, date);
  
  return await cache.wrap(
    cacheKey,
    async () => {
      // Логика поиска маршрутов
      return await findRoutesInDatabase(from, to, date);
    },
    routesTTL
  );
}
```

### 3. Инвалидация кеша

```typescript
// При обновлении данных
async function updateRoute(routeId: string, data: RouteData) {
  await updateRouteInDatabase(routeId, data);
  
  // Инвалидируем кеш
  await cacheService.delete(CacheKeyBuilder.routes.byId(routeId));
  await cacheService.deleteByPattern(CacheKeyBuilder.routes.pattern());
}
```

### 4. Работа с сессиями

```typescript
// Сохранение сессии
const sessionKey = CacheKeyBuilder.sessions.user(userId);
await cacheService.set(sessionKey, sessionData, sessionTTL);

// Получение сессии
const session = await cacheService.get(sessionKey);
```

## Ключи кеша

Все ключи строятся через `CacheKeyBuilder` для единообразия:

- **Маршруты:** `travel-app:routes:*`
- **Гостиницы:** `travel-app:hotels:*`
- **Транспорт:** `travel-app:transport:*`
- **Избранное:** `travel-app:favorites:*`
- **Сессии:** `travel-app:sessions:*`

## TTL (Time To Live)

Настраивается через переменные окружения:

- `REDIS_TTL_DEFAULT=3600` (1 час)
- `REDIS_TTL_ROUTES=1800` (30 минут)
- `REDIS_TTL_HOTELS=1800` (30 минут)
- `REDIS_TTL_TRANSPORT=1800` (30 минут)
- `REDIS_TTL_FAVORITES=3600` (1 час)
- `REDIS_TTL_SESSION=86400` (24 часа)

## Graceful Degradation

Если Redis недоступен, приложение продолжает работать без кеша. Все операции с кешем обернуты в try-catch и логируют предупреждения.

## Безопасность

- Redis защищен паролем
- Доступен только внутри Docker сети
- Чувствительные данные не кешируются
- JWT токены хранятся с коротким TTL

