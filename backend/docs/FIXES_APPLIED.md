# ✅ Исправления ошибок компиляции

## Исправленные проблемы

### 1. RiskLevel импортируется как значение, а не как тип

**Проблема:** `RiskLevel` импортировался как `import type { RiskLevel }`, но использовался как значение (enum).

**Исправлено в файлах:**
- ✅ `backend/src/domain/entities/InsuranceProduct.ts`
- ✅ `backend/src/application/insurance/InsuranceService.ts`
- ✅ `backend/src/application/risk-engine/use-cases/AssessSegmentRiskUseCase.ts`
- ✅ `backend/src/application/risk-engine/risk-engine/SegmentRiskEngine.ts`
- ✅ `backend/src/application/risk-engine/risk-calculator/UnifiedRiskCalculator.ts`

**Изменение:**
```typescript
// Было:
import type { IRiskScore, RiskLevel } from './RiskAssessment';

// Стало:
import type { IRiskScore } from './RiskAssessment';
import { RiskLevel } from './RiskAssessment';
```

### 2. Методы отсутствуют в интерфейсе IInsuranceProduct

**Проблема:** В интерфейсе `IInsuranceProduct` отсутствовали методы `calculatePrice`, `shouldBeRecommended` и `toJSON`, которые есть в классе `InsuranceProduct`.

**Исправлено:**
- ✅ Добавлены методы в интерфейс `IInsuranceProduct`:
  - `calculatePrice(riskScore: IRiskScore): number`
  - `shouldBeRecommended(riskScore: IRiskScore): boolean`
  - `toJSON(): Record<string, unknown>`

**Файл:** `backend/src/domain/entities/InsuranceProduct.ts`

### 3. Убедились, что объекты создаются как экземпляры класса

**Проверено:**
- ✅ `InsuranceProductRepository` создает экземпляры класса `InsuranceProduct` через `new InsuranceProduct(...)`
- ✅ Все продукты хранятся в `Map<string, InsuranceProduct>` и возвращаются как экземпляры класса
- ✅ Контроллер использует `.toJSON()` для сериализации перед отправкой в ответ

**Файлы:**
- ✅ `backend/src/application/insurance/InsuranceProductRepository.ts`
- ✅ `backend/src/presentation/controllers/InsuranceController.ts`

## Результат

- ✅ Все импорты `RiskLevel` исправлены
- ✅ Интерфейс `IInsuranceProduct` полностью соответствует классу `InsuranceProduct`
- ✅ Все объекты создаются как экземпляры класса
- ✅ Репозитории и сервисы работают с сущностями, а не с DTO
- ✅ Ошибки TS2339 и TS1361 должны быть устранены

## Проверка

Для проверки компиляции выполните:
```bash
cd backend
npm run build
```

Или через ts-node:
```bash
npx ts-node src/index.ts
```


