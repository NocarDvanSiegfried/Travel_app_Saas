# Отчёт об исправлении отображения карты Leaflet

## Файлы: `route-map.tsx`, `leaflet-map-provider.ts`

## Дата: 2025-01-XX

## Проблема

**Симптом**: Карта Leaflet не отображается на странице деталей маршрута, хотя SSR-ошибки устранены и модуль leaflet установлен.

**Причины**:
1. **Leaflet CSS не загружается** - Leaflet требует свои CSS стили для правильного отображения карты
2. **Контейнер не имеет фиксированной высоты** - Leaflet требует явные размеры контейнера
3. **Инициализация происходит до рендера контейнера** - контейнер может не иметь размеров на момент инициализации
4. **Отсутствует обновление размеров после инициализации** - Leaflet может не определить размеры контейнера

## Исправления

### 1. Добавлена загрузка Leaflet CSS

**Файл**: `route-map.tsx` (строки 183-200)

**Решение**: Добавлен `useEffect` для динамической загрузки Leaflet CSS через CDN:

```typescript
useEffect(() => {
  if (typeof window === 'undefined' || providerType !== 'leaflet') {
    return;
  }

  // Проверяем, не загружен ли уже Leaflet CSS
  const existingLink = document.querySelector('link[data-leaflet-css]');
  if (existingLink) {
    return;
  }

  // Создаём link элемент для Leaflet CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  link.setAttribute('data-leaflet-css', 'true');
  
  document.head.appendChild(link);
}, [providerType]);
```

### 2. Исправлены стили контейнера карты

**Файл**: `route-map.tsx` (строки 360-367)

**Было**:
```typescript
<div
  ref={containerRef}
  className="w-full h-full"
  style={{ minHeight: height }}
  data-testid="route-map-container"
/>
```

**Стало**:
```typescript
<div
  ref={containerRef}
  className="w-full h-full"
  style={{ 
    height: height,
    minHeight: height,
    position: 'relative',
    zIndex: 0,
  }}
  data-testid="route-map-container"
/>
```

**Объяснение**: Добавлена фиксированная высота и явные стили для корректного отображения Leaflet.

### 3. Добавлена проверка размеров контейнера перед инициализацией

**Файл**: `route-map.tsx` (строки 205-250)

**Решение**: Добавлена функция проверки размеров и повторные попытки инициализации:

```typescript
// Проверяем, что контейнер имеет размеры
const checkContainerSize = () => {
  const container = containerRef.current;
  if (!container) {
    return false;
  }

  const rect = container.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

// Ждём, пока контейнер получит размеры
const initMap = () => {
  if (!checkContainerSize()) {
    // Повторяем попытку через небольшую задержку
    setTimeout(initMap, 100);
    return;
  }
  // ... инициализация карты
};

// Небольшая задержка для гарантии, что DOM полностью отрендерился
const timeoutId = setTimeout(initMap, 50);
```

### 4. Добавлен вызов invalidateSize после инициализации

**Файл**: `route-map.tsx` (строки 240-248)

**Решение**: После успешной инициализации Leaflet вызывается `invalidateSize()`:

```typescript
.then(() => {
  mapProviderRef.current = mapProvider;
  // Принудительно обновляем размеры карты после инициализации
  if (providerType === 'leaflet' && mapProviderRef.current) {
    setTimeout(() => {
      if (mapProviderRef.current && typeof (mapProviderRef.current as { invalidateSize?: () => void }).invalidateSize === 'function') {
        (mapProviderRef.current as { invalidateSize: () => void }).invalidateSize();
      }
    }, 100);
  }
})
```

### 5. Добавлен метод invalidateSize в LeafletMapProvider

**Файл**: `leaflet-map-provider.ts` (строки 439-451)

**Решение**: Добавлен метод для обновления размеров карты:

```typescript
/**
 * Обновляет размеры карты (для Leaflet)
 * Полезно после изменения размеров контейнера
 */
invalidateSize(): void {
  if (!this.map || !this.isMapReady) {
    return;
  }

  // Для Leaflet вызываем invalidateSize на нативном объекте карты
  const nativeMap = this.map as unknown as { invalidateSize?: () => void };
  if (nativeMap.invalidateSize) {
    nativeMap.invalidateSize();
  }
}
```

## Результат

✅ **Leaflet CSS загружается**: CSS стили загружаются динамически через CDN  
✅ **Контейнер имеет фиксированные размеры**: Высота и стили установлены явно  
✅ **Проверка размеров контейнера**: Инициализация происходит только после того, как контейнер имеет размеры  
✅ **Обновление размеров**: После инициализации вызывается `invalidateSize()` для корректного отображения  
✅ **Бизнес-логика не изменена**: Изменения только в инициализации и стилях  
✅ **API провайдера не изменён**: Добавлен только метод `invalidateSize()`  

## Проверка

- ✅ Линтер: нет ошибок
- ✅ SSR: Leaflet загружается только на клиенте
- ✅ CSS: Leaflet CSS загружается динамически
- ✅ Размеры: Контейнер имеет фиксированные размеры

## Статус

**Готово к использованию** ✅

Карта Leaflet должна корректно отображаться на странице `/routes/details` с правильными стилями, размерами и инициализацией.


