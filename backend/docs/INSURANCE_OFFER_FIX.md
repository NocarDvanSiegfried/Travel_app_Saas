# ✅ Исправление ошибок TS2339 в InsuranceController

## Проблема

```
error TS2339: Property 'toJSON' does not exist on type 'IInsuranceOffer'.
```

Метод `toJSON()` вызывался на объектах типа `IInsuranceOffer[]`, но интерфейс `IInsuranceOffer` не содержал этого метода.

## Причина

Класс `InsuranceOffer` реализует метод `toJSON()`, но интерфейс `IInsuranceOffer` не объявлял этот метод. В контроллере использовался тип `IInsuranceOffer[]`, и TypeScript не знал, что объекты имеют метод `toJSON()`.

## Исправление

**Файл:** `backend/src/domain/entities/InsuranceProduct.ts`

**Добавлен метод в интерфейс `IInsuranceOffer`:**

```typescript
export interface IInsuranceOffer {
  /** Страховой продукт */
  readonly product: IInsuranceProduct;
  /** Рассчитанная цена (в копейках) */
  readonly price: number;
  /** Оценка риска, на основе которой рассчитана цена */
  readonly riskScore: IRiskScore;
  /** Рекомендуется ли продукт */
  readonly isRecommended: boolean;
  /** Приоритет отображения */
  readonly priority: number;
  /**
   * Преобразует объект в JSON
   *
   * @returns Объект в формате JSON
   */
  toJSON(): Record<string, unknown>;
}
```

**Класс `InsuranceOffer` уже реализует этот метод:**

```typescript
export class InsuranceOffer implements IInsuranceOffer {
  // ... свойства ...
  
  public toJSON(): Record<string, unknown> {
    return {
      product: this.product.toJSON(),
      price: this.price,
      riskScore: this.riskScore,
      isRecommended: this.isRecommended,
      priority: this.priority,
    };
  }
}
```

## Использование в контроллере

**Файл:** `backend/src/presentation/controllers/InsuranceController.ts`

Метод используется в двух местах:

1. **Строка 202:**
```typescript
offers: offers.map((offer) => offer.toJSON()),
```

2. **Строка 300:**
```typescript
offers: offers.map((offer) => offer.toJSON()),
```

## Результат

- ✅ Ошибки TS2339 устранены
- ✅ Интерфейс `IInsuranceOffer` теперь содержит метод `toJSON()`
- ✅ Класс `InsuranceOffer` корректно реализует интерфейс
- ✅ Контроллер может вызывать `toJSON()` на объектах типа `IInsuranceOffer`
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибки TS2339 должны исчезнуть.


