/**
 * Модель цены с базовой ценой и дополнительными расходами
 * 
 * @example
 * ```typescript
 * const price = new PriceModel({
 *   base: 12000,
 *   additional: {
 *     taxi: 600,
 *     transfer: 0,
 *     baggage: 2000,
 *     fees: 1000,
 *   },
 *   total: 15600,
 *   currency: 'RUB',
 *   display: '15600₽ (+600₽ такси +2000₽ багаж +1000₽ сборы)'
 * });
 * ```
 */
export interface PriceModel {
  /**
   * Базовая цена (сумма базовых цен всех сегментов)
   */
  base: number;

  /**
   * Дополнительные расходы
   */
  additional: {
    /**
     * Такси до/от остановок
     */
    taxi: number;

    /**
     * Трансферы между остановками
     */
    transfer: number;

    /**
     * Багаж (сверх нормы)
     */
    baggage: number;

    /**
     * Сборы (аэропортовые, сервисные)
     */
    fees: number;
  };

  /**
   * Общая цена (базовая + дополнительные расходы)
   */
  total: number;

  /**
   * Валюта (всегда RUB)
   */
  currency: 'RUB';

  /**
   * Отображаемое значение для пользователя
   * Пример: "15600₽ (+600₽ такси +2000₽ багаж +1000₽ сборы)"
   */
  display: string;
}

/**
 * Создаёт модель цены
 */
export function createPriceModel(
  base: number,
  additional: Partial<PriceModel['additional']> = {},
  display?: string
): PriceModel {
  const defaultAdditional: PriceModel['additional'] = {
    taxi: 0,
    transfer: 0,
    baggage: 0,
    fees: 0,
  };

  const fullAdditional = { ...defaultAdditional, ...additional };
  const total = base + Object.values(fullAdditional).reduce((sum, val) => sum + val, 0);

  // Автоматически генерируем display, если не указан
  if (!display) {
    const parts: string[] = [];
    if (fullAdditional.taxi > 0) parts.push(`+${fullAdditional.taxi}₽ такси`);
    if (fullAdditional.transfer > 0) parts.push(`+${fullAdditional.transfer}₽ пересадки`);
    if (fullAdditional.baggage > 0) parts.push(`+${fullAdditional.baggage}₽ багаж`);
    if (fullAdditional.fees > 0) parts.push(`+${fullAdditional.fees}₽ сборы`);

    if (parts.length > 0) {
      display = `${total}₽ (${parts.join(' ')})`;
    } else {
      display = `${total}₽`;
    }
  }

  return {
    base,
    additional: fullAdditional,
    total,
    currency: 'RUB',
    display,
  };
}

