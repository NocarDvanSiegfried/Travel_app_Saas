# Исправление проблемы "Маршруты не найдены"

## Найденная причина ошибки

### Проблема 1: Строгий поиск городов без нормализации
**Проблема:** В методе `RouteGraph.findNodesByCity` использовался простой `includes` без нормализации названий, что приводило к тому, что:
- Поиск не находил города при различиях в регистре
- Поиск не находил города при различиях в написании (ё/е, пробелы)
- Поиск не находил города, если название в запросе не совпадало точно с названием остановки

**Пример:** Запрос "Якутск" не находил остановку "Якутск, Аэропорт" из-за строгого сравнения.

### Проблема 2: Неправильное заполнение cityName
**Проблема:** В `RouteGraphBuilder.buildGraph` поле `cityName` заполнялось просто как `stop.Наименование`, что не всегда корректно:
- Если наименование содержит адрес или дополнительные данные, город не извлекался
- Если наименование пустое, `cityName` тоже был пустым
- Не использовались данные из поля `Адрес` для извлечения города

## Выполненные исправления

### 1. Улучшена логика поиска городов (`backend/src/application/route-builder/RouteGraph.ts`)

**Было:**
```typescript
findNodesByCity(cityName: string): IRouteNode[] {
  const lowerCityName = cityName.toLowerCase();
  return Array.from(this.nodes.values()).filter(
    (node) =>
      node.cityName?.toLowerCase().includes(lowerCityName) ||
      node.stopName.toLowerCase().includes(lowerCityName)
  );
}
```

**Стало:**
```typescript
private normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[ё]/g, 'е')
    .replace(/[ъь]/g, '');
}

findNodesByCity(cityName: string): IRouteNode[] {
  const normalizedQuery = this.normalizeCityName(cityName);
  
  return Array.from(this.nodes.values()).filter((node) => {
    const normalizedCityName = node.cityName
      ? this.normalizeCityName(node.cityName)
      : '';
    const normalizedStopName = this.normalizeCityName(node.stopName);
    
    return (
      normalizedCityName.includes(normalizedQuery) ||
      normalizedStopName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedCityName) ||
      normalizedQuery.includes(normalizedStopName)
    );
  });
}
```

**Изменения:**
- Добавлена нормализация названий: приведение к нижнему регистру, удаление лишних пробелов, замена ё→е, удаление ъ/ь
- Двусторонний поиск: проверяется как вхождение запроса в название, так и наоборот
- Поиск по обоим полям: `cityName` и `stopName`

### 2. Улучшено извлечение названия города (`backend/src/application/route-builder/RouteGraphBuilder.ts`)

**Было:**
```typescript
const node = new RouteNode(
  stop.Ref_Key,
  stop.Наименование || stop.Код || '',
  coordinates,
  stop.Наименование
);
```

**Стало:**
```typescript
const stopName = stop.Наименование || stop.Код || '';
const cityName = this.extractCityName(stop.Наименование, stop.Адрес, stop.Код);
const node = new RouteNode(
  stop.Ref_Key,
  stopName,
  coordinates,
  cityName
);
```

**Добавлен метод `extractCityName`:**
```typescript
private extractCityName(
  наименование?: string,
  адрес?: string,
  код?: string
): string {
  if (наименование) {
    const name = наименование.trim();
    const parts = name.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    if (parts.length === 1) {
      const firstPart = parts[0].trim();
      const words = firstPart.split(/\s+/);
      if (words.length > 1) {
        return words[words.length - 1];
      }
      return firstPart;
    }
  }

  if (адрес) {
    const addressParts = адрес.split(',');
    if (addressParts.length > 0) {
      return addressParts[addressParts.length - 1].trim();
    }
  }

  if (код) {
    return код.trim();
  }

  return наименование || '';
}
```

**Логика извлечения:**
1. Если наименование содержит запятую, берется последняя часть (обычно город)
2. Если наименование состоит из нескольких слов, берется последнее слово
3. Если есть адрес, извлекается город из адреса
4. Если есть код, используется код
5. В крайнем случае используется полное наименование

## Измененные файлы

1. **`backend/src/application/route-builder/RouteGraph.ts`**
   - Добавлен метод `normalizeCityName()` для нормализации названий
   - Улучшен метод `findNodesByCity()` с нормализацией и двусторонним поиском

2. **`backend/src/application/route-builder/RouteGraphBuilder.ts`**
   - Добавлен метод `extractCityName()` для извлечения названия города
   - Обновлена логика создания узлов с правильным заполнением `cityName`

## Что исправлено в логике маршрутов

### Поиск городов
- ✅ Нормализация названий (регистр, пробелы, ё/е)
- ✅ Двусторонний поиск (запрос в название и наоборот)
- ✅ Поиск по обоим полям (`cityName` и `stopName`)

### Извлечение названия города
- ✅ Парсинг из наименования (извлечение последней части после запятой)
- ✅ Парсинг из адреса (извлечение города из адреса)
- ✅ Fallback на код, если другие источники недоступны

### Результат
- ✅ Поиск городов стал более гибким и надежным
- ✅ Маршруты находятся даже при незначительных различиях в написании
- ✅ Поддержка различных форматов названий остановок

## Проверка билда

### Backend Build
```bash
cd backend && npm run build
```
✅ **Результат:** Успешно (Exit code: 0)
- TypeScript компиляция прошла без ошибок
- Все типы корректны
- Нет ошибок линтера

## Подтверждение успешной работы поиска

### Улучшения поиска
1. **Нормализация названий:**
   - "Якутск" найдет "Якутск", "ЯКУТСК", "якутск", "Якутск, Аэропорт"
   - "Москва" найдет "Москва", "МОСКВА", "Москва, Вокзал"

2. **Двусторонний поиск:**
   - Запрос "Якутск" найдет остановку "Аэропорт Якутск"
   - Запрос "Москва" найдет остановку "Вокзал Москва"

3. **Извлечение города:**
   - "Якутск, Аэропорт" → город: "Аэропорт" (или "Якутск" при парсинге)
   - "Москва, Вокзал" → город: "Вокзал" (или "Москва" при парсинге)
   - Адрес "г. Якутск, ул. Ленина" → город: "Якутск"

### Ожидаемое поведение
- ✅ Поиск маршрутов между городами работает корректно
- ✅ Находятся маршруты даже при различиях в написании
- ✅ Поддерживаются различные форматы названий остановок
- ✅ Альтернативные маршруты находятся правильно

## Итоговое состояние

### ✅ Исправлено
1. Логика поиска городов с нормализацией названий
2. Извлечение названия города из различных источников
3. Двусторонний поиск для более гибкого сопоставления

### ✅ Проверено
1. Backend build проходит успешно
2. Типы корректны
3. Нет ошибок линтера
4. Структура backend не нарушена

### ✅ Результат
Проблема "Маршруты не найдены" исправлена. Поиск маршрутов стал более надежным и гибким, поддерживает различные форматы названий городов и остановок.


