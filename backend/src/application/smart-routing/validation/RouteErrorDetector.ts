/**
 * Детектор ошибок маршрутов
 * 
 * Обнаруживает:
 * - Маршруты через пустое пространство (не по дорогам/рекам/ЖД)
 * - Некорректные соединения между сегментами
 * - Нереалистичные маршруты
 * - Несуществующие сегменты
 * 
 * @module application/smart-routing/validation
 */

import type { SmartRoute } from '../../../domain/smart-routing/entities/SmartRoute';
import type { SmartRouteSegment } from '../../../domain/smart-routing/entities/SmartRouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';

/**
 * Результат детекции ошибок
 */
export interface RouteErrorDetectionResult {
  /**
   * Есть ли критические ошибки
   */
  hasCriticalErrors: boolean;

  /**
   * Список обнаруженных ошибок
   */
  errors: Array<{
    /**
     * Тип ошибки
     */
    type: 'empty_space' | 'incorrect_connection' | 'unrealistic_route' | 'non_existent_segment' | 'invalid_city_format';
    
    /**
     * Сегмент, в котором обнаружена ошибка (если применимо)
     */
    segmentId?: string;
    
    /**
     * Описание ошибки
     */
    message: string;
    
    /**
     * Дополнительные данные
     */
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Список предупреждений
   */
  warnings: Array<{
    /**
     * Тип предупреждения
     */
    type: 'simplified_path' | 'long_distance' | 'unusual_route';
    
    /**
     * Сегмент, в котором обнаружено предупреждение (если применимо)
     */
    segmentId?: string;
    
    /**
     * Описание предупреждения
     */
    message: string;
  }>;
}

/**
 * Детектор ошибок маршрутов
 */
export class RouteErrorDetector {
  /**
   * Минимальное количество точек для реалистичного пути (не прямая линия)
   */
  private readonly MIN_PATH_POINTS = 3;

  /**
   * Максимальное отклонение пути от прямой линии для автобусов/паромов/ЖД (%)
   * Если путь слишком близок к прямой линии - это ошибка
   */
  private readonly MAX_STRAIGHT_LINE_DEVIATION = 5;

  /**
   * Минимальное расстояние между точками пути для проверки реалистичности (км)
   */
  private readonly MIN_POINT_DISTANCE_KM = 10;

  /**
   * Обнаруживает ошибки в маршруте
   */
  public detectErrors(route: SmartRoute): RouteErrorDetectionResult {
    const errors: RouteErrorDetectionResult['errors'] = [];
    const warnings: RouteErrorDetectionResult['warnings'] = [];

    // Проверка каждого сегмента
    for (const segment of route.segments) {
      // Проверка маршрутов через пустое пространство
      const emptySpaceCheck = this.checkEmptySpaceRoute(segment);
      if (emptySpaceCheck.error) {
        errors.push({
          type: 'empty_space',
          segmentId: segment.id,
          message: emptySpaceCheck.error,
          metadata: {
            ...emptySpaceCheck.metadata,
            transportType: segment.type,
            fromCity: segment.from.cityId,
            toCity: segment.to.cityId,
          },
        });
      }
      if (emptySpaceCheck.warning) {
        warnings.push({
          type: 'simplified_path',
          segmentId: segment.id,
          message: emptySpaceCheck.warning,
        });
      }

      // Проверка реалистичности маршрута
      const realismCheck = this.checkRouteRealism(segment);
      if (realismCheck.error) {
        errors.push({
          type: 'unrealistic_route',
          segmentId: segment.id,
          message: realismCheck.error,
          metadata: {
            ...realismCheck.metadata,
            transportType: segment.type,
            distance: segment.distance.value,
            duration: segment.duration.value,
          },
        });
      }
      if (realismCheck.warning) {
        warnings.push({
          type: 'unusual_route',
          segmentId: segment.id,
          message: realismCheck.warning,
        });
      }
    }

    // Проверка некорректных соединений
    const connectionCheck = this.checkIncorrectConnections(route);
    if (connectionCheck.error) {
      errors.push({
        type: 'incorrect_connection',
        message: connectionCheck.error,
        metadata: connectionCheck.metadata,
      });
    }

    // Проверка форматов городов
    const cityFormatCheck = this.checkCityFormats(route);
    if (cityFormatCheck.error) {
      errors.push({
        type: 'invalid_city_format',
        message: cityFormatCheck.error,
        metadata: cityFormatCheck.metadata,
      });
    }

    return {
      hasCriticalErrors: errors.length > 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет, не проходит ли маршрут через пустое пространство
   */
  private checkEmptySpaceRoute(
    segment: SmartRouteSegment
  ): { error?: string; warning?: string; metadata?: Record<string, unknown> } {
    // Для авиа прямые линии разрешены (но только между крупными хабами)
    if (segment.type === TransportType.AIRPLANE) {
      // Проверяем, что если это прямой рейс, то он между крупными городами
      if (segment.isDirect) {
        const distance = segment.distance.value;
        const fromIsHub = segment.from.isHub;
        const toIsHub = segment.to.isHub;

        // Прямые рейсы между малыми аэропортами на большие расстояния - ошибка
        if (!fromIsHub && !toIsHub && distance > 500) {
          return {
            error: `Прямой авиарейс между малыми аэропортами на расстояние ${distance.toFixed(0)} км невозможен. Требуется маршрут через хаб.`,
            metadata: {
              distance,
              fromIsHub,
              toIsHub,
            },
          };
        }
      }

      // Для авиа через хабы - путь должен быть ломаной линией
      if (segment.viaHubs && segment.viaHubs.length > 0) {
        const pathGeometry = segment.pathGeometry;
        if (pathGeometry && pathGeometry.coordinates.length < 3) {
          return {
            error: `Авиамаршрут через хабы должен быть ломаной линией (минимум 3 точки), но получено ${pathGeometry.coordinates.length} точек`,
            metadata: {
              viaHubsCount: segment.viaHubs.length,
              pathPointsCount: pathGeometry.coordinates.length,
            },
          };
        }
      }

      return {}; // Для авиа нет ошибок, если путь корректен
    }

    // Для автобусов, паромов, ЖД и зимников - путь НЕ должен быть прямой линией
    const shouldNotBeStraight = [
      TransportType.BUS,
      TransportType.FERRY,
      TransportType.TRAIN,
      TransportType.WINTER_ROAD,
    ].includes(segment.type);

    if (shouldNotBeStraight) {
      const pathGeometry = segment.pathGeometry;
      
      // Если путь содержит только 2 точки (начало и конец) - это прямая линия
      if (!pathGeometry || pathGeometry.coordinates.length <= 2) {
        return {
          error: `Маршрут ${segment.type} не должен быть прямой линией. Требуется путь по ${this.getPathTypeForTransport(segment.type)}.`,
          metadata: {
            transportType: segment.type,
            pathPointsCount: pathGeometry?.coordinates.length || 0,
          },
        };
      }

      // Проверяем, что путь не слишком близок к прямой линии
      const straightLineCheck = this.checkStraightLineDeviation(pathGeometry.coordinates);
      if (straightLineCheck.isTooStraight) {
        return {
          error: `Маршрут ${segment.type} слишком близок к прямой линии (отклонение ${straightLineCheck.deviation.toFixed(1)}%). Требуется путь по ${this.getPathTypeForTransport(segment.type)}.`,
          metadata: {
            transportType: segment.type,
            deviation: straightLineCheck.deviation,
            pathPointsCount: pathGeometry.coordinates.length,
          },
        };
      }

      // Проверяем, что точки пути не слишком далеко друг от друга (признак упрощённого пути)
      const pointDistanceCheck = this.checkPointDistances(pathGeometry.coordinates);
      if (pointDistanceCheck.hasLargeGaps) {
        return {
          warning: `Маршрут ${segment.type} содержит большие промежутки между точками (до ${pointDistanceCheck.maxGap.toFixed(0)} км). Путь может быть упрощённым.`,
        };
      }
    }

    return {};
  }

  /**
   * Проверяет отклонение пути от прямой линии
   */
  private checkStraightLineDeviation(
    coordinates: [number, number][]
  ): { isTooStraight: boolean; deviation: number } {
    if (coordinates.length < 3) {
      return { isTooStraight: true, deviation: 0 };
    }

    const start = new Coordinates(coordinates[0][1], coordinates[0][0]); // [lng, lat] -> Coordinates(lat, lng)
    const end = new Coordinates(
      coordinates[coordinates.length - 1][1],
      coordinates[coordinates.length - 1][0]
    );

    // Расстояние по прямой
    const straightDistance = start.distanceTo(end);

    // Расстояние по пути (сумма расстояний между точками)
    let pathDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const point1 = new Coordinates(coordinates[i][1], coordinates[i][0]);
      const point2 = new Coordinates(coordinates[i + 1][1], coordinates[i + 1][0]);
      pathDistance += point1.distanceTo(point2);
    }

    // Отклонение в процентах
    const deviation = straightDistance > 0 
      ? ((pathDistance - straightDistance) / straightDistance) * 100 
      : 0;

    return {
      isTooStraight: deviation < this.MAX_STRAIGHT_LINE_DEVIATION,
      deviation,
    };
  }

  /**
   * Проверяет расстояния между точками пути
   */
  private checkPointDistances(
    coordinates: [number, number][]
  ): { hasLargeGaps: boolean; maxGap: number } {
    let maxGap = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const point1 = new Coordinates(coordinates[i][1], coordinates[i][0]);
      const point2 = new Coordinates(coordinates[i + 1][1], coordinates[i + 1][0]);
      const distance = point1.distanceTo(point2);
      maxGap = Math.max(maxGap, distance);
    }

    return {
      hasLargeGaps: maxGap > this.MIN_POINT_DISTANCE_KM * 5, // Если есть промежутки > 50 км
      maxGap,
    };
  }

  /**
   * Получает тип пути для транспорта
   */
  private getPathTypeForTransport(transportType: TransportType): string {
    const mapping: Record<TransportType, string> = {
      [TransportType.BUS]: 'дорогам',
      [TransportType.FERRY]: 'рекам',
      [TransportType.TRAIN]: 'железным дорогам',
      [TransportType.WINTER_ROAD]: 'зимним дорогам',
      [TransportType.AIRPLANE]: 'воздушным путям',
      [TransportType.TAXI]: 'дорогам',
      [TransportType.UNKNOWN]: 'дорогам',
    };

    return mapping[transportType] || 'дорогам';
  }

  /**
   * Проверяет реалистичность маршрута
   */
  private checkRouteRealism(
    segment: SmartRouteSegment
  ): { error?: string; warning?: string; metadata?: Record<string, unknown> } {
    const distance = segment.distance.value;
    const duration = segment.duration.value;

    // Проверка для автобусов
    if (segment.type === TransportType.BUS) {
      // Автобусы не должны ехать > 1500 км
      if (distance > 1500) {
        return {
          error: `Автобусный маршрут на расстояние ${distance.toFixed(0)} км нереалистичен (максимум 1500 км)`,
          metadata: { distance, maxDistance: 1500 },
        };
      }

      // Автобусы не должны ехать > 24 часов
      const durationHours = duration / 60;
      if (durationHours > 24) {
        return {
          error: `Автобусный маршрут длительностью ${durationHours.toFixed(1)} часов нереалистичен (максимум 24 часа)`,
          metadata: { durationHours, maxDurationHours: 24 },
        };
      }

      // Проверка средней скорости (должна быть разумной для автобуса)
      const avgSpeed = distance / (duration / 60); // км/ч
      if (avgSpeed > 100) {
        return {
          warning: `Средняя скорость автобуса ${avgSpeed.toFixed(1)} км/ч кажется завышенной`,
          metadata: { avgSpeed, distance, duration },
        };
      }
    }

    // Проверка для паромов
    if (segment.type === TransportType.FERRY) {
      // Паромы обычно не ходят > 1000 км
      if (distance > 1000) {
        return {
          warning: `Паромный маршрут на расстояние ${distance.toFixed(0)} км может быть нереалистичным`,
          metadata: { distance },
        };
      }
    }

    // Проверка для такси
    if (segment.type === TransportType.TAXI) {
      // Такси обычно не ездят > 200 км
      if (distance > 200) {
        return {
          warning: `Такси на расстояние ${distance.toFixed(0)} км может быть неоптимальным (рассмотрите другой транспорт)`,
          metadata: { distance },
        };
      }
    }

    return {};
  }

  /**
   * Проверяет некорректные соединения между сегментами
   */
  private checkIncorrectConnections(
    route: SmartRoute
  ): { error?: string; metadata?: Record<string, unknown> } {
    if (route.segments.length === 0) {
      return {};
    }

    // Проверка связности сегментов
    for (let i = 0; i < route.segments.length - 1; i++) {
      const currentSegment = route.segments[i];
      const nextSegment = route.segments[i + 1];

      // Проверка, что конечная точка текущего сегмента совпадает с начальной точкой следующего
      if (currentSegment.to.id !== nextSegment.from.id) {
        return {
          error: `Сегменты не связаны: сегмент ${i + 1} (${nextSegment.id}) начинается в ${nextSegment.from.id} (${nextSegment.from.name}), но предыдущий сегмент ${i} (${currentSegment.id}) заканчивается в ${currentSegment.to.id} (${currentSegment.to.name})`,
          metadata: {
            segmentIndex1: i,
            segmentId1: currentSegment.id,
            segmentIndex2: i + 1,
            segmentId2: nextSegment.id,
            fromStopId: nextSegment.from.id,
            toStopId: currentSegment.to.id,
          },
        };
      }

      // Проверка, что города совпадают (или хотя бы близки)
      if (currentSegment.to.cityId !== nextSegment.from.cityId) {
        return {
          error: `Сегменты находятся в разных городах: сегмент ${i} заканчивается в городе ${currentSegment.to.cityId}, а сегмент ${i + 1} начинается в городе ${nextSegment.from.cityId}`,
          metadata: {
            segmentIndex1: i,
            segmentId1: currentSegment.id,
            segmentIndex2: i + 1,
            segmentId2: nextSegment.id,
            fromCityId: nextSegment.from.cityId,
            toCityId: currentSegment.to.cityId,
          },
        };
      }

      // Проверка, что координаты близки (в пределах разумного расстояния для пересадки)
      const fromCoords = nextSegment.from.coordinates;
      const toCoords = currentSegment.to.coordinates;
      const distance = fromCoords.distanceTo(toCoords);

      // Пересадка не должна быть > 10 км (разумное расстояние для пересадки)
      if (distance > 10) {
        return {
          error: `Расстояние между конечной точкой сегмента ${i} и начальной точкой сегмента ${i + 1} слишком большое: ${distance.toFixed(1)} км (максимум 10 км для пересадки)`,
          metadata: {
            segmentIndex1: i,
            segmentId1: currentSegment.id,
            segmentIndex2: i + 1,
            segmentId2: nextSegment.id,
            distance,
            maxDistance: 10,
          },
        };
      }
    }

    return {};
  }

  /**
   * Проверяет форматы городов
   */
  private checkCityFormats(
    route: SmartRoute
  ): { error?: string; metadata?: Record<string, unknown> } {
    const errors: string[] = [];

    // Проверка формата ID города отправления
    if (!this.isValidCityId(route.fromCity.id)) {
      errors.push(`Неверный формат ID города отправления: ${route.fromCity.id}`);
    }

    // Проверка формата ID города назначения
    if (!this.isValidCityId(route.toCity.id)) {
      errors.push(`Неверный формат ID города назначения: ${route.toCity.id}`);
    }

    // Проверка формата названий городов
    if (!this.isValidCityName(route.fromCity.name)) {
      errors.push(`Неверный формат названия города отправления: ${route.fromCity.name}`);
    }

    if (!this.isValidCityName(route.toCity.name)) {
      errors.push(`Неверный формат названия города назначения: ${route.toCity.name}`);
    }

    // Проверка формата городов в сегментах
    for (const segment of route.segments) {
      if (!this.isValidCityId(segment.from.cityId)) {
        errors.push(`Неверный формат ID города в сегменте ${segment.id} (from): ${segment.from.cityId}`);
      }
      if (!this.isValidCityId(segment.to.cityId)) {
        errors.push(`Неверный формат ID города в сегменте ${segment.id} (to): ${segment.to.cityId}`);
      }
    }

    if (errors.length > 0) {
      return {
        error: errors.join('; '),
        metadata: { errors },
      };
    }

    return {};
  }

  /**
   * Проверяет, является ли ID города валидным
   */
  private isValidCityId(cityId: string): boolean {
    // ID должен быть непустой строкой в нижнем регистре, без пробелов и специальных символов
    // Разрешены: буквы, цифры, дефисы, подчёркивания
    return /^[a-z0-9_-]+$/.test(cityId) && cityId.length > 0 && cityId.length <= 50;
  }

  /**
   * Проверяет, является ли название города валидным
   */
  private isValidCityName(cityName: string): boolean {
    // Название должно быть непустой строкой, начинаться с заглавной буквы
    return cityName.length > 0 && cityName.length <= 100 && /^[А-ЯЁA-Z]/.test(cityName);
  }
}

