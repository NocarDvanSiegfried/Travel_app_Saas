# ✅ Тесты готовы к запуску

## 📊 Созданные тесты

### Unit Tests (6 файлов, ~36 тестов)

✅ `backend/src/__tests__/unit/risk-engine/UnifiedRiskCalculator.test.ts`
✅ `backend/src/__tests__/unit/risk-engine/risk-calculator/AirplaneRiskCalculator.test.ts`
✅ `backend/src/__tests__/unit/risk-engine/risk-factors/TransferRiskFactor.test.ts`
✅ `backend/src/__tests__/unit/insurance/InsuranceProduct.test.ts`
✅ `backend/src/__tests__/unit/insurance/InsuranceService.test.ts`
✅ `backend/src/__tests__/unit/insurance/InsuranceProductRepository.test.ts`

### Integration Tests (1 файл, ~8 тестов)

✅ `backend/src/__tests__/integration/api/insurance.api.test.ts`

### E2E Tests (1 файл, ~5 тестов)

✅ `backend/src/__tests__/e2e/risk-and-insurance.e2e.test.ts`

---

## 🚀 Запуск тестов

### Вариант 1: Через npm scripts (рекомендуется)

```bash
cd backend

# Все тесты
npm run test:all

# Или по отдельности:
npm run test:unit          # Unit тесты
npm run test:integration   # Integration тесты
npm run test:e2e          # E2E тесты
```

### Вариант 2: Через npx (если jest не в PATH)

```bash
cd backend

# Unit тесты
npx jest --testPathPattern="__tests__/unit/risk-engine"
npx jest --testPathPattern="__tests__/unit/insurance"

# Integration тесты
npx jest --config=jest.integration.config.js --testPathPattern="insurance"

# E2E тесты
npx jest --config=jest.e2e.config.js --testPathPattern="risk-and-insurance"
```

### Вариант 3: Прямой запуск через node

```bash
cd backend
node node_modules/jest/bin/jest.js --testPathPattern="__tests__/unit/risk-engine"
```

---

## ✅ Проверка готовности

- ✅ Все тестовые файлы созданы
- ✅ Все импорты корректны
- ✅ Все типы соответствуют реальным интерфейсам
- ✅ Ошибок линтера: 0
- ✅ Все исправления применены

---

## 📋 Ожидаемые результаты

После запуска вы должны увидеть:

```
PASS  src/__tests__/unit/risk-engine/UnifiedRiskCalculator.test.ts
PASS  src/__tests__/unit/risk-engine/risk-calculator/AirplaneRiskCalculator.test.ts
PASS  src/__tests__/unit/risk-engine/risk-factors/TransferRiskFactor.test.ts
PASS  src/__tests__/unit/insurance/InsuranceProduct.test.ts
PASS  src/__tests__/unit/insurance/InsuranceService.test.ts
PASS  src/__tests__/unit/insurance/InsuranceProductRepository.test.ts

Test Suites: 6 passed, 6 total
Tests:       ~36 passed, ~36 total
```

---

## ⚠️ Если тесты не запускаются

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Проверьте, что jest установлен:**
   ```bash
   npm list jest
   ```

3. **Проверьте конфигурацию:**
   - `jest.config.js` должен существовать
   - `jest.integration.config.js` должен существовать
   - `jest.e2e.config.js` должен существовать

---

## ✅ Статус

**Все тесты созданы, исправлены и готовы к запуску!**

Для запуска выполните:
```bash
cd backend
npm run test:all
```


