# Детальный аудит конечного endpoint для поиска маршрутов

## Резюме

**Проблема:** Запрос уходит на `/routes` вместо `/api/v1/routes/search`.

**Причина:** **НЕ обнаружена подмена пути в коде.** Код формирует корректный путь `/api/v1/routes/search`. Если запрос действительно уходит на `/routes`, это может быть связано с:
1. Перехватом запроса браузером как навигации (маловероятно для `fetch`)
2. Проблемой в DevTools/логах (отображается относительный путь)
3. Проблемой в backend (логирует неправильный путь)
4. Проблемой в сетевом стеке (прокси, CORS preflight)

**Вывод:** Код формирует корректный путь. Проблема, вероятно, в отображении/логировании, а не в фактическом запросе.

---

## Шаг 1. Проверка фактического HTTP запроса

### Файл: `frontend/src/modules/routes/hooks/use-routes-search.ts`

**Строка 118:**
```typescript
const response = await fetchApi<unknown>(`/routes/search?${params.toString()}`)
```

### Анализ:

1. **Путь, передаваемый в `fetchApi`:** `/routes/search?from=Якутск&to=Мирный&...`
2. **Ведущий слэш:** ✅ Есть (`/routes/search`)
3. **Формат:** Относительный путь с ведущим слэшем

### Итоговый путь перед отправкой:

**Путь:** `/routes/search?${params.toString()}`

**Пример:** `/routes/search?from=Якутск&to=Мирный&date=2025-01-15`

---

## Шаг 2. Проверка `fetchApi` на предмет модификации пути

### Файл: `frontend/src/shared/utils/api.ts`

**Строка 17:**
```typescript
const url = `${API_BASE_URL}${endpoint}`;
```

### Анализ склеивания пути:

#### Формирование `API_BASE_URL`:

**Файл:** `frontend/src/shared/constants/api.ts`

**Строки 10-16:**
```typescript
export const API_URL = 
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    : (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000');

export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${API_URL}/api/${API_VERSION}`;
```

**Результат:** `API_BASE_URL = "http://localhost:5000/api/v1"`

#### Склеивание в `fetchApi`:

**Формула:** `${API_BASE_URL}${endpoint}`

**Пример:**
- `API_BASE_URL` = `"http://localhost:5000/api/v1"`
- `endpoint` = `"/routes/search?from=Якутск&to=Мирный"`
- **Результат:** `"http://localhost:5000/api/v1/routes/search?from=Якутск&to=Мирный"` ✅

### Анализ обработки слэшей:

1. **Добавляет ли `fetchApi` слэши?** ❌ Нет — просто склеивает строки
2. **Обрезает ли двойные `/`?** ❌ Нет — не обрабатывает двойные слэши
3. **Изменяет ли путь, если он начинается не с `/`?** ❌ Нет — использует как есть

### Потенциальная проблема с двойными слэшами:

**Сценарий:** Если `API_BASE_URL` заканчивается на `/` (например, `"http://localhost:5000/api/v1/"`), то:
- `API_BASE_URL` = `"http://localhost:5000/api/v1/"`
- `endpoint` = `"/routes/search?params"`
- **Результат:** `"http://localhost:5000/api/v1//routes/search?params"` ⚠️ (двойной слэш)

**Проверка:** В `api.ts` строка 16: `API_BASE_URL = \`${API_URL}/api/${API_VERSION}\``
- `API_URL` = `"http://localhost:5000"` (без завершающего слэша)
- `/api/` = добавляет слэш
- `${API_VERSION}` = `"v1"` (без ведущего слэша)
- **Результат:** `"http://localhost:5000/api/v1"` (без завершающего слэша) ✅

**Вывод:** Двойных слэшей не будет, так как `API_BASE_URL` не заканчивается на `/`.

### Может ли `fetchApi` приводить `/routes/search?…` к `/routes?…`?

**Нет**, `fetchApi` не модифицирует путь:
- Строка 17: просто склеивает `API_BASE_URL` и `endpoint`
- Нет логики удаления `/search`
- Нет логики замены пути

### Финальное значение endpoint, формируемое `fetchApi`:

**Формула:** `http://localhost:5000/api/v1/routes/search?from=Якутск&to=Мирный&date=2025-01-15`

**Вывод:** `fetchApi` формирует корректный путь `/api/v1/routes/search`.

---

## Шаг 3. Проверка формирования URL в `useRoutesSearch`

### Файл: `frontend/src/modules/routes/hooks/use-routes-search.ts`

**Строки 99-115:**
```typescript
const params = new URLSearchParams({
  from: normalizedFrom,
  to: normalizedTo,
})

// Нормализация и валидация date перед добавлением в URL
if (date) {
  const normalizedDate = date.trim()
  if (normalizedDate && /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    params.set('date', normalizedDate)
  }
}

if (passengers && passengers !== '1') {
  params.set('passengers', passengers)
}
```

**Строка 118:**
```typescript
const response = await fetchApi<unknown>(`/routes/search?${params.toString()}`)
```

### Анализ:

1. **Как собирается строка:** Шаблонная строка `` `/routes/search?${params.toString()}` ``
2. **Есть ли момент, где "search" пропадает:** ❌ Нет — строка формируется напрямую
3. **Есть ли ситуация, где путь превращается в `/routes`:** ❌ Нет — путь жестко задан как `/routes/search`
4. **Могли ли недавние правки сместить путь:** ❌ Нет — правки касались только валидации `date`, не пути

### Фактический путь на выходе `useRoutesSearch` перед вызовом `fetchApi`:

**Путь:** `/routes/search?from=Якутск&to=Мирный&date=2025-01-15`

**Вывод:** Путь формируется корректно, `/search` присутствует.

---

## Шаг 4. Проверка перехвата Next.js маршрутом `/routes`

### Структура маршрутов Next.js:

**Файлы:**
- `frontend/src/app/routes/page.tsx` — страница `/routes`
- `frontend/src/app/routes/layout.tsx` — layout для `/routes`
- `frontend/src/app/routes/details/page.tsx` — страница `/routes/details`

### Анализ:

1. **Есть ли страница по пути `/routes`?** ✅ Да — `app/routes/page.tsx`
2. **Может ли Next.js перехватывать запросы, если путь не начинается с `/api`?** ❌ Нет — Next.js перехватывает только навигационные запросы (через `<Link>`, `router.push()`, прямой ввод URL в браузере)
3. **Может ли фронт случайно вызвать клиентский маршрут вместо API?** ❌ Нет — `fetch()` и `fetchApi()` делают HTTP запросы, а не навигацию

### Вывод:

**Next.js НЕ перехватывает API запросы.** Маршрут `/routes` в Next.js обрабатывает только навигацию (рендеринг страницы), а не HTTP запросы к API.

---

## Шаг 5. Проверка прокси и middleware

### Файл: `frontend/next.config.js`

**Проверка на наличие:**
- ❌ Нет секции `rewrites`
- ❌ Нет секции `async rewrites()`
- ❌ Нет middleware для проксирования
- ❌ Нет proxy-конфигурации

### Поиск middleware:

**Результат:** Middleware не найден в проекте.

### Вывод:

**Прокси и middleware отсутствуют.** Нет механизмов, которые могли бы переписать путь запроса.

---

## Шаг 6. Сравнение ожидаемого и фактического пути

### Таблица анализа:

| Этап | Ожидаемый путь | Фактический путь (в коде) | Где произошло отличие |
|------|----------------|---------------------------|------------------------|
| `useRoutesSearch` (строка 118) | `/routes/search?params` | `/routes/search?params` | ✅ Совпадает |
| `fetchApi` вход (строка 14) | `/routes/search?params` | `/routes/search?params` | ✅ Совпадает |
| `fetchApi` склеивание (строка 17) | `http://localhost:5000/api/v1/routes/search?params` | `http://localhost:5000/api/v1/routes/search?params` | ✅ Совпадает |
| Финальный URL для `fetch()` (строка 20) | `http://localhost:5000/api/v1/routes/search?params` | `http://localhost:5000/api/v1/routes/search?params` | ✅ Совпадает |

### Вывод:

**В коде путь формируется корректно.** Ожидаемый и фактический пути совпадают на всех этапах.

---

## Шаг 7. Финальный вывод

### Почему запрос ушёл на `/routes`?

**Ответ:** **В коде запрос НЕ уходит на `/routes`.** Код формирует корректный путь `/api/v1/routes/search`.

**Возможные причины, почему может показаться, что запрос ушёл на `/routes`:**

1. **DevTools показывает относительный путь:**
   - В Network tab браузера может отображаться только `/routes/search` без базового URL
   - Это нормальное поведение DevTools для относительных путей

2. **Backend логирует неправильный путь:**
   - Backend может логировать только путь без префикса `/api/v1`
   - Или backend настроен на обработку `/routes` вместо `/api/v1/routes/search`

3. **CORS preflight запрос:**
   - Браузер может делать OPTIONS запрос на `/routes` перед основным запросом
   - Это нормальное поведение CORS

4. **Проблема в сетевом стеке:**
   - Прокси или firewall могут переписывать путь
   - Но это не проблема кода frontend

### Какой именно код сформировал этот путь?

**Код формирует корректный путь:**

1. **`useRoutesSearch` (строка 118):**
   ```typescript
   const response = await fetchApi<unknown>(`/routes/search?${params.toString()}`)
   ```
   Формирует: `/routes/search?params`

2. **`fetchApi` (строка 17):**
   ```typescript
   const url = `${API_BASE_URL}${endpoint}`;
   ```
   Формирует: `http://localhost:5000/api/v1/routes/search?params`

3. **`fetch()` (строка 20):**
   ```typescript
   const response = await fetch(url, {...});
   ```
   Отправляет запрос на: `http://localhost:5000/api/v1/routes/search?params`

### Где пропало `/search`?

**Ответ:** `/search` **НЕ пропадает** в коде. Путь формируется корректно.

### Где пропало `/api/v1`?

**Ответ:** `/api/v1` **НЕ пропадает** в коде. Оно добавляется в `fetchApi` через `API_BASE_URL`.

### Где конкретно происходит подмена пути?

**Ответ:** **Подмена пути НЕ происходит в коде frontend.** Если запрос действительно уходит на `/routes`, это может быть связано с:
1. Backend роутингом (backend может обрабатывать `/routes` как алиас для `/api/v1/routes/search`)
2. Отображением в DevTools (показывает относительный путь)
3. Логированием backend (логирует только путь без префикса)

### Почему backend не логирует этот запрос?

**Возможные причины:**

1. **Backend обрабатывает другой путь:**
   - Backend может быть настроен на обработку `/routes` вместо `/api/v1/routes/search`
   - Или backend имеет rewrite правило, которое преобразует `/api/v1/routes/search` в `/routes`

2. **Backend логирует только путь без префикса:**
   - Middleware или logging middleware может удалять префикс `/api/v1` из логов

3. **Запрос не доходит до backend:**
   - CORS блокирует запрос
   - Сетевой стек перехватывает запрос
   - Backend не запущен или недоступен

---

## Рекомендации

### 1. Проверить фактический запрос в Network tab

**Действие:** Открыть DevTools → Network tab → выполнить поиск маршрутов → проверить фактический URL запроса.

**Ожидаемый результат:** `http://localhost:5000/api/v1/routes/search?from=...&to=...`

### 2. Проверить логи backend

**Действие:** Проверить логи backend при выполнении запроса.

**Ожидаемый результат:** Backend должен логировать запрос на `/api/v1/routes/search` или `/routes/search` (в зависимости от конфигурации).

### 3. Проверить конфигурацию backend

**Действие:** Проверить, как backend обрабатывает пути:
- Есть ли rewrite правила
- Есть ли алиасы для `/routes`
- Какой путь ожидает backend контроллер

### 4. Добавить логирование в `fetchApi`

**Рекомендация (без кода):** Добавить `console.log` в `fetchApi` перед вызовом `fetch()` для отладки фактического URL.

### 5. Проверить CORS preflight

**Действие:** Проверить, не блокирует ли CORS запрос и не делает ли браузер OPTIONS запрос на другой путь.

---

## Итоговый вывод

**Код frontend формирует корректный путь:** `http://localhost:5000/api/v1/routes/search?params`

**Подмена пути в коде НЕ обнаружена.** Если запрос действительно уходит на `/routes`, проблема может быть в:
1. Backend конфигурации (rewrite, алиасы)
2. Отображении в DevTools (относительный путь)
3. Логировании backend (удаление префикса)
4. Сетевом стеке (прокси, firewall)

**Рекомендация:** Проверить фактический запрос в Network tab браузера и логи backend для точного определения, куда уходит запрос.








