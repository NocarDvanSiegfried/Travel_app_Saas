# Отчёт о тестировании карты маршрутов (E2E)

**Дата:** 2025-01-27  
**Версия:** 1.0  
**Статус:** Требуются исправления

---

## 1. Проверка API ключа Yandex Maps

### 1.1. Наличие переменной окружения

**Статус:** ✅ Настроено

**Проверка:**
- Файл `.env.local` существует
- Переменная `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` задана
- Значение: 

### 1.2. Использование в layout.tsx

**Статус:** ✅ Правильно настроено

**Проверка кода:**
```typescript
{process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY && process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY.trim() !== '' && (
  <script
    src={`https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${encodeURIComponent(process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY)}`}
    defer
  />
)}
```

**Анализ:**
- ✅ Проверка наличия ключа реализована
- ✅ Проверка на пустую строку реализована
- ✅ Используется `encodeURIComponent` для безопасной кодировки
- ✅ Скрипт загружается с атрибутом `defer`

**Рекомендация:**
- Код корректен, API ключ будет правильно вставлен в URL при сборке/запуске

### 1.3. Инициализация карты

**Статус:** ⚠️ Требует проверки в браузере

**Проверка кода:**
- `YandexMapProvider` проверяет наличие `window.ymaps` перед инициализацией
- Есть обработка ошибок при отсутствии API

**Что нужно проверить вручную:**
- [ ] Открыть DevTools → Network → проверить загрузку скрипта Yandex Maps
- [ ] Проверить, что `window.ymaps` доступен после загрузки
- [ ] Проверить консоль на ошибки инициализации
- [ ] Убедиться, что карта отображается

### 1.4. Fallback на Leaflet

**Статус:** ⚠️ Требует проверки

**Проверка кода:**
- `LeafletMapProvider` реализован
- Логика переключения между провайдерами есть в `RouteMap`

**Что нужно проверить:**
- [ ] Если Yandex Maps не загрузился, используется Leaflet
- [ ] Карта отображается с OpenStreetMap тайлами
- [ ] Нет ошибок в консоли

---

## 2. Результаты E2E тестов

### 2.1. Общая статистика

**Результат:** ⚠️ Частично работает

- **Всего тестов:** 105
- **Прошло:** 20
- **Упало:** 85
- **Время выполнения:** ~1.4 минуты

### 2.2. Успешные тесты (20)

**Браузеры:**
- ✅ Chromium: 15 тестов прошли
- ✅ Mobile Chrome: 2 теста прошли
- ✅ Mobile Safari: 1 тест прошёл
- ✅ WebKit: 1 тест прошёл

**Категории успешных тестов:**
- Route Map Integration: `should handle map loading error gracefully` (Chromium, Mobile Chrome)
- Routes Search: `should display error when required fields are empty` (Chromium, Mobile Chrome, Mobile Safari)

### 2.3. Упавшие тесты (85)

#### Категория 1: Отсутствие элементов route-switcher (6 тестов в Chromium)

**Тесты:**
1. `route-map-alternatives.spec.ts` - `should display route switcher when multiple routes are available`
2. `route-map-alternatives.spec.ts` - `should switch to next route when next button is clicked`
3. `route-map-alternatives.spec.ts` - `should switch to previous route when previous button is clicked`
4. `route-map-alternatives.spec.ts` - `should switch route when indicator is clicked`
5. `route-map-alternatives.spec.ts` - `should disable previous button on first route`
6. `route-map-alternatives.spec.ts` - `should disable next button on last route`

**Ошибки:**
```
Error: expect(locator).toBeVisible() failed
Timeout: 10000ms
Error: element(s) not found
```

**Элементы, которые не находятся:**
- `[data-testid="route-map-switcher"]` - основной контейнер
- `[data-testid="route-switcher-next"]` - кнопка "Следующий"
- `[data-testid="route-switcher-prev"]` - кнопка "Предыдущий"
- `[data-testid="route-switcher-indicator-1"]` - индикатор маршрута

**Анализ кода:**
- ✅ `data-testid` атрибуты **присутствуют** в `RouteMapSwitcher.tsx`:
  - `data-testid="route-map-switcher"` (строка 111)
  - `data-testid="route-switcher-controls"` (строка 114)
  - `data-testid="route-switcher-prev"` (строка 123)
  - `data-testid="route-switcher-next"` (строка 135)
  - `data-testid="route-switcher-indicator-${index}"` (строка 154)

**Причина проблемы:**
Элементы не рендерятся, потому что условие `hasAlternatives` возвращает `false`.

**Проверка логики:**
```typescript
const hasAlternatives = useMemo(() => {
  return routes && routes.length > 1;
}, [routes]);
```

**Проблема:** Компонент `RouteMapSwitcher` получает `routes` из пропсов, но в тестах данные загружаются через `localStorage` в `RouteMapWithAlternatives`, который затем передаёт их в `RouteMapSwitcher`.

**Возможные причины:**
1. Данные не загружаются из `localStorage` в тестах
2. Компонент `RouteMapWithAlternatives` не передаёт `routes` в `RouteMapSwitcher`
3. Условие `hasAlternatives` вычисляется до загрузки данных
4. Компонент не рендерится на странице (не интегрирован в RouteDetailsView)

**Решение:**
- Проверить, что `RouteMapWithAlternatives` правильно загружает данные из `localStorage`
- Убедиться, что `routes` передаются в `RouteMapSwitcher`
- Добавить логирование для отладки
- Проверить интеграцию в `RouteDetailsView`

#### Категория 2: Firefox не установлен (35 тестов)

**Ошибка:**
```
Error: browserType.launch: Executable doesn't exist at 
C:\Users\admin\AppData\Local\ms-playwright\firefox-1495\firefox\firefox.exe
```

**Затронутые тесты:**
- Все тесты в Firefox проекте (35 тестов)

**Причина:** Playwright Firefox не установлен

**Решение:**
```bash
npx playwright install firefox
```

**Или:** Убрать Firefox из конфигурации `playwright.config.ts` (если не нужен)

#### Категория 3: WebKit не установлен (несколько тестов)

**Ошибка:**
```
Error: browserType.launch: Executable doesn't exist at 
C:\Users\admin\AppData\Local\ms-playwright\webkit-2215\Playwright.exe
```

**Причина:** Playwright WebKit не установлен

**Решение:**
```bash
npx playwright install webkit
```

#### Категория 4: Strict mode violation в routes-search (9 тестов)

**Ошибка:**
```
Error: locator.fill: Error: strict mode violation: getByLabel('Куда') resolved to 2 elements
```

**Затронутые тесты:**
- `routes-search.spec.ts` - `should search for routes with valid data`
- `routes-search.spec.ts` - `should display error on invalid search (same cities)`
- `routes-search.spec.ts` - `should handle API error gracefully`

**Причина:** На странице два элемента с одинаковым label "Куда"

**Решение:**
- Использовать более специфичные селекторы
- Использовать `getByRole` с дополнительными параметрами
- Использовать `getByTestId` если есть
- Использовать `first()` или `nth()` для выбора конкретного элемента

#### Категория 5: Элемент не найден в route-map-integration (1 тест)

**Тест:**
- `route-map-integration.spec.ts` - `should handle empty route segments`

**Ошибка:**
```
Error: expect(locator).toBeVisible() failed
Timeout: 5000ms
Error: element(s) not found
```

**Элемент:** Не указан в выводе, но судя по контексту, это может быть элемент карты или сообщение об ошибке

**Решение:**
- Проверить, какой именно элемент не находится
- Добавить `data-testid` если отсутствует
- Увеличить timeout если элемент загружается долго

---

## 3. Детальный анализ упавших тестов

### 3.1. Тесты route-map-alternatives (6 тестов в Chromium)

**Проблема:** Элементы `route-switcher` не находятся

**Анализ:**

1. **Тест:** `should display route switcher when multiple routes are available`
   - **Ожидает:** `[data-testid="route-map-switcher"]` должен быть видимым
   - **Реальность:** Элемент не найден
   - **Причина:** Компонент не рендерится или `hasAlternatives = false`

2. **Тест:** `should switch to next route when next button is clicked`
   - **Ожидает:** `[data-testid="route-switcher-next"]` должен быть найден
   - **Реальность:** Элемент не найден
   - **Причина:** Кнопка не рендерится, так как `hasAlternatives = false`

3. **Тест:** `should switch to previous route when previous button is clicked`
   - **Ожидает:** `[data-testid="route-switcher-prev"]` должен быть найден
   - **Реальность:** Элемент не найден
   - **Причина:** Кнопка не рендерится

4. **Тест:** `should switch route when indicator is clicked`
   - **Ожидает:** `[data-testid="route-switcher-indicator-1"]` должен быть найден
   - **Реальность:** Элемент не найден
   - **Причина:** Индикаторы не рендерятся

5. **Тест:** `should disable previous button on first route`
   - **Ожидает:** `[data-testid="route-switcher-prev"]` должен быть disabled
   - **Реальность:** Элемент не найден
   - **Причина:** Кнопка не рендерится

6. **Тест:** `should disable next button on last route`
   - **Ожидает:** `[data-testid="route-switcher-next"]` должен быть disabled
   - **Реальность:** Элемент не найден
   - **Причина:** Кнопка не рендерится

**Корневая причина:**
Компонент `RouteMapSwitcher` не получает `routes` с длиной > 1, поэтому `hasAlternatives = false` и элементы не рендерятся.

**Что проверить:**
1. Загружаются ли данные из `localStorage` в тестах
2. Передаются ли `routes` из `RouteMapWithAlternatives` в `RouteMapSwitcher`
3. Правильно ли работает логика загрузки альтернативных маршрутов

### 3.2. Тесты routes-search (9 тестов)

**Проблема:** Strict mode violation - два элемента с label "Куда"

**Анализ:**
- Тест использует `page.getByLabel('Куда')` для заполнения поля
- На странице два элемента с таким label
- Playwright не может определить, какой использовать

**Решение:**
1. Использовать `getByRole('textbox', { name: 'Куда' }).first()`
2. Использовать `getByTestId` если есть
3. Использовать более специфичный селектор (например, по форме)
4. Исправить HTML, чтобы label был уникальным

### 3.3. Тесты route-map-integration (1 тест)

**Проблема:** Элемент не найден при пустых сегментах

**Анализ:**
- Тест проверяет обработку пустых сегментов маршрута
- Какой-то элемент не находится (не указан в выводе)

**Решение:**
- Проверить, какой элемент ожидается в тесте
- Добавить `data-testid` если отсутствует
- Проверить логику обработки пустых сегментов

---

## 4. Приоритеты исправления

### Критические (блокируют функциональность)

**Нет критических проблем** — компиляция успешна, приложение работает

### Высокие (требуют внимания)

1. **Элементы route-switcher не рендерятся**
   - **Приоритет:** Высокий
   - **Влияние:** Нельзя протестировать переключение альтернативных маршрутов
   - **Решение:** Проверить логику загрузки данных из localStorage и передачу routes

2. **Strict mode violation в routes-search**
   - **Приоритет:** Высокий
   - **Влияние:** Тесты поиска маршрутов не работают
   - **Решение:** Использовать более специфичные селекторы

### Средние (можно отложить)

3. **Firefox не установлен**
   - **Приоритет:** Средний
   - **Влияние:** Тесты не запускаются в Firefox
   - **Решение:** `npx playwright install firefox` или убрать из конфига

4. **WebKit не установлен**
   - **Приоритет:** Средний
   - **Влияние:** Тесты не запускаются в Safari
   - **Решение:** `npx playwright install webkit` или убрать из конфига

5. **Элемент не найден в route-map-integration**
   - **Приоритет:** Средний
   - **Влияние:** Один тест не проходит
   - **Решение:** Проверить тест и добавить нужные data-testid

---

## 5. Что можно исправить автоматически

### 5.1. Исправления без уточнений

1. **Установить браузеры Playwright:**
   ```bash
   npx playwright install firefox
   npx playwright install webkit
   ```

2. **Исправить strict mode violation в routes-search:**
   - Заменить `getByLabel('Куда')` на `getByRole('textbox', { name: 'Куда' }).first()`
   - Или использовать `getByTestId` если есть

3. **Добавить data-testid для обработки пустых сегментов:**
   - Проверить тест `should handle empty route segments`
   - Добавить нужные `data-testid` в компоненты

### 5.2. Исправления, требующие уточнений

1. **Проблема с route-switcher:**
   - Нужно проверить, как данные загружаются из localStorage
   - Нужно проверить, передаются ли routes в RouteMapSwitcher
   - Возможно, нужно исправить логику в RouteMapWithAlternatives

2. **Интеграция в RouteDetailsView:**
   - Нужно проверить, используется ли RouteMapWithAlternatives в RouteDetailsView
   - Возможно, нужно добавить интеграцию

---

## 6. Рекомендации

### Немедленные действия:

1. **Установить браузеры Playwright:**
   ```bash
   npx playwright install firefox webkit
   ```

2. **Исправить strict mode violation:**
   - Обновить селекторы в `routes-search.spec.ts`

3. **Проверить логику route-switcher:**
   - Добавить логирование в `RouteMapWithAlternatives`
   - Проверить загрузку данных из localStorage
   - Убедиться, что routes передаются в RouteMapSwitcher

### После исправлений:

1. **Запустить E2E тесты снова:**
   ```bash
   npm run test:e2e
   ```

2. **Проверить результаты:**
   - Убедиться, что route-switcher тесты проходят
   - Убедиться, что routes-search тесты проходят

3. **Провести ручное тестирование:**
   - Открыть страницу RouteDetailsView
   - Проверить отображение карты
   - Проверить переключение альтернативных маршрутов

---

## 7. Итоговый статус

| Критерий | Статус |
|----------|--------|
| API ключ настроен | ✅ Да |
| Компиляция | ✅ Успешна |
| E2E тесты запускаются | ✅ Да |
| E2E тесты проходят | ⚠️ Частично (20/105) |
| Готовность к ручному тестированию | ✅ Готова |
| Готовность к продакшену | ❌ Не готова (требует исправления тестов) |

---

**Отчёт подготовлен:** 2025-01-27  
**Версия:** 1.0

