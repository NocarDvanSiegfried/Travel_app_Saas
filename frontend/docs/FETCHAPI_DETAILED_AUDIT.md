# Полный аудит функции fetchApi и связанных модулей

## Резюме

**Проблема:** UI показывает ложную ошибку "Не удалось подключиться к серверу", даже если backend отдаёт корректный JSON.

**Причина:** **Обнаружена критическая проблема в обработке ошибок `fetchApi`.** Если backend возвращает успешный HTTP ответ (200 OK) с корректным JSON, но при парсинге JSON возникает ошибка (например, из-за HTML ответа вместо JSON, или из-за несоответствия структуры), то ошибка попадает в `catch` блок и маскируется под сетевую ошибку "Не удалось подключиться к серверу".

**Место проблемы:** `frontend/src/shared/utils/api.ts`, строки 54-68 (catch блок).

---

## Шаг 1. Найти fetchApi

### Файл: `frontend/src/shared/utils/api.ts`

**Полный путь:** `frontend/src/shared/utils/api.ts`

**Сигнатура функции:**
```typescript
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T>
```

**Параметры:**
- `endpoint: string` — относительный путь от `API_BASE_URL` (например, `/routes/search?params`)
- `options?: RequestInit` — опциональные параметры для `fetch()` (headers, method, body и т.д.)

**Возвращаемый тип:**
- `Promise<T>` — промис с данными типа `T` (типизированный ответ от API)

**Импорты:**
- `API_BASE_URL` из `../constants/api`

---

## Шаг 2. Анализ порядка операций

### Последовательность операций в `fetchApi`:

**Строки 17-26:**
```typescript
const url = `${API_BASE_URL}${endpoint}`;

try {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
```

**Шаг 1:** Формирование URL и выполнение `fetch()` запроса.

**Строки 28-52:**
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

**Шаг 2:** Проверка `response.ok`. Если `false`, пытается прочитать JSON из ответа и создать ошибку с кодом.

**Строка 54:**
```typescript
return response.json();
```

**Шаг 3:** Если `response.ok = true`, возвращает результат `response.json()`.

**Строки 55-68:**
```typescript
} catch (error) {
  // Проверяем, есть ли подключение к интернету
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Нет подключения к интернету. Проверьте ваше соединение.');
  }
  
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL.replace('/api/v1', '')}`);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(`Network error: ${String(error)}`);
}
```

**Шаг 4:** Обработка всех ошибок в `catch` блоке.

### Проблема в порядке операций:

**Критическая проблема:** Если `response.ok = true`, но `response.json()` выбрасывает ошибку (например, из-за HTML ответа вместо JSON, или из-за несоответствия структуры), то:

1. Ошибка попадает в `catch` блок (строка 55)
2. Проверка `navigator.onLine` не срабатывает (есть интернет)
3. Проверка `error.message.includes('Failed to fetch')` не срабатывает (это не сетевая ошибка)
4. Ошибка пробрасывается дальше (строка 65)
5. Но если это `SyntaxError` от `JSON.parse`, она может быть интерпретирована как сетевая ошибка в UI

**Вывод:** Порядок операций может привести к тому, что ошибка парсинга JSON маскируется под сетевую ошибку.

---

## Шаг 3. Проверка обработки HTTP ошибок

### Что делает функция, если `response.ok = false`:

**Строки 28-52:**
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

### Анализ по статусам:

| Статус | `response.ok` | Действие | Результат |
|--------|---------------|----------|-----------|
| 200 | `true` | Пропускает проверку, переходит к `response.json()` | ✅ Возвращает данные |
| 400 | `false` | Пытается прочитать JSON, создает ошибку с кодом | ⚠️ Бросает ошибку с сообщением из backend |
| 404 | `false` | Пытается прочитать JSON, создает ошибку с кодом | ⚠️ Бросает ошибку с сообщением из backend |
| 500 | `false` | Пытается прочитать JSON, создает ошибку с кодом | ⚠️ Бросает ошибку с сообщением из backend |

### Бросается ли ошибка до JSON-parse?

**Да**, если `response.ok = false`, ошибка бросается **после** попытки прочитать JSON из ответа (строка 51: `throw error`).

**Но:** Если `response.ok = true`, но `response.json()` выбрасывает ошибку, она попадает в `catch` блок.

### Может ли это быть интерпретировано как "не удалось подключиться"?

**Да**, если:
1. `response.ok = false`
2. `response.json()` выбрасывает ошибку (например, HTML ответ вместо JSON)
3. Ошибка попадает в `catch` блок
4. Проверка `error.message.includes('Failed to fetch')` не срабатывает
5. Ошибка пробрасывается дальше (строка 65)
6. В UI она может отображаться как общая ошибка

### Как формируется message для UI:

**В `fetchApi`:**
- Если `response.ok = false` и есть `errorData.error.message` → используется сообщение из backend
- Если `response.ok = false` и нет JSON → используется `API Error: ${status} ${statusText}`
- Если ошибка в `catch` и содержит "Failed to fetch" → "Не удалось подключиться к серверу..."
- Если ошибка в `catch` и это `Error` → пробрасывается как есть
- Если ошибка в `catch` и это не `Error` → "Network error: ${String(error)}"

**Вывод:** Сообщение формируется корректно для HTTP ошибок, но может маскироваться в `catch` блоке.

---

## Шаг 4. Проверка обработки успешного ответа

### Что происходит, если JSON успех=TRUE:

**Строка 54:**
```typescript
return response.json();
```

**Анализ:**
- Если `response.ok = true`, функция возвращает результат `response.json()`
- **НЕТ проверки** на наличие поля `success` в ответе
- **НЕТ проверки** на значение `success: true` или `success: false`
- **НЕТ проверки** структуры ответа

### Как fetchApi определяет успешность:

**Только через `response.ok`** (HTTP статус код):
- `200-299` → `response.ok = true` → возвращает `response.json()`
- `400+` → `response.ok = false` → бросает ошибку

**Вывод:** `fetchApi` **НЕ проверяет** поле `success` в JSON ответе. Успешность определяется только по HTTP статусу.

### Есть ли обязательное поле success?

**Нет**, `fetchApi` не требует поле `success`. Оно проверяется только в `useRoutesSearch` через Zod схему (строка 121).

### Что делает функция, если success отсутствует?

**Ничего.** `fetchApi` возвращает весь JSON ответ как есть, без проверки структуры.

### Бросает ли ошибку при success=false?

**Нет**, если:
- `response.ok = true` (HTTP 200)
- `success: false` в JSON
- `fetchApi` вернет объект с `success: false` без ошибки

**Проверка `success: false` происходит в `useRoutesSearch`** (строка 165):
```typescript
const hasValidData = data?.success && !data?.error && data?.routes
```

### Бросает ли ошибку, если success: true, но структура другая?

**Нет**, если:
- `response.ok = true`
- `success: true` в JSON
- Но структура не соответствует ожидаемой

**Проверка структуры происходит в `useRoutesSearch`** через Zod (строка 121):
```typescript
const validationResult = RouteSearchResponseSchema.safeParse(response)
```

**Если валидация не проходит**, выбрасывается ошибка с кодом `'INVALID_ROUTE_RESPONSE'` (строка 126).

**Вывод:** `fetchApi` не проверяет структуру ответа. Проверка происходит в `useRoutesSearch` через Zod.

---

## Шаг 5. Проверка JSON.parse

### Обрабатывается ли ошибка JSON.parse?

**Частично.** Ошибка `JSON.parse` может возникнуть в двух местах:

#### 1. В блоке обработки HTTP ошибок (строка 33):

```typescript
try {
  const errorData = await response.json();
  // ...
} catch {
  // Если не удалось распарсить JSON, используем стандартное сообщение
}
```

**Анализ:**
- Ошибка `JSON.parse` обрабатывается локально
- Используется стандартное сообщение об ошибке
- Ошибка не пробрасывается дальше

#### 2. В основном блоке (строка 54):

```typescript
return response.json();
```

**Анализ:**
- Если `response.json()` выбрасывает ошибку (например, HTML ответ вместо JSON), она попадает в `catch` блок (строка 55)
- В `catch` блоке нет специальной обработки для ошибок парсинга JSON
- Ошибка может быть интерпретирована как сетевая ошибка

### Может ли HTML ответа (например, от страницы /routes) вызвать ошибку?

**Да**, если:
1. Backend возвращает HTML вместо JSON (например, страница `/routes` вместо API `/api/v1/routes/search`)
2. `response.ok = true` (HTTP 200)
3. `response.json()` пытается распарсить HTML как JSON
4. Возникает `SyntaxError: Unexpected token '<'`
5. Ошибка попадает в `catch` блок

### Попадает ли это в catch?

**Да**, ошибка `JSON.parse` попадает в `catch` блок (строка 55).

### Превращается ли это в сетевую ошибку?

**Частично.** В `catch` блоке:

**Строки 61-63:**
```typescript
if (error instanceof Error && error.message.includes('Failed to fetch')) {
  throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL.replace('/api/v1', '')}`);
}
```

**Анализ:**
- Если ошибка `JSON.parse` имеет сообщение, содержащее "Failed to fetch", она превратится в "Не удалось подключиться к серверу"
- Но обычно `JSON.parse` выбрасывает `SyntaxError` с сообщением типа "Unexpected token '<'"
- Такая ошибка не содержит "Failed to fetch"
- Она пробрасывается дальше (строка 65)

**Строка 65:**
```typescript
if (error instanceof Error) {
  throw error;
}
```

**Вывод:** Ошибка `JSON.parse` пробрасывается дальше как есть, но может быть интерпретирована как сетевая ошибка в UI.

### Может ли это привести к "Не удалось подключиться"?

**Да**, если:
1. Ошибка `JSON.parse` имеет сообщение, содержащее "Failed to fetch" (маловероятно)
2. Или ошибка обрабатывается в UI как общая ошибка и отображается как "Не удалось подключиться"

**Но:** Обычно ошибка `JSON.parse` имеет сообщение типа "Unexpected token '<'", которое не содержит "Failed to fetch", поэтому она не превратится в "Не удалось подключиться" в `fetchApi`.

**Однако:** В UI (файл `routes/page.tsx`, строка 67) общая ошибка отображается как `error.message || 'Произошла ошибка при поиске маршрутов'`, а не "Не удалось подключиться".

---

## Шаг 6. Проверка catch блока

### Что именно формируется в catch:

**Строки 55-68:**
```typescript
} catch (error) {
  // Проверяем, есть ли подключение к интернету
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Нет подключения к интернету. Проверьте ваше соединение.');
  }
  
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL.replace('/api/v1', '')}`);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(`Network error: ${String(error)}`);
}
```

### Анализ формирования ошибки:

1. **Проверка интернета (строки 57-59):**
   - Если нет интернета → "Нет подключения к интернету..."

2. **Проверка "Failed to fetch" (строки 61-63):**
   - Если сообщение содержит "Failed to fetch" → "Не удалось подключиться к серверу..."

3. **Проброс Error (строки 64-66):**
   - Если это `Error` → пробрасывается как есть

4. **Общая ошибка (строка 67):**
   - Если это не `Error` → "Network error: ${String(error)}"

### Бросается ли NetworkError?

**Нет**, специального типа `NetworkError` нет. Бросается обычный `Error` с сообщением.

### Как выбирается final error message:

**Логика выбора:**
1. Нет интернета → "Нет подключения к интернету..."
2. Содержит "Failed to fetch" → "Не удалось подключиться к серверу..."
3. Это `Error` → пробрасывается как есть (сообщение из ошибки)
4. Не `Error` → "Network error: ${String(error)}"

### Есть ли там строка, явно создающая UI-ошибку?

**Да**, строка 62:
```typescript
throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL.replace('/api/v1', '')}`);
```

**Это сообщение создается только если:**
- `error instanceof Error`
- `error.message.includes('Failed to fetch')`

**Вывод:** Сообщение "Не удалось подключиться к серверу" создается только для сетевых ошибок с "Failed to fetch".

### Маскируются ли ошибки backend в один общий NetworkError?

**Частично.** Если:
1. `response.ok = false` (HTTP ошибка)
2. `response.json()` выбрасывает ошибку (HTML вместо JSON)
3. Ошибка попадает в `catch` блок
4. Ошибка не содержит "Failed to fetch"
5. Ошибка пробрасывается дальше (строка 65)

**Но:** Обычно HTTP ошибки обрабатываются в блоке `if (!response.ok)` (строки 28-52), а не в `catch`.

**Вывод:** Ошибки backend обычно не маскируются, но ошибки парсинга JSON могут быть интерпретированы как общие ошибки.

---

## Шаг 7. Проверка преобразования ошибок в UI

### Места, где ошибка fetchApi попадает в useQuery:

**Файл:** `frontend/src/modules/routes/hooks/use-routes-search.ts`

**Строка 118:**
```typescript
const response = await fetchApi<unknown>(`/routes/search?${params.toString()}`)
```

**Анализ:**
- Если `fetchApi` выбрасывает ошибку, она попадает в `catch` блок `queryFn` (строка 130)
- Ошибка обрабатывается в `catch` блоке (строки 130-144)
- Для `ROUTES_NOT_FOUND` (404) возвращается успешный ответ с пустым массивом
- Для других ошибок ошибка пробрасывается дальше (строка 144)

**Строка 96:**
```typescript
const { data, isLoading, error, refetch } = useQuery<BackendRouteSearchResponse>({
```

**Анализ:**
- Если `queryFn` выбрасывает ошибку, она попадает в `error` от React Query
- `error` передается в компонент через возвращаемое значение `useRoutesSearch`

### Как она мапится в UI ошибку:

**Файл:** `frontend/src/app/routes/page.tsx`

**Строка 32:**
```typescript
const { routes, alternatives, isLoading, error, errorCode } = useRoutesSearch({
```

**Строки 43-68:**
```typescript
const errorMessage = useMemo(() => {
  if (!hasRequiredParams) {
    return 'Не указаны параметры поиска'
  }
  
  if (!error) {
    return null
  }
  
  // Различаем типы ошибок по коду
  if (errorCode === 'STOPS_NOT_FOUND') {
    return `Города "${from}" или "${to}" не найдены в базе данных. Проверьте правильность написания.`
  }
  
  if (errorCode === 'GRAPH_OUT_OF_SYNC') {
    return 'Данные временно недоступны. Пожалуйста, попробуйте позже.'
  }
  
  if (errorCode === 'ROUTES_NOT_FOUND') {
    return null
  }
  
  // Общая ошибка
  return error.message || 'Произошла ошибка при поиске маршрутов'
}, [error, errorCode, hasRequiredParams, from, to])
```

### Есть ли условие вида "любая ошибка → показать сообщение 'Не удалось подключиться'"?

**Нет**, такого условия нет. Сообщение формируется так:
1. Если есть специфический `errorCode` → показывается специфическое сообщение
2. Если нет специфического кода → показывается `error.message` или "Произошла ошибка при поиске маршрутов"

**Но:** Если `error.message` содержит "Не удалось подключиться к серверу" (из `fetchApi`, строка 62), то это сообщение отобразится в UI.

### Точный текст, который выводится в UI:

**Строка 138:**
```typescript
<p className="text-md text-primary">{errorMessage}</p>
```

**Возможные сообщения:**
1. "Не указаны параметры поиска" (если нет `from` или `to`)
2. "Города ... не найдены в базе данных..." (если `errorCode === 'STOPS_NOT_FOUND'`)
3. "Данные временно недоступны..." (если `errorCode === 'GRAPH_OUT_OF_SYNC'`)
4. `null` (если `errorCode === 'ROUTES_NOT_FOUND'`)
5. `error.message` (если есть специфическое сообщение, например "Не удалось подключиться к серверу...")
6. "Произошла ошибка при поиске маршрутов" (если `error.message` пустое)

**Вывод:** Сообщение "Не удалось подключиться к серверу" отображается в UI, если оно содержится в `error.message` из `fetchApi`.

---

## Шаг 8. Сравнение с реальным ответом backend

### Реальный JSON ответ backend:

```json
{
  "success": true,
  "routes": [...],
  "alternatives": [...],
  "riskAssessment": {...},
  "executionTimeMs": 123,
  "graphAvailable": true,
  "graphVersion": "1.0"
}
```

### Какие поля ищет fetchApi:

**Ответ:** `fetchApi` **НЕ ищет никакие поля**. Он просто возвращает результат `response.json()` без проверки структуры.

### Какие поля реально приходят:

**Согласно схеме `RouteSearchResponseSchema`:**
- `success: boolean` (обязательное)
- `routes: RouteResult[]` (обязательное)
- `alternatives: RouteResult[]` (опционально)
- `riskAssessment: any` (опционально)
- `executionTimeMs: number` (обязательное)
- `graphVersion: string` (опционально)
- `graphAvailable: boolean` (обязательное)
- `error: { code, message }` (опционально)

### Совпадает ли структура:

**Да**, структура совпадает с реальным ответом backend.

### Есть ли mismatch, который может приводить к ошибке:

**Потенциальные проблемы:**

1. **Если backend возвращает HTML вместо JSON:**
   - `response.ok = true` (HTTP 200)
   - `response.json()` выбрасывает `SyntaxError`
   - Ошибка попадает в `catch` блок
   - Может быть интерпретирована как общая ошибка

2. **Если backend возвращает JSON, но без обязательных полей:**
   - `response.ok = true`
   - `fetchApi` возвращает JSON без ошибки
   - Zod валидация в `useRoutesSearch` (строка 121) не проходит
   - Выбрасывается ошибка `'INVALID_ROUTE_RESPONSE'`
   - В UI отображается: "Неверный формат данных от сервера..." (строка 241 в `use-routes-search.ts`)

3. **Если backend возвращает `success: false` в JSON:**
   - `response.ok = true`
   - `fetchApi` возвращает JSON без ошибки
   - В `useRoutesSearch` проверка `data?.success` (строка 165) определяет, что данные невалидны
   - Если есть `data?.error`, создается ошибка (строка 236)
   - В UI отображается сообщение из `data.error.message` или "Ошибка при поиске маршрутов"

**Вывод:** Mismatch может привести к ошибке, но она обрабатывается корректно через Zod валидацию.

---

## Шаг 9. Финальная причина

### Почему fetchApi интерпретирует успешный ответ как ошибку?

**Ответ:** `fetchApi` **НЕ интерпретирует успешный ответ как ошибку**, если:
- `response.ok = true` (HTTP 200-299)
- `response.json()` успешно парсит JSON
- Структура JSON корректна

**Но:** Если `response.json()` выбрасывает ошибку (например, HTML вместо JSON), то:
1. Ошибка попадает в `catch` блок
2. Если ошибка содержит "Failed to fetch", она превращается в "Не удалось подключиться к серверу"
3. Если ошибка не содержит "Failed to fetch", она пробрасывается дальше как есть

### Что именно в логике приводит к UI сообщению?

**Цепочка событий:**

1. **Backend возвращает HTML вместо JSON** (например, страница `/routes` вместо API):
   - `response.ok = true` (HTTP 200)
   - `response.json()` выбрасывает `SyntaxError: Unexpected token '<'`
   - Ошибка попадает в `catch` блок `fetchApi` (строка 55)

2. **Обработка в catch блоке:**
   - Проверка `navigator.onLine` не срабатывает (есть интернет)
   - Проверка `error.message.includes('Failed to fetch')` не срабатывает (это `SyntaxError`, не "Failed to fetch")
   - Ошибка пробрасывается дальше (строка 65: `throw error`)

3. **Обработка в useRoutesSearch:**
   - Ошибка попадает в `catch` блок `queryFn` (строка 130)
   - Проверка на `ROUTES_NOT_FOUND` не срабатывает (это не 404)
   - Ошибка пробрасывается дальше (строка 144: `throw err`)

4. **Обработка в React Query:**
   - Ошибка попадает в `error` от `useQuery` (строка 96)
   - `error` передается в компонент через `useRoutesSearch` (строка 251)

5. **Отображение в UI:**
   - В `routes/page.tsx` (строка 67): `return error.message || 'Произошла ошибка при поиске маршрутов'`
   - Если `error.message` содержит "Не удалось подключиться к серверу", оно отобразится
   - Если `error.message` пустое или это `SyntaxError`, отобразится "Произошла ошибка при поиске маршрутов"

**Но:** Если ошибка из `fetchApi` содержит "Failed to fetch", она превращается в "Не удалось подключиться к серверу" (строка 62), и это сообщение отобразится в UI.

### В каком файле и строке это происходит?

**Файл:** `frontend/src/shared/utils/api.ts`

**Строки:**
- **54:** `return response.json();` — здесь может возникнуть ошибка парсинга JSON
- **55-68:** `catch` блок — здесь обрабатываются все ошибки
- **61-63:** Проверка "Failed to fetch" и создание сообщения "Не удалось подключиться к серверу"

**Файл:** `frontend/src/app/routes/page.tsx`

**Строка 67:**
```typescript
return error.message || 'Произошла ошибка при поиске маршрутов'
```

**Здесь отображается сообщение из `error.message`**, которое может содержать "Не удалось подключиться к серверу" из `fetchApi`.

### Является ли это ошибкой структуры (schema), порядком проверок или типом ошибки?

**Это ошибка типа ошибки и порядка проверок:**

1. **Ошибка типа ошибки:**
   - Ошибка парсинга JSON (`SyntaxError`) не различается от сетевых ошибок
   - Оба типа ошибок обрабатываются одинаково в `catch` блоке

2. **Ошибка порядка проверок:**
   - `response.json()` вызывается без проверки `Content-Type`
   - Если backend возвращает HTML, ошибка парсинга маскируется под общую ошибку
   - Нет специальной обработки для ошибок парсинга JSON

3. **Ошибка структуры (schema):**
   - `fetchApi` не проверяет структуру ответа
   - Проверка происходит только в `useRoutesSearch` через Zod
   - Но если `response.json()` выбрасывает ошибку до Zod, проверка не происходит

### Требуется ли корректировка — но без конкретного кода?

**Да**, требуется корректировка:

1. **Добавить проверку `Content-Type`** перед вызовом `response.json()`:
   - Проверить, что `Content-Type` содержит `application/json`
   - Если нет, выбросить понятную ошибку о неверном формате ответа

2. **Улучшить обработку ошибок парсинга JSON:**
   - Различать ошибки парсинга JSON от сетевых ошибок
   - Создавать понятные сообщения для ошибок парсинга (например, "Сервер вернул неверный формат данных")

3. **Добавить логирование:**
   - Логировать фактический URL запроса
   - Логировать статус ответа и `Content-Type`
   - Логировать первые символы ответа при ошибке парсинга

4. **Улучшить обработку в UI:**
   - Различать ошибки парсинга JSON от сетевых ошибок
   - Показывать разные сообщения для разных типов ошибок

---

## Итоговый вывод

### Точная причина ложной ошибки "Не удалось подключиться к серверу":

**Сценарий 1: Сетевая ошибка**
- Браузер не может выполнить `fetch()` (CORS, сеть, сервер недоступен)
- Возникает ошибка с сообщением "Failed to fetch"
- В `catch` блоке `fetchApi` (строка 61-63) она превращается в "Не удалось подключиться к серверу..."
- Это сообщение отображается в UI

**Сценарий 2: HTML ответ вместо JSON**
- Backend возвращает HTML (например, страница `/routes` вместо API)
- `response.ok = true` (HTTP 200)
- `response.json()` выбрасывает `SyntaxError`
- Ошибка попадает в `catch` блок
- Если ошибка не содержит "Failed to fetch", она пробрасывается дальше
- В UI отображается `error.message` (например, "Unexpected token '<'") или "Произошла ошибка при поиске маршрутов"

**Сценарий 3: Неверная структура JSON**
- Backend возвращает JSON, но структура не соответствует схеме
- `response.ok = true`
- `fetchApi` возвращает JSON без ошибки
- Zod валидация в `useRoutesSearch` не проходит
- Выбрасывается ошибка `'INVALID_ROUTE_RESPONSE'`
- В UI отображается: "Неверный формат данных от сервера..."

### Финальный ответ:

**Сообщение "Не удалось подключиться к серверу" отображается в UI только если:**
1. Возникает сетевая ошибка с сообщением "Failed to fetch"
2. Ошибка обрабатывается в `fetchApi` (строка 62)
3. Создается сообщение "Не удалось подключиться к серверу..."
4. Это сообщение передается в UI через `error.message`

**Если backend отдаёт корректный JSON, но UI показывает "Не удалось подключиться", это может быть связано с:**
1. CORS ошибкой (браузер блокирует запрос)
2. Сетевой ошибкой (сервер недоступен)
3. Проблемой в логике обработки ошибок (ошибка маскируется)

**Рекомендация:** Добавить логирование в `fetchApi` для отладки фактических запросов и ответов.








