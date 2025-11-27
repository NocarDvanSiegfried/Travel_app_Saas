import type { BaseEntity } from '../../entities/BaseEntity';
import type { City } from './City';
import type { SmartRouteSegment } from './SmartRouteSegment';
import type { DistanceModel } from '../value-objects/DistanceModel';
import type { PriceModel } from '../value-objects/PriceModel';
import type { VisualizationMetadata } from '../value-objects/VisualizationMetadata';

/**
 * Результат валидации маршрута
 */
export interface ValidationResult {
  /**
   * Валиден ли маршрут
   */
  isValid: boolean;

  /**
   * Список ошибок
   */
  errors: string[];

  /**
   * Список предупреждений
   */
  warnings: string[];
}

/**
 * Умный мультимодальный маршрут
 * 
 * Полный маршрут от одного города до другого с реалистичными путями,
 * валидацией, ценами, расстояниями и визуализацией
 * 
 * @example
 * ```typescript
 * const route = new SmartRoute({
 *   id: 'route-1',
 *   fromCity: city1,
 *   toCity: city2,
 *   segments: [segment1, segment2],
 *   totalDistance: distanceModel,
 *   totalDuration: { value: 255, unit: 'minutes', display: '4 часа 15 минут' },
 *   totalPrice: priceModel,
 *   validation: { isValid: true, errors: [], warnings: [] },
 *   visualization: visualizationMetadata
 * });
 * ```
 */
export interface ISmartRoute extends BaseEntity {
  /**
   * Уникальный идентификатор маршрута
   */
  readonly id: string;

  /**
   * Город отправления
   */
  readonly fromCity: City;

  /**
   * Город назначения
   */
  readonly toCity: City;

  /**
   * Сегменты маршрута (последовательность)
   */
  readonly segments: SmartRouteSegment[];

  /**
   * Общее расстояние
   */
  readonly totalDistance: DistanceModel;

  /**
   * Общая длительность
   */
  readonly totalDuration: {
    /**
     * Значение в минутах
     */
    value: number;

    /**
     * Единица измерения (всегда 'minutes')
     */
    unit: 'minutes';

    /**
     * Детализация
     */
    breakdown: {
      /**
       * Время в пути
       */
      travel: number;

      /**
       * Время на пересадки
       */
      transfers: number;
    };

    /**
     * Отображаемое значение
     * Пример: "4 часа 15 минут (3 часа в пути + 1 час 15 минут пересадки)"
     */
    display: string;
  };

  /**
   * Общая цена
   */
  readonly totalPrice: PriceModel;

  /**
   * Результат валидации
   */
  readonly validation: ValidationResult;

  /**
   * Метаданные визуализации
   */
  readonly visualization: VisualizationMetadata;
}

/**
 * Класс умного маршрута
 */
export class SmartRoute implements ISmartRoute {
  constructor(
    public readonly id: string,
    public readonly fromCity: City,
    public readonly toCity: City,
    public readonly segments: SmartRouteSegment[],
    public readonly totalDistance: DistanceModel,
    public readonly totalDuration: ISmartRoute['totalDuration'],
    public readonly totalPrice: PriceModel,
    public readonly validation: ValidationResult,
    public readonly visualization: VisualizationMetadata
  ) {
    this.validate();
  }

  /**
   * Валидация маршрута
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('SmartRoute: id is required');
    }

    if (this.segments.length === 0) {
      throw new Error('SmartRoute: segments array cannot be empty');
    }

    // Проверка связности сегментов
    // КРИТИЧЕСКИЙ ФИКС: Разрешаем пересадки между остановками в одном городе
    // Сегменты считаются соединенными, если они находятся в одном городе (cityId)
    for (let i = 0; i < this.segments.length - 1; i++) {
      const currentSegment = this.segments[i];
      const nextSegment = this.segments[i + 1];

      // Проверяем, что сегменты находятся в одном городе (пересадка)
      const currentSegmentEndCityId = currentSegment.to.cityId;
      const nextSegmentStartCityId = nextSegment.from.cityId;

      if (currentSegmentEndCityId !== nextSegmentStartCityId) {
        throw new Error(
          `SmartRoute: segments are not connected. Segment ${i} ends in city ${currentSegmentEndCityId} (stop ${currentSegment.to.id}), but segment ${i + 1} starts in city ${nextSegmentStartCityId} (stop ${nextSegment.from.id})`
        );
      }

      // Если остановки не совпадают, но города совпадают - это валидная пересадка
      // (например, с аэропорта на автовокзал в том же городе)
      if (currentSegment.to.id !== nextSegment.from.id) {
        console.log(
          `[SmartRoute] Transfer detected: Segment ${i} ends at ${currentSegment.to.id} (${currentSegment.to.type}) in ${currentSegmentEndCityId}, segment ${i + 1} starts at ${nextSegment.from.id} (${nextSegment.from.type}) in ${nextSegmentStartCityId}`
        );
      }
    }

    // Проверка: первый сегмент должен начинаться в fromCity
    const firstSegment = this.segments[0];
    if (firstSegment.from.cityId !== this.fromCity.id) {
      throw new Error(
        `SmartRoute: first segment must start in fromCity. Expected ${this.fromCity.id}, got ${firstSegment.from.cityId}`
      );
    }

    // Проверка: последний сегмент должен заканчиваться в toCity
    const lastSegment = this.segments[this.segments.length - 1];
    if (lastSegment.to.cityId !== this.toCity.id) {
      throw new Error(
        `SmartRoute: last segment must end in toCity. Expected ${this.toCity.id}, got ${lastSegment.to.cityId}`
      );
    }
  }

  /**
   * Получает количество пересадок
   */
  public getTransferCount(): number {
    return Math.max(0, this.segments.length - 1);
  }

  /**
   * Получает все типы транспорта, используемые в маршруте
   */
  public getTransportTypes(): Set<string> {
    return new Set(this.segments.map((segment) => segment.type));
  }

  /**
   * Проверяет, является ли маршрут прямым (один сегмент)
   */
  public isDirect(): boolean {
    return this.segments.length === 1 && this.segments[0].isDirect;
  }

  /**
   * Получает все остановки маршрута в порядке следования
   */
  public getAllStopsInOrder(): Array<{ stop: import('./Stop').IStop; segmentIndex: number }> {
    const stops: Array<{ stop: import('./Stop').IStop; segmentIndex: number }> = [];

    this.segments.forEach((segment, segmentIndex) => {
      // Добавляем остановку отправления (кроме первого сегмента, чтобы избежать дубликатов)
      if (segmentIndex === 0) {
        stops.push({ stop: segment.from, segmentIndex });
      }

      // Добавляем промежуточные остановки
      if (segment.intermediateStops) {
        segment.intermediateStops.forEach((stop) => {
          stops.push({ stop, segmentIndex });
        });
      }

      // Добавляем остановку назначения
      stops.push({ stop: segment.to, segmentIndex });
    });

    return stops;
  }

  /**
   * Получает общее время в пути (без учёта пересадок)
   */
  public getTravelTime(): number {
    return this.segments.reduce((sum, segment) => sum + segment.duration.value, 0);
  }

  /**
   * Получает общее время на пересадки (оценочно)
   */
  public getTransferTime(): number {
    // Оценочное время пересадки: 30 минут на каждую пересадку
    const transferTimePerTransfer = 30;
    return this.getTransferCount() * transferTimePerTransfer;
  }

  /**
   * Преобразует в объект для сериализации
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      fromCity: this.fromCity.toJSON(),
      toCity: this.toCity.toJSON(),
      segments: this.segments.map((segment) => segment.toJSON()),
      totalDistance: this.totalDistance,
      totalDuration: this.totalDuration,
      totalPrice: this.totalPrice,
      validation: this.validation,
      visualization: this.visualization,
    };
  }
}

/**
 * Создаёт отображаемое значение общей длительности
 */
export function formatTotalDuration(
  travelMinutes: number,
  transferMinutes: number
): string {
  const totalMinutes = travelMinutes + transferMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const travelHours = Math.floor(travelMinutes / 60);
  const travelMins = travelMinutes % 60;
  const transferHours = Math.floor(transferMinutes / 60);
  const transferMins = transferMinutes % 60;

  const parts: string[] = [];

  if (hours > 0 || mins > 0) {
    if (hours === 0) {
      parts.push(`${mins} минут`);
    } else if (mins === 0) {
      parts.push(`${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`);
    } else {
      parts.push(
        `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} ${mins} ${mins === 1 ? 'минута' : mins < 5 ? 'минуты' : 'минут'}`
      );
    }
  }

  const breakdownParts: string[] = [];

  if (travelMinutes > 0) {
    if (travelHours === 0) {
      breakdownParts.push(`${travelMins} минут в пути`);
    } else if (travelMins === 0) {
      breakdownParts.push(
        `${travelHours} ${travelHours === 1 ? 'час' : travelHours < 5 ? 'часа' : 'часов'} в пути`
      );
    } else {
      breakdownParts.push(
        `${travelHours} ${travelHours === 1 ? 'час' : travelHours < 5 ? 'часа' : 'часов'} ${travelMins} ${travelMins === 1 ? 'минута' : travelMins < 5 ? 'минуты' : 'минут'} в пути`
      );
    }
  }

  if (transferMinutes > 0) {
    if (transferHours === 0) {
      breakdownParts.push(`${transferMins} минут пересадки`);
    } else if (transferMins === 0) {
      breakdownParts.push(
        `${transferHours} ${transferHours === 1 ? 'час' : transferHours < 5 ? 'часа' : 'часов'} пересадки`
      );
    } else {
      breakdownParts.push(
        `${transferHours} ${transferHours === 1 ? 'час' : transferHours < 5 ? 'часа' : 'часов'} ${transferMins} ${transferMins === 1 ? 'минута' : transferMins < 5 ? 'минуты' : 'минут'} пересадки`
      );
    }
  }

  if (breakdownParts.length > 0) {
    return `${parts.join(' ')} (${breakdownParts.join(' + ')})`;
  }

  return parts.join(' ') || '0 минут';
}




