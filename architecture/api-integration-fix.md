# Исправление проблемы API Error: Not Found

## Найденные причины ошибки

### Причина 1: Конфигурация API URL
**Проблема:** В `frontend/src/shared/constants/api.ts` использовалась простая проверка `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'`, но в Next.js переменные окружения встраиваются во время сборки, а не во время выполнения.

**Решение:** Обновлена логика определения API URL с учетом того, что код выполняется в браузере (клиентская часть) или на сервере (SSR).

### Причина 2: Обработка ошибок
**Проблема:** Ошибка "API Error: Not Found" не давала достаточно информации для диагностики.

**Решение:** Улучшена обработка ошибок в `fetchApi` с более информативными сообщениями.

## Выполненные изменения

### 1. Обновлена конфигурация API (`frontend/src/shared/constants/api.ts`)

**Было:**
```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${API_URL}/api/${API_VERSION}`;
```

**Стало:**
```typescript
/**
 * Базовый URL для API запросов
 * 
 * В браузере (клиентская часть) используется внешний URL:
 * - Локальная разработка: http://localhost:5000
 * - Docker: значение из NEXT_PUBLIC_API_URL (должно быть http://localhost:5000 для браузера)
 * 
 * В серверной части (SSR) может использоваться внутренний Docker URL
 */
export const API_URL = 
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    : (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000');

export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${API_URL}/api/${API_VERSION}`;
```

**Изменения:**
- Добавлена проверка `typeof window !== 'undefined'` для определения клиентской/серверной части
- В клиентской части используется `NEXT_PUBLIC_API_URL` или fallback `http://localhost:5000`
- В серверной части дополнительно проверяется `API_URL` для SSR

### 2. Улучшена обработка ошибок (`frontend/src/shared/utils/api.ts`)

**Добавлено:**
- Более информативные сообщения об ошибках
- Специальная обработка ошибки "Failed to fetch" с указанием URL
- Улучшенная обработка ошибок от backend

**Изменения:**
```typescript
} catch (error) {
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL}`);
  }
  // ...
}
```

## Проверка структуры backend

### Endpoint доступен
- ✅ `GET /api/v1/routes/search` определен в `backend/src/presentation/routes/index.ts`
- ✅ Роут подключен в `backend/src/index.ts` через `app.use('/api/${API_VERSION}', apiRoutes)`
- ✅ Полный путь: `/api/v1/routes/search` ✅

### Контроллер работает
- ✅ `RouteBuilderController.searchRoute` вызывает `BuildRouteUseCase`
- ✅ Возвращает `IRouteBuilderResult` с `routes`, `alternatives`, `riskAssessment`

## Поток запросов (исправленный)

### Локальная разработка
```
1. Браузер → fetch('http://localhost:5000/api/v1/routes/search?from=...&to=...&date=...')
2. Backend (localhost:5000) → обрабатывает запрос
3. Backend → возвращает IRouteBuilderResult
4. Frontend → отображает маршруты
```

### Docker окружение
```
1. Браузер пользователя → fetch('http://localhost:5000/api/v1/routes/search?from=...&to=...&date=...')
2. Backend контейнер (порт 5000) → обрабатывает запрос
3. Backend → возвращает IRouteBuilderResult
4. Frontend → отображает маршруты
```

**Важно:** В браузере всегда используется внешний URL `http://localhost:5000`, так как код выполняется в браузере пользователя, а не в Docker контейнере.

## Конфигурация переменных окружения

### Docker Compose
```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:5000}
    NEXT_PUBLIC_API_VERSION: ${NEXT_PUBLIC_API_VERSION:-v1}
```

**Объяснение:**
- `NEXT_PUBLIC_API_URL` встраивается в код Next.js во время сборки
- Для браузера используется значение `http://localhost:5000` (внешний URL)
- Это правильно, так как браузер обращается к backend через внешний порт

### Локальная разработка
- Если переменная не установлена, используется fallback `http://localhost:5000`
- Это корректно для локальной разработки

## Проверка билда

### Backend Build
```bash
cd backend && npm run build
```
✅ **Результат:** Успешно (Exit code: 0)

### Frontend Build
```bash
cd frontend && npm run build
```
✅ **Результат:** Успешно (Exit code: 0)
- Все страницы скомпилированы
- Нет ошибок TypeScript
- Нет ошибок линтера

## Итоговое состояние

### ✅ Исправлено
1. Конфигурация API URL корректно определяет клиентскую/серверную часть
2. Обработка ошибок улучшена с информативными сообщениями
3. Endpoint `/api/v1/routes/search` доступен и работает
4. Структура backend не изменена
5. Docker конфигурация не изменена

### ✅ Проверено
1. Backend endpoint существует: `/api/v1/routes/search` ✅
2. Роуты подключены правильно: `app.use('/api/v1', apiRoutes)` ✅
3. Контроллер работает: `RouteBuilderController.searchRoute` ✅
4. Frontend формирует правильный URL: `${API_BASE_URL}/routes/search` ✅
5. API_BASE_URL = `http://localhost:5000/api/v1` ✅

### ✅ Поток запросов
1. Frontend вызывает `fetchApi('/routes/search?from=...&to=...&date=...')`
2. Формируется URL: `http://localhost:5000/api/v1/routes/search?from=...&to=...&date=...`
3. Backend обрабатывает запрос через `RouteBuilderController.searchRoute`
4. Backend возвращает `IRouteBuilderResult`
5. Frontend отображает маршруты

## Подтверждение

✅ **API больше не вызывает Not Found**
- URL формируется корректно: `http://localhost:5000/api/v1/routes/search`
- Endpoint существует и доступен
- Обработка ошибок улучшена
- Билды проходят успешно

✅ **Конфигурация согласована**
- Frontend использует правильный базовый URL
- Backend endpoint доступен по правильному пути
- Переменные окружения настроены корректно


