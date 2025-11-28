l# Полный диагностический анализ: Почему карта Leaflet не отображается

## КОРНЕВАЯ ПРИЧИНА

**Основная проблема:** CSS Leaflet не загружается корректно из-за того, что событие `onload` на элементе `<link>` не срабатывает в большинстве браузеров. Это приводит к тому, что `isLeafletCssLoaded` остаётся `false`, и инициализация карты блокируется на этапе проверки CSS.

**Вторичная проблема:** Контейнер карты в состояниях `loading` и `error` создаётся внутри `absolute` позиционированного div, что может приводить к некорректным размерам при проверке `checkContainerSize()`.

**Третичная проблема:** `key` в `RouteMapSwitcher` вызывает полное пересоздание компонента при каждом изменении маршрута, уничтожая карту.

---

## ТОЧНОЕ МЕСТО ПРОБЛЕМЫ

### 1. КРИТИЧЕСКАЯ: CSS onload не срабатывает

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 185-192  
**Проблема:** Событие `onload` на элементе `<link>` для CSS не срабатывает в большинстве браузеров (Chrome, Firefox, Safari). Это известная особенность браузеров — CSS `<link>` элементы не всегда вызывают `onload`.

**Текущий код:**
```typescript
link.onload = () => {
  setIsLeafletCssLoaded(true);
};

link.onerror = () => {
  console.error('Failed to load Leaflet CSS');
  setIsLeafletCssLoaded(false);
};
```

**Почему это проблема:**
- `onload` не срабатывает → `isLeafletCssLoaded` остаётся `false`
- Эффект инициализации блокируется на строке 225: `if (providerType === 'leaflet' && !isLeafletCssLoaded)`
- Интервал проверки CSS (строки 230-242) проверяет `cssLink && isLeafletCssLoaded`, но `isLeafletCssLoaded` никогда не становится `true`
- После 50 попыток (5 секунд) показывается ошибка, но CSS уже может быть загружен

---

### 2. КРИТИЧЕСКАЯ: Некорректная проверка CSS в интервале

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 230-242  
**Проблема:** Проверка `cssLink && isLeafletCssLoaded` требует, чтобы оба условия были `true`, но `isLeafletCssLoaded` может остаться `false` из-за проблемы с `onload`.

**Текущий код:**
```typescript
const checkCss = setInterval(() => {
  cssCheckAttempts++;
  const cssLink = document.querySelector('link[data-leaflet-css]');
  if (cssLink && isLeafletCssLoaded) {
    clearInterval(checkCss);
    // CSS загружен, эффект перезапустится автоматически благодаря зависимости isLeafletCssLoaded
  } else if (cssCheckAttempts >= MAX_CSS_CHECK_ATTEMPTS) {
    clearInterval(checkCss);
    const error = new Error('CSS Leaflet не загрузился в течение 5 секунд');
    setInitError(error);
    console.error('Failed to load Leaflet CSS:', error);
  }
}, 100);
```

**Почему это проблема:**
- Если `onload` не сработал, но CSS уже в DOM, проверка `cssLink && isLeafletCssLoaded` никогда не пройдёт
- Интервал будет работать 5 секунд, затем покажет ошибку, даже если CSS загружен

---

### 3. ВЫСОКАЯ: Контейнер в состояниях loading/error не имеет правильных размеров

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 487-497, 501-525, 531-538, 543-551  
**Проблема:** Контейнер карты создаётся внутри `absolute` позиционированного div, что может приводить к некорректным размерам при проверке `checkContainerSize()`.

**Текущий код:**
```typescript
if (isLoading) {
  return (
    <div className={`relative ${className}`} style={{ height }} data-testid="route-map">
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        {/* Loading UI */}
      </div>
      <div ref={containerRef} className="w-full h-full bg-gray-200" data-testid="route-map-container"></div>
    </div>
  );
}
```

**Почему это проблема:**
- Контейнер находится внутри `relative` div с `absolute` дочерним элементом
- `absolute` элемент перекрывает контейнер, и контейнер может не получить правильные размеры
- `checkContainerSize()` может вернуть `false`, даже если контейнер существует

---

### 4. ВЫСОКАЯ: key в RouteMapSwitcher вызывает пересоздание компонента

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map-switcher.tsx`  
**Строка:** 172  
**Проблема:** `key={preserveMapPosition ? 'preserve' : currentRoute.routeId}` вызывает полное пересоздание компонента при каждом изменении маршрута, если `preserveMapPosition === false`.

**Текущий код:**
```typescript
<RouteMap
  route={currentRoute}
  height={height}
  showLegend={showLegend}
  providerType={providerType}
  key={preserveMapPosition ? 'preserve' : currentRoute.routeId}
/>
```

**Почему это проблема:**
- При изменении `currentRoute.routeId` компонент полностью пересоздаётся
- Старая карта уничтожается в cleanup функции (строка 345-353 в `route-map.tsx`)
- Новая карта должна инициализироваться заново, но это может привести к race conditions

---

### 5. СРЕДНЯЯ: Контейнер может быть не готов при первом вызове checkContainerSize

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 249-258, 265-277  
**Проблема:** `checkContainerSize()` вызывается в `setTimeout(initMap, 50)`, но контейнер может быть ещё не отрендерен или не иметь размеров.

**Текущий код:**
```typescript
// Небольшая задержка для гарантии, что DOM полностью отрендерился
const timeoutId = setTimeout(initMap, 50);

// Внутри initMap:
const checkContainerSize = () => {
  const container = containerRef.current;
  if (!container) {
    return false;
  }
  const rect = container.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};
```

**Почему это проблема:**
- 50ms может быть недостаточно для полного рендера, особенно на медленных устройствах
- Если контейнер внутри `absolute` div, размеры могут быть некорректными
- После 10 попыток показывается ошибка, но контейнер может быть готов позже

---

### 6. СРЕДНЯЯ: isMapReady не сбрасывается при ошибке инициализации

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 325-339  
**Проблема:** При ошибке инициализации `isMapReady` остаётся `false`, что правильно, но эффекты для полилиний и маркеров могут не перезапуститься после исправления ошибки.

**Текущий код:**
```typescript
.catch((error) => {
  const initError = error instanceof Error ? error : new Error(String(error));
  setInitError(initError);
  // isMapReady остаётся false - это правильно
});
```

**Почему это проблема:**
- После исправления ошибки (кнопка "Попробовать снова") `isMapReady` сбрасывается в `false` (строка 512)
- Но эффекты для полилиний и маркеров зависят от `isMapReady`, поэтому они не выполнятся до успешной инициализации
- Это правильно, но может быть неочевидно при отладке

---

## СПИСОК ПРОБЛЕМ

### Критические (блокируют отображение карты)

1. **CSS onload не срабатывает** (строки 185-192)
   - Событие `onload` на `<link>` не срабатывает в браузерах
   - `isLeafletCssLoaded` остаётся `false`
   - Инициализация блокируется

2. **Некорректная проверка CSS в интервале** (строки 230-242)
   - Проверка требует `cssLink && isLeafletCssLoaded`, но `isLeafletCssLoaded` может остаться `false`
   - Интервал работает 5 секунд, затем показывает ошибку, даже если CSS загружен

### Высокие (могут блокировать в определённых условиях)

3. **Контейнер в состояниях loading/error не имеет правильных размеров** (строки 487-497, 501-525, 531-538, 543-551)
   - Контейнер внутри `absolute` div может не получить правильные размеры
   - `checkContainerSize()` может вернуть `false`

4. **key в RouteMapSwitcher вызывает пересоздание компонента** (строка 172 в `route-map-switcher.tsx`)
   - При изменении маршрута компонент полностью пересоздаётся
   - Старая карта уничтожается, новая должна инициализироваться заново

### Средние (могут вызывать проблемы в редких случаях)

5. **Контейнер может быть не готов при первом вызове checkContainerSize** (строки 249-258, 265-277)
   - 50ms может быть недостаточно для полного рендера
   - После 10 попыток показывается ошибка, но контейнер может быть готов позже

6. **isMapReady не сбрасывается при ошибке инициализации** (строки 325-339)
   - Это правильно, но может быть неочевидно при отладке

---

## СПИСОК ТОЧЕЧНЫХ ИСПРАВЛЕНИЙ

### 1. КРИТИЧЕСКОЕ: Исправить проверку загрузки CSS

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 185-192, 230-242

**Что изменить:**
- Убрать зависимость от `onload` события для CSS
- Использовать проверку наличия CSS в DOM через `document.querySelector('link[data-leaflet-css]')`
- Проверять, что CSS действительно загружен, через проверку стилей Leaflet (например, проверка наличия класса `.leaflet-container` в computed styles)
- В интервале проверки CSS проверять только наличие `<link>` в DOM, без проверки `isLeafletCssLoaded`
- Установить `isLeafletCssLoaded = true` сразу после добавления `<link>` в DOM, если он уже существует

**Приоритет:** КРИТИЧЕСКИЙ

---

### 2. КРИТИЧЕСКОЕ: Упростить проверку CSS в интервале

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 230-242

**Что изменить:**
- Изменить проверку с `cssLink && isLeafletCssLoaded` на просто `cssLink`
- Проверять, что `<link>` существует в DOM и имеет атрибут `href`
- Установить `isLeafletCssLoaded = true` при обнаружении `<link>` в DOM
- Убрать зависимость от состояния `isLeafletCssLoaded` в условии интервала

**Приоритет:** КРИТИЧЕСКИЙ

---

### 3. ВЫСОКИЙ: Исправить контейнер в состояниях loading/error

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 487-497, 501-525, 531-538, 543-551

**Что изменить:**
- Убедиться, что контейнер имеет правильные размеры во всех состояниях
- Добавить явные стили `height` и `minHeight` к контейнеру в состояниях loading/error
- Убедиться, что контейнер не перекрывается `absolute` элементами
- Возможно, переместить контейнер вне `absolute` div или использовать `z-index`

**Приоритет:** ВЫСОКИЙ

---

### 4. ВЫСОКИЙ: Исправить key в RouteMapSwitcher

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map-switcher.tsx`  
**Строка:** 172

**Что изменить:**
- Использовать стабильный `key` для `RouteMap`, чтобы избежать пересоздания компонента
- Если `preserveMapPosition === true`, использовать `'preserve'`
- Если `preserveMapPosition === false`, использовать стабильный ключ, например, `'route-map'` или `providerType`
- Обновлять `route` через пропсы, а не через пересоздание компонента

**Приоритет:** ВЫСОКИЙ

---

### 5. СРЕДНИЙ: Увеличить задержку перед проверкой контейнера

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 343

**Что изменить:**
- Увеличить задержку с 50ms до 100-150ms для гарантии полного рендера
- Или использовать `requestAnimationFrame` для ожидания следующего кадра рендера
- Добавить проверку, что контейнер действительно отрендерен перед вызовом `checkContainerSize()`

**Приоритет:** СРЕДНИЙ

---

### 6. СРЕДНИЙ: Добавить дополнительное логирование

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строки:** 230-242, 265-277

**Что изменить:**
- Добавить логирование в интервал проверки CSS для отладки
- Добавить логирование в `checkContainerSize()` для отладки размеров контейнера
- Логировать, когда CSS обнаружен в DOM, но `isLeafletCssLoaded` ещё `false`

**Приоритет:** СРЕДНИЙ

---

## ПРИОРИТЕТЫ ИСПРАВЛЕНИЙ

### Критические (исправить немедленно)

1. ✅ Исправить проверку загрузки CSS (убрать зависимость от `onload`)
2. ✅ Упростить проверку CSS в интервале (проверять только наличие в DOM)

### Высокие (исправить после критических)

3. ✅ Исправить контейнер в состояниях loading/error
4. ✅ Исправить key в RouteMapSwitcher

### Средние (исправить при необходимости)

5. ⚠️ Увеличить задержку перед проверкой контейнера
6. ⚠️ Добавить дополнительное логирование

---

## ВЫВОДЫ

**Основная причина:** CSS Leaflet не загружается корректно из-за того, что событие `onload` на элементе `<link>` не срабатывает в браузерах. Это приводит к тому, что `isLeafletCssLoaded` остаётся `false`, и инициализация карты блокируется.

**Решение:** Убрать зависимость от `onload` и использовать проверку наличия CSS в DOM через `document.querySelector('link[data-leaflet-css]')`. Установить `isLeafletCssLoaded = true` сразу после добавления `<link>` в DOM или при обнаружении существующего `<link>`.

**Дополнительные проблемы:** Контейнер в состояниях loading/error может не иметь правильных размеров, и `key` в RouteMapSwitcher вызывает пересоздание компонента. Эти проблемы должны быть исправлены после решения основной проблемы с CSS.

---

## РЕКОМЕНДАЦИИ

1. **Немедленно исправить:** Проблему с проверкой CSS (критические исправления 1 и 2)
2. **Затем исправить:** Проблему с контейнером и key (высокие исправления 3 и 4)
3. **При необходимости:** Улучшить задержки и логирование (средние исправления 5 и 6)

После исправления критических проблем карта Leaflet должна начать отображаться корректно.








