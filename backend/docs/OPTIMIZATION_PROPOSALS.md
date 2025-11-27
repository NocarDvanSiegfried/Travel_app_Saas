# Предложения по оптимизации системы работы с городами

**Дата:** 2025-01-27  
**Статус:** Предложения для реализации

---

## Обзор

После исправления критических проблем с городами, предлагаются следующие оптимизации для улучшения производительности и надёжности системы.

---

## 1. Redis кэширование списка городов

### Проблема:
- Каждый запрос к `/api/v1/cities` выполняет:
  - 2 запроса к БД (`getAllRealStops`, `getAllVirtualStops`)
  - Обработку всех остановок в памяти
  - Загрузку unified reference (хотя есть in-memory cache)
  - Нормализацию и фильтрацию

### Решение:
Добавить Redis кэширование для полного списка городов.

**Преимущества:**
- Снижение нагрузки на БД
- Быстрый ответ для клиентов
- Автоматическая инвалидация при изменении данных

**Реализация:**
```typescript
// В CitiesController.ts
const cacheKey = 'cities:list:all';
const cachedCities = await redisClient.get(cacheKey);

if (cachedCities) {
  return JSON.parse(cachedCities);
}

// ... текущая логика ...

const result = createPaginatedResponse(paginatedCities, total, page, limit);
await redisClient.setex(cacheKey, 3600, JSON.stringify(result)); // TTL 1 час
return result;
```

**Инвалидация кэша:**
- При запуске `ODataSyncWorker` → `redisClient.del('cities:list:all')`
- При запуске `VirtualEntitiesGeneratorWorker` → `redisClient.del('cities:list:all')`
- При ручном обновлении через `DataReinitController` → `redisClient.del('cities:list:all')`

**Ожидаемый эффект:**
- Время ответа: с ~200ms до ~5ms (при попадании в кэш)
- Снижение нагрузки на БД: ~95%

---

## 2. Оптимизация запросов к БД

### Проблема:
- `getAllRealStops()` и `getAllVirtualStops()` загружают все остановки в память
- Нет индексов на `city_id` для быстрого поиска
- Нет batch loading для больших объёмов данных

### Решение A: Добавить индексы в БД

**Миграция:**
```sql
-- Индекс для быстрого поиска по city_id
CREATE INDEX IF NOT EXISTS idx_stops_city_id ON stops(city_id);
CREATE INDEX IF NOT EXISTS idx_virtual_stops_city_id ON virtual_stops(city_id);

-- Индекс для нормализованного city_id (для поиска без учёта регистра)
CREATE INDEX IF NOT EXISTS idx_stops_city_id_lower ON stops(LOWER(city_id));
CREATE INDEX IF NOT EXISTS idx_virtual_stops_city_id_lower ON virtual_stops(LOWER(city_id));

-- Композитный индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_stops_city_id_name ON stops(city_id, name);
CREATE INDEX IF NOT EXISTS idx_virtual_stops_city_id_name ON virtual_stops(city_id, name);
```

**Ожидаемый эффект:**
- Ускорение поиска по `city_id`: с ~50ms до ~1ms
- Ускорение `getRealStopsByCity`: с ~30ms до ~0.5ms

### Решение B: Оптимизировать запросы в CitiesController

**Текущий подход:**
```typescript
const [realStops, virtualStops] = await Promise.all([
  stopRepository.getAllRealStops(),
  stopRepository.getAllVirtualStops(),
]);
// Затем обработка всех остановок в памяти
```

**Оптимизированный подход:**
```typescript
// Загрузить только уникальные city_id из БД
const uniqueCityIds = await stopRepository.getDistinctCityIds();
// Затем обработать только эти city_id через unified reference
```

**Новый метод в PostgresStopRepository:**
```typescript
async getDistinctCityIds(): Promise<string[]> {
  const result = await this.pool.query(`
    SELECT DISTINCT city_id 
    FROM stops 
    WHERE city_id IS NOT NULL
    UNION
    SELECT DISTINCT city_id 
    FROM virtual_stops 
    WHERE city_id IS NOT NULL
  `);
  return result.rows.map(row => row.city_id);
}
```

**Ожидаемый эффект:**
- Снижение объёма данных: с ~1000 остановок до ~30 city_id
- Ускорение обработки: с ~100ms до ~10ms

---

## 3. Мемоизация normalizeCityName

### Проблема:
- `normalizeCityName()` вызывается многократно для одних и тех же значений
- Нет кэширования результатов нормализации

### Решение:
Добавить мемоизацию с использованием Map.

**Реализация:**
```typescript
// В city-normalizer.ts
const normalizationCache = new Map<string, string>();

export function normalizeCityName(cityName: string): string {
  // Проверка кэша
  if (normalizationCache.has(cityName)) {
    return normalizationCache.get(cityName)!;
  }
  
  // Нормализация
  let normalized = cityName
    .trim()
    .toLowerCase()
    .replace(/^г\.\s*/i, '')
    .replace(/^п\.\s*/i, '')
    .replace(/^с\.\s*/i, '')
    .replace(/ё/g, 'е')
    .replace(/ъ/g, '')
    .replace(/ь/g, '');
  
  // Сохранение в кэш
  normalizationCache.set(cityName, normalized);
  
  return normalized;
}
```

**Ожидаемый эффект:**
- Ускорение нормализации: с ~0.1ms до ~0.001ms (при попадании в кэш)
- Снижение CPU нагрузки: ~90% для повторяющихся значений

---

## 4. Валидация unified reference при загрузке

### Проблема:
- Нет валидации структуры данных в unified reference
- Ошибки в JSON могут привести к падению приложения
- Нет проверки дубликатов

### Решение:
Добавить валидацию с использованием Zod.

**Реализация:**
```typescript
// Создать schema для валидации
import { z } from 'zod';

const CitySchema = z.object({
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isKeyCity: z.boolean().optional(),
  description: z.string().optional(),
});

const YakutiaCitiesReferenceSchema = z.object({
  description: z.string(),
  version: z.string(),
  cities: z.array(CitySchema),
});

// В loadUnifiedCitiesReference()
try {
  const yakutiaCities = getAllYakutiaCities();
  
  // Валидация
  const validated = YakutiaCitiesReferenceSchema.parse({
    description: 'Yakutia cities',
    version: '1.0',
    cities: yakutiaCities,
  });
  
  // Проверка дубликатов
  const normalizedNames = new Set<string>();
  for (const city of validated.cities) {
    const normalized = normalizeCityName(city.normalizedName || city.name);
    if (normalizedNames.has(normalized)) {
      throw new Error(`Duplicate city found: ${city.name} (normalized: ${normalized})`);
    }
    normalizedNames.add(normalized);
  }
  
  // Продолжить загрузку...
} catch (error) {
  logger.error('Validation error in unified reference', error);
  throw error;
}
```

**Ожидаемый эффект:**
- Раннее обнаружение ошибок в данных
- Предотвращение падений приложения
- Улучшение диагностики проблем

---

## 5. Метрики производительности

### Проблема:
- Нет метрик для мониторинга производительности
- Невозможно отследить деградацию производительности

### Решение:
Добавить метрики с использованием OpenTelemetry или простого логирования.

**Реализация:**
```typescript
// В CitiesController.ts
const startTime = Date.now();

try {
  // ... текущая логика ...
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  logger.info('Cities list generated', {
    module: 'CitiesController',
    duration: `${duration}ms`,
    totalCities: cities.length,
    realStopsCount: realStops.length,
    virtualStopsCount: virtualStops.length,
    cacheHit: false, // или true, если использовали Redis
  });
  
  // Экспорт метрик (если используется Prometheus)
  metrics.citiesListDuration.observe(duration);
  metrics.citiesListTotal.observe(cities.length);
  
} catch (error) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  logger.error('Failed to generate cities list', error, {
    module: 'CitiesController',
    duration: `${duration}ms`,
  });
  
  metrics.citiesListErrors.inc();
}
```

**Метрики для отслеживания:**
- `cities_list_duration_ms` — время генерации списка
- `cities_list_total` — общее количество городов
- `cities_list_cache_hits` — количество попаданий в кэш
- `cities_list_cache_misses` — количество промахов кэша
- `cities_list_db_queries` — количество запросов к БД

**Ожидаемый эффект:**
- Видимость производительности в реальном времени
- Возможность выявления проблем до их критичности
- Данные для дальнейшей оптимизации

---

## 6. Оптимизация финального шага в CitiesController

### Проблема:
- Финальный шаг итерирует по всем городам из unified reference
- Для каждого города вызывается `normalizeCityName()` (даже с мемоизацией)
- Множественные проверки `normalizedCitiesMap.has()`

### Решение:
Оптимизировать финальный шаг, используя Set для быстрой проверки.

**Текущий код:**
```typescript
for (const city of allUnifiedCities) {
  unifiedCityNames.add(city.name);
  const normalized = normalizeCityName(city.name);
  normalizedCitiesMap.set(normalized, city.name);
  citiesSet.add(city.name);
}
```

**Оптимизированный код:**
```typescript
// Предварительно нормализовать все города
const normalizedSet = new Set<string>();
for (const city of allUnifiedCities) {
  const normalized = normalizeCityName(city.name);
  normalizedSet.add(normalized);
}

// Затем добавить все города одним проходом
for (const city of allUnifiedCities) {
  unifiedCityNames.add(city.name);
  const normalized = normalizeCityName(city.name); // Из кэша
  normalizedCitiesMap.set(normalized, city.name);
  citiesSet.add(city.name);
}
```

**Ожидаемый эффект:**
- Незначительное ускорение (~5-10ms)
- Улучшение читаемости кода

---

## 7. Batch processing для больших объёмов данных

### Проблема:
- При большом количестве остановок (>10,000) обработка в памяти может быть медленной
- Нет пагинации при загрузке данных из БД

### Решение:
Добавить batch processing для обработки остановок порциями.

**Реализация:**
```typescript
// В PostgresStopRepository.ts
async getAllRealStopsBatch(batchSize: number = 1000): Promise<AsyncGenerator<RealStop[]>> {
  let offset = 0;
  
  while (true) {
    const result = await this.pool.query(
      `SELECT id, name, latitude, longitude, city_id, is_airport, is_railway_station, metadata, created_at, updated_at 
       FROM stops 
       ORDER BY name 
       LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );
    
    if (result.rows.length === 0) break;
    
    yield result.rows.map(row => this.mapRowToRealStop(row));
    offset += batchSize;
  }
}

// В CitiesController.ts
const citiesSet = new Set<string>();
for await (const batch of stopRepository.getAllRealStopsBatch()) {
  for (const stop of batch) {
    // Обработка остановки...
  }
}
```

**Ожидаемый эффект:**
- Снижение потребления памяти: с ~50MB до ~5MB
- Возможность обработки больших объёмов данных без падений

---

## Приоритеты реализации

### Высокий приоритет:
1. ✅ **Redis кэширование** — максимальный эффект при минимальных изменениях
2. ✅ **Индексы в БД** — критично для производительности запросов
3. ✅ **Мемоизация normalizeCityName** — простое и эффективное улучшение

### Средний приоритет:
4. ⚠️ **Валидация unified reference** — улучшение надёжности
5. ⚠️ **Метрики производительности** — для мониторинга

### Низкий приоритет:
6. ℹ️ **Оптимизация финального шага** — незначительный эффект
7. ℹ️ **Batch processing** — только при больших объёмах данных

---

## Ожидаемые результаты

После реализации всех оптимизаций:

- **Время ответа API:** с ~200ms до ~5ms (при попадании в кэш)
- **Нагрузка на БД:** снижение на ~95%
- **Потребление памяти:** снижение на ~90% (при batch processing)
- **CPU нагрузка:** снижение на ~80% (благодаря мемоизации)

---

## Следующие шаги

1. **Реализовать Redis кэширование** (1-2 часа)
2. **Добавить индексы в БД** (30 минут)
3. **Добавить мемоизацию** (30 минут)
4. **Добавить валидацию** (1 час)
5. **Добавить метрики** (1-2 часа)

**Общее время:** ~5-6 часов

---

## Примечания

- Все оптимизации должны быть протестированы
- Необходимо добавить fallback на случай недоступности Redis
- Метрики должны быть экспортированы в Prometheus/Grafana
- Индексы должны быть добавлены через миграции БД






