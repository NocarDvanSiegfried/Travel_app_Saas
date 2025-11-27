/**
 * Проверка реалистичности маршрутов
 * 
 * Автоматическая проверка против реальных расстояний, цен и маршрутов
 * с правилами коррекции и fallback алгоритмами
 * 
 * @module application/smart-routing/validation
 */

import type { SmartRoute } from '../../../domain/smart-routing/entities/SmartRoute';
import type { SmartRouteSegment } from '../../../domain/smart-routing/entities/SmartRouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { ALL_CITIES, getCityById } from '../../../domain/smart-routing/data/cities-reference';
import { ALL_HUBS } from '../../../domain/smart-routing/data/hubs-reference';
import { isAvailableOnDate } from '../../../domain/smart-routing/value-objects/Seasonality';

/**
 * Результат проверки реалистичности
 */
export interface RealityCheckResult {
  /**
   * Есть ли несоответствия с реальностью
   */
  hasIssues: boolean;

  /**
   * Список обнаруженных несоответствий
   */
  issues: Array<{
    /**
     * Тип несоответствия
     */
    type: 'distance_mismatch' | 'price_mismatch' | 'route_mismatch' | 'path_mismatch' | 'hub_mismatch' | 'transfer_mismatch' | 'seasonality_mismatch';
    
    /**
     * Сегмент, в котором обнаружено несоответствие
     */
    segmentId: string;
    
    /**
     * Описание несоответствия
     */
    message: string;
    
    /**
     * Предложенная коррекция
     */
    correction?: {
      /**
       * Тип коррекции
       */
      type: 'adjust_distance' | 'adjust_price' | 'rebuild_route' | 'rebuild_path' | 'add_hub' | 'remove_hub' | 'add_transfer' | 'change_season';
      
      /**
       * Предложенное значение
       */
      suggestedValue: number | string | unknown;
      
      /**
       * Уверенность в коррекции (0-1)
       */
      confidence: number;
    };
    
    /**
     * Дополнительные данные
     */
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Рекомендации по улучшению
   */
  recommendations: string[];
}

/**
 * Проверка реалистичности маршрутов
 */
export class RealityChecker {
  /**
   * Допустимое отклонение расстояния от реального (%)
   */
  private readonly DISTANCE_TOLERANCE_PERCENT = 10;

  /**
   * Допустимое отклонение цены от реальной (%)
   */
  private readonly PRICE_TOLERANCE_PERCENT = 20;

  /**
   * Минимальная уверенность для применения коррекции
   */
  private readonly MIN_CORRECTION_CONFIDENCE = 0.7;

  /**
   * Проверяет реалистичность маршрута
   */
  public checkReality(route: SmartRoute): RealityCheckResult {
    const issues: RealityCheckResult['issues'] = [];
    const recommendations: string[] = [];

    // Проверка каждого сегмента
    for (const segment of route.segments) {
      // Проверка расстояния
      const distanceCheck = this.checkDistanceReality(segment);
      if (distanceCheck.issue) {
        issues.push({
          type: 'distance_mismatch',
          segmentId: segment.id,
          message: distanceCheck.issue,
          correction: distanceCheck.correction,
          metadata: distanceCheck.metadata,
        });
      }

      // Проверка цены
      const priceCheck = this.checkPriceReality(segment);
      if (priceCheck.issue) {
        issues.push({
          type: 'price_mismatch',
          segmentId: segment.id,
          message: priceCheck.issue,
          correction: priceCheck.correction,
          metadata: priceCheck.metadata,
        });
      }

      // Проверка пути
      const pathCheck = this.checkPathReality(segment);
      if (pathCheck.issue) {
        issues.push({
          type: 'path_mismatch',
          segmentId: segment.id,
          message: pathCheck.issue,
          correction: pathCheck.correction,
          metadata: pathCheck.metadata,
        });
      }

      // Проверка хабов (только для авиа)
      if (segment.type === TransportType.AIRPLANE) {
        const hubCheck = this.checkHubReality(segment, route);
        if (hubCheck.issue) {
          issues.push({
            type: 'hub_mismatch',
            segmentId: segment.id,
            message: hubCheck.issue,
            correction: hubCheck.correction,
            metadata: hubCheck.metadata,
          });
        }
      }

      // Проверка пересадок
      const transferCheck = this.checkTransferReality(segment, route);
      if (transferCheck.issue) {
        issues.push({
          type: 'transfer_mismatch',
          segmentId: segment.id,
          message: transferCheck.issue,
          correction: transferCheck.correction,
          metadata: transferCheck.metadata,
        });
      }

      // Проверка сезонности
      const seasonalityCheck = this.checkSeasonalityReality(segment, route);
      if (seasonalityCheck.issue) {
        issues.push({
          type: 'seasonality_mismatch',
          segmentId: segment.id,
          message: seasonalityCheck.issue,
          correction: seasonalityCheck.correction,
          metadata: seasonalityCheck.metadata,
        });
      }
    }

    // Генерация рекомендаций
    if (issues.length > 0) {
      recommendations.push('Обнаружены несоответствия с реальными данными. Рекомендуется пересчитать маршрут.');
    }

    if (issues.some((issue) => issue.type === 'distance_mismatch')) {
      recommendations.push('Рекомендуется проверить расчёт расстояний через OSRM/Google Maps API.');
    }

    if (issues.some((issue) => issue.type === 'price_mismatch')) {
      recommendations.push('Рекомендуется обновить формулы ценообразования или проверить актуальность тарифов.');
    }

    if (issues.some((issue) => issue.type === 'path_mismatch')) {
      recommendations.push('Рекомендуется перестроить пути через реальные дороги/реки/ЖД.');
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      recommendations,
    };
  }

  /**
   * Проверяет реалистичность расстояния
   */
  private checkDistanceReality(
    segment: SmartRouteSegment
  ): {
    issue?: string;
    correction?: RealityCheckResult['issues'][0]['correction'];
    metadata?: Record<string, unknown>;
  } {
    const reportedDistance = segment.distance.value;
    
    // Вычисляем реальное расстояние на основе типа транспорта
    const realDistance = this.calculateRealDistance(segment);
    
    if (realDistance === null) {
      return {}; // Не можем проверить
    }

    // Проверяем отклонение
    const deviation = Math.abs(reportedDistance - realDistance) / realDistance;
    
    if (deviation > this.DISTANCE_TOLERANCE_PERCENT / 100) {
      const confidence = this.calculateCorrectionConfidence(segment, 'distance');
      
      return {
        issue: `Расстояние сегмента ${segment.id} отклоняется от реального на ${(deviation * 100).toFixed(1)}%: заявлено ${reportedDistance.toFixed(0)} км, реально ${realDistance.toFixed(0)} км`,
        correction: confidence >= this.MIN_CORRECTION_CONFIDENCE
          ? {
              type: 'adjust_distance',
              suggestedValue: realDistance,
              confidence,
            }
          : undefined,
        metadata: {
          reportedDistance,
          realDistance,
          deviation: deviation * 100,
        },
      };
    }

    return {};
  }

  /**
   * Вычисляет реальное расстояние на основе типа транспорта
   */
  private calculateRealDistance(segment: SmartRouteSegment): number | null {
    // Для авиа - используем Haversine (расстояние по прямой)
    if (segment.type === TransportType.AIRPLANE) {
      return segment.from.coordinates.distanceTo(segment.to.coordinates);
    }

    // Для наземного/водного транспорта - используем pathGeometry
    if (segment.pathGeometry && segment.pathGeometry.coordinates.length >= 2) {
      let totalDistance = 0;
      const coords = segment.pathGeometry.coordinates;
      
      for (let i = 0; i < coords.length - 1; i++) {
        const point1 = new Coordinates(coords[i][1], coords[i][0]); // [lng, lat] -> Coordinates(lat, lng)
        const point2 = new Coordinates(coords[i + 1][1], coords[i + 1][0]);
        totalDistance += point1.distanceTo(point2);
      }
      
      return totalDistance;
    }

    // Если нет pathGeometry - не можем проверить
    return null;
  }

  /**
   * Проверяет реалистичность цены
   */
  private checkPriceReality(
    segment: SmartRouteSegment
  ): {
    issue?: string;
    correction?: RealityCheckResult['issues'][0]['correction'];
    metadata?: Record<string, unknown>;
  } {
    const reportedPrice = segment.price.total;
    
    // Оцениваем реальную цену
    const estimatedPrice = this.estimateRealPrice(segment);
    
    // Проверяем отклонение
    const deviation = Math.abs(reportedPrice - estimatedPrice) / estimatedPrice;
    
    if (deviation > this.PRICE_TOLERANCE_PERCENT / 100) {
      const confidence = this.calculateCorrectionConfidence(segment, 'price');
      
      return {
        issue: `Цена сегмента ${segment.id} отклоняется от оценочной на ${(deviation * 100).toFixed(1)}%: заявлено ${reportedPrice.toFixed(0)}₽, оценочно ${estimatedPrice.toFixed(0)}₽`,
        correction: confidence >= this.MIN_CORRECTION_CONFIDENCE
          ? {
              type: 'adjust_price',
              suggestedValue: estimatedPrice,
              confidence,
            }
          : undefined,
        metadata: {
          reportedPrice,
          estimatedPrice,
          deviation: deviation * 100,
        },
      };
    }

    return {};
  }

  /**
   * Оценивает реальную цену на основе расстояния и типа транспорта
   */
  private estimateRealPrice(segment: SmartRouteSegment): number {
    const distance = segment.distance.value;
    
    // Базовые тарифы (руб/км) - те же, что в PriceCalculator
    const baseRates: Record<TransportType, number> = {
      [TransportType.AIRPLANE]: 5.0,
      [TransportType.TRAIN]: 1.5,
      [TransportType.BUS]: 4.0,
      [TransportType.FERRY]: 6.0,
      [TransportType.WINTER_ROAD]: 7.5,
      [TransportType.TAXI]: 15.0,
      [TransportType.UNKNOWN]: 5.0,
    };

    const baseRate = baseRates[segment.type] || 5.0;
    return baseRate * distance;
  }

  /**
   * Проверяет реалистичность пути
   */
  private checkPathReality(
    segment: SmartRouteSegment
  ): {
    issue?: string;
    correction?: RealityCheckResult['issues'][0]['correction'];
    metadata?: Record<string, unknown>;
  } {
    // Для транспорта, который не должен использовать прямые линии
    const shouldNotBeStraight = [
      TransportType.BUS,
      TransportType.FERRY,
      TransportType.TRAIN,
      TransportType.WINTER_ROAD,
    ].includes(segment.type);

    if (!shouldNotBeStraight) {
      return {}; // Для авиа и такси прямые линии допустимы
    }

    const pathGeometry = segment.pathGeometry;
    
    // Если путь содержит только 2 точки - это прямая линия (ошибка)
    if (!pathGeometry || pathGeometry.coordinates.length <= 2) {
      return {
        issue: `Путь сегмента ${segment.id} (${segment.type}) является прямой линией, но должен проходить по ${this.getPathTypeForTransport(segment.type)}`,
        correction: {
          type: 'rebuild_path',
          suggestedValue: 'rebuild_using_osrm_or_river_data',
          confidence: 0.9,
        },
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
        issue: `Путь сегмента ${segment.id} слишком близок к прямой линии (отклонение ${straightLineCheck.deviation.toFixed(1)}%)`,
        correction: {
          type: 'rebuild_path',
          suggestedValue: 'rebuild_using_osrm_or_river_data',
          confidence: 0.8,
        },
        metadata: {
          transportType: segment.type,
          deviation: straightLineCheck.deviation,
          pathPointsCount: pathGeometry.coordinates.length,
        },
      };
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

    const start = new Coordinates(coordinates[0][1], coordinates[0][0]);
    const end = new Coordinates(
      coordinates[coordinates.length - 1][1],
      coordinates[coordinates.length - 1][0]
    );

    const straightDistance = start.distanceTo(end);

    let pathDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const point1 = new Coordinates(coordinates[i][1], coordinates[i][0]);
      const point2 = new Coordinates(coordinates[i + 1][1], coordinates[i + 1][0]);
      pathDistance += point1.distanceTo(point2);
    }

    const deviation = straightDistance > 0 
      ? ((pathDistance - straightDistance) / straightDistance) * 100 
      : 0;

    return {
      isTooStraight: deviation < 5, // Менее 5% отклонения - слишком прямая линия
      deviation,
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
   * Проверяет реалистичность использования хабов
   */
  private checkHubReality(
    segment: SmartRouteSegment,
    route: SmartRoute
  ): {
    issue?: string;
    correction?: RealityCheckResult['issues'][0]['correction'];
    metadata?: Record<string, unknown>;
  } {
    // Проверка только для авиа-сегментов
    if (segment.type !== TransportType.AIRPLANE) {
      return {};
    }

    // Если есть viaHubs, проверяем их валидность
    if (segment.viaHubs && segment.viaHubs.length > 0) {
      for (const hub of segment.viaHubs) {
        // Проверяем, что хаб существует в справочнике
        const realHub = ALL_HUBS.find((h) => h.id === hub.id);
        if (!realHub) {
          return {
            issue: `Хаб ${hub.id} в сегменте ${segment.id} не найден в справочнике хабов`,
            correction: {
              type: 'remove_hub',
              suggestedValue: hub.id,
              confidence: 0.9,
            },
            metadata: {
              hubId: hub.id,
              segmentId: segment.id,
            },
          };
        }

        // Проверяем, что хаб находится между точками отправления и назначения
        const fromCity = getCityById(segment.from.cityId);
        const toCity = getCityById(segment.to.cityId);
        
        if (fromCity && toCity) {
          // Используем координаты хаба напрямую
          const hubCoords = hub.coordinates;
          const fromCoords = new Coordinates(fromCity.coordinates.latitude, fromCity.coordinates.longitude);
          const toCoords = new Coordinates(toCity.coordinates.latitude, toCity.coordinates.longitude);
          
          // Проверяем, что хаб логично расположен между точками
          const distanceFromTo = fromCoords.distanceTo(toCoords);
          const distanceFromHub = fromCoords.distanceTo(hubCoords);
          const distanceHubTo = hubCoords.distanceTo(toCoords);
          
          // Если хаб слишком далеко от маршрута (более 50% от прямого расстояния)
          const totalViaHub = distanceFromHub + distanceHubTo;
          if (totalViaHub > distanceFromTo * 1.5) {
            return {
              issue: `Хаб ${hub.id} в сегменте ${segment.id} значительно удлиняет маршрут (${totalViaHub.toFixed(0)} км вместо ${distanceFromTo.toFixed(0)} км)`,
              correction: {
                type: 'remove_hub',
                suggestedValue: hub.id,
                confidence: 0.7,
              },
              metadata: {
                hubId: hub.id,
                directDistance: distanceFromTo,
                viaHubDistance: totalViaHub,
              },
            };
          }
        }
      }
    }

    // Для длинных авиа-маршрутов проверяем, что используются хабы
    const fromCity = getCityById(segment.from.cityId);
    const toCity = getCityById(segment.to.cityId);
    
    if (fromCity && toCity) {
      const fromCoords = new Coordinates(fromCity.coordinates.latitude, fromCity.coordinates.longitude);
      const toCoords = new Coordinates(toCity.coordinates.latitude, toCity.coordinates.longitude);
      const distance = fromCoords.distanceTo(toCoords);
      // Для маршрутов более 2000 км обычно используются хабы
      if (distance > 2000 && (!segment.viaHubs || segment.viaHubs.length === 0)) {
        return {
          issue: `Длинный авиа-маршрут ${segment.id} (${distance.toFixed(0)} км) не использует хабы, что может быть неоптимально`,
          correction: {
            type: 'add_hub',
            suggestedValue: 'suggest_regional_hub',
            confidence: 0.6,
          },
          metadata: {
            distance,
            segmentId: segment.id,
          },
        };
      }
    }

    return {};
  }

  /**
   * Проверяет реалистичность пересадок между сегментами
   */
  private checkTransferReality(
    segment: SmartRouteSegment,
    route: SmartRoute
  ): {
    issue?: string;
    correction?: RealityCheckResult['issues'][0]['correction'];
    metadata?: Record<string, unknown>;
  } {
    // Находим индекс текущего сегмента
    const segmentIndex = route.segments.findIndex((s) => s.id === segment.id);
    
    // Если это не последний сегмент, проверяем пересадку на следующий
    if (segmentIndex < route.segments.length - 1) {
      const nextSegment = route.segments[segmentIndex + 1];
      
      // Проверяем, что сегменты соединены (конец текущего = начало следующего)
      if (segment.to.id !== nextSegment.from.id) {
        return {
          issue: `Сегменты ${segment.id} и ${nextSegment.id} не соединены: сегмент ${segment.id} заканчивается в ${segment.to.id}, а сегмент ${nextSegment.id} начинается в ${nextSegment.from.id}`,
          correction: {
            type: 'add_transfer',
            suggestedValue: {
              from: segment.to.id,
              to: nextSegment.from.id,
            },
            confidence: 0.9,
          },
          metadata: {
            segmentId: segment.id,
            nextSegmentId: nextSegment.id,
            fromStop: segment.to.id,
            toStop: nextSegment.from.id,
          },
        };
      }

      // Проверяем минимальное время пересадки для текущей пары сегментов
      const minTransferTime = this.getMinTransferTime(segment.type, nextSegment.type);
      
      // Вычисляем количество пересадок в маршруте
      const transferCount = route.segments.length - 1;
      
      // Проверяем, что общее время пересадок в маршруте распределено правильно
      // Упрощенно: среднее время на пересадку должно быть не меньше минимального для текущей пересадки
      const totalTransferTime = route.totalDuration.breakdown.transfers;
      const averageTransferTime = transferCount > 0 ? totalTransferTime / transferCount : 0;
      
      // Если среднее время пересадки меньше минимального для текущей пересадки
      if (transferCount > 0 && averageTransferTime < minTransferTime) {
        return {
          issue: `Время пересадки между сегментами ${segment.id} и ${nextSegment.id} слишком мало: среднее время пересадки ${averageTransferTime.toFixed(0)} мин, требуется минимум ${minTransferTime} мин`,
          correction: {
            type: 'add_transfer',
            suggestedValue: {
              minTime: minTransferTime,
              currentAverageTime: averageTransferTime,
              transferCount,
            },
            confidence: 0.8,
          },
          metadata: {
            segmentId: segment.id,
            nextSegmentId: nextSegment.id,
            currentAverageTransferTime: averageTransferTime,
            minTransferTime,
            totalTransferTime,
            transferCount,
            fromType: segment.type,
            toType: nextSegment.type,
          },
        };
      }

      // Проверяем совместимость типов транспорта для пересадки
      const isCompatible = this.areTransportTypesCompatible(segment.type, nextSegment.type);
      if (!isCompatible) {
        return {
          issue: `Несовместимые типы транспорта для пересадки: ${segment.type} → ${nextSegment.type} в сегментах ${segment.id} и ${nextSegment.id}`,
          correction: {
            type: 'add_transfer',
            suggestedValue: {
              fromType: segment.type,
              toType: nextSegment.type,
              suggestion: 'add_intermediate_segment',
            },
            confidence: 0.7,
          },
          metadata: {
            segmentId: segment.id,
            nextSegmentId: nextSegment.id,
            fromType: segment.type,
            toType: nextSegment.type,
          },
        };
      }
    }

    return {};
  }

  /**
   * Проверяет реалистичность сезонности сегмента
   */
  private checkSeasonalityReality(
    segment: SmartRouteSegment,
    route: SmartRoute
  ): {
    issue?: string;
    correction?: RealityCheckResult['issues'][0]['correction'];
    metadata?: Record<string, unknown>;
  } {
    // Проверяем доступность сегмента в указанный сезон
    if (!segment.seasonality.available) {
      return {
        issue: `Сегмент ${segment.id} недоступен в указанный сезон (${segment.seasonality.season})`,
        correction: {
          type: 'change_season',
          suggestedValue: segment.seasonality.season === Season.WINTER ? Season.SUMMER : Season.WINTER,
          confidence: 0.8,
        },
        metadata: {
          segmentId: segment.id,
          currentSeason: segment.seasonality.season,
          available: segment.seasonality.available,
        },
      };
    }

    // Проверяем, что сезонность соответствует типу транспорта
    const expectedSeasonality = this.getExpectedSeasonality(segment.type);
    if (expectedSeasonality && !expectedSeasonality.includes(segment.seasonality.season)) {
      return {
        issue: `Сегмент ${segment.id} (${segment.type}) имеет неожиданную сезонность: ${segment.seasonality.season}`,
        correction: {
          type: 'change_season',
          suggestedValue: expectedSeasonality[0],
          confidence: 0.6,
        },
        metadata: {
          segmentId: segment.id,
          transportType: segment.type,
          currentSeason: segment.seasonality.season,
          expectedSeasons: expectedSeasonality,
        },
      };
    }

    // Проверяем доступность на конкретную дату (если есть период)
    if (segment.seasonality.period?.start && segment.seasonality.period?.end) {
      const now = new Date();
      const startDate = new Date(segment.seasonality.period.start);
      const endDate = new Date(segment.seasonality.period.end);
      
      if (now < startDate || now > endDate) {
        return {
          issue: `Сегмент ${segment.id} недоступен на текущую дату (доступен с ${startDate.toISOString()} по ${endDate.toISOString()})`,
          correction: {
            type: 'change_season',
            suggestedValue: 'adjust_dates',
            confidence: 0.7,
          },
          metadata: {
            segmentId: segment.id,
            startDate: startDate,
            endDate: endDate,
            currentDate: now,
          },
        };
      }
    }

    return {};
  }

  /**
   * Получает минимальное время пересадки между типами транспорта (в минутах)
   */
  private getMinTransferTime(fromType: TransportType, toType: TransportType): number {
    // Базовое время пересадки
    const baseTime = 30; // 30 минут

    // Дополнительное время для разных типов транспорта
    if (fromType === TransportType.AIRPLANE && toType === TransportType.AIRPLANE) {
      return 60; // Между авиарейсами нужно больше времени
    }

    if (fromType === TransportType.TRAIN && toType === TransportType.TRAIN) {
      return 15; // Между поездами можно быстрее
    }

    if (fromType === TransportType.BUS && toType === TransportType.BUS) {
      return 10; // Между автобусами можно очень быстро
    }

    // Между разными типами транспорта нужно больше времени
    if (fromType !== toType) {
      return 45;
    }

    return baseTime;
  }

  /**
   * Проверяет совместимость типов транспорта для пересадки
   */
  private areTransportTypesCompatible(fromType: TransportType, toType: TransportType): boolean {
    // Все типы транспорта совместимы для пересадки
    // Но можно добавить специальные правила, например:
    // - FERRY → AIRPLANE может быть проблематично (нужен наземный транспорт)
    // - WINTER_ROAD → FERRY может быть проблематично (зимняя дорога доступна только зимой)
    
    // Пока считаем все совместимыми
    return true;
  }

  /**
   * Получает ожидаемые сезоны для типа транспорта
   */
  private getExpectedSeasonality(transportType: TransportType): Season[] | null {
    switch (transportType) {
      case TransportType.WINTER_ROAD:
        return [Season.WINTER, Season.TRANSITION];
      case TransportType.FERRY:
        return [Season.SUMMER, Season.TRANSITION];
      case TransportType.AIRPLANE:
      case TransportType.TRAIN:
      case TransportType.BUS:
      case TransportType.TAXI:
      case TransportType.UNKNOWN:
        return [Season.ALL, Season.SUMMER, Season.WINTER, Season.TRANSITION];
      default:
        return null;
    }
  }

  /**
   * Вычисляет уверенность в коррекции
   */
  private calculateCorrectionConfidence(
    segment: SmartRouteSegment,
    checkType: 'distance' | 'price'
  ): number {
    let confidence = 0.5; // Базовая уверенность

    // Увеличиваем уверенность, если есть pathGeometry (для расстояния)
    if (checkType === 'distance' && segment.pathGeometry && segment.pathGeometry.coordinates.length >= 3) {
      confidence += 0.2;
    }

    // Увеличиваем уверенность, если есть реальные данные о ценах (для цены)
    if (checkType === 'price') {
      // В реальной системе здесь можно проверить наличие актуальных тарифов
      confidence += 0.1;
    }

    // Уменьшаем уверенность для необычных маршрутов
    if (segment.type === TransportType.WINTER_ROAD || segment.type === TransportType.FERRY) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
