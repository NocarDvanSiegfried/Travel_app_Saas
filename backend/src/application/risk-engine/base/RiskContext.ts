/**
 * Контекст оценки риска
 * 
 * Содержит информацию, необходимую для оценки риска маршрута или сегмента.
 */

import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';

/**
 * Контекст оценки риска
 */
export class RiskContext implements IRiskDataContext {
  /**
   * Приватные поля для хранения основных свойств
   */
  private readonly _date: string;
  private readonly _passengers?: number;
  
  /**
   * Дополнительные параметры контекста
   */
  private readonly additionalParams: Map<string, unknown>;
  
  /**
   * Индексная сигнатура для соответствия IRiskDataContext
   * Обеспечивает доступ к параметрам через индекс
   */
  [key: string]: unknown;
  
  /**
   * Создать контекст оценки риска
   * 
   * @param date - Дата поездки
   * @param passengers - Количество пассажиров
   * @param additionalParams - Дополнительные параметры
   */
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
  
  /**
   * Дата поездки
   */
  get date(): string {
    return this._date;
  }
  
  /**
   * Количество пассажиров
   */
  get passengers(): number | undefined {
    return this._passengers;
  }
  
  /**
   * Получить значение параметра
   * 
   * @param key - Ключ параметра
   * @returns Значение параметра или undefined
   */
  getParam(key: string): unknown {
    return this.additionalParams.get(key);
  }
  
  /**
   * Установить значение параметра
   * 
   * @param key - Ключ параметра
   * @param value - Значение параметра
   */
  setParam(key: string, value: unknown): void {
    this.additionalParams.set(key, value);
  }
  
  /**
   * Проверить наличие параметра
   * 
   * @param key - Ключ параметра
   * @returns true, если параметр существует
   */
  hasParam(key: string): boolean {
    return this.additionalParams.has(key);
  }
  
  /**
   * Получить все параметры как объект
   * 
   * @returns Объект с параметрами
   */
  getParams(): Record<string, unknown> {
    return Object.fromEntries(this.additionalParams);
  }
}

