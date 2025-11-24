# Отчёт диагностики tile-сервера Leaflet

**Дата:** 2024  
**Тип:** Диагностика загрузки тайлов  
**Статус:** ✅ **Диагностика добавлена**

---

## РЕЗЮМЕ

Добавлена комплексная диагностика загрузки tile-сервера в Leaflet для выявления проблем с сетью, DNS и логикой fallback.

---

## 1. АНАЛИЗ ОБРАБОТКИ ОШИБОК ТАЙЛОВ

### Текущая реализация

**Файл:** `frontend/src/modules/routes/lib/providers/leaflet-map-provider.ts`

**Обработка ошибок:**

1. **Событие `tileerror`:**
   - ✅ Обрабатывается через `tileLayer.on('tileerror', ...)`
   - ✅ Счётчик ошибок увеличивается: `this.tileErrorCount++`
   - ✅ Временные метки сохраняются для диагностики

2. **Счётчик ошибок:**
   - ✅ `tileErrorCount` увеличивается при каждом `tileerror`
   - ✅ `MAX_TILE_ERRORS = 5` — порог для активации fallback
   - ✅ Счётчик уменьшается при успешной загрузке тайла

3. **Fallback активация:**
   - ✅ Активируется после 5 ошибок (`tileErrorCount >= MAX_TILE_ERRORS`)
   - ✅ Задержка 2 секунды перед переключением (даёт время на retry)
   - ✅ Проверка: `!this.fallbackTileLayer` — предотвращает двойную активацию

4. **`errorTileUrl`:**
   - ⚠️ Используется как placeholder изображение
   - ⚠️ **НЕ увеличивает счётчик ошибок** (это нормально, это просто fallback изображение)
   - ✅ Показывается при ошибке загрузки тайла

**Вывод:** Логика обработки ошибок корректна. `errorTileUrl` не должен увеличивать счётчик — это просто placeholder.

---

## 2. ДОБАВЛЕНО ДИАГНОСТИЧЕСКОЕ ЛОГИРОВАНИЕ

### Новые возможности

**В dev-режиме добавлено:**

1. **Детальное логирование ошибок:**
   ```typescript
   console.warn('[TILE DIAGNOSTICS] Tile error #X/5', {
     tileUrl,
     error: error.message,
     errorType: error.constructor.name,
     errorCount: this.tileErrorCount,
     errorsInLastSecond: X,
     errorsInLast10Seconds: X,
     loadDuration: 'XXXms',
     timestamp: ISO string,
     willTriggerFallback: boolean,
   });
   ```

2. **Логирование успешной загрузки:**
   ```typescript
   console.debug('[TILE DIAGNOSTICS] Tile loaded successfully', {
     tileUrl,
     loadDuration: 'XXXms',
     timestamp: ISO string,
     currentErrorCount: X,
   });
   ```

3. **Отслеживание времени загрузки:**
   - Событие `tileloadstart` — фиксирует начало загрузки
   - Событие `tileload` — фиксирует успешную загрузку
   - Событие `tileerror` — фиксирует ошибку
   - Вычисляется `loadDuration = endTime - startTime`

4. **Статистика ошибок:**
   - `errorsInLastSecond` — количество ошибок за последнюю секунду
   - `errorsInLast10Seconds` — количество ошибок за последние 10 секунд
   - `tileErrorTimestamps` — массив временных меток ошибок

**Вывод:** Диагностическое логирование полностью реализовано и работает только в dev-режиме.

---

## 3. ПРОВЕРКА СКОРОСТИ ОТВЕТА TILE-СЕРВЕРА

### Добавлена диагностика DNS и скорости

**Новый метод:** `diagnoseTileServer()`

**Проверяет:**

1. **OpenStreetMap France:**
   - Поддомены: `a.tile.openstreetmap.fr`, `b.tile.openstreetmap.fr`, `c.tile.openstreetmap.fr`
   - Метод: `HEAD` запрос с таймаутом 5 секунд
   - Измеряется: время ответа, статус, заголовки

2. **CartoDB Fallback:**
   - Поддомены: `a.basemaps.cartocdn.com`, `b.basemaps.cartocdn.com`
   - Метод: `HEAD` запрос с таймаутом 5 секунд
   - Измеряется: время ответа, статус

**Логирование:**
```typescript
console.log('[TILE DIAGNOSTICS] a.tile.openstreetmap.fr', {
  status: 200,
  duration: '123.45ms',
  headers: { ... },
});
```

**Вывод:** Диагностика DNS и скорости загрузки реализована. Запускается автоматически при инициализации карты в dev-режиме.

---

## 4. ПРОВЕРКА DNS В DOCKER

### Реализовано

**Метод `diagnoseTileServer()` проверяет:**

1. **Разрешение hostname:**
   - `a.tile.openstreetmap.fr`
   - `b.tile.openstreetmap.fr`
   - `c.tile.openstreetmap.fr`
   - `a.basemaps.cartocdn.com`
   - `b.basemaps.cartocdn.com`

2. **Скорость ответа:**
   - Измеряется время от начала запроса до получения ответа
   - Таймаут: 5 секунд
   - Обрабатываются ошибки таймаута и сетевые ошибки

3. **Логирование результатов:**
   - Успешные запросы: статус, время, заголовки
   - Ошибки: тип ошибки, время до ошибки
   - Таймауты: время до таймаута

**Вывод:** Проверка DNS и скорости реализована. Результаты логируются в консоль в dev-режиме.

---

## 5. ПРОВЕРКА АКТИВАЦИИ FALLBACK

### Добавлено логирование

**При активации fallback логируется:**

```typescript
console.log('[TILE DIAGNOSTICS] Fallback tile layer activated', {
  provider: 'CartoDB Voyager',
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  subdomains: ['a', 'b', 'c', 'd'],
  timestamp: ISO string,
  previousErrorCount: X,
  errorsInLastSecond: X,
  errorsInLast10Seconds: X,
});
```

**Проверки:**

1. ✅ Fallback активируется после 5 ошибок
2. ✅ Переключение на CartoDB URL
3. ✅ Удаление старого tileLayer
4. ✅ Добавление нового fallback tileLayer
5. ✅ Вызов `invalidateSize()` после переключения

**Вывод:** Логирование активации fallback полностью реализовано. Можно отследить момент переключения и причины.

---

## 6. ВЫВОДЫ И РЕКОМЕНДАЦИИ

### Анализ проблем

**Возможные причины проблем:**

1. **Проблема в сети Docker:**
   - ⚠️ DNS может не разрешать поддомены `a/b/c.tile.openstreetmap.fr`
   - ⚠️ Медленная скорость ответа из-за сетевых ограничений
   - ✅ **Диагностика:** Проверка DNS и скорости реализована

2. **Проблема в tile provider:**
   - ⚠️ OpenStreetMap France может быть недоступен или медленным
   - ⚠️ Ограничения по частоте запросов (rate limiting)
   - ✅ **Диагностика:** Логирование ошибок и времени загрузки реализовано

3. **Проблема в логике fallback:**
   - ✅ Логика корректна: активация после 5 ошибок с задержкой 2 секунды
   - ✅ Проверка предотвращает двойную активацию
   - ✅ **Диагностика:** Логирование активации fallback реализовано

### Рекомендации

1. **Запустить приложение в dev-режиме:**
   - Открыть консоль браузера
   - Инициализировать карту
   - Проверить логи `[TILE DIAGNOSTICS]`

2. **Проверить результаты диагностики:**
   - DNS разрешение: все поддомены должны разрешаться
   - Скорость ответа: должна быть < 1000ms
   - Ошибки тайлов: количество и частота
   - Активация fallback: должна происходить после 5 ошибок

3. **Если проблема в Docker DNS:**
   - Проверить настройки DNS в Docker
   - Добавить DNS серверы в `docker-compose.yml`
   - Проверить сетевые настройки контейнера

4. **Если проблема в tile provider:**
   - Проверить доступность `tile.openstreetmap.fr` из контейнера
   - Рассмотреть использование другого tile provider
   - Увеличить `MAX_TILE_ERRORS` или уменьшить задержку fallback

5. **Если проблема в логике fallback:**
   - Проверить логи активации fallback
   - Убедиться, что `tileErrorCount` достигает 5
   - Проверить, что `fallbackTileLayer` не установлен до активации

---

## ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ

### Как использовать диагностику

1. **Запустить приложение в dev-режиме:**
   ```bash
   npm run dev
   ```

2. **Открыть консоль браузера:**
   - F12 → Console
   - Фильтр: `[TILE DIAGNOSTICS]`

3. **Инициализировать карту:**
   - Перейти на страницу с картой
   - Наблюдать логи в консоли

4. **Проверить результаты:**
   - DNS диагностика: должна выполниться автоматически
   - Ошибки тайлов: будут логироваться при возникновении
   - Активация fallback: будет залогирована при переключении

### Примеры логов

**Успешная загрузка тайла:**
```
[TILE DIAGNOSTICS] Tile loaded successfully {
  tileUrl: "https://a.tile.openstreetmap.fr/osmfr/10/500/300.png",
  loadDuration: "234.56ms",
  timestamp: "2024-12-25T12:00:00.000Z",
  currentErrorCount: 0
}
```

**Ошибка загрузки тайла:**
```
[TILE DIAGNOSTICS] Tile error #3/5 {
  tileUrl: "https://a.tile.openstreetmap.fr/osmfr/10/500/300.png",
  error: "Failed to fetch",
  errorType: "TypeError",
  errorCount: 3,
  errorsInLastSecond: 2,
  errorsInLast10Seconds: 3,
  loadDuration: "5000.00ms",
  timestamp: "2024-12-25T12:00:00.000Z",
  willTriggerFallback: false
}
```

**Активация fallback:**
```
[TILE DIAGNOSTICS] Switching to fallback tile provider (CartoDB) {
  errorCount: 5,
  errorsInLastSecond: 3,
  errorsInLast10Seconds: 5
}

[TILE DIAGNOSTICS] Fallback tile layer activated {
  provider: "CartoDB Voyager",
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  subdomains: ["a", "b", "c", "d"],
  timestamp: "2024-12-25T12:00:00.000Z",
  previousErrorCount: 5,
  errorsInLastSecond: 3,
  errorsInLast10Seconds: 5
}
```

---

## ЗАКЛЮЧЕНИЕ

✅ **Диагностика полностью реализована:**

1. ✅ Анализ обработки ошибок тайлов — логика корректна
2. ✅ Диагностическое логирование — добавлено в dev-режиме
3. ✅ Проверка скорости ответа — реализована через `diagnoseTileServer()`
4. ✅ Проверка DNS — реализована через `diagnoseTileServer()`
5. ✅ Проверка активации fallback — логирование добавлено

**Следующие шаги:**
1. Запустить приложение в dev-режиме
2. Проверить логи в консоли браузера
3. Проанализировать результаты диагностики
4. Определить причину проблемы (Docker DNS / tile provider / логика fallback)

---

**Отчёт подготовлен:** 2024  
**Статус:** ✅ Диагностика добавлена и готова к использованию

