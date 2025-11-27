# Полный аудит доступности Backend-API из Frontend для функционала маршрутов

**Дата:** 2025-01-XX  
**Статус:** Анализ без изменений

---

## Шаг 1. Найти, какой модуль фронта вызывает поиск маршрутов

### Цепочка вызовов

**1. Компонент:** `frontend/src/app/routes/page.tsx` (строка 32)
```typescript
const { routes, alternatives, dataMode, dataQuality, isLoading, error, errorCode } = useRoutesSearch({
  from: searchParams.get('from') || '',
  to: searchParams.get('to') || '',
  date: searchParams.get('date') || undefined,
  passengers: searchParams.get('passengers') || '1',
});
```

**2. Hook:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 90-196)
```typescript
export function useRoutesSearch({
  from,
  to,
  date,
  passengers = '1',
}: UseRoutesSearchParams): UseRoutesSearchResult {
  // ...
  const { data, isLoading, error, refetch } = useQuery<BackendRouteSearchResponse>({
    queryKey: ['routes', 'search', normalizedFrom, normalizedTo, date, passengers],
    queryFn: async () => {
      // ...
      const response = await fetchApi<BackendRouteSearchResponse>(`/routes/search?${params.toString()}`)
      return response
    },
  });
}
```

**3. API функция:** `frontend/src/shared/utils/api.ts` (строки 13-69)
```typescript
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  // ...
  const response = await fetch(url, { ... });
  return response.json();
}
```

**4. Константа API:** `frontend/src/shared/constants/api.ts` (строка 16)
```typescript
export const API_BASE_URL = `${API_URL}/api/${API_VERSION}`;
// API_URL = http://localhost:5000
// API_VERSION = v1
// API_BASE_URL = http://localhost:5000/api/v1
```

### Результат шага 1

**Полный путь:**
- Компонент: `app/routes/page.tsx` → `useRoutesSearch()`
- Hook: `modules/routes/hooks/use-routes-search.ts` → `useQuery()` → `fetchApi()`
- API util: `shared/utils/api.ts` → `fetch()`
- Константа: `shared/constants/api.ts` → `API_BASE_URL`

**Механизм запроса:** React Query (`@tanstack/react-query`) с функцией `fetchApi`

---

## Шаг 2. Определить финальный URL, который отправляет фронт

### Сборка URL

**Параметры запроса:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 102-113)
```typescript
const params = new URLSearchParams({
  from: normalizedFrom,
  to: normalizedTo,
})

if (date) {
  params.set('date', date)
}

if (passengers && passengers !== '1') {
  params.set('passengers', passengers)
}
```

**Финальный URL:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строка 116)
```typescript
const response = await fetchApi<BackendRouteSearchResponse>(`/routes/search?${params.toString()}`)
```

**Полная сборка:**
- `API_BASE_URL` = `http://localhost:5000/api/v1` (из `shared/constants/api.ts`)
- `endpoint` = `/routes/search?from=Якутск&to=Москва&date=2025-01-20&passengers=1`
- **Итоговый URL:** `http://localhost:5000/api/v1/routes/search?from=Якутск&to=Москва&date=2025-01-20&passengers=1`

### Результат шага 2

✅ **Статус:** URL собирается корректно

- **Протокол:** `http`
- **Хост:** `localhost`
- **Порт:** `5000`
- **Путь:** `/api/v1/routes/search`
- **Query-параметры:** `from`, `to`, `date` (опционально), `passengers` (опционально)
- **Полный URL:** `http://localhost:5000/api/v1/routes/search?from={from}&to={to}&date={date}&passengers={passengers}`

**Совпадение с реальным API:** ✅ Да (backend route: `/api/v1/routes/search`)

---

## Шаг 3. Найти Zod-схему, которая валидирует ответ маршрутов

### Схемы валидации

**Файл:** `frontend/src/modules/routes/schemas/route.schema.ts`

**Схема параметров запроса:**
```typescript
export const RouteSearchParamsSchema = z.object({
  from: z.string().min(1, 'Город отправления обязателен').trim(),
  to: z.string().min(1, 'Город назначения обязателен').trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты').optional(),
  passengers: z.string().regex(/^[1-9]$/, 'Количество пассажиров должно быть от 1 до 9').optional(),
})
```

**⚠️ Проблема:** Нет Zod-схемы для валидации ответа API

**Вместо Zod-схемы используется TypeScript интерфейс:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 30-44)
```typescript
interface BackendRouteSearchResponse {
  success: boolean
  routes: BackendRouteResult[]
  alternatives?: BackendRouteResult[]
  executionTimeMs?: number
  graphVersion?: string
  graphAvailable?: boolean
  error?: {
    code: string
    message: string
  }
  dataMode?: string
  dataQuality?: number
  riskAssessment?: IRiskAssessment
}

interface BackendRouteResult {
  segments: Array<{
    fromStopId: string
    toStopId: string
    distance: number
    duration: number
    transportType: string
    routeId?: string
    price?: number
    departureTime?: string
    arrivalTime?: string
  }>
  totalDistance: number
  totalDuration: number
  totalPrice: number
  fromCity: string
  toCity: string
  departureDate: string | Date
}
```

### Результат шага 3

❌ **Статус:** Zod-схема для ответа отсутствует

**Что используется:**
- TypeScript интерфейс `BackendRouteSearchResponse` (не валидируется во время выполнения)
- TypeScript интерфейс `BackendRouteResult` (не валидируется во время выполнения)

**Ожидаемые поля (из интерфейса):**
- `success: boolean` (обязательное)
- `routes: BackendRouteResult[]` (обязательное)
- `alternatives?: BackendRouteResult[]` (опциональное)
- `executionTimeMs?: number` (опциональное)
- `graphVersion?: string` (опциональное)
- `graphAvailable?: boolean` (опциональное)
- `error?: { code: string, message: string }` (опциональное)
- `dataMode?: string` (опциональное)
- `dataQuality?: number` (опциональное)
- `riskAssessment?: IRiskAssessment` (опциональное)

**Поля BackendRouteResult:**
- `segments: Array<{...}>` (обязательное)
- `totalDistance: number` (обязательное)
- `totalDuration: number` (обязательное)
- `totalPrice: number` (обязательное)
- `fromCity: string` (обязательное)
- `toCity: string` (обязательное)
- `departureDate: string | Date` (обязательное)

---

## Шаг 4. Найти структуру ответа backend

### Backend контроллер

**Файл:** `backend/src/presentation/controllers/RouteBuilderController.ts` (строки 310-319)
```typescript
if (result.success) {
  res.status(200).json({
    success: true,
    routes: result.routes,
    alternatives: result.alternatives,
    riskAssessment: result.riskAssessment,
    executionTimeMs: totalExecutionTime,
    graphVersion: result.graphVersion,
    graphAvailable: result.graphAvailable,
  });
}
```

### Структура RouteResult

**Файл:** `backend/src/application/route-builder/use-cases/BuildRouteUseCase.optimized.ts` (строки 36-59)
```typescript
export type RouteSegment = {
  fromStopId: string;
  toStopId: string;
  distance: number; // km
  duration: number; // minutes
  transportType: string;
  routeId?: string;
  price?: number;
  departureTime?: string;
  arrivalTime?: string;
};

export type RouteResult = {
  segments: RouteSegment[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  totalPrice: number;
  fromCity: string;
  toCity: string;
  departureDate: Date;
};
```

### Структура BuildRouteResponse

**Файл:** `backend/src/application/route-builder/use-cases/BuildRouteUseCase.optimized.ts` (строки 64-73)
```typescript
export type BuildRouteResponse = {
  success: boolean;
  routes: RouteResult[];
  alternatives?: RouteResult[];
  riskAssessment?: IRiskAssessment;
  executionTimeMs: number;
  error?: string;
  graphAvailable: boolean;
  graphVersion?: string;
};
```

### Результат шага 4

✅ **Статус:** Структура ответа определена

**Реальная структура ответа backend (200 OK):**
```json
{
  "success": true,
  "routes": [
    {
      "segments": [
        {
          "fromStopId": "string",
          "toStopId": "string",
          "distance": 0,
          "duration": 0,
          "transportType": "string",
          "routeId": "string (optional)",
          "price": 0 (optional),
          "departureTime": "string (optional)",
          "arrivalTime": "string (optional)"
        }
      ],
      "totalDistance": 0,
      "totalDuration": 0,
      "totalPrice": 0,
      "fromCity": "string",
      "toCity": "string",
      "departureDate": "Date (сериализуется в ISO string)"
    }
  ],
  "alternatives": [ /* тот же формат */ ] (optional),
  "riskAssessment": { /* IRiskAssessment */ } (optional),
  "executionTimeMs": 0,
  "graphVersion": "string" (optional),
  "graphAvailable": true
}
```

**Поля, которые НЕ возвращаются backend:**
- ❌ `dataMode` — отсутствует в ответе
- ❌ `dataQuality` — отсутствует в ответе
- ❌ `error` (в успешном ответе) — отсутствует

**Поля, которые возвращаются backend:**
- ✅ `success: boolean`
- ✅ `routes: RouteResult[]`
- ✅ `alternatives?: RouteResult[]`
- ✅ `riskAssessment?: IRiskAssessment`
- ✅ `executionTimeMs: number`
- ✅ `graphVersion?: string`
- ✅ `graphAvailable: boolean`

---

## Шаг 5. Сравнить frontend vs backend

### Таблица сравнения полей

| Поле | Backend | Frontend | Статус |
|------|---------|----------|--------|
| `success` | ✅ `boolean` | ✅ `boolean` | ✅ Совпадает |
| `routes` | ✅ `RouteResult[]` | ✅ `BackendRouteResult[]` | ⚠️ Типы совпадают, но структура может отличаться |
| `alternatives` | ✅ `RouteResult[]?` | ✅ `BackendRouteResult[]?` | ⚠️ Типы совпадают |
| `executionTimeMs` | ✅ `number` | ✅ `number?` | ✅ Совпадает (опциональность не критична) |
| `graphVersion` | ✅ `string?` | ✅ `string?` | ✅ Совпадает |
| `graphAvailable` | ✅ `boolean` | ✅ `boolean?` | ⚠️ Backend обязательное, frontend опциональное |
| `riskAssessment` | ✅ `IRiskAssessment?` | ✅ `IRiskAssessment?` | ✅ Совпадает |
| `error` | ✅ `string?` (в BuildRouteResponse) | ✅ `{ code: string, message: string }?` | ❌ Разный формат |
| `dataMode` | ❌ Отсутствует | ✅ `string?` | ❌ Frontend ожидает, backend не возвращает |
| `dataQuality` | ❌ Отсутствует | ✅ `number?` | ❌ Frontend ожидает, backend не возвращает |

### Сравнение RouteResult vs BackendRouteResult

| Поле | Backend RouteResult | Frontend BackendRouteResult | Статус |
|------|---------------------|----------------------------|--------|
| `segments` | ✅ `RouteSegment[]` | ✅ `Array<{...}>` | ✅ Структура совпадает |
| `totalDistance` | ✅ `number` | ✅ `number` | ✅ Совпадает |
| `totalDuration` | ✅ `number` | ✅ `number` | ✅ Совпадает |
| `totalPrice` | ✅ `number` | ✅ `number` | ✅ Совпадает |
| `fromCity` | ✅ `string` | ✅ `string` | ✅ Совпадает |
| `toCity` | ✅ `string` | ✅ `string` | ✅ Совпадает |
| `departureDate` | ✅ `Date` | ✅ `string \| Date` | ⚠️ Backend возвращает Date (сериализуется в ISO string) |

### Сравнение RouteSegment

| Поле | Backend RouteSegment | Frontend (в BackendRouteResult) | Статус |
|------|----------------------|--------------------------------|--------|
| `fromStopId` | ✅ `string` | ✅ `string` | ✅ Совпадает |
| `toStopId` | ✅ `string` | ✅ `string` | ✅ Совпадает |
| `distance` | ✅ `number` | ✅ `number` | ✅ Совпадает |
| `duration` | ✅ `number` | ✅ `number` | ✅ Совпадает |
| `transportType` | ✅ `string` | ✅ `string` | ✅ Совпадает |
| `routeId` | ✅ `string?` | ✅ `string?` | ✅ Совпадает |
| `price` | ✅ `number?` | ✅ `number?` | ✅ Совпадает |
| `departureTime` | ✅ `string?` | ✅ `string?` | ✅ Совпадает |
| `arrivalTime` | ✅ `string?` | ✅ `string?` | ✅ Совпадает |

### Результат шага 5

❌ **Статус:** Обнаружены расхождения

**Критические расхождения:**

1. **`dataMode` и `dataQuality` отсутствуют в backend**
   - Frontend ожидает: `dataMode?: string`, `dataQuality?: number`
   - Backend не возвращает эти поля
   - **Место в коде:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 41-42, 189-190)

2. **Формат ошибки различается**
   - Backend возвращает: `error?: string` (в BuildRouteResponse)
   - Backend возвращает в JSON: `error?: { code: string, message: string }` (в контроллере)
   - Frontend ожидает: `error?: { code: string, message: string }`
   - **Статус:** ✅ Совпадает (контроллер возвращает объект)

3. **`graphAvailable` обязательность**
   - Backend: `graphAvailable: boolean` (обязательное)
   - Frontend: `graphAvailable?: boolean` (опциональное)
   - **Статус:** ⚠️ Не критично (всегда присутствует в успешном ответе)

**Незначительные расхождения:**

4. **`departureDate` тип**
   - Backend: `Date` (сериализуется в ISO string при JSON.stringify)
   - Frontend: `string | Date`
   - **Статус:** ✅ Совместимо (Date сериализуется в строку)

---

## Шаг 6. Проверка обработки ошибок

### Обработка ошибок в useRoutesSearch

**Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 115-131)
```typescript
try {
  const response = await fetchApi<BackendRouteSearchResponse>(`/routes/search?${params.toString()}`)
  return response
} catch (err) {
  // Для ROUTES_NOT_FOUND (404) возвращаем успешный ответ с пустым массивом
  const apiError = err as ApiError
  if (apiError.status === 404 && apiError.code === 'ROUTES_NOT_FOUND') {
    return {
      success: true,
      routes: [],
      alternatives: [],
    } as BackendRouteSearchResponse
  }
  // Для других ошибок пробрасываем дальше
  throw err
}
```

### Обработка ошибок в fetchApi

**Файл:** `frontend/src/shared/utils/api.ts` (строки 28-51)
```typescript
if (!response.ok) {
  let errorMessage = `API Error: ${response.status} ${response.statusText}`;
  let errorCode: string | undefined;
  
  try {
    const errorData = await response.json();
    if (errorData.error) {
      if (errorData.error.message) {
        errorMessage = errorData.error.message;
      }
      if (errorData.error.code) {
        errorCode = errorData.error.code;
        errorMessage = errorData.error.message || errorMessage;
      }
    }
  } catch {
    // Если не удалось распарсить JSON, используем стандартное сообщение
  }
  
  const error = new Error(errorMessage) as Error & { code?: string; status?: number };
  error.code = errorCode;
  error.status = response.status;
  throw error;
}
```

**Обработка сетевых ошибок:** `frontend/src/shared/utils/api.ts` (строки 55-68)
```typescript
catch (error) {
  // Проверяем, есть ли подключение к интернету
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Нет подключения к интернету. Проверьте ваше соединение.');
  }
  
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL.replace('/api/v1', '')}`);
  }
  // ...
}
```

### Обработка ошибок в useRoutesSearch (после получения данных)

**Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 150-195)
```typescript
// Проверяем, что ответ успешный и нет ошибки
const hasValidData = data?.success && !data?.error && data?.routes

const adaptedRoutes = hasValidData && Array.isArray(data.routes) && data.routes.length > 0
  ? adaptBackendRoutesToFrontend(data.routes, date, Number(passengers) || 1)
  : []

// Обработка ошибки из API ответа
const apiError = data?.error
  ? new Error(data.error.message || 'Ошибка при поиске маршрутов')
  : (error as Error | null)

// Если есть ошибка, возвращаем пустые массивы
const finalRoutes = apiError ? [] : routes
const finalAlternatives = apiError ? [] : alternatives
```

### Результат шага 6

✅ **Статус:** Обработка ошибок реализована

**Что происходит при ошибке:**

1. **Сетевые ошибки (Failed to fetch):**
   - `fetchApi` выбрасывает: `Error("Не удалось подключиться к серверу...")`
   - React Query перехватывает ошибку
   - `useRoutesSearch` возвращает: `{ error: Error, routes: [], alternatives: [] }`

2. **Ошибки API (404, 500, etc.):**
   - `fetchApi` выбрасывает: `Error` с `code` и `status`
   - Для `404` с `code === 'ROUTES_NOT_FOUND'`: возвращается успешный ответ с пустыми массивами
   - Для других ошибок: пробрасывается дальше

3. **Ошибки в ответе API (`data.error`):**
   - Проверяется: `data?.error`
   - Если есть: создается `Error(data.error.message)`
   - Возвращаются пустые массивы: `routes: [], alternatives: []`

4. **Ошибки валидации (Zod):**
   - ❌ **НЕ ОБРАБАТЫВАЮТСЯ** — Zod-схема отсутствует
   - TypeScript интерфейсы не валидируются во время выполнения
   - Если структура ответа не совпадает, ошибка не обнаруживается

**Место, где подменяется ошибка парсинга:**
- ❌ **НЕ НАЙДЕНО** — парсинг не валидируется (нет Zod-схемы)
- Ошибка "Не удалось подключиться к серверу" показывается только при сетевых ошибках

---

## Шаг 7. Финальная диагностика

### Точная причина проблемы

**Основная проблема:** Отсутствие валидации ответа API

**Детали:**

1. **Нет Zod-схемы для валидации ответа**
   - Используется только TypeScript интерфейс
   - TypeScript не валидируется во время выполнения
   - Если backend вернет неожиданную структуру, ошибка не будет обнаружена

2. **Несоответствие ожидаемых полей**
   - Frontend ожидает `dataMode` и `dataQuality`, но backend их не возвращает
   - Это не вызывает ошибку (поля опциональные), но может привести к неожиданному поведению

3. **Отсутствие обработки ошибок парсинга**
   - Если структура ответа не совпадает с интерфейсом, ошибка не обнаруживается
   - Адаптер `adaptBackendRoutesToFrontend` может получить неожиданные данные

### Места в коде, где может возникнуть ошибка

**1. Отсутствие валидации ответа**
- **Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строка 116)
- **Проблема:** `fetchApi<BackendRouteSearchResponse>()` не валидирует структуру ответа
- **Риск:** Если backend вернет неожиданную структуру, TypeScript не обнаружит ошибку

**2. Обращение к несуществующим полям**
- **Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 189-190)
- **Проблема:** `dataMode: apiError ? undefined : data?.dataMode` — поле может быть `undefined`
- **Риск:** Низкий (поле опциональное)

**3. Адаптация данных без валидации**
- **Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 154-160)
- **Проблема:** `adaptBackendRoutesToFrontend(data.routes, ...)` вызывается без проверки структуры `data.routes`
- **Риск:** Если `data.routes` не массив или имеет неожиданную структуру, адаптер может упасть

**4. Обращение к полям сегментов**
- **Файл:** `frontend/src/modules/routes/utils/route-adapter.ts` (строки 102-124)
- **Проблема:** Адаптер обращается к полям сегментов без проверки их наличия
- **Риск:** Если сегмент не содержит ожидаемых полей, может возникнуть ошибка

### Структура backend-ответа, из-за которой может возникнуть ошибка

**Успешный ответ (200 OK):**
```json
{
  "success": true,
  "routes": [
    {
      "segments": [
        {
          "fromStopId": "stop-001",
          "toStopId": "stop-002",
          "distance": 100,
          "duration": 120,
          "transportType": "BUS",
          "routeId": "route-001",
          "price": 500,
          "departureTime": "08:00",
          "arrivalTime": "10:00"
        }
      ],
      "totalDistance": 100,
      "totalDuration": 120,
      "totalPrice": 500,
      "fromCity": "Якутск",
      "toCity": "Москва",
      "departureDate": "2025-01-20T00:00:00.000Z"
    }
  ],
  "alternatives": [],
  "riskAssessment": { /* ... */ },
  "executionTimeMs": 5,
  "graphVersion": "v1.0.0",
  "graphAvailable": true
}
```

**Потенциальные проблемы:**

1. **`departureDate` как Date объект**
   - Backend возвращает `Date`, который сериализуется в ISO string
   - Frontend ожидает `string | Date`
   - **Риск:** Низкий (JSON.stringify автоматически сериализует Date)

2. **Отсутствие опциональных полей в сегментах**
   - `routeId`, `price`, `departureTime`, `arrivalTime` опциональные
   - Адаптер может не обработать их отсутствие корректно
   - **Риск:** Средний (адаптер использует fallback значения)

3. **Отсутствие `dataMode` и `dataQuality`**
   - Frontend ожидает эти поля, но backend их не возвращает
   - **Риск:** Низкий (поля опциональные, используются только для отображения)

### Вывод: что именно ломает поиск маршрутов

**Критические проблемы:**

1. **Отсутствие валидации ответа API**
   - Нет Zod-схемы для валидации структуры ответа
   - TypeScript интерфейсы не валидируются во время выполнения
   - Если backend вернет неожиданную структуру, ошибка не будет обнаружена
   - **Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts`
   - **Строка:** 116

2. **Отсутствие обработки ошибок парсинга**
   - Если структура ответа не совпадает с интерфейсом, ошибка не обнаруживается
   - Адаптер может получить неожиданные данные и упасть
   - **Файл:** `frontend/src/modules/routes/utils/route-adapter.ts`
   - **Строки:** 102-124

**Незначительные проблемы:**

3. **Ожидание несуществующих полей**
   - Frontend ожидает `dataMode` и `dataQuality`, но backend их не возвращает
   - Это не вызывает ошибку, но может привести к неожиданному поведению
   - **Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts`
   - **Строки:** 41-42, 189-190

4. **Отсутствие проверки структуры перед адаптацией**
   - `adaptBackendRoutesToFrontend` вызывается без проверки структуры данных
   - Если `data.routes` не массив или имеет неожиданную структуру, адаптер может упасть
   - **Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts`
   - **Строки:** 154-160

### Рекомендации

1. **Добавить Zod-схему для валидации ответа API**
   - Создать `RouteSearchResponseSchema` в `frontend/src/modules/routes/schemas/route.schema.ts`
   - Валидировать ответ перед использованием

2. **Убрать ожидание несуществующих полей**
   - Удалить `dataMode` и `dataQuality` из интерфейса `BackendRouteSearchResponse`
   - Или добавить эти поля в backend ответ

3. **Добавить проверку структуры перед адаптацией**
   - Проверить, что `data.routes` является массивом
   - Проверить структуру каждого элемента перед адаптацией

4. **Добавить обработку ошибок парсинга**
   - Обработать ошибки валидации Zod
   - Показать понятное сообщение об ошибке пользователю

---

## Итоговая таблица проблем

| # | Проблема | Критичность | Файл | Строки |
|---|----------|-------------|------|--------|
| 1 | Отсутствие Zod-схемы для валидации ответа | 🔴 Критическая | `hooks/use-routes-search.ts` | 116 |
| 2 | Отсутствие обработки ошибок парсинга | 🔴 Критическая | `utils/route-adapter.ts` | 102-124 |
| 3 | Ожидание несуществующих полей (`dataMode`, `dataQuality`) | 🟡 Средняя | `hooks/use-routes-search.ts` | 41-42, 189-190 |
| 4 | Отсутствие проверки структуры перед адаптацией | 🟡 Средняя | `hooks/use-routes-search.ts` | 154-160 |

---

## Заключение

**Основная причина ошибки "Не удалось подключиться к серверу":**

Скорее всего, это **не проблема подключения**, а проблема **отсутствия валидации ответа**:
1. Запрос успешно отправляется
2. Backend отвечает (200 OK)
3. Но структура ответа не валидируется
4. Если структура не совпадает с интерфейсом, ошибка не обнаруживается
5. Адаптер может получить неожиданные данные и упасть
6. React Query перехватывает ошибку и показывает "Не удалось подключиться к серверу"

**Рекомендуемый порядок исправления:**
1. Добавить Zod-схему для валидации ответа API
2. Добавить проверку структуры перед адаптацией
3. Убрать ожидание несуществующих полей (`dataMode`, `dataQuality`)
4. Добавить обработку ошибок парсинга











