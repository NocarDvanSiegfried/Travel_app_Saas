import type { BaseEntity } from '../../entities/BaseEntity';
import { TransportType } from '../../entities/RouteSegment';
import type { IStop } from './Stop';
import type { Hub } from './Hub';
import type { DistanceModel } from '../value-objects/DistanceModel';
import type { PriceModel } from '../value-objects/PriceModel';
import type { Seasonality } from '../value-objects/Seasonality';

/**
 * Метаданные сегмента маршрута
 */
export interface SegmentMetadata {
  /**
   * Номер маршрута/рейса
   */
  routeNumber?: string;

  /**
   * Перевозчик
   */
  carrier?: string;

  /**
   * Расписание
   */
  schedule?: string;

  /**
   * Дополнительные метаданные
   */
  [key: string]: unknown;
}

/**
 * Сегмент умного мультимодального маршрута
 * 
 * Представляет часть пути между двумя остановками с реалистичным путём
 * (не прямая линия, а путь по дорогам/рекам/ЖД/через хабы)
 * 
 * @example
 * ```typescript
 * const segment = new SmartRouteSegment({
 *   id: 'seg-1',
 *   type: TransportType.AIRPLANE,
 *   from: stop1,
 *   to: stop2,
 *   distance: distanceModel,
 *   duration: { value: 390, unit: 'minutes', display: '6 часов 30 минут' },
 *   price: priceModel,
 *   seasonality: seasonalityModel,
 *   pathGeometry: {
 *     type: 'LineString',
 *     coordinates: [[129.7042, 62.0278], [37.6173, 55.7558]]
 *   },
 *   viaHubs: [hub1],
 *   isDirect: false
 * });
 * ```
 */
export interface ISmartRouteSegment extends BaseEntity {
  /**
   * Уникальный идентификатор сегмента
   */
  readonly id: string;

  /**
   * Тип транспорта
   */
  readonly type: TransportType;

  /**
   * Остановка отправления
   */
  readonly from: IStop;

  /**
   * Остановка назначения
   */
  readonly to: IStop;

  /**
   * Промежуточные остановки (опционально)
   */
  readonly intermediateStops?: IStop[];

  /**
   * Модель расстояния
   */
  readonly distance: DistanceModel;

  /**
   * Длительность в пути
   */
  readonly duration: {
    /**
     * Значение в минутах
     */
    value: number;

    /**
     * Единица измерения (всегда 'minutes')
     */
    unit: 'minutes';

    /**
     * Отображаемое значение
     * Пример: "6 часов 30 минут"
     */
    display: string;
  };

  /**
   * Модель цены
   */
  readonly price: PriceModel;

  /**
   * Сезонность доступности
   */
  readonly seasonality: Seasonality;

  /**
   * Геометрия пути для визуализации
   */
  readonly pathGeometry: {
    /**
     * Тип геометрии (всегда 'LineString')
     */
    type: 'LineString';

    /**
     * Координаты пути [longitude, latitude]
     * Для авиа - ломаная линия через хабы
     * Для автобусов - путь по дорогам
     * Для паромов - путь по рекам
     * Для ЖД - путь по железным дорогам
     */
    coordinates: [number, number][];
  };

  /**
   * Хабы, через которые проходит маршрут (для авиа)
   */
  readonly viaHubs?: Hub[];

  /**
   * Является ли сегмент прямым (без промежуточных остановок/хабов)
   */
  readonly isDirect: boolean;

  /**
   * Метаданные сегмента
   */
  readonly metadata?: SegmentMetadata;
}

/**
 * Класс сегмента умного маршрута
 */
export class SmartRouteSegment implements ISmartRouteSegment {
  constructor(
    public readonly id: string,
    public readonly type: TransportType,
    public readonly from: IStop,
    public readonly to: IStop,
    public readonly distance: DistanceModel,
    public readonly duration: ISmartRouteSegment['duration'],
    public readonly price: PriceModel,
    public readonly seasonality: Seasonality,
    public readonly pathGeometry: ISmartRouteSegment['pathGeometry'],
    public readonly isDirect: boolean,
    public readonly intermediateStops?: IStop[],
    public readonly viaHubs?: Hub[],
    public readonly metadata?: SegmentMetadata
  ) {
    this.validate();
  }

  /**
   * Валидация сегмента
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('SmartRouteSegment: id is required');
    }

    if (this.from.id === this.to.id) {
      throw new Error('SmartRouteSegment: from and to stops must be different');
    }

    if (this.distance.value <= 0) {
      throw new Error('SmartRouteSegment: distance must be greater than 0');
    }

    if (this.duration.value <= 0) {
      throw new Error('SmartRouteSegment: duration must be greater than 0');
    }

    if (this.price.total <= 0) {
      throw new Error('SmartRouteSegment: price must be greater than 0');
    }

    if (this.pathGeometry.coordinates.length < 2) {
      throw new Error('SmartRouteSegment: pathGeometry must have at least 2 coordinates');
    }

    // Проверка: для авиа с viaHubs путь должен быть ломаной линией
    if (this.type === TransportType.AIRPLANE && this.viaHubs && this.viaHubs.length > 0) {
      // Минимум 3 точки: from -> hub -> to
      if (this.pathGeometry.coordinates.length < 3) {
        throw new Error(
          'SmartRouteSegment: for airplane with hubs, pathGeometry must have at least 3 coordinates'
        );
      }
    }

    // Проверка: для прямых рейсов не должно быть промежуточных остановок
    if (this.isDirect && this.intermediateStops && this.intermediateStops.length > 0) {
      throw new Error('SmartRouteSegment: direct segment cannot have intermediate stops');
    }
  }

  /**
   * Проверяет доступность сегмента в указанную дату
   */
  public isAvailableOnDate(date: Date): boolean {
    return this.seasonality.available;
  }

  /**
   * Получает общее количество остановок (from + to + промежуточные)
   */
  public getTotalStopsCount(): number {
    return 2 + (this.intermediateStops?.length || 0);
  }

  /**
   * Получает все остановки сегмента в порядке следования
   */
  public getAllStopsInOrder(): IStop[] {
    const stops: IStop[] = [this.from];
    if (this.intermediateStops) {
      stops.push(...this.intermediateStops);
    }
    stops.push(this.to);
    return stops;
  }

  /**
   * Преобразует в объект для сериализации
   */
  public toJSON(): Record<string, unknown> {
    // КРИТИЧЕСКИЙ ФИКС: Убеждаемся, что type всегда сериализуется как строка
    const typeValue = this.type !== undefined && this.type !== null 
      ? (typeof this.type === 'string' ? this.type : String(this.type))
      : 'unknown';
    
    // КРИТИЧЕСКИЙ ФИКС: Безопасная сериализация from и to
    // Если они отсутствуют, возвращаем null вместо ошибки
    if (!this.from || !this.to) {
      console.error('[SmartRouteSegment.toJSON] Missing from or to:', {
        id: this.id,
        hasFrom: !!this.from,
        hasTo: !!this.to,
        type: typeValue,
      });
    }
    
    return {
      id: this.id,
      type: typeValue,
      from: this.from?.toJSON() || null,
      to: this.to?.toJSON() || null,
      intermediateStops: this.intermediateStops?.map((stop) => stop.toJSON()),
      distance: this.distance,
      duration: this.duration,
      price: this.price,
      seasonality: this.seasonality,
      pathGeometry: this.pathGeometry,
      viaHubs: this.viaHubs?.map((hub) => hub.toJSON()),
      isDirect: this.isDirect,
      metadata: this.metadata,
    };
  }
}

/**
 * Создаёт отображаемое значение длительности
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} минут`;
  }

  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  }

  return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} ${mins} ${mins === 1 ? 'минута' : mins < 5 ? 'минуты' : 'минут'}`;
}




