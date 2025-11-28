# Тесты для модуля route-map

## Структура тестов

```
__tests__/
├── lib/
│   ├── map-styles.test.ts          # Unit тесты для стилей карты
│   └── marker-generator.test.ts     # Unit тесты для генератора маркеров
├── hooks/
│   ├── use-route-map-data.test.ts   # Unit тесты для хука загрузки данных
│   ├── use-route-map-bounds.test.ts # Unit тесты для хука расчёта границ
│   ├── use-route-map-segments.test.ts # Unit тесты для хука обработки сегментов
│   └── use-route-map-sync.test.ts  # Unit тесты для хука синхронизации
└── ui/
    └── route-map.test.tsx           # Integration тесты для компонента RouteMap
```

## Запуск тестов

```bash
# Все тесты
npm test

# Только тесты route-map
npm test route-map

# С покрытием
npm run test:coverage

# В watch режиме
npm run test:watch
```

## E2E тесты

E2E тесты находятся в `frontend/e2e/`:
- `route-map-integration.spec.ts` - Интеграция карты
- `route-map-alternatives.spec.ts` - Переключение альтернативных маршрутов

```bash
# Запуск E2E тестов
npm run test:e2e
```

## Покрытие

Целевое покрытие: > 80%

Текущее покрытие можно проверить командой:
```bash
npm run test:coverage
```








