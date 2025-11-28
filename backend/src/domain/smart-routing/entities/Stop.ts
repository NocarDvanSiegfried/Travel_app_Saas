import type { BaseEntity } from '../../entities/BaseEntity';
import { Coordinates } from '../value-objects/Coordinates';
import { HubLevel } from '../enums/HubLevel';

/**
 * Тип остановки
 */
export type StopType =
  | 'airport'
  | 'train_station'
  | 'bus_station'
  | 'ferry_pier'
  | 'winter_road_point'
  | 'taxi_stand';

/**
 * Остановка в умной мультимодальной системе
 * 
 * Расширенная версия остановки с поддержкой хабов и административной структуры
 * 
 * @example
 * ```typescript
 * const stop = new Stop({
 *   id: 'yakutsk-airport',
 *   name: 'Аэропорт Якутск (Туймаада)',
 *   type: 'airport',
 *   coordinates: new Coordinates(62.0933, 129.7706),
 *   cityId: 'yakutsk',
 *   isHub: true,
 *   hubLevel: HubLevel.REGIONAL,
 *   airportCode: 'YAK'
 * });
 * ```
 */
export interface IStop extends BaseEntity {
  /**
   * Уникальный идентификатор остановки
   */
  readonly id: string;

  /**
   * Название остановки
   */
  readonly name: string;

  /**
   * Тип остановки
   */
  readonly type: StopType;

  /**
   * Координаты остановки
   */
  readonly coordinates: Coordinates;

  /**
   * ID города, к которому относится остановка
   */
  readonly cityId: string;

  /**
   * Является ли остановка хабом
   */
  readonly isHub?: boolean;

  /**
   * Уровень хаба (если isHub = true)
   */
  readonly hubLevel?: HubLevel;

  /**
   * Код аэропорта (IATA/ICAO) для аэропортов
   */
  readonly airportCode?: string;

  /**
   * Код станции РЖД для вокзалов
   */
  readonly trainStationCode?: string;

  /**
   * Название пристани для паромных пристаней
   */
  readonly pierName?: string;

  /**
   * Метаданные остановки
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Класс остановки
 */
export class Stop implements IStop {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: StopType,
    public readonly coordinates: Coordinates,
    public readonly cityId: string,
    public readonly isHub: boolean = false,
    public readonly hubLevel?: HubLevel,
    public readonly airportCode?: string,
    public readonly trainStationCode?: string,
    public readonly pierName?: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    this.validate();
  }

  /**
   * Валидация остановки
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Stop: id is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Stop: name is required');
    }

    if (!this.cityId || this.cityId.trim().length === 0) {
      throw new Error('Stop: cityId is required');
    }

    if (this.isHub && !this.hubLevel) {
      throw new Error('Stop: hubLevel is required when isHub is true');
    }

    if (this.type === 'airport' && !this.airportCode) {
      // Предупреждение, но не ошибка
      console.warn(`Stop: airportCode is recommended for airport stops (${this.id})`);
    }

    if (this.type === 'train_station' && !this.trainStationCode) {
      // Предупреждение, но не ошибка
      console.warn(`Stop: trainStationCode is recommended for train stations (${this.id})`);
    }
  }

  /**
   * Вычисляет расстояние до другой остановки (в км)
   */
  public distanceTo(other: Stop): number {
    return this.coordinates.distanceTo(other.coordinates);
  }

  /**
   * Проверяет, является ли остановка аэропортом
   */
  public isAirport(): boolean {
    return this.type === 'airport';
  }

  /**
   * Проверяет, является ли остановка вокзалом
   */
  public isTrainStation(): boolean {
    return this.type === 'train_station';
  }

  /**
   * Проверяет, является ли остановка автовокзалом
   */
  public isBusStation(): boolean {
    return this.type === 'bus_station';
  }

  /**
   * Проверяет, является ли остановка пристанью
   */
  public isFerryPier(): boolean {
    return this.type === 'ferry_pier';
  }

  /**
   * Преобразует в объект для сериализации
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      coordinates: this.coordinates.toJSON(),
      cityId: this.cityId,
      isHub: this.isHub,
      hubLevel: this.hubLevel,
      airportCode: this.airportCode,
      trainStationCode: this.trainStationCode,
      pierName: this.pierName,
      metadata: this.metadata,
    };
  }
}






