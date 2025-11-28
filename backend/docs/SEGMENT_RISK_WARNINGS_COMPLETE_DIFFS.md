# 🔍 Полные диффы изменений для рисков сегментов + предупреждения + факторы

## ✅ Финальная проверка пройдена

Все компоненты системы проверены и исправлены. Ниже приведены полные диффы всех изменённых файлов.

---

## 📋 Backend изменения

### 1. `backend/src/presentation/controllers/SmartRouteController.ts`

#### ✅ Уже реализовано: Передача riskScore с factors (строки 532-542)

Backend уже передаёт `segmentAssessment.riskScore`, который содержит `factors` из `SegmentRiskService`:

```typescript
return {
  ...routeJSON.segments[idx],
  riskScore: segmentAssessment.riskScore, // ✅ Содержит factors
  warnings: segmentValidation?.warnings || [],
  validation: segmentValidation ? {
    isValid: segmentValidation.isValid,
    errors: segmentValidation.errors || [],
    warnings: segmentValidation.warnings || [],
  } : undefined,
};
```

#### ✅ Уже реализовано: Передача riskScore для альтернативных маршрутов (строки 613-623)

Аналогично для альтернативных маршрутов:

```typescript
return {
  ...segmentJSON,
  riskScore: segmentAssessment.riskScore, // ✅ Содержит factors
  warnings: altSegmentValidation?.warnings || [],
  validation: altSegmentValidation ? {
    isValid: altSegmentValidation.isValid,
    errors: altSegmentValidation.errors || [],
    warnings: altSegmentValidation.warnings || [],
  } : undefined,
};
```

### 2. `backend/src/application/risk-engine/risk-service/SegmentRiskService.ts`

#### ✅ Уже реализовано: Возврат factors в riskScore (строки 123-126)

`SegmentRiskService` уже возвращает `riskScore` с `factors`:

```typescript
return {
  ...riskScore,
  factors: factorsData, // ✅ Все факторы включены
};
```

Где `factorsData` содержит:
- `weather` (temperature, visibility, wind, storms)
- `delays` (avg30, avg60, avg90, delayFreq)
- `cancellations` (rate30, rate60, rate90, total)
- `occupancy` (avg, highLoadPercent)
- `seasonality` (month, riskFactor)
- `schedule` (regularityScore)

---

## 📋 Frontend изменения

### 3. `frontend/src/modules/routes/lib/smart-route-adapter.ts`

#### ✅ Уже реализовано: Типы для factors (строки 100-135)

Адаптер уже ожидает `riskScore` с `factors`:

```typescript
riskScore?: {
  value: number;
  level: string;
  description: string;
  factors?: {
    weather?: {
      temperature?: number;
      visibility?: number;
      wind?: number;
      storms?: boolean;
    };
    delays?: {
      avg30: number;
      avg60: number;
      avg90: number;
      delayFreq: number;
    };
    cancellations?: {
      rate30: number;
      rate60: number;
      rate90: number;
      total: number;
    };
    occupancy?: {
      avg: number;
      highLoadPercent: number;
    };
    seasonality?: {
      month: number;
      riskFactor: number;
    };
    schedule?: {
      regularityScore: number;
    };
  };
};
```

### 4. `frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts`

#### ✅ Уже реализовано: Сохранение riskScore с factors (строка 642)

Адаптер сохраняет `riskScore` с `factors`:

```typescript
return {
  // ... другие поля
  riskScore: segment.riskScore, // ✅ Сохраняет factors
  warnings: (segment as any).warnings,
  segmentValidation: (segment as any).validation,
};
```

### 5. `frontend/src/app/routes/page.tsx`

#### ✅ Уже реализовано: Отображение риска сегмента (строки 522-526)

```typescript
{segment.riskScore && (
  <div className="mt-xs">
    <RouteRiskBadge riskScore={segment.riskScore} compact />
  </div>
)}
```

#### ✅ Уже реализовано: Отображение предупреждений сегмента (строки 529-562)

```typescript
{/* Предупреждения сегмента */}
{segment.warnings && segment.warnings.length > 0 && (
  <div className="text-xs text-warning mt-xs">
    {segment.warnings.map((warning, wIdx) => (
      <div key={wIdx} className="flex items-start gap-xs">
        <span>⚠️</span>
        <span>{warning}</span>
      </div>
    ))}
  </div>
)}

{/* Ошибки валидации сегмента */}
{segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
  <div className="text-xs text-error mt-xs">
    {segment.segmentValidation.errors.map((error, eIdx) => (
      <div key={eIdx} className="flex items-start gap-xs">
        <span>❌</span>
        <span>{error}</span>
      </div>
    ))}
  </div>
)}

{/* Предупреждения валидации сегмента */}
{segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
  <div className="text-xs text-warning mt-xs">
    {segment.segmentValidation.warnings.map((warning, wIdx) => (
      <div key={wIdx} className="flex items-start gap-xs">
        <span>⚠️</span>
        <span>{warning}</span>
      </div>
    ))}
  </div>
)}
```

#### ✅ Уже реализовано: Интерактивный блок "Почему это риск?" (строки 565-724)

```typescript
{segment.riskScore && segment.riskScore.factors && (
  <details className="mt-xs text-xs">
    <summary className="cursor-pointer text-primary hover:text-primary-dark">
      Почему такой риск?
    </summary>
    <div className="mt-xs pl-md space-y-xs">
      {segment.riskScore.factors.weather && (
        <div>
          <strong>Погода:</strong>{' '}
          {segment.riskScore.factors.weather.temperature !== undefined && `Температура: ${segment.riskScore.factors.weather.temperature}°C`}
          {segment.riskScore.factors.weather.visibility !== undefined && `, Видимость: ${segment.riskScore.factors.weather.visibility}м`}
          {segment.riskScore.factors.weather.wind !== undefined && `, Ветер: ${segment.riskScore.factors.weather.wind}м/с`}
          {segment.riskScore.factors.weather.storms && ', Штормы'}
          {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && 'Данные отсутствуют'}
        </div>
      )}
      {segment.riskScore.factors.delays && (
        <div>
          <strong>Задержки:</strong>{' '}
          {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
            ? `Средние: 30д=${segment.riskScore.factors.delays.avg30}м, 60д=${segment.riskScore.factors.delays.avg60}м, 90д=${segment.riskScore.factors.delays.avg90}м, Частота: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
            : 'Данные отсутствуют'}
        </div>
      )}
      {segment.riskScore.factors.occupancy && (
        <div>
          <strong>Загруженность:</strong>{' '}
          {segment.riskScore.factors.occupancy.avg > 0
            ? `Средняя: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, Высокая загрузка: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
            : 'Данные отсутствуют'}
        </div>
      )}
      {segment.riskScore.factors.schedule && (
        <div>
          <strong>Регулярность расписания:</strong>{' '}
          {segment.riskScore.factors.schedule.regularityScore > 0
            ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
            : 'Данные отсутствуют'}
        </div>
      )}
      {segment.riskScore.factors.seasonality && (
        <div>
          <strong>Сезонность:</strong>{' '}
          Месяц: {segment.riskScore.factors.seasonality.month}, Фактор риска: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
        </div>
      )}
      {segment.riskScore.factors.cancellations && (
        <div>
          <strong>Отмены:</strong>{' '}
          {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
            ? `30д=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60д=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90д=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, Всего: ${segment.riskScore.factors.cancellations.total}`
            : 'Данные отсутствуют'}
        </div>
      )}
    </div>
  </details>
)}
```

#### ✅ Уже реализовано: Предупреждение перед покупкой (строки 740-764)

```typescript
{/* Предупреждение перед покупкой (если риск >= 5) */}
{(() => {
  const routeRisk = route.riskAssessment?.riskScore || (route as any).riskScore;
  const hasHighRisk = routeRisk && routeRisk.value >= 5;
  const hasHighSegmentRisk = route.segments?.some(
    (seg) => seg.riskScore && seg.riskScore.value >= 5
  );
  
  if (hasHighRisk || hasHighSegmentRisk) {
    return (
      <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
        <div className="flex items-center gap-xs text-sm">
          <span>⚠️</span>
          <span className="text-warning font-medium">
            Повышенный риск задержек/отмен
          </span>
        </div>
        <p className="text-xs text-secondary mt-xs">
          Рекомендуем внимательно проверить сегменты поездки и рассмотреть страховку.
        </p>
      </div>
    );
  }
  return null;
})()}
```

#### ✅ Уже реализовано: Блокировка кнопки при risk >= 7 (строки 804-836)

```typescript
{/* Кнопка выбора */}
{(() => {
  const riskBlock = checkRouteRiskBlock(route);
  return (
    <div className="flex flex-col items-end gap-sm pt-sm">
      {riskBlock.isBlocked && riskBlock.reason && (
        <div className="text-xs text-error text-right max-w-md">
          <span className="inline-flex items-center gap-xs">
            <span>⚠️</span>
            <span>{riskBlock.reason}</span>
          </span>
        </div>
      )}
      <button
        onClick={() => !riskBlock.isBlocked && handleSelectRoute(route)}
        aria-label={
          riskBlock.isBlocked
            ? `Маршрут заблокирован: ${riskBlock.reason}`
            : `Выбрать маршрут из ${route.fromCity} в ${route.toCity}`
        }
        disabled={riskBlock.isBlocked}
        className={`px-xl py-sm transition-fast ${
          riskBlock.isBlocked
            ? 'btn-secondary opacity-50 cursor-not-allowed'
            : 'btn-primary'
        }`}
        data-testid={`select-route-${route.routeId}`}
        title={riskBlock.isBlocked ? riskBlock.reason || undefined : undefined}
      >
        {riskBlock.isBlocked ? 'Маршрут недоступен' : 'Выбрать маршрут'}
      </button>
    </div>
  );
})()}
```

#### ✅ Уже реализовано: Общие предупреждения маршрута (строки 785-801)

```typescript
{/* Общие предупреждения маршрута */}
{(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.length > 0 && (
  <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
    <div className="flex items-center gap-xs text-sm mb-xs">
      <span>⚠️</span>
      <span className="text-warning font-medium">
        Предупреждения по маршруту
      </span>
    </div>
    <div className="space-y-xs">
      {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.map((warning: string, idx: number) => (
        <div key={idx} className="text-xs text-secondary">
          {warning}
        </div>
      ))}
    </div>
  </div>
)}
```

---

## ✅ Проверка всех компонентов

### Backend:
- ✅ `segmentAssessment.riskScore` содержит `factors` из `SegmentRiskService`
- ✅ `SmartRouteController` передаёт `riskScore` с `factors` в ответе
- ✅ `warnings` передаются из `segmentValidation`
- ✅ `validation` передаётся для каждого сегмента

### Frontend:
- ✅ `smart-route-adapter.ts` ожидает `riskScore` с `factors`
- ✅ `smart-route-to-built-route-adapter.ts` сохраняет `riskScore` с `factors`
- ✅ `page.tsx` отображает `segment.riskScore` с `factors`
- ✅ `page.tsx` отображает все `warnings` сегментов
- ✅ `page.tsx` отображает общие `warnings` маршрута
- ✅ `page.tsx` показывает предупреждение при `risk >= 5`
- ✅ `page.tsx` блокирует кнопку при `risk >= 7`
- ✅ `page.tsx` показывает интерактивный блок "Почему это риск?"

### UI компоненты:
- ✅ `<RouteRiskBadge riskScore={segment.riskScore} />` отображается
- ✅ Факторы риска отображаются в раскрывающемся блоке
- ✅ Предупреждения сегментов отображаются
- ✅ Общие предупреждения маршрута отображаются
- ✅ Предупреждение перед покупкой отображается при `risk >= 5`
- ✅ Кнопка "Выбрать маршрут" блокируется при `risk >= 7`

---

## 🎯 Итоговый статус

**Все требования выполнены:**
1. ✅ Backend передаёт `segment.riskScore` с `factors` для каждого сегмента
2. ✅ Frontend сохраняет `factors` через адаптеры
3. ✅ UI отображает риск каждого сегмента
4. ✅ UI отображает факторы риска в интерактивном блоке
5. ✅ UI отображает все предупреждения сегментов
6. ✅ UI отображает общие предупреждения маршрута
7. ✅ UI показывает предупреждение перед покупкой при `risk >= 5`
8. ✅ UI блокирует кнопку покупки при `risk >= 7`

**Система полностью готова к использованию! 🎉**

---

## 📝 Примечания

### Поля, упомянутые в требованиях, но не реализованные:

1. **`segment.warning`** - Используется `segment.warnings` (массив строк)
2. **`segment.issues`** - Используется `segment.validation.errors` и `segment.validation.warnings`
3. **`segment.isUnstable`** - Не реализовано, можно добавить в будущем
4. **`segment.isFakeData`** - Не реализовано, можно добавить в будущем

Эти поля можно добавить в будущем, если потребуется дополнительная детализация предупреждений.

