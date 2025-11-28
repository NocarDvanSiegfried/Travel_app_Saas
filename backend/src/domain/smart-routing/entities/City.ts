import type { BaseEntity } from '../../entities/BaseEntity';
import { Coordinates } from '../value-objects/Coordinates';
import { HubLevel } from '../enums/HubLevel';
import type { AdministrativeStructure } from './AdministrativeStructure';
import type { IStop } from './Stop';

/**
 * Класс аэропорта
 */
export type AirportClass = 'A' | 'B' | 'C' | 'D';

/**
 * Город в умной мультимодальной системе
 * 
 * Расширенная версия города с административной структурой и инфраструктурой
 * 
 * @example
 * ```typescript
 * const city = new City({
 *   id: 'yakutsk',
 *   name: 'Якутск',
 *   normalizedName: 'якутск',
 *   administrative: adminStructure,
 *   coordinates: new Coordinates(62.0278, 129.7042),
 *   timezone: 'Asia/Yakutsk',
 *   isKeyCity: true,
 *   isHub: true,
 *   hubLevel: HubLevel.REGIONAL,
 *   infrastructure: {
 *     hasAirport: true,
 *     airportClass: 'B',
 *     hasTrainStation: false,
 *     hasBusStation: true,
 *     hasFerryPier: true,
 *     hasWinterRoad: true
 *   },
 *   stops: [stop1, stop2],
 *   synonyms: ['Дьокуускай']
 * });
 * ```
 */
export interface ICity extends BaseEntity {
  /**
   * Уникальный идентификатор города
   */
  readonly id: string;

  /**
   * Название города
   */
  readonly name: string;

  /**
   * Нормализованное название (для поиска)
   */
  readonly normalizedName: string;

  /**
   * Административная структура
   */
  readonly administrative: AdministrativeStructure;

  /**
   * Координаты города
   */
  readonly coordinates: Coordinates;

  /**
   * Часовой пояс
   */
  readonly timezone: string;

  /**
   * Население (опционально)
   */
  readonly population?: number;

  /**
   * Является ли город ключевым городом Якутии
   */
  readonly isKeyCity: boolean;

  /**
   * Является ли город хабом
   */
  readonly isHub: boolean;

  /**
   * Уровень хаба (если isHub = true)
   */
  readonly hubLevel?: HubLevel;

  /**
   * Транспортная инфраструктура
   */
  readonly infrastructure: {
    /**
     * Есть ли аэропорт
     */
    hasAirport: boolean;

    /**
     * Класс аэропорта (если hasAirport = true)
     */
    airportClass?: AirportClass;

    /**
     * Есть ли ЖД-станция
     */
    hasTrainStation: boolean;

    /**
     * Есть ли автовокзал
     */
    hasBusStation: boolean;

    /**
     * Есть ли паромная пристань
     */
    hasFerryPier: boolean;

    /**
     * Есть ли зимник
     */
    hasWinterRoad: boolean;
  };

  /**
   * Список остановок в городе
   */
  readonly stops: IStop[];

  /**
   * Синонимы для поиска
   */
  readonly synonyms: string[];
}

/**
 * Класс города
 */
export class City implements ICity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly normalizedName: string,
    public readonly administrative: AdministrativeStructure,
    public readonly coordinates: Coordinates,
    public readonly timezone: string,
    public readonly isKeyCity: boolean,
    public readonly isHub: boolean,
    public readonly hubLevel: HubLevel | undefined,
    public readonly infrastructure: ICity['infrastructure'],
    public readonly stops: IStop[],
    public readonly synonyms: string[],
    public readonly population?: number
  ) {
    this.validate();
  }

  /**
   * Валидация города
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('City: id is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('City: name is required');
    }

    if (!this.normalizedName || this.normalizedName.trim().length === 0) {
      throw new Error('City: normalizedName is required');
    }

    if (!this.timezone || this.timezone.trim().length === 0) {
      throw new Error('City: timezone is required');
    }

    if (this.isHub && !this.hubLevel) {
      throw new Error('City: hubLevel is required when isHub is true');
    }

    if (this.infrastructure.hasAirport && !this.infrastructure.airportClass) {
      throw new Error('City: airportClass is required when hasAirport is true');
    }
  }

  /**
   * Получает полное название города с административной структурой
   */
  public getFullName(): string {
    return this.administrative.formats.full;
  }

  /**
   * Получает название с контекстом
   */
  public getNameWithContext(): string {
    return this.administrative.formats.withContext;
  }

  /**
   * Проверяет, является ли город федеральным хабом
   */
  public isFederalHub(): boolean {
    return this.isHub && this.hubLevel === HubLevel.FEDERAL;
  }

  /**
   * Проверяет, является ли город региональным хабом
   */
  public isRegionalHub(): boolean {
    return this.isHub && this.hubLevel === HubLevel.REGIONAL;
  }

  /**
   * Получает остановки определённого типа
   */
  public getStopsByType(type: IStop['type']): IStop[] {
    return this.stops.filter((stop) => stop.type === type);
  }

  /**
   * Получает аэропорты города
   */
  public getAirports(): IStop[] {
    return this.getStopsByType('airport');
  }

  /**
   * Получает вокзалы города
   */
  public getTrainStations(): IStop[] {
    return this.getStopsByType('train_station');
  }

  /**
   * Получает автовокзалы города
   */
  public getBusStations(): IStop[] {
    return this.getStopsByType('bus_station');
  }

  /**
   * Получает пристани города
   */
  public getFerryPiers(): IStop[] {
    return this.getStopsByType('ferry_pier');
  }

  /**
   * Вычисляет расстояние до другого города (в км)
   */
  public distanceTo(other: City): number {
    return this.coordinates.distanceTo(other.coordinates);
  }

  /**
   * Преобразует в объект для сериализации
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      normalizedName: this.normalizedName,
      administrative: this.administrative,
      coordinates: this.coordinates.toJSON(),
      timezone: this.timezone,
      population: this.population,
      isKeyCity: this.isKeyCity,
      isHub: this.isHub,
      hubLevel: this.hubLevel,
      infrastructure: this.infrastructure,
      stops: this.stops.map((stop) => stop.toJSON()),
      synonyms: this.synonyms,
    };
  }
}





