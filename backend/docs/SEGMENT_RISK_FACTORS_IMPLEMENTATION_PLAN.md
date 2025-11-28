# План реализации факторов риска для сегментов

## Задачи

1. ✅ Расширить IRiskScore для включения factors
2. Обновить SegmentRiskService для сбора факторов
3. Обновить AssessSegmentRiskUseCase для возврата factors
4. Обновить SmartRouteController для передачи factors
5. Обновить frontend адаптеры
6. Добавить UI компоненты
7. Восстановить предупреждения
8. Добавить предупреждение перед покупкой
9. Добавить интерактивный блок "Почему это риск?"

## Структура факторов

```typescript
factors: {
  weather: { temperature?, visibility?, wind?, storms? },
  delays: { avg30, avg60, avg90, delayFreq },
  cancellations: { rate30, rate60, rate90, total },
  occupancy: { avg, highLoadPercent },
  seasonality: { month, riskFactor },
  schedule: { regularityScore }
}
```


