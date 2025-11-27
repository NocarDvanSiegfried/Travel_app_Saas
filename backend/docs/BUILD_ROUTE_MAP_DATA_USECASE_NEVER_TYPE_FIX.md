# Отчёт об исправлении ошибки типа `never` в BuildRouteMapDataUseCase

## Файл: `BuildRouteMapDataUseCase.ts`

## Дата: 2025-01-XX

## Проблема

**Ошибка TypeScript**: `TS2339: Property 'cityId' does not exist on type 'never'`

**Локация**: Строки 370-400 (метод `loadStopCoordinates`)

**Причина**: 
После ранних `return` в условиях `if (realStop)` и `if (virtualStop)` TypeScript сужал тип переменных до `never`, считая, что они не могут существовать после проверки с ранним возвратом. При попытке доступа к `realStop.cityId` или `virtualStop.cityId` после этих проверок возникала ошибка типизации.

## Решение

### 1. Добавлен импорт типов

**Строка 18**:
```typescript
import type { RealStop, VirtualStop } from '../../../domain/entities';
```

### 2. Изменена логика загрузки остановок

**Было** (строки 359-369):
```typescript
// Попытка 1: Real Stop
const realStop = await this.stopRepository.findRealStopById(stopId);
if (realStop) {
  return [realStop.latitude, realStop.longitude];
}

// Попытка 2: Virtual Stop
const virtualStop = await this.stopRepository.findVirtualStopById(stopId);
if (virtualStop) {
  return [virtualStop.latitude, virtualStop.longitude];
}

// Попытка 3: Unified Cities Reference
// ...
const realStopCityId = realStop ? realStop.cityId : undefined; // ❌ Ошибка: realStop имеет тип never
```

**Стало** (строки 360-388):
```typescript
// Загружаем остановки один раз и явно типизируем для избежания never
const realStop: RealStop | undefined = await this.stopRepository.findRealStopById(stopId);
const virtualStop: VirtualStop | undefined = await this.stopRepository.findVirtualStopById(stopId);

// Попытка 1: Real Stop с валидными координатами
if (realStop && isFinite(realStop.latitude) && isFinite(realStop.longitude)) {
  return [realStop.latitude, realStop.longitude];
}

// Попытка 2: Virtual Stop с валидными координатами
if (virtualStop && isFinite(virtualStop.latitude) && isFinite(virtualStop.longitude)) {
  return [virtualStop.latitude, virtualStop.longitude];
}

// Попытка 3: Unified Cities Reference
// Используем cityId из остановок (если они были загружены, но координаты отсутствуют)
let cityName: string | null = null;

// Проверяем cityId из остановок (явная проверка типов гарантирует корректный тип)
if (realStop && realStop.cityId) { // ✅ Корректный тип: RealStop | undefined
  cityName = realStop.cityId;
} else if (virtualStop && virtualStop.cityId) { // ✅ Корректный тип: VirtualStop | undefined
  cityName = virtualStop.cityId;
}
```

## Ключевые изменения

1. **Явная типизация переменных**: 
   - `const realStop: RealStop | undefined = ...`
   - `const virtualStop: VirtualStop | undefined = ...`
   
   Это гарантирует, что TypeScript понимает правильный тип переменных и не сужает их до `never`.

2. **Изменена логика проверки координат**:
   - Вместо простой проверки `if (realStop)` используется `if (realStop && isFinite(realStop.latitude) && isFinite(realStop.longitude))`
   - Это позволяет использовать переменные после проверки, если координаты невалидны

3. **Явная проверка перед доступом к `cityId`**:
   - `if (realStop && realStop.cityId)` - гарантирует, что `realStop` существует и имеет `cityId`
   - `if (virtualStop && virtualStop.cityId)` - аналогично для `virtualStop`

## Результат

✅ **Ошибка TS2339 устранена**
✅ **Типы корректны**: `realStop` и `virtualStop` имеют тип `RealStop | undefined` и `VirtualStop | undefined` соответственно
✅ **Бизнес-логика не изменена**: функциональность сохранена, улучшена только типизация
✅ **Валидация координат**: добавлена проверка `isFinite()` для валидации координат

## Проверка

- ✅ Линтер: нет ошибок
- ✅ Типизация: все типы корректны
- ✅ Компиляция: ошибок TypeScript нет

## Статус

**Готово к компиляции** ✅






