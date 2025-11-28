# 🔍 Диффы изменений для route.riskScore

## 📋 Backend изменения

### 1. `backend/src/presentation/controllers/SmartRouteController.ts`

#### Добавлен импорт RiskLevel:
```typescript
// Строка 24
import { RiskLevel } from '../../domain/entities/RiskAssessment';
```

#### Добавлено вычисление route.riskScore (строки 542-567):
```typescript
// Вычисляем общий маршрутный риск как максимум среди всех сегментов
const segmentRiskScores = segmentsWithRisk
  .map((seg) => seg.riskScore)
  .filter((riskScore): riskScore is IRiskScore => riskScore !== undefined && riskScore !== null);

if (segmentRiskScores.length > 0) {
  // Находим максимальное значение riskScore.value
  const maxRiskValue = Math.max(...segmentRiskScores.map((rs) => rs.value));
  const maxRiskScore = segmentRiskScores.find((rs) => rs.value === maxRiskValue)!;

  // Вычисляем level на основе значения (на случай, если level не совпадает с value)
  const getRiskLevelFromValue = (value: number): RiskLevel => {
    if (value <= 2) return RiskLevel.VERY_LOW;
    if (value <= 4) return RiskLevel.LOW;
    if (value <= 6) return RiskLevel.MEDIUM;
    if (value <= 8) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  };

  // Добавляем общий риск маршрута
  routeJSON.riskScore = {
    value: maxRiskValue,
    level: getRiskLevelFromValue(maxRiskValue),
    description: `Общий риск маршрута: ${maxRiskScore.description}`,
  };
}
```

#### Добавлено вычисление route.riskScore для альтернативных маршрутов (строки 609-635):
```typescript
// Вычисляем общий риск для альтернативного маршрута
const altSegmentRiskScores = altSegmentsWithRisk
  .map((seg) => seg.riskScore)
  .filter((riskScore): riskScore is IRiskScore => riskScore !== undefined && riskScore !== null);

if (altSegmentRiskScores.length > 0) {
  const maxRiskValue = Math.max(...altSegmentRiskScores.map((rs) => rs.value));
  const maxRiskScore = altSegmentRiskScores.find((rs) => rs.value === maxRiskValue)!;

  // Вычисляем level на основе значения
  const getRiskLevelFromValue = (value: number): RiskLevel => {
    if (value <= 2) return RiskLevel.VERY_LOW;
    if (value <= 4) return RiskLevel.LOW;
    if (value <= 6) return RiskLevel.MEDIUM;
    if (value <= 8) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  };

  return {
    ...altRoute,
    segments: altSegmentsWithRisk,
    riskScore: {
      value: maxRiskValue,
      level: getRiskLevelFromValue(maxRiskValue),
      description: `Общий риск маршрута: ${maxRiskScore.description}`,
    },
  };
}
```

#### Обновлена Swagger документация (строки 158-160):
```typescript
*                     riskScore:
*                       $ref: '#/components/schemas/RiskScore'
*                       description: Общий риск маршрута (максимум среди всех сегментов, опционально)
```

---

## 📋 Frontend изменения

### 2. `frontend/src/modules/routes/lib/smart-route-adapter.ts`

#### Добавлено поле riskScore в BackendSmartRoute (строки 106-111):
```typescript
// ФАЗА 4: Backend может отдавать riskScore для всего маршрута (максимум среди сегментов)
riskScore?: {
  value: number;
  level: string;
  description: string;
};
```

### 3. `frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts`

#### Добавлен импорт IRiskAssessment и IRiskFactors (строка 13):
```typescript
import type { IBuiltRoute, IRouteSegmentDetails, IRouteSegment, IRiskScore, IRiskAssessment, IRiskFactors } from '../domain/types'
```

#### Добавлено поле riskScore в SmartRoute (строка 118):
```typescript
// ФАЗА 4: Backend может отдавать riskScore для всего маршрута (максимум среди сегментов)
riskScore?: IRiskScore
```

#### Добавлено создание riskAssessment из smartRoute.riskScore (строки 785-817):
```typescript
// ФАЗА 4: Добавляем riskAssessment из riskScore маршрута
riskAssessment: smartRoute.riskScore ? {
  routeId: smartRoute.id || `route-${Date.now()}`,
  riskScore: smartRoute.riskScore,
  factors: {
    transferCount,
    transportTypes: transportTypes.map(t => t),
    totalDuration: totalDurationValue,
    historicalDelays: {
      averageDelay30Days: 0,
      averageDelay60Days: 0,
      averageDelay90Days: 0,
      delayFrequency: 0,
    },
    cancellations: {
      cancellationRate30Days: 0,
      cancellationRate60Days: 0,
      cancellationRate90Days: 0,
      totalCancellations: 0,
    },
    occupancy: {
      averageOccupancy: 0,
      highOccupancySegments: 0,
      lowAvailabilitySegments: 0,
    },
    seasonality: {
      month: new Date(routeDate).getMonth() + 1,
      dayOfWeek: new Date(routeDate).getDay(),
      seasonFactor: 1,
    },
    scheduleRegularity: 0,
  },
} : undefined,
```

#### Обновлён тип результата (строка 752):
```typescript
const result: IBuiltRoute & {
  validation?: SmartRoute['validation']
  totalDistance?: number
  totalDurationData?: { display: string }
  totalPriceData?: { display: string }
  fromCityId?: string
  toCityId?: string
  riskAssessment?: IRiskAssessment  // ← Добавлено
} = {
```

### 4. `frontend/src/app/routes/page.tsx`

#### Обновлена функция checkRouteRiskBlock (строки 26-27):
```typescript
// Проверяем риск маршрута (из riskAssessment или напрямую из route.riskScore)
const routeRiskScore = route.riskAssessment?.riskScore || (route as any).riskScore;
```

#### UI отображение riskScore (строки 429-431, 642-644):
```typescript
{route.riskAssessment && route.riskAssessment.riskScore && (
  <RouteRiskBadge riskScore={route.riskAssessment.riskScore} compact />
)}
```

#### UI отображение страховки (строки 530-532, 743-745):
```typescript
{route.riskAssessment?.riskScore && route.riskAssessment.riskScore.value >= 5 && (
  <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
    <div className="flex items-center gap-xs text-sm">
      <span>🛡️</span>
      <span className="text-warning font-medium">
        Рекомендуем оформить страховку
      </span>
    </div>
    <InsuranceOptions
      riskScore={route.riskAssessment.riskScore}
      routeId={route.routeId}
    />
  </div>
)}
```

### 5. `frontend/src/modules/routes/hooks/use-routes-search.ts`

#### Убрана перезапись riskAssessment (строки 455-467):
```typescript
// ФАЗА 4: riskAssessment уже создан в адаптере из route.riskScore, используем его
const routes: Route[] = adaptedRoutes.map((route) => ({
  ...route,
  // riskAssessment уже есть в route из adaptSmartRouteToIBuiltRoute
  // Добавляем validation из SmartRoute API (если доступна)
  validation: (data as RouteSearchResponse & { validation?: any })?.validation,
} as Route & { validation?: any }))
```

---

## ✅ Проверка реализации

### Backend:
- ✅ `route.riskScore` вычисляется ДО `res.json()` (строка 562, перед строкой 648)
- ✅ Используется функция `getRiskLevelFromValue()` для вычисления level
- ✅ Описание формируется как "Общий риск маршрута: " + описание сегмента с максимальным риском
- ✅ Swagger документация обновлена
- ✅ Роутер `/smart-routes/build` использует `SmartRouteController.buildSmartRoute`

### Frontend:
- ✅ `smart-route-adapter.ts` ожидает `smartRoute.riskScore`
- ✅ `smart-route-to-built-route-adapter.ts` создаёт `riskAssessment` на основе `smartRoute.riskScore`
- ✅ `checkRouteRiskBlock()` использует `route.riskAssessment?.riskScore` или `route.riskScore`
- ✅ UI отображает бейдж риска маршрута
- ✅ UI отображает блок страховки при risk >= 5
- ✅ UI блокирует кнопку "Купить" при risk >= 7

---

## 🎯 Итоговый статус

**Все требования выполнены:**
1. ✅ Backend вычисляет `route.riskScore` как максимум среди всех сегментов
2. ✅ Swagger показывает поле `route.riskScore`
3. ✅ Frontend правильно обрабатывает `route.riskScore`
4. ✅ UI отображает риск, страховку и блокирует покупку

**Система полностью готова к использованию.**

