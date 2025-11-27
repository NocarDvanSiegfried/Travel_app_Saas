import { DistanceCalculationMethod } from '../enums/DistanceCalculationMethod';

/**
 * Модель расстояния с детализацией по типам транспорта
 * 
 * @example
 * ```typescript
 * const distance = new DistanceModel({
 *   value: 4900,
 *   unit: 'km',
 *   calculationMethod: DistanceCalculationMethod.HAVERSINE,
 *   breakdown: {
 *     airplane: 4900,
 *     train: 0,
 *     bus: 0,
 *     ferry: 0,
 *     winter_road: 0,
 *     taxi: 0,
 *   },
 *   display: '4900 км (по прямой)'
 * });
 * ```
 */
export interface DistanceModel {
  /**
   * Значение расстояния
   */
  value: number;

  /**
   * Единица измерения (всегда 'km')
   */
  unit: 'km';

  /**
   * Метод расчёта расстояния
   */
  calculationMethod: DistanceCalculationMethod;

  /**
   * Детализация по типам транспорта (в км)
   */
  breakdown: {
    airplane: number;
    train: number;
    bus: number;
    ferry: number;
    winter_road: number;
    taxi: number;
  };

  /**
   * Отображаемое значение для пользователя
   * Пример: "4900 км (по прямой)" или "517 км (400 км самолёт + 100 км такси)"
   */
  display: string;
}

/**
 * Создаёт модель расстояния
 */
export function createDistanceModel(
  value: number,
  calculationMethod: DistanceCalculationMethod,
  breakdown: Partial<DistanceModel['breakdown']> = {},
  display?: string
): DistanceModel {
  const defaultBreakdown: DistanceModel['breakdown'] = {
    airplane: 0,
    train: 0,
    bus: 0,
    ferry: 0,
    winter_road: 0,
    taxi: 0,
  };

  const fullBreakdown = { ...defaultBreakdown, ...breakdown };

  // Автоматически генерируем display, если не указан
  if (!display) {
    const parts: string[] = [];
    if (fullBreakdown.airplane > 0) parts.push(`${fullBreakdown.airplane} км самолёт`);
    if (fullBreakdown.train > 0) parts.push(`${fullBreakdown.train} км поезд`);
    if (fullBreakdown.bus > 0) parts.push(`${fullBreakdown.bus} км автобус`);
    if (fullBreakdown.ferry > 0) parts.push(`${fullBreakdown.ferry} км паром`);
    if (fullBreakdown.winter_road > 0) parts.push(`${fullBreakdown.winter_road} км зимник`);
    if (fullBreakdown.taxi > 0) parts.push(`${fullBreakdown.taxi} км такси`);

    if (parts.length > 0) {
      display = `${value} км (${parts.join(' + ')})`;
    } else {
      display = `${value} км`;
    }
  }

  return {
    value,
    unit: 'km',
    calculationMethod,
    breakdown: fullBreakdown,
    display,
  };
}




