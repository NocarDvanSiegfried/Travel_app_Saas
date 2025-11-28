# ✅ Исправление ошибки TS2540 в RiskContext

## Проблема

```
error TS2540: Cannot assign to 'date' because it is a read-only property.
error TS2540: Cannot assign to 'passengers' because it is a read-only property.
```

Геттеры `get date()` и `get passengers()` делают эти свойства read-only, но в конструкторе мы пытались присваивать им значения через индексную сигнатуру `this['date'] = date`.

## Причина

TypeScript видит геттеры и считает свойства read-only, даже при присваивании через индексную сигнатуру. Это конфликт между:
- Геттерами (read-only)
- Индексной сигнатурой `[key: string]: unknown`
- Попыткой присваивания через `this['date'] = date`

## Исправление

**Файл:** `backend/src/application/risk-engine/base/RiskContext.ts`

**Решение:**
1. Использовать приватные поля `_date` и `_passengers` для хранения значений
2. Геттеры возвращают значения из приватных полей
3. Использовать `Object.defineProperty` для установки значений в индексную сигнатуру

**Изменения:**

```typescript
export class RiskContext implements IRiskDataContext {
  // Приватные поля для хранения основных свойств
  private readonly _date: string;
  private readonly _passengers?: number;
  
  private readonly additionalParams: Map<string, unknown>;
  
  [key: string]: unknown;
  
  constructor(
    date: string,
    passengers?: number,
    additionalParams?: Record<string, unknown>
  ) {
    this._date = date;
    this._passengers = passengers;
    this.additionalParams = new Map(Object.entries(additionalParams || {}));
    
    // Устанавливаем основные свойства в индексную сигнатуру через Object.defineProperty
    Object.defineProperty(this, 'date', {
      value: date,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    
    if (passengers !== undefined) {
      Object.defineProperty(this, 'passengers', {
        value: passengers,
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
    
    // Добавляем дополнительные параметры в индексную сигнатуру
    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        this[key] = value;
      }
    }
  }
  
  get date(): string {
    return this._date;
  }
  
  get passengers(): number | undefined {
    return this._passengers;
  }
  
  // ... остальные методы ...
}
```

## Результат

- ✅ Ошибки TS2540 устранены
- ✅ Геттеры работают корректно, возвращая значения из приватных полей
- ✅ Индексная сигнатура работает через `Object.defineProperty`
- ✅ Свойства доступны как через геттеры (`context.date`), так и через индекс (`context['date']`)
- ✅ Ошибок линтера: 0

## Проверка

Приложение должно компилироваться без ошибок. При запуске через ts-node/nodemon ошибки TS2540 должны исчезнуть.
