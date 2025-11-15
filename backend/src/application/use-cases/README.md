# Use Cases с Redis Cache

## Примеры использования кеширования

### 1. Кеширование маршрутов

```typescript
import { CacheDecorator } from './CacheDecorator';
import { CacheKeyBuilder } from '../../infrastructure/cache/CacheKeyBuilder';

const cache = new CacheDecorator();
const routesTTL = parseInt(process.env.REDIS_TTL_ROUTES || '1800', 10);

// В use case для поиска маршрутов
async function searchRoutes(from: string, to: string, date: string) {
  const cacheKey = CacheKeyBuilder.routes.search(from, to, date);
  
  return await cache.wrap(
    cacheKey,
    async () => {
      // Логика поиска маршрутов из БД или API
      return await findRoutesInDatabase(from, to, date);
    },
    routesTTL
  );
}
```

### 2. Кеширование гостиниц

```typescript
async function searchHotels(city: string, checkIn: string, checkOut: string) {
  const cacheKey = CacheKeyBuilder.hotels.search(city, checkIn, checkOut);
  const hotelsTTL = parseInt(process.env.REDIS_TTL_HOTELS || '1800', 10);
  
  return await cache.wrap(
    cacheKey,
    async () => {
      return await findHotelsInDatabase(city, checkIn, checkOut);
    },
    hotelsTTL
  );
}
```

### 3. Инвалидация кеша при обновлении

```typescript
async function updateRoute(routeId: string, data: RouteData) {
  // Обновляем в БД
  await updateRouteInDatabase(routeId, data);
  
  // Инвалидируем кеш
  await cache.invalidate(CacheKeyBuilder.routes.byId(routeId));
  await cache.invalidatePattern(CacheKeyBuilder.routes.pattern());
}
```

### 4. Кеширование сессий пользователя

```typescript
async function getUserSession(userId: string) {
  const cacheKey = CacheKeyBuilder.sessions.user(userId);
  const sessionTTL = parseInt(process.env.REDIS_TTL_SESSION || '86400', 10);
  
  return await cache.wrap(
    cacheKey,
    async () => {
      return await loadUserSessionFromDatabase(userId);
    },
    sessionTTL
  );
}
```

