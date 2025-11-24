# Анализ проблемы: Карта Leaflet не отображается на /routes/details

## КОРНЕВАЯ ПРИЧИНА

**Основная проблема:** `providerType='leaflet'` не передаётся в цепочке компонентов, из-за чего везде используется дефолтное значение `'yandex'`. В результате:
- Создаётся `YandexMapProvider` вместо `LeafletMapProvider`
- CSS Leaflet не загружается
- `initialize()` вызывается для Yandex, а не для Leaflet
- Карта Leaflet никогда не инициализируется

**Первая проблема в цепочке:** `RouteDetailsView.tsx` не передаёт `providerType` в `RouteMapWithAlternatives`.

---

## МЕСТО ОШИБКИ

**Файл:** `frontend/src/modules/routes/features/route-details/ui/route-details-view.tsx`  
**Строка:** 136  
**Компонент:** `RouteDetailsView`  
**Проблема:** Вызов `<RouteMapWithAlternatives>` без пропа `providerType`

```typescript
// Текущий код (строка 136):
<RouteMapWithAlternatives primaryRouteId={primaryRoute.route.Ref_Key} height="500px" />

// Отсутствует: providerType='leaflet'
```

**Цепочка передачи providerType:**
1. `RouteDetailsView` (строка 136) → НЕ передаёт `providerType` → дефолт `'yandex'`
2. `RouteMapWithAlternatives` (строка 66) → дефолт `'yandex'` → передаёт в `RouteMapSwitcher` (строка 162)
3. `RouteMapSwitcher` (строка 65) → дефолт `'yandex'` → передаёт в `RouteMap` (строка 170)
4. `RouteMap` (строка 100) → дефолт `'yandex'` → использует `YandexMapProvider`

---

## ПРОБЛЕМЫ С ЭФФЕКТАМИ

### 1. useEffect для загрузки CSS Leaflet (route-map.tsx, строки 160-180)
**Проблема:** Эффект не срабатывает, потому что `providerType !== 'leaflet'`
- Условие: `if (typeof window === 'undefined' || providerType !== 'leaflet')` → всегда `true` (providerType = 'yandex')
- Результат: CSS Leaflet никогда не загружается

### 2. useMemo для создания провайдера (route-map.tsx, строки 183-193)
**Проблема:** Создаётся `YandexMapProvider` вместо `LeafletMapProvider`
- Условие: `if (providerType === 'leaflet')` → всегда `false`
- Результат: `return new YandexMapProvider()` выполняется всегда

### 3. useEffect для инициализации карты (route-map.tsx, строки 196-268)
**Проблема:** Инициализируется Yandex карта, а не Leaflet
- Вызывается: `mapProvider.initialize()` для `YandexMapProvider`
- Результат: Leaflet карта никогда не инициализируется

### 4. useEffect для рендеринга полилиний (route-map.tsx, строки 295-326)
**Проблема:** Нет проверки `isInitialized()` или `isMapReady` перед вызовом `addPolyline`
- Проверяется только: `if (!mapProviderRef.current || !visibleSegments || visibleSegments.length === 0)`
- Отсутствует: проверка `mapProviderRef.current.isInitialized()` или `mapProviderRef.current.isMapReady`
- Риск: `addPolyline` может быть вызван до завершения инициализации карты (race condition)

### 5. useEffect для рендеринга маркеров (route-map.tsx, строки 329-360)
**Проблема:** Нет проверки `isInitialized()` или `isMapReady` перед вызовом `addMarker`
- Проверяется только: `if (!mapProviderRef.current || !mapData || !mapData.segments || mapData.segments.length === 0)`
- Отсутствует: проверка `mapProviderRef.current.isInitialized()` или `mapProviderRef.current.isMapReady`
- Риск: `addMarker` может быть вызван до завершения инициализации карты (race condition)

### 6. Зависимости useEffect
**Проблема:** Зависимости корректны, но эффекты не срабатывают из-за неправильного `providerType`
- `useEffect` для CSS: зависимость `[providerType]` → не срабатывает, т.к. `providerType = 'yandex'`
- `useMemo` для провайдера: зависимости `[externalMapProvider, providerType]` → создаёт Yandex провайдер
- `useEffect` для инициализации: зависимости `[mapProvider, showControls, providerType]` → инициализирует Yandex

---

## ЧТО МЕШАЕТ LEAFLET СТАРТОВАТЬ

### 1. providerType не передаётся / передаётся неправильно
- **Критично:** `RouteDetailsView` не передаёт `providerType='leaflet'` в `RouteMapWithAlternatives`
- **Результат:** Везде используется дефолт `'yandex'`

### 2. CSS не загружается
- **Причина:** `providerType !== 'leaflet'` в условии загрузки CSS (route-map.tsx, строка 161)
- **Результат:** CSS Leaflet никогда не добавляется в `<head>`

### 3. Провайдер не создаётся
- **Причина:** `providerType !== 'leaflet'` в условии создания провайдера (route-map.tsx, строка 188)
- **Результат:** Создаётся `YandexMapProvider` вместо `LeafletMapProvider`

### 4. initialize() не вызывается для Leaflet
- **Причина:** `mapProvider` — это `YandexMapProvider`, а не `LeafletMapProvider`
- **Результат:** `LeafletMapProvider.initialize()` никогда не вызывается

### 5. Контейнер имеет размеры
- **Статус:** ✅ Контейнер проверяется корректно (route-map.tsx, строки 206-214)
- **Статус:** ✅ Есть retry механизм для ожидания размеров (route-map.tsx, строки 217-222)

### 6. Race condition между инициализацией и рендерингом
- **Проблема:** `addPolyline` и `addMarker` вызываются без проверки `isInitialized()` или `isMapReady`
- **Риск:** Методы могут быть вызваны до завершения `initialize()`, что приведёт к ошибкам
- **Защита в LeafletMapProvider:** ✅ Есть проверка `isMapReady` в `addPolyline` (строка 286) и `addMarker` (строка 195)
- **Проблема:** Эти методы не вызываются, т.к. используется `YandexMapProvider`

### 7. mapProviderRef.current = null в момент вызова addPolyline/addMarker
- **Статус:** ✅ Проверяется в useEffect (route-map.tsx, строки 296, 330)
- **Проблема:** Нет проверки `isInitialized()` или `isMapReady` перед вызовами

---

## СПИСОК ТОЧЕЧНЫХ ИСПРАВЛЕНИЙ

### КРИТИЧЕСКИЙ ПРИОРИТЕТ

#### 1. Передать providerType='leaflet' в RouteMapWithAlternatives
**Файл:** `frontend/src/modules/routes/features/route-details/ui/route-details-view.tsx`  
**Строка:** 136  
**Действие:** Добавить проп `providerType='leaflet'` в компонент `RouteMapWithAlternatives`  
**Код:**
```typescript
// Было:
<RouteMapWithAlternatives primaryRouteId={primaryRoute.route.Ref_Key} height="500px" />

// Должно быть:
<RouteMapWithAlternatives 
  primaryRouteId={primaryRoute.route.Ref_Key} 
  height="500px"
  providerType="leaflet"
/>
```
**Приоритет:** Критический  
**Причина:** Это корневая причина проблемы. Без этого исправления все остальные проверки бесполезны.

---

### ВЫСОКИЙ ПРИОРИТЕТ

#### 2. Добавить проверку isInitialized() перед вызовом addPolyline
**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 295-326 (useEffect для полилиний)  
**Действие:** Добавить проверку `mapProviderRef.current.isInitialized()` перед вызовом `addPolyline`  
**Изменение:**
```typescript
// Добавить проверку после строки 296:
if (!mapProviderRef.current || !visibleSegments || visibleSegments.length === 0) {
  return;
}

// Добавить проверку инициализации:
if (!mapProviderRef.current.isInitialized()) {
  return;
}
```
**Приоритет:** Высокий  
**Причина:** Предотвращает race condition, когда `addPolyline` вызывается до завершения инициализации.

#### 3. Добавить проверку isInitialized() перед вызовом addMarker
**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 329-360 (useEffect для маркеров)  
**Действие:** Добавить проверку `mapProviderRef.current.isInitialized()` перед вызовом `addMarker`  
**Изменение:**
```typescript
// Добавить проверку после строки 330:
if (!mapProviderRef.current || !mapData || !mapData.segments || mapData.segments.length === 0) {
  return;
}

// Добавить проверку инициализации:
if (!mapProviderRef.current.isInitialized()) {
  return;
}
```
**Приоритет:** Высокий  
**Причина:** Предотвращает race condition, когда `addMarker` вызывается до завершения инициализации.

---

### СРЕДНИЙ ПРИОРИТЕТ

#### 4. Добавить зависимость isMapReady в useEffect для полилиний
**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 326 (зависимости useEffect)  
**Действие:** Добавить состояние `isMapReady` и включить его в зависимости useEffect  
**Примечание:** Это улучшение, но не критично, т.к. проверка `isInitialized()` уже решает проблему.

#### 5. Добавить зависимость isMapReady в useEffect для маркеров
**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 360 (зависимости useEffect)  
**Действие:** Добавить состояние `isMapReady` и включить его в зависимости useEffect  
**Примечание:** Это улучшение, но не критично, т.к. проверка `isInitialized()` уже решает проблему.

---

## ИТОГОВАЯ СХЕМА ПРОБЛЕМЫ

```
RouteDetailsView (строка 136)
  └─ НЕ передаёт providerType='leaflet'
     └─ RouteMapWithAlternatives (строка 66)
        └─ Использует дефолт providerType='yandex'
           └─ RouteMapSwitcher (строка 65)
              └─ Использует дефолт providerType='yandex'
                 └─ RouteMap (строка 100)
                    └─ Использует дефолт providerType='yandex'
                       ├─ CSS Leaflet НЕ загружается (строка 161: providerType !== 'leaflet')
                       ├─ Создаётся YandexMapProvider (строка 192)
                       └─ Инициализируется Yandex карта (строка 233)
                          └─ Leaflet карта НИКОГДА не инициализируется
```

---

## ВЫВОДЫ

1. **Основная проблема:** Отсутствие `providerType='leaflet'` в `RouteDetailsView` приводит к использованию Yandex карты вместо Leaflet.

2. **Вторичные проблемы:** Отсутствие проверок `isInitialized()` перед вызовами `addPolyline` и `addMarker` может привести к race condition, но это не критично, т.к. Leaflet карта всё равно не инициализируется.

3. **Минимальное исправление:** Достаточно добавить `providerType='leaflet'` в `RouteDetailsView`, чтобы карта Leaflet начала работать.

4. **Рекомендуемые улучшения:** Добавить проверки `isInitialized()` для предотвращения потенциальных race condition в будущем.

---

## ПРИОРИТЕТ ИСПРАВЛЕНИЙ

1. **Критический:** Исправление #1 (передать `providerType='leaflet'`)
2. **Высокий:** Исправления #2 и #3 (добавить проверки `isInitialized()`)
3. **Средний:** Исправления #4 и #5 (улучшить зависимости useEffect)
