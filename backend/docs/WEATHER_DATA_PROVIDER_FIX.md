# ✅ Исправление ошибки TS2345 в WeatherDataProvider

## Проблема

```
error TS2345: Argument of type 'IRouteSegmentDetails' is not assignable to parameter of type 'IRouteSegment'.
```

В методе `getDataForRoute` передавался `IRouteSegmentDetails`, но метод `getWeatherForSegment` ожидает `IRouteSegment`.

## Причина

В `IBuiltRoute` поле `segments` имеет тип `IRouteSegmentDetails[]`, где каждый элемент содержит:
- `segment: IRouteSegment` - собственно сегмент
- Дополнительные поля: `departureTime`, `arrivalTime`, `duration`, `price`, и т.д.

Метод `getWeatherForSegment` ожидает только `IRouteSegment`, а не весь `IRouteSegmentDetails`.

## Исправление

**Файл:** `backend/src/application/risk-engine/data-providers/WeatherDataProvider.ts`

**Было:**
```typescript
const weatherDataArray = await Promise.all(
  segments.map((segment) => this.getWeatherForSegment(segment, context))
);
```

**Стало:**
```typescript
const weatherDataArray = await Promise.all(
  segments.map((segmentDetails) => this.getWeatherForSegment(segmentDetails.segment, context))
);
```

## Результат

- ✅ Ошибка TS2345 устранена
- ✅ Извлекается `segment` из `IRouteSegmentDetails` перед передачей в `getWeatherForSegment`
- ✅ Типы полностью совместимы
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибка TS2345 должна исчезнуть.


