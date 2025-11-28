# Краткое резюме плана выполнения (EXECUTION_PLAN_DETAILED.md)

**Дата анализа:** 2025-01-XX  
**Статус:** План загружен и проанализирован  
**Готовность:** Готов к выполнению

---

## 📊 Структура плана

План разбит на **4 этапа**, каждый этап содержит:
- Новые файлы для создания
- Существующие файлы для обновления
- Функции для переписания/добавления
- Структуры данных для изменения
- Тесты для создания/обновления

---

## 🔴 ЭТАП 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ

**Цель:** Восстановить корректность данных, устранить блокирующие ошибки  
**Время:** 2-3 дня

### Задачи:
1. Создать справочники нормализации (airports, suburbs)
2. Создать загрузчики справочников (airports-loader, suburbs-loader)
3. Создать валидатор остановок (stop-validator)
4. Исправить `extractCityFromStopName()` для обработки аэропортов
5. Обновить `ODataSyncWorker.parseODataResponse()` для нормализации и валидации

### Новые файлы (5):
1. `backend/data/reference/airports-reference.json`
2. `backend/data/reference/suburbs-reference.json`
3. `backend/src/shared/utils/airports-loader.ts`
4. `backend/src/shared/utils/suburbs-loader.ts`
5. `backend/src/shared/validators/stop-validator.ts`

### Обновляемые файлы (2):
1. `backend/src/shared/utils/city-normalizer.ts` - функция `extractCityFromStopName()`
2. `backend/src/application/workers/ODataSyncWorker.ts` - метод `parseODataResponse()`

### Функции для изменения (2):
1. `extractCityFromStopName()` - добавить обработку паттернов аэропортов
2. `parseODataResponse()` - добавить нормализацию и валидацию

### Тесты (5 файлов):
- 3 новых: airports-loader, suburbs-loader, stop-validator
- 2 обновляемых: city-normalizer, ODataSyncWorker

---

## 🟠 ЭТАП 2: ДОБАВЛЕНИЕ ФЕДЕРАЛЬНЫХ ГОРОДОВ

**Цель:** Добавить 10 федеральных городов, обеспечить маршруты Россия → Якутия  
**Время:** 3-4 дня  
**Зависимости:** Этап 1

### Задачи:
1. Создать справочник федеральных городов
2. Создать unified-cities-loader
3. Обновить ODataSyncWorker для unified-reference
4. Обновить VirtualEntitiesGeneratorWorker для федеральных городов
5. Создать AirRouteGeneratorWorker
6. Обновить initializeWorkers.ts

### Новые файлы (3):
1. `backend/data/reference/russia-federal-cities-reference.json`
2. `backend/src/shared/utils/unified-cities-loader.ts`
3. `backend/src/application/workers/AirRouteGeneratorWorker.ts`

### Обновляемые файлы (3):
1. `backend/src/application/workers/ODataSyncWorker.ts` - unified-reference
2. `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts` - unified-cities-loader, `ensureCitiesConnectivity()`
3. `backend/src/infrastructure/workers/initializeWorkers.ts` - порядок воркеров

### Функции для изменения (3):
1. `generateVirtualStops()` - использовать unified-cities-loader
2. `ensureYakutiaCitiesConnectivity()` → `ensureCitiesConnectivity()` - переименовать и расширить
3. `executeWorkerLogic()` в AirRouteGeneratorWorker - новый воркер

### Тесты (4 файла):
- 2 новых: unified-cities-loader, AirRouteGeneratorWorker
- 2 обновляемых: VirtualEntitiesGeneratorWorker, ODataSyncWorker

---

## 🟡 ЭТАП 3: СМЕШАННЫЕ МАРШРУТЫ И ПЕРЕПРАВА

**Цель:** Реализовать смешанные маршруты (air + ground + ferry), переправу  
**Время:** 4-5 дней  
**Зависимости:** Этап 1, Этап 2

### Задачи:
1. Расширить mock-данные (stops, routes, flights)
2. Добавить FERRY в TransportType
3. Обновить GraphBuilderWorker для пересадок
4. Обновить RouteGraphBuilder для ferry
5. Добавить расчет веса пересадки и ferry

### Новые файлы (0):
- Нет новых файлов

### Обновляемые файлы (7):
1. `backend/data/mock/stops.json` - остановки федеральных городов и переправы
2. `backend/data/mock/routes.json` - авиамаршруты и ferry-маршруты
3. `backend/data/mock/flights.json` - рейсы для новых маршрутов
4. `backend/src/domain/entities/Route.ts` - добавить `'FERRY'` в `TransportType`
5. `backend/src/application/workers/GraphBuilderWorker.ts` - пересадки, ferry
6. `backend/src/application/route-builder/RouteGraphBuilder.ts` - поддержка ferry
7. `backend/src/domain/repositories/IGraphRepository.ts` - проверка `transportType`

### Функции для изменения (4):
1. `buildGraphStructure()` - добавить рёбра пересадки
2. `calculateTransferWeight()` - новый метод (НОВАЯ)
3. `calculateFerryWeight()` - новый метод для ferry (НОВАЯ)
4. `buildFromDataset()` - поддержка ferry

### Структуры данных (3):
1. `TransportType` в `Route.ts` - добавить `'FERRY'`
2. `GraphNeighbor` в `IGraphRepository.ts` - добавить `transportType?: string`
3. `Route.metadata` - использовать для `ferrySchedule`

### Тесты (3 файла):
- 0 новых
- 3 обновляемых: GraphBuilderWorker, RouteGraphBuilder, OptimizedBuildRouteUseCase

---

## 🟣 ЭТАП 4: ГРАФ И ВАЛИДАЦИЯ

**Цель:** Валидация графа, оптимизация, финальная проверка  
**Время:** 3-4 дня  
**Зависимости:** Этап 3

### Задачи:
1. Создать graph-validator
2. Интегрировать валидацию в GraphBuilderWorker
3. Добавить логирование и метрики
4. Проверить все контрольные маршруты

### Новые файлы (1):
1. `backend/src/shared/validators/graph-validator.ts`

### Обновляемые файлы (1):
1. `backend/src/application/workers/GraphBuilderWorker.ts` - интеграция валидации

### Функции для изменения (1):
1. `executeWorkerLogic()` - интеграция валидации графа

### Тесты (2 файла):
- 1 новый: graph-validator
- 1 обновляемый: GraphBuilderWorker

---

## 📋 ИТОГОВАЯ СВОДКА

### Статистика по этапам:

| Этап | Новые файлы | Обновляемые файлы | Функции | Тесты |
|------|-------------|-------------------|---------|-------|
| **Этап 1** | 5 | 2 | 2 | 5 (3+2) |
| **Этап 2** | 3 | 3 | 3 | 4 (2+2) |
| **Этап 3** | 0 | 7 | 4 | 3 (0+3) |
| **Этап 4** | 1 | 1 | 1 | 2 (1+1) |
| **ИТОГО** | **9** | **13** | **10** | **14 (6+8)** |

### Общий список новых файлов (9):

1. `backend/data/reference/airports-reference.json`
2. `backend/data/reference/suburbs-reference.json`
3. `backend/data/reference/russia-federal-cities-reference.json`
4. `backend/src/shared/utils/airports-loader.ts`
5. `backend/src/shared/utils/suburbs-loader.ts`
6. `backend/src/shared/utils/unified-cities-loader.ts`
7. `backend/src/shared/validators/stop-validator.ts`
8. `backend/src/shared/validators/graph-validator.ts`
9. `backend/src/application/workers/AirRouteGeneratorWorker.ts`

### Общий список обновляемых файлов (11):

1. `backend/src/shared/utils/city-normalizer.ts`
2. `backend/src/application/workers/ODataSyncWorker.ts`
3. `backend/src/application/workers/VirtualEntitiesGeneratorWorker.ts`
4. `backend/src/application/workers/GraphBuilderWorker.ts`
5. `backend/src/application/route-builder/RouteGraphBuilder.ts`
6. `backend/src/domain/entities/Route.ts`
7. `backend/src/domain/repositories/IGraphRepository.ts`
8. `backend/data/mock/stops.json`
9. `backend/data/mock/routes.json`
10. `backend/data/mock/flights.json`
11. `backend/src/infrastructure/workers/initializeWorkers.ts`

### Функции для переписания/добавления (10):

1. `extractCityFromStopName()` - обработка аэропортов
2. `parseODataResponse()` - нормализация и валидация
3. `generateVirtualStops()` - unified-cities-loader
4. `ensureYakutiaCitiesConnectivity()` → `ensureCitiesConnectivity()` - переименовать и расширить
5. `buildGraphStructure()` - рёбра пересадки
6. `calculateTransferWeight()` - **НОВАЯ**
7. `calculateFerryWeight()` - **НОВАЯ** (или часть `buildGraphStructure()`)
8. `buildFromDataset()` - поддержка ferry
9. `executeWorkerLogic()` в GraphBuilderWorker - валидация
10. `executeWorkerLogic()` в AirRouteGeneratorWorker - **НОВАЯ**

### Структуры данных для изменения (3):

1. `TransportType` в `Route.ts` - добавить `'FERRY'`
2. `GraphNeighbor` в `IGraphRepository.ts` - проверить/добавить `transportType?: string`
3. `Route.metadata` - использовать для `ferrySchedule`

### Тесты (14 файлов):

**Новые (6):**
1. `airports-loader.test.ts`
2. `suburbs-loader.test.ts`
3. `stop-validator.test.ts`
4. `unified-cities-loader.test.ts`
5. `graph-validator.test.ts`
6. `AirRouteGeneratorWorker.test.ts`

**Обновляемые (8):**
1. `city-normalizer.test.ts`
2. `ODataSyncWorker.test.ts`
3. `VirtualEntitiesGeneratorWorker.test.ts`
4. `GraphBuilderWorker.test.ts`
5. `RouteGraphBuilder.test.ts`
6. `OptimizedBuildRouteUseCase.integration.test.ts`

---

## 🎯 Критерии успеха по этапам

### Этап 1:
- ✅ "Аэропорт Якутск (Туймаада)" → `city_id = "Якутск"`
- ✅ "Нижний Бестях" → `city_id = "Якутск"`
- ✅ "Туймаада" не появляется как отдельный город
- ✅ Мусорные записи фильтруются

### Этап 2:
- ✅ 10 федеральных городов доступны
- ✅ Маршруты из федеральных городов в Якутию строятся
- ✅ Hub-based маршруты работают

### Этап 3:
- ✅ Смешанные маршруты строятся корректно
- ✅ Переправа Якутск ↔ Нижний Бестях работает
- ✅ Пересадки работают с правильными весами

### Этап 4:
- ✅ Граф валидируется на корректность
- ✅ Все контрольные маршруты строятся
- ✅ Система устойчива к ошибкам

---

## 📝 Порядок выполнения (по фазам из промпта)

### ФАЗА 1 — КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ
- **ШАГ 1:** Создание 5 новых файлов справочников и вспомогательных модулей
- **ШАГ 2:** Обновить city-normalizer.ts
- **ШАГ 3:** Обновить ODataSyncWorker

### ФАЗА 2 — ФЕДЕРАЛЬНЫЕ ГОРОДА
- **ШАГ 4:** Добавить AirRouteGeneratorWorker
- **ШАГ 5:** Обновить VirtualEntitiesGeneratorWorker
- **ШАГ 6:** Обновить initializeWorkers.ts

### ФАЗА 3 — СМЕШАННЫЕ МАРШРУТЫ И ПЕРЕПРАВА
- **ШАГ 7:** Обновить mock-datasets
- **ШАГ 8:** Обновить GraphBuilderWorker
- **ШАГ 9:** Обновить RouteGraphBuilder

### ФАЗА 4 — ВАЛИДАЦИЯ ГРАФА
- **ШАГ 10:** Создать graph-validator.ts
- **ШАГ 11:** Интеграция валидатора в GraphBuilderWorker

### ФИНАЛЬНЫЕ ШАГИ
- **ШАГ 12:** Добавить тесты (12 файлов)
- **ШАГ 13:** Прогнать контрольные маршруты

---

## ✅ Статус инициализации

✅ **План загружен и проанализирован**  
✅ **Структура плана понятна**  
✅ **Резюме сформировано**  
✅ **Готов к выполнению**

**Следующий шаг:** Ожидаю указания конкретного шага для выполнения (ШАГ 1, ШАГ 2, и т.д.)

---

**Конец резюме**











