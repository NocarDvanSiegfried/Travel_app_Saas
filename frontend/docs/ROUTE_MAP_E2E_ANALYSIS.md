# Анализ E2E тестов карты маршрутов

**Дата:** 2025-01-27  
**Версия:** 1.0

---

## 1. Статус API ключа Yandex Maps

### ✅ Настроено правильно

- Файл `.env.local` существует
- Переменная `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` задана
- Код в `layout.tsx` корректен и будет правильно работать

**Требуется:** Ручная проверка в браузере после запуска dev-сервера

---

## 2. Состояние E2E тестов

### Статистика

- **Всего:** 105 тестов
- **Прошло:** 20 (19%)
- **Упало:** 85 (81%)

### Успешные тесты (20)

- Route Map Integration: обработка ошибок загрузки карты
- Routes Search: валидация пустых полей

### Упавшие тесты (85)

#### Группа 1: Route Map Alternatives (6 тестов в Chromium) — КРИТИЧНО

**Проблема:** Элементы `route-switcher` не находятся

**Анализ корневой причины:**

1. **Тесты ожидают:**Df
   - Компонент `RouteMapWithAlternatives` используется в `RouteDetailsView`
   - Компонент загружает альтернативные маршруты из `localStorage`
   - Компонент передаёт все маршруты в `RouteMapSwitcher`
   - `RouteMapSwitcher` рендерит элементы управления при `routes.length > 1`

2. **Реальность:**
   - В `RouteDetailsView` используется `RouteMapSection` (строка 136)
   - `RouteMapSection` загружает только основной маршрут из `localStorage` (ключ `route-${routeId}`)
   - `RouteMapSection` НЕ загружает альтернативы из `route-${routeId}-alternatives`
   - `RouteMapSection` передаёт только один маршрут в `RouteMap`
   - `RouteMapSwitcher` не используется вообще

3. **Код подтверждает:**
   ```typescript
   // RouteMapSection.tsx, строки 72-80
   const storedData = safeLocalStorage.getItem(`route-${routeId}`);
   // Загружает только основной маршрут, альтернативы не загружаются
   ```

4. **RouteMapWithAlternatives загружает альтернативы:**
   ```typescript
   // RouteMapWithAlternatives.tsx, строки 98-111
   const alternativesKey = `route-${primaryRouteId}-alternatives`;
   const alternativesData = safeLocalStorage.getItem(alternativesKey);
   if (alternativesData) {
     // Загружает альтернативы
   }
   ```

**Вывод:** Несоответствие между тестами и реализацией.

**Варианты решения:**
1. Изменить `RouteMapSection` чтобы он загружал альтернативы (как `RouteMapWithAlternatives`)
2. Заменить `RouteMapSection` на `RouteMapWithAlternatives` в `RouteDetailsView`
3. Изменить тесты чтобы они использовали правильный компонент

#### Группа 2: Firefox не установлен (35 тестов)

**Ошибка:** `Executable doesn't exist at ...\firefox\firefox.exe`

**Решение:** `npx playwright install firefox`

#### Группа 3: WebKit не установлен (несколько тестов)

**Ошибка:** `Executable doesn't exist at ...\webkit-2215\Playwright.exe`

**Решение:** `npx playwright install webkit`

#### Группа 4: Strict mode violation в routes-search (9 тестов)

**Ошибка:** `getByLabel('Куда') resolved to 2 elements`

**Причина:** На странице два элемента с одинаковым label

**Решение:** Использовать более специфичные селекторы:
```typescript
// Вместо:
await page.getByLabel('Куда').fill('Нерюнгри');

// Использовать:
await page.getByRole('textbox', { name: 'Куда' }).first().fill('Нерюнгри');
// Или:
await page.getByTestId('destination-input').fill('Нерюнгри');
```

#### Группа 5: Элемент не найден в route-map-integration (1 тест)

**Тест:** `should handle empty route segments`

**Проблема:** Селектор сообщения об ошибке не находит элемент

**Решение:** Проверить тест и добавить нужные `data-testid` или исправить селектор

---

## 3. Детальный анализ проблемы route-switcher

### Текущая реализация

**RouteDetailsView.tsx (строка 136):**
```typescript
<RouteMapSection routeId={primaryRoute.route.Ref_Key} height="500px" />
```

**RouteMapSection.tsx:**
- Загружает только `route-${routeId}` из localStorage
- НЕ загружает `route-${routeId}-alternatives`
- Передаёт один маршрут в `RouteMap`
- НЕ использует `RouteMapWithAlternatives` или `RouteMapSwitcher`

**RouteMapWithAlternatives.tsx:**
- Загружает `route-${primaryRouteId}` из localStorage
- Загружает `route-${primaryRouteId}-alternatives` из localStorage
- Передаёт все маршруты в `RouteMapSwitcher`
- `RouteMapSwitcher` рендерит элементы управления при `routes.length > 1`

### Что ожидают тесты

**route-map-alternatives.spec.ts:**
```typescript
// Сохраняет данные в localStorage
localStorage.setItem('route-route-1', JSON.stringify({ route: route1 }));
localStorage.setItem('route-route-1-alternatives', JSON.stringify({ routes: [route2] }));

// Переходит на страницу
await page.goto('/routes/details?routeId=route-1');

// Ожидает найти элементы route-switcher
await expect(page.getByTestId('route-map-switcher')).toBeVisible();
```

### Несоответствие

- **Тесты ожидают:** `RouteMapWithAlternatives` используется и загружает альтернативы
- **Реальность:** `RouteMapSection` используется и НЕ загружает альтернативы

---

## 4. Приоритеты исправления

### Приоритет 1: Высокий

1. **Исправить несоответствие route-switcher**
   - **Вариант A:** Изменить `RouteMapSection` чтобы он загружал альтернативы
   - **Вариант B:** Заменить `RouteMapSection` на `RouteMapWithAlternatives` в `RouteDetailsView`
   - **Вариант C:** Изменить тесты

2. **Исправить strict mode violation**
   - Обновить селекторы в `routes-search.spec.ts`

### Приоритет 2: Средний

3. **Установить браузеры Playwright**
   - `npx playwright install firefox webkit`

4. **Исправить тест route-map-integration**
   - Проверить селектор сообщения об ошибке

---

## 5. Что можно исправить автоматически

### ✅ Без уточнений

1. Установить браузеры: `npx playwright install firefox webkit`
2. Исправить strict mode violation: обновить селекторы в `routes-search.spec.ts`
3. Исправить тест route-map-integration: проверить селектор

### ⚠️ Требуют решения

1. **Проблема route-switcher:**
   - Какой компонент должен использоваться в `RouteDetailsView`?
   - Должен ли `RouteMapSection` загружать альтернативы?
   - Или нужно заменить на `RouteMapWithAlternatives`?

---

## 6. Вопросы для уточнения

1. **Должен ли `RouteMapSection` поддерживать альтернативные маршруты?**
   - Если да → добавить логику загрузки альтернатив
   - Если нет → заменить на `RouteMapWithAlternatives` в `RouteDetailsView`

2. **Какой компонент должен использоваться по умолчанию?**
   - `RouteMapSection` — простой, без альтернатив
   - `RouteMapWithAlternatives` — с поддержкой альтернатив
   - Условный рендеринг в зависимости от наличия альтернатив

3. **Как должны храниться альтернативные маршруты?**
   - В `localStorage` как `route-{routeId}-alternatives`? (текущий формат)
   - В том же ключе что и основной маршрут?
   - В другом формате?

---

**Отчёт подготовлен:** 2025-01-27  
**Версия:** 1.0



