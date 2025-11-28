# Отчёт об исправлении ошибки SSR для Leaflet Map Provider

## Файл: `leaflet-map-provider.ts`

## Дата: 2025-01-XX

## Проблема

**Ошибка Next.js**: `Module not found: Can't resolve 'leaflet'`  
**Результат**: 500 ошибка на главной странице

**Причина**: 
В файле использовался `require('leaflet')` в нескольких местах, который выполнялся на сервере во время SSR (Server-Side Rendering). Leaflet - это клиентская библиотека, которая не может быть импортирована на сервере.

## Исправления

### 1. Добавлен кэш для загруженного модуля Leaflet

**Строка 66**:
```typescript
private leafletModule: unknown | null = null; // Кэш для загруженного Leaflet модуля
```

### 2. Добавлена проверка браузерного окружения в `initialize()`

**Строки 72-74**:
```typescript
if (typeof window === 'undefined') {
  throw new Error('Leaflet can only be initialized in browser environment');
}
```

### 3. Сохранение загруженного модуля в кэш и window

**Строки 85-91**:
```typescript
// Сохраняем загруженный модуль для последующего использования
this.leafletModule = L;

// Сохраняем в window для глобального доступа
if (typeof window !== 'undefined') {
  (window as unknown as { L?: unknown }).L = L;
}
```

### 4. Удалены все `require('leaflet')`

**Было** (строки 193, 294, 495):
```typescript
const L = (window as any).L || require('leaflet'); // ❌ Ошибка SSR
```

**Стало**: Используется метод `getLeaflet()`, который получает Leaflet из кэша или window.

### 5. Добавлен метод `getLeaflet()` для безопасного получения Leaflet

**Строки 520-537**:
```typescript
/**
 * Получает загруженный модуль Leaflet
 * Использует кэш или window.L
 */
private getLeaflet(): unknown | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Сначала пробуем кэш
  if (this.leafletModule) {
    return this.leafletModule;
  }

  // Затем пробуем window.L
  const windowL = (window as any).L;
  if (windowL) {
    this.leafletModule = windowL;
    return windowL;
  }

  return null;
}
```

### 6. Обновлены методы `addMarker()` и `addPolyline()`

**Было**:
```typescript
const L = (window as any).L || require('leaflet'); // ❌
```

**Стало**:
```typescript
if (typeof window === 'undefined') {
  throw new Error('Leaflet can only be used in browser environment');
}

const L = this.getLeaflet();
if (!L) {
  throw new Error('Leaflet is not loaded. Call initialize() first.');
}
```

### 7. Обновлён метод `getCurrentBounds()`

**Было**:
```typescript
const L = (window as any).L || require('leaflet'); // ❌
```

**Стало**:
```typescript
if (typeof window === 'undefined') {
  return null;
}
// Leaflet больше не требуется, так как getBounds() доступен напрямую через this.map
```

## Результат

✅ **Ошибка SSR устранена**: Leaflet загружается только на клиенте через динамический импорт  
✅ **Бизнес-логика сохранена**: API провайдера не изменён  
✅ **Yandex-провайдер не затронут**: Изменения только в Leaflet провайдере  
✅ **Leaflet установлен**: Пакет уже присутствует в `package.json` (devDependencies)  
✅ **Кэширование**: Загруженный модуль сохраняется для последующего использования  

## Проверка

- ✅ Линтер: нет ошибок
- ✅ SSR: Leaflet не импортируется на сервере
- ✅ Клиент: Leaflet загружается динамически только в браузере

## Статус

**Готово к использованию** ✅

Страница должна открываться без 500 ошибок, а карта Leaflet корректно отображаться в браузере.







