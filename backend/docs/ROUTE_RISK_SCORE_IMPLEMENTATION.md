# ✅ Реализация общего riskScore для маршрута (routeRiskScore)

**Дата:** 2024-12-XX  
**Статус:** ✅ Реализовано и протестировано

## 📋 Выполненные задачи

### 1. ✅ Backend - вычисление routeRiskScore

#### Реализовано:
- ✅ В `SmartRouteController.buildSmartRoute` добавлено вычисление общего риска маршрута
- ✅ Общий риск вычисляется как максимум `riskScore.value` среди всех сегментов основного маршрута
- ✅ Общий риск вычисляется для каждого альтернативного маршрута
- ✅ Если у сегмента нет `riskScore` — он игнорируется при расчёте
- ✅ Если нет ни одного сегмента с `riskScore` — маршрутный `riskScore` не добавляется
- ✅ `level` вычисляется на основе `value` по стандартной шкале (1-2: VERY_LOW, 3-4: LOW, 5-6: MEDIUM, 7-8: HIGH, 9-10: VERY_HIGH)

**Файлы:**
- `backend/src/presentation/controllers/SmartRouteController.ts` (строки 541-557, 599-617)

### 2. ✅ Swagger документация

#### Обновлено:
- ✅ Добавлено поле `riskScore` в схему объекта `route` в Swagger
- ✅ Используется `$ref: '#/components/schemas/RiskScore'` для консистентности
- ✅ Добавлено описание: "Общий риск маршрута (максимум среди всех сегментов, опционально)"

**Файлы:**
- `backend/src/presentation/controllers/SmartRouteController.ts` (строки 155-157)

### 3. ✅ Frontend адаптеры

#### Обновлено:
- ✅ `BackendSmartRoute` интерфейс расширен полем `riskScore?: { value, level, description }`
- ✅ `SmartRoute` интерфейс расширен полем `riskScore?: IRiskScore`
- ✅ `adaptSmartRouteToIBuiltRoute` создаёт `riskAssessment` из `smartRoute.riskScore`
- ✅ `riskAssessment` формируется с полным набором `factors` (даже если они пустые)

**Файлы:**
- `frontend/src/modules/routes/lib/smart-route-adapter.ts` (строки 106-111)
- `frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts` (строки 117, 785-816)

### 4. ✅ UI компоненты

#### Обновлено:
- ✅ `checkRouteRiskBlock()` проверяет `route.riskAssessment?.riskScore` или `route.riskScore` напрямую
- ✅ Блокировка кнопки "Купить" работает для `routeRiskScore` (риск >= 7)
- ✅ `RouteRiskBadge` отображает `route.riskAssessment.riskScore` в списке маршрутов
- ✅ `RouteRiskAssessment` компонент готов к отображению данных из `route.riskAssessment`

**Файлы:**
- `frontend/src/app/routes/page.tsx` (строки 26-27, 429-431, 642-644)

### 5. ✅ Хуки и обработка данных

#### Обновлено:
- ✅ `use-routes-search.ts` использует `riskAssessment` из адаптированного маршрута (не перезаписывает)
- ✅ `use-smart-route-search.ts` корректно обрабатывает `riskScore` из API
- ✅ Валидация `riskScore` работает для основного и альтернативных маршрутов

**Файлы:**
- `frontend/src/modules/routes/hooks/use-routes-search.ts` (строки 455-467)

## 🔧 Технические детали

### Алгоритм вычисления routeRiskScore

```typescript
// 1. Собираем все riskScore из сегментов
const segmentRiskScores = segmentsWithRisk
  .map((seg) => seg.riskScore)
  .filter((riskScore): riskScore is IRiskScore => 
    riskScore !== undefined && riskScore !== null
  );

// 2. Если есть хотя бы один riskScore
if (segmentRiskScores.length > 0) {
  // 3. Находим максимальное значение
  const maxRiskValue = Math.max(...segmentRiskScores.map((rs) => rs.value));
  const maxRiskScore = segmentRiskScores.find((rs) => rs.value === maxRiskValue)!;
  
  // 4. Вычисляем level на основе value
  const getRiskLevelFromValue = (value: number): RiskLevel => {
    if (value <= 2) return RiskLevel.VERY_LOW;
    if (value <= 4) return RiskLevel.LOW;
    if (value <= 6) return RiskLevel.MEDIUM;
    if (value <= 8) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  };
  
  // 5. Добавляем в routeJSON
  routeJSON.riskScore = {
    value: maxRiskValue,
    level: getRiskLevelFromValue(maxRiskValue),
    description: `Общий риск маршрута: ${maxRiskScore.description}`,
  };
}
```

### Структура данных

**Backend ответ:**
```json
{
  "success": true,
  "route": {
    "id": "route-123",
    "riskScore": {
      "value": 7,
      "level": "high",
      "description": "Общий риск маршрута: Высокий риск задержек"
    },
    "segments": [
      {
        "id": "seg-1",
        "riskScore": { "value": 5, "level": "medium", ... },
        ...
      },
      {
        "id": "seg-2",
        "riskScore": { "value": 7, "level": "high", ... },
        ...
      }
    ]
  }
}
```

**Frontend структура:**
```typescript
interface Route extends IBuiltRoute {
  riskAssessment?: {
    routeId: string;
    riskScore: IRiskScore; // Из route.riskScore
    factors: IRiskFactors;
  };
}
```

## ✅ Проверка работы

### Backend
- ✅ `route.riskScore` присутствует в ответе `/smart-route/build`
- ✅ Значение соответствует максимальному риску среди всех сегментов
- ✅ Альтернативные маршруты также имеют `riskScore`
- ✅ Если нет сегментов с `riskScore` — поле отсутствует

### Frontend
- ✅ `route.riskAssessment.riskScore` формируется из `route.riskScore`
- ✅ `checkRouteRiskBlock()` блокирует покупку при риске >= 7
- ✅ `RouteRiskBadge` отображает риск маршрута
- ✅ Блок "Оценка рисков маршрута" получает данные

## 📝 Изменённые файлы

1. **Backend:**
   - `backend/src/presentation/controllers/SmartRouteController.ts`
     - Добавлено вычисление `routeRiskScore` для основного маршрута (строки 541-557)
     - Добавлено вычисление `routeRiskScore` для альтернативных маршрутов (строки 599-617)
     - Обновлена Swagger документация (строки 155-157)
     - Добавлен импорт `RiskLevel` (строка 23)

2. **Frontend:**
   - `frontend/src/modules/routes/lib/smart-route-adapter.ts`
     - Добавлено поле `riskScore` в `BackendSmartRoute` (строки 106-111)
   - `frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts`
     - Добавлено поле `riskScore` в `SmartRoute` (строка 117)
     - Добавлено создание `riskAssessment` из `smartRoute.riskScore` (строки 785-816)
     - Добавлены импорты `IRiskAssessment`, `IRiskFactors` (строка 13)
   - `frontend/src/app/routes/page.tsx`
     - Обновлена функция `checkRouteRiskBlock()` для проверки `route.riskScore` (строки 26-27)
   - `frontend/src/modules/routes/hooks/use-routes-search.ts`
     - Убрана перезапись `riskAssessment` из `data?.riskAssessment` (строки 455-467)

## ✅ Итоговый статус

**Все задачи выполнены:**
- ✅ Backend вычисляет и возвращает `route.riskScore`
- ✅ Frontend получает и обрабатывает `route.riskScore`
- ✅ UI отображает риск маршрута
- ✅ Блокировка покупки работает на основе `routeRiskScore`
- ✅ Блок "Оценка рисков маршрута" получает данные

**Система готова к использованию.**


