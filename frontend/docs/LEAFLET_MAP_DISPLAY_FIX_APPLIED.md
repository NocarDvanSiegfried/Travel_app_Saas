# Отчёт: Исправления для отображения карты Leaflet

## Внесённые исправления

### 1. Передача providerType="leaflet" в RouteMapWithAlternatives

**Файл:** `frontend/src/modules/routes/features/route-details/ui/route-details-view.tsx`  
**Строка:** 136  
**Изменение:** Добавлен проп `providerType="leaflet"` в компонент `RouteMapWithAlternatives`

**Было:**
```typescript
<RouteMapWithAlternatives primaryRouteId={primaryRoute.route.Ref_Key} height="500px" />
```

**Стало:**
```typescript
<RouteMapWithAlternatives primaryRouteId={primaryRoute.route.Ref_Key} height="500px" providerType="leaflet" />
```

**Результат:**
- Теперь `providerType='leaflet'` передаётся через всю цепочку компонентов
- `RouteMapWithAlternatives` → `RouteMapSwitcher` → `RouteMap` получают правильный провайдер
- `LeafletMapProvider` создаётся вместо `YandexMapProvider`
- CSS Leaflet загружается (условие `providerType === 'leaflet'` выполняется)
- `LeafletMapProvider.initialize()` вызывается вместо `YandexMapProvider.initialize()`

---

### 2. Проверка isInitialized() перед addPolyline

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 295-326 (useEffect для полилиний)  
**Изменение:** Добавлена проверка `isInitialized()` перед вызовом `addPolyline`

**Было:**
```typescript
useEffect(() => {
  if (!mapProviderRef.current || !visibleSegments || visibleSegments.length === 0) {
    return;
  }

  const provider = mapProviderRef.current;
  // ... остальной код
```

**Стало:**
```typescript
useEffect(() => {
  if (!mapProviderRef.current || !visibleSegments || visibleSegments.length === 0) {
    return;
  }

  // Проверяем, что карта инициализирована
  if (!mapProviderRef.current.isInitialized()) {
    return;
  }

  const provider = mapProviderRef.current;
  // ... остальной код
```

**Результат:**
- Предотвращена race condition, когда `addPolyline` вызывается до завершения инициализации карты
- Эффект будет повторно выполнен при следующем рендере, когда карта станет готовой
- Исключены ошибки типа "Map is not initialized" при вызове `addPolyline`

---

### 3. Проверка isInitialized() перед addMarker

**Файл:** `frontend/src/modules/routes/features/route-map/ui/route-map.tsx`  
**Строка:** 329-360 (useEffect для маркеров)  
**Изменение:** Добавлена проверка `isInitialized()` перед вызовом `addMarker`

**Было:**
```typescript
useEffect(() => {
  if (!mapProviderRef.current || !mapData || !mapData.segments || mapData.segments.length === 0) {
    return;
  }

  const provider = mapProviderRef.current;
  // ... остальной код
```

**Стало:**
```typescript
useEffect(() => {
  if (!mapProviderRef.current || !mapData || !mapData.segments || mapData.segments.length === 0) {
    return;
  }

  // Проверяем, что карта инициализирована
  if (!mapProviderRef.current.isInitialized()) {
    return;
  }

  const provider = mapProviderRef.current;
  // ... остальной код
```

**Результат:**
- Предотвращена race condition, когда `addMarker` вызывается до завершения инициализации карты
- Эффект будет повторно выполнен при следующем рендере, когда карта станет готовой
- Исключены ошибки типа "Map is not initialized" при вызове `addMarker`

---

## Ожидаемые результаты

После внесённых исправлений:

1. ✅ **LeafletMapProvider создаётся**
   - `providerType='leaflet'` передаётся через всю цепочку
   - `useMemo` в `RouteMap` создаёт `LeafletMapProvider` вместо `YandexMapProvider`

2. ✅ **CSS Leaflet загружается**
   - `useEffect` для загрузки CSS срабатывает (условие `providerType === 'leaflet'` выполняется)
   - CSS добавляется в `<head>` через `<link>` элемент

3. ✅ **initialize() выполняется для Leaflet**
   - `LeafletMapProvider.initialize()` вызывается в `useEffect` инициализации
   - Карта создаётся с правильными параметрами (center, zoom, controls)

4. ✅ **Карта отображается корректно**
   - Контейнер имеет размеры (проверка `checkContainerSize()`)
   - Полилинии и маркеры добавляются только после инициализации
   - `invalidateSize()` вызывается для Leaflet после инициализации

5. ✅ **Ошибки инициализации не возникают**
   - Проверки `isInitialized()` предотвращают вызовы до готовности карты
   - Race condition устранена

---

## Проверка исправлений

Для проверки корректности работы:

1. Откройте страницу `/routes/details` в браузере
2. Проверьте консоль браузера — не должно быть ошибок инициализации
3. Убедитесь, что карта Leaflet отображается (OpenStreetMap тайлы)
4. Проверьте, что полилинии и маркеры отображаются на карте
5. Убедитесь, что CSS Leaflet загружен (проверьте `<head>` в DevTools)

---

## Статус

✅ **Все исправления применены**  
✅ **Ошибок линтера нет**  
✅ **Интерфейс IMapProvider содержит метод isInitialized()**  
✅ **Минимальные точечные изменения без изменения бизнес-логики**

---

## Следующие шаги

1. Запустить dev-сервер и проверить отображение карты на `/routes/details`
2. Проверить консоль браузера на наличие ошибок
3. Убедиться, что карта Leaflet инициализируется и отображается корректно
4. При необходимости провести ручное тестирование функциональности карты

