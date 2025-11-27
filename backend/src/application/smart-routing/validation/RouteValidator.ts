/**
 * Валидатор маршрутов
 * 
 * Проверяет физическую возможность, логическую корректность
 * и реалистичность маршрутов
 */

import type { SmartRoute } from '../../../domain/smart-routing/entities/SmartRoute';
import type { SmartRouteSegment } from '../../../domain/smart-routing/entities/SmartRouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import type { ValidationResult } from '../../../domain/smart-routing/entities/SmartRoute';
import { RouteErrorDetector } from './RouteErrorDetector';
import { RealityChecker } from './RealityChecker';

/**
 * Результат валидации маршрута
 */
export interface RouteValidationResult {
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

  /**
   * Детали валидации по сегментам
   */
  segmentValidations: Array<{
    segmentId: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

/**
 * Валидатор маршрутов
 */
export class RouteValidator {
  /**
   * Максимальное расстояние для автобусных маршрутов (км)
   */
  private readonly MAX_BUS_DISTANCE = 1500;

  /**
   * Максимальное время в пути для автобусов (часы)
   */
  private readonly MAX_BUS_DURATION_HOURS = 24;

  /**
   * Максимальное расстояние для прямых авиарейсов между малыми аэропортами (км)
   */
  private readonly MAX_DIRECT_FLIGHT_DISTANCE_SMALL_AIRPORTS = 500;

  /**
   * Допустимое отклонение цены от реальной (%)
   */
  private readonly PRICE_TOLERANCE_PERCENT = 20;

  /**
   * Детектор ошибок маршрутов
   */
  private readonly errorDetector: RouteErrorDetector;

  /**
   * Проверка реалистичности маршрутов
   */
  private readonly realityChecker: RealityChecker;

  constructor() {
    this.errorDetector = new RouteErrorDetector();
    this.realityChecker = new RealityChecker();
  }

  /**
   * Валидирует маршрут
   */
  public validateRoute(route: SmartRoute, date: Date): RouteValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const segmentValidations: RouteValidationResult['segmentValidations'] = [];

    // Валидация каждого сегмента
    for (const segment of route.segments) {
      const segmentValidation = this.validateSegment(segment, date);
      segmentValidations.push(segmentValidation);

      if (!segmentValidation.isValid) {
        errors.push(...segmentValidation.errors);
      }
      warnings.push(...segmentValidation.warnings);
    }

    // Валидация структуры маршрута
    const structureValidation = this.validateRouteStructure(route);
    if (!structureValidation.isValid) {
      errors.push(...structureValidation.errors);
    }
    warnings.push(...structureValidation.warnings);

    // Валидация цен
    const priceValidation = this.validatePrices(route);
    if (!priceValidation.isValid) {
      warnings.push(...priceValidation.warnings);
    }

    // Детекция ошибок (ШАГ 8): обнаружение маршрутов через пустое пространство,
    // некорректных соединений и нереалистичных маршрутов
    const errorDetection = this.errorDetector.detectErrors(route);
    if (errorDetection.hasCriticalErrors) {
      // Преобразуем ошибки детекции в формат валидации
      for (const error of errorDetection.errors) {
        errors.push(`[${error.type}] ${error.message}`);
      }
    }
    // Добавляем предупреждения из детекции
    for (const warning of errorDetection.warnings) {
      warnings.push(`[${warning.type}] ${warning.message}`);
    }

    // Автоматическая проверка реалистичности (ШАГ 9): проверка против реальных
    // расстояний, цен и маршрутов с правилами коррекции
    const realityCheck = this.realityChecker.checkReality(route);
    if (realityCheck.hasIssues) {
      // Преобразуем проблемы реалистичности в предупреждения
      for (const issue of realityCheck.issues) {
        warnings.push(`[${issue.type}] ${issue.message}`);
        if (issue.correction) {
          warnings.push(
            `  → Предложенная коррекция: ${issue.correction.type} (уверенность: ${(issue.correction.confidence * 100).toFixed(0)}%)`
          );
        }
      }
      // Добавляем рекомендации
      warnings.push(...realityCheck.recommendations.map((rec) => `[рекомендация] ${rec}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      segmentValidations,
    };
  }

  /**
   * Валидирует сегмент маршрута
   */
  private validateSegment(
    segment: SmartRouteSegment,
    date: Date
  ): RouteValidationResult['segmentValidations'][0] {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка сезонности
    const seasonalityCheck = this.checkSeasonality(segment, date);
    if (!seasonalityCheck.isValid) {
      errors.push(...seasonalityCheck.errors);
    }
    warnings.push(...seasonalityCheck.warnings);

    // Проверка расстояния
    const distanceCheck = this.checkDistance(segment);
    if (!distanceCheck.isValid) {
      errors.push(...distanceCheck.errors);
    }
    warnings.push(...distanceCheck.warnings);

    // Проверка типа транспорта и маршрута
    const transportCheck = this.checkTransportType(segment);
    if (!transportCheck.isValid) {
      errors.push(...transportCheck.errors);
    }
    warnings.push(...transportCheck.warnings);

    // Проверка реалистичности пути
    const pathCheck = this.checkPathRealism(segment);
    if (!pathCheck.isValid) {
      errors.push(...pathCheck.errors);
    }
    warnings.push(...pathCheck.warnings);

    return {
      segmentId: segment.id,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет сезонность сегмента
   */
  private checkSeasonality(
    segment: SmartRouteSegment,
    date: Date
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверяем доступность сегмента на дату
    if (!segment.isAvailableOnDate(date)) {
      errors.push(
        `Сегмент ${segment.id} недоступен в сезон ${this.getSeasonFromDate(date)}`
      );
    }

    // Специфичные проверки для разных типов транспорта
    const season = this.getSeasonFromDate(date);

    if (segment.type === TransportType.FERRY && season === Season.WINTER) {
      errors.push(`Паромные маршруты недоступны зимой: ${segment.id}`);
    }

    if (segment.type === TransportType.WINTER_ROAD && season === Season.SUMMER) {
      errors.push(`Зимние дороги недоступны летом: ${segment.id}`);
    }

    // Проверка сезонности из модели
    if (!segment.seasonality.available) {
      warnings.push(
        `Сегмент ${segment.id} помечен как недоступный в модели сезонности (сезон: ${segment.seasonality.season})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет расстояние сегмента
   */
  private checkDistance(
    segment: SmartRouteSegment
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const distance = segment.distance.value;

    // Проверка для автобусов
    if (segment.type === TransportType.BUS) {
      if (distance > this.MAX_BUS_DISTANCE) {
        errors.push(
          `Автобусный маршрут слишком длинный: ${distance} км (максимум ${this.MAX_BUS_DISTANCE} км)`
        );
      }

      // Проверка времени в пути
      const durationHours = segment.duration.value / 60;
      if (durationHours > this.MAX_BUS_DURATION_HOURS) {
        errors.push(
          `Время в пути автобуса слишком долгое: ${durationHours.toFixed(1)} часов (максимум ${this.MAX_BUS_DURATION_HOURS} часов)`
        );
      }
    }

    // Проверка для прямых авиарейсов между малыми аэропортами
    if (segment.type === TransportType.AIRPLANE && segment.isDirect) {
      const fromCity = segment.from.cityId;
      const toCity = segment.to.cityId;

      // Проверяем, являются ли аэропорты малыми (упрощённая проверка)
      const isSmallAirport = this.isSmallAirport(fromCity) || this.isSmallAirport(toCity);

      if (isSmallAirport && distance > this.MAX_DIRECT_FLIGHT_DISTANCE_SMALL_AIRPORTS) {
        warnings.push(
          `Прямой рейс между малыми аэропортами на расстояние ${distance} км может быть недоступен. Рекомендуется маршрут через хаб.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет тип транспорта и маршрут
   */
  private checkTransportType(
    segment: SmartRouteSegment
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Запрет невозможных маршрутов
    const impossibleRoutes = this.getImpossibleRoutes();
    const routeKey = `${segment.from.cityId}-${segment.to.cityId}`;

    if (impossibleRoutes.has(routeKey)) {
      const routeInfo = impossibleRoutes.get(routeKey)!;
      if (routeInfo.transportTypes.includes(segment.type)) {
        errors.push(
          `Невозможный маршрут: ${routeInfo.description} (тип транспорта: ${segment.type})`
        );
      }
    }

    // Проверка наличия инфраструктуры
    const infrastructureCheck = this.checkInfrastructure(segment);
    if (!infrastructureCheck.isValid) {
      errors.push(...infrastructureCheck.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет реалистичность пути
   */
  private checkPathRealism(
    segment: SmartRouteSegment
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка, что путь не является прямой линией для транспорта, который не должен использовать прямые линии
    if (this.shouldNotUseStraightLine(segment.type)) {
      const pathGeometry = segment.pathGeometry;
      if (pathGeometry && pathGeometry.coordinates.length <= 2) {
        errors.push(
          `Маршрут ${segment.type} не должен быть прямой линией. Требуется путь по дорогам/рекам/ЖД.`
        );
      }
    }

    // Проверка для автобусов: путь должен быть по дорогам
    if (segment.type === TransportType.BUS) {
      const pathGeometry = segment.pathGeometry;
      if (pathGeometry && pathGeometry.coordinates.length < 3) {
        warnings.push(
          `Автобусный маршрут должен проходить по дорогам. Текущий путь может быть упрощённым.`
        );
      }
    }

    // Проверка для паромов: путь должен быть по рекам
    if (segment.type === TransportType.FERRY) {
      const pathGeometry = segment.pathGeometry;
      if (pathGeometry && pathGeometry.coordinates.length < 3) {
        warnings.push(
          `Паромный маршрут должен проходить по рекам. Текущий путь может быть упрощённым.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет структуру маршрута
   */
  private validateRouteStructure(
    route: SmartRoute
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (route.segments.length === 0) {
      errors.push('Маршрут должен содержать хотя бы один сегмент');
      return { isValid: false, errors, warnings };
    }

    // Проверка связности сегментов
    for (let i = 0; i < route.segments.length - 1; i++) {
      const currentSegment = route.segments[i];
      const nextSegment = route.segments[i + 1];

      if (currentSegment.to.id !== nextSegment.from.id) {
        errors.push(
          `Сегменты не связаны: сегмент ${i + 1} начинается в ${nextSegment.from.id}, но предыдущий сегмент заканчивается в ${currentSegment.to.id}`
        );
      }
    }

    // Проверка, что начальная точка первого сегмента совпадает с начальным городом
    if (route.segments[0].from.cityId !== route.fromCity.id) {
      errors.push(
        `Начальная точка маршрута не совпадает с городом отправления: ${route.segments[0].from.cityId} !== ${route.fromCity.id}`
      );
    }

    // Проверка, что конечная точка последнего сегмента совпадает с конечным городом
    const lastSegment = route.segments[route.segments.length - 1];
    if (lastSegment.to.cityId !== route.toCity.id) {
      errors.push(
        `Конечная точка маршрута не совпадает с городом назначения: ${lastSegment.to.cityId} !== ${route.toCity.id}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Проверяет цены на реалистичность
   */
  private validatePrices(
    route: SmartRoute
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    for (const segment of route.segments) {
      const priceCheck = this.checkPriceRealism(segment);
      if (!priceCheck.isValid) {
        warnings.push(...priceCheck.warnings);
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Проверяет реалистичность цены сегмента
   */
  private checkPriceRealism(
    segment: SmartRouteSegment
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Оценочная цена на основе расстояния и типа транспорта
    const estimatedPrice = this.estimatePrice(segment.type, segment.distance.value);
    const actualPrice = segment.price.total;

    // Проверяем отклонение от оценочной цены
    const deviation = Math.abs(actualPrice - estimatedPrice) / estimatedPrice;
    if (deviation > this.PRICE_TOLERANCE_PERCENT / 100) {
      warnings.push(
        `Цена сегмента ${segment.id} отклоняется от оценочной более чем на ${this.PRICE_TOLERANCE_PERCENT}%: фактическая ${actualPrice}₽, оценочная ${estimatedPrice.toFixed(0)}₽`
      );
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Оценивает цену на основе типа транспорта и расстояния
   */
  private estimatePrice(transportType: TransportType, distanceKm: number): number {
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

    const baseRate = baseRates[transportType] || 5.0;
    return baseRate * distanceKm;
  }

  /**
   * Проверяет наличие инфраструктуры
   */
  private checkInfrastructure(
    segment: SmartRouteSegment
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Проверка наличия остановок нужного типа
    const requiredStopType = this.getRequiredStopType(segment.type);

    if (segment.from.type !== requiredStopType) {
      errors.push(
        `Остановка отправления должна быть типа ${requiredStopType}, но получена ${segment.from.type}`
      );
    }

    if (segment.to.type !== requiredStopType) {
      errors.push(
        `Остановка назначения должна быть типа ${requiredStopType}, но получена ${segment.to.type}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Получает требуемый тип остановки для типа транспорта
   */
  private getRequiredStopType(transportType: TransportType): string {
    const mapping: Record<TransportType, string> = {
      [TransportType.AIRPLANE]: 'airport',
      [TransportType.TRAIN]: 'train_station',
      [TransportType.BUS]: 'bus_station',
      [TransportType.FERRY]: 'ferry_pier',
      [TransportType.WINTER_ROAD]: 'winter_road_point',
      [TransportType.TAXI]: 'taxi_stand',
      [TransportType.UNKNOWN]: 'bus_station',
    };

    return mapping[transportType] || 'bus_station';
  }

  /**
   * Проверяет, должен ли тип транспорта использовать прямые линии
   */
  private shouldNotUseStraightLine(transportType: TransportType): boolean {
    // Автобусы, паромы, ЖД и зимники не должны использовать прямые линии
    return [
      TransportType.BUS,
      TransportType.FERRY,
      TransportType.TRAIN,
      TransportType.WINTER_ROAD,
    ].includes(transportType);
  }

  /**
   * Получает список невозможных маршрутов
   */
  private getImpossibleRoutes(): Map<
    string,
    { transportTypes: TransportType[]; description: string }
  > {
    const impossible = new Map<
      string,
      { transportTypes: TransportType[]; description: string }
    >();

    // Москва → Бестях автобусом
    impossible.set('moscow-bestyakh', {
      transportTypes: [TransportType.BUS],
      description: 'Москва → Нижний Бестях автобусом (5000+ км, нет прямой дороги)',
    });

    // Иркутск → Олёкминск автобусом (прямой)
    impossible.set('irkutsk-olekminsk', {
      transportTypes: [TransportType.BUS],
      description: 'Иркутск → Олёкминск автобусом (1500+ км, нет прямой дороги)',
    });

    // Все автобусные маршруты > 1500 км
    // Это проверяется в checkDistance

    return impossible;
  }

  /**
   * Проверяет, является ли аэропорт малым
   */
  private isSmallAirport(cityId: string): boolean {
    // Упрощённая проверка: малые аэропорты - это не ключевые города
    // В реальной системе это должно проверяться по справочнику аэропортов
    const smallAirportCities = [
      'srednekolymsk',
      'chokurdakh',
      'verkhoyansk',
      'zhigansk',
      'udachny',
      'lensk',
      'vilyuisk',
      'olekminsk',
    ];

    return smallAirportCities.includes(cityId);
  }

  /**
   * Получает сезон из даты
   */
  private getSeasonFromDate(date: Date): Season {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    // Летний период: 1 июня - 18 октября
    if (
      (month === 6 && day >= 1) ||
      (month >= 7 && month <= 9) ||
      (month === 10 && day <= 18)
    ) {
      return Season.SUMMER;
    }

    // Зимний период: 1 декабря - 15 апреля
    if (
      month === 12 ||
      month === 1 ||
      month === 2 ||
      month === 3 ||
      (month === 4 && day <= 15)
    ) {
      return Season.WINTER;
    }

    // Переходный период
    return Season.TRANSITION;
  }
}

