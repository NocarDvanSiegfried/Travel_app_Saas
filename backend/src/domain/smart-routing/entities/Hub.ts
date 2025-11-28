import type { BaseEntity } from '../../entities/BaseEntity';
import { Coordinates } from '../value-objects/Coordinates';
import { HubLevel } from '../enums/HubLevel';

/**
 * Частота рейсов
 */
export type HubFrequency = 'daily' | 'weekly' | 'seasonal';

/**
 * Транспортный хаб
 * 
 * Узел транспортной сети для построения маршрутов через хабы
 * 
 * @example
 * ```typescript
 * const hub = new Hub({
 *   id: 'yakutsk-hub',
 *   name: 'Якутск',
 *   level: HubLevel.REGIONAL,
 *   airportCode: 'YAK',
 *   coordinates: new Coordinates(62.0278, 129.7042),
 *   connections: {
 *     federal: ['moscow-hub', 'novosibirsk-hub'],
 *     regional: ['mirny-hub', 'neryungri-hub'],
 *     local: ['srednekolymsk-airport', 'chokurdakh-airport']
 *   },
 *   schedule: {
 *     frequency: 'daily',
 *     days: [1, 2, 3, 4, 5, 6, 7]
 *   }
 * });
 * ```
 */
export interface IHub extends BaseEntity {
  /**
   * Уникальный идентификатор хаба
   */
  readonly id: string;

  /**
   * Название хаба
   */
  readonly name: string;

  /**
   * Уровень хаба
   */
  readonly level: HubLevel;

  /**
   * Код аэропорта (IATA/ICAO)
   */
  readonly airportCode?: string;

  /**
   * Координаты хаба
   */
  readonly coordinates: Coordinates;

  /**
   * Связи с другими хабами и аэропортами
   */
  readonly connections: {
    /**
     * Связи с федеральными хабами
     */
    federal: string[];

    /**
     * Связи с региональными хабами
     */
    regional: string[];

    /**
     * Связи с локальными аэропортами
     */
    local: string[];
  };

  /**
   * Расписание рейсов
   */
  readonly schedule: {
    /**
     * Частота рейсов
     */
    frequency: HubFrequency;

    /**
     * Дни недели (1-7, где 1 = понедельник)
     */
    days?: number[];

    /**
     * Сезон (для seasonal frequency)
     */
    season?: {
      /**
       * Дата начала сезона (ISO 8601)
       */
      start: string;

      /**
       * Дата окончания сезона (ISO 8601)
       */
      end: string;
    };
  };
}

/**
 * Класс хаба
 */
export class Hub implements IHub {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly level: HubLevel,
    public readonly coordinates: Coordinates,
    public readonly connections: IHub['connections'],
    public readonly schedule: IHub['schedule'],
    public readonly airportCode?: string
  ) {
    this.validate();
  }

  /**
   * Валидация хаба
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Hub: id is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Hub: name is required');
    }

    if (this.schedule.frequency === 'seasonal' && !this.schedule.season) {
      throw new Error('Hub: season is required when frequency is seasonal');
    }

    if (this.schedule.days) {
      const invalidDays = this.schedule.days.filter((day) => day < 1 || day > 7);
      if (invalidDays.length > 0) {
        throw new Error(`Hub: invalid days ${invalidDays.join(', ')}. Days must be between 1 and 7.`);
      }
    }
  }

  /**
   * Проверяет, является ли хаб федеральным
   */
  public isFederal(): boolean {
    return this.level === HubLevel.FEDERAL;
  }

  /**
   * Проверяет, является ли хаб региональным
   */
  public isRegional(): boolean {
    return this.level === HubLevel.REGIONAL;
  }

  /**
   * Проверяет доступность хаба в указанную дату
   */
  public isAvailableOnDate(date: Date): boolean {
    if (this.schedule.frequency === 'daily') {
      return true;
    }

    if (this.schedule.frequency === 'weekly' && this.schedule.days) {
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Преобразуем воскресенье в 7
      return this.schedule.days.includes(dayOfWeek);
    }

    if (this.schedule.frequency === 'seasonal' && this.schedule.season) {
      const start = new Date(this.schedule.season.start);
      const end = new Date(this.schedule.season.end);
      return date >= start && date <= end;
    }

    return false;
  }

  /**
   * Получает все связи хаба (объединённый список)
   */
  public getAllConnections(): string[] {
    return [
      ...this.connections.federal,
      ...this.connections.regional,
      ...this.connections.local,
    ];
  }

  /**
   * Проверяет наличие связи с другим хабом/аэропортом
   */
  public hasConnection(hubId: string): boolean {
    return this.getAllConnections().includes(hubId);
  }

  /**
   * Преобразует в объект для сериализации
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      airportCode: this.airportCode,
      coordinates: this.coordinates.toJSON(),
      connections: this.connections,
      schedule: this.schedule,
    };
  }
}






