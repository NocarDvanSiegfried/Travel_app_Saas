# 🚀 Инструкция по запуску тестов

## Быстрый старт

```bash
# 1. Установите зависимости (если еще не установлены)
npm install

# 2. Запустите все тесты
npm run test:all

# Или по отдельности:
npm run test:unit          # Unit тесты
npm run test:integration   # Integration тесты
npm run test:e2e          # E2E тесты
```

## Запуск конкретных тестов

### Только тесты risk-engine и insurance
```bash
# Unit тесты risk-engine
npm test -- --testPathPattern="__tests__/unit/risk-engine"

# Unit тесты insurance
npm test -- --testPathPattern="__tests__/unit/insurance"

# Integration тесты insurance API
npm test -- --testPathPattern="__tests__/integration/api/insurance"

# E2E тесты risk и insurance
npm test -- --testPathPattern="__tests__/e2e/risk-and-insurance"
```

## С покрытием кода
```bash
npm run test:coverage
```

## Результаты

После запуска вы увидите:
- ✅ Количество пройденных тестов
- ✅ Количество упавших тестов (если есть)
- ✅ Время выполнения
- ✅ Покрытие кода (если включено)

## Структура тестов

```
backend/src/__tests__/
├── unit/
│   ├── risk-engine/
│   │   ├── UnifiedRiskCalculator.test.ts
│   │   ├── risk-calculator/
│   │   │   └── AirplaneRiskCalculator.test.ts
│   │   └── risk-factors/
│   │       └── TransferRiskFactor.test.ts
│   └── insurance/
│       ├── InsuranceProduct.test.ts
│       ├── InsuranceService.test.ts
│       └── InsuranceProductRepository.test.ts
├── integration/
│   └── api/
│       └── insurance.api.test.ts
└── e2e/
    └── risk-and-insurance.e2e.test.ts
```

## Ожидаемый результат

- ✅ ~36 unit тестов
- ✅ ~8 integration тестов
- ✅ ~5 e2e тестов
- **Всего: ~49 тестов**

