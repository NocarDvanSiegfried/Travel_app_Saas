/**
 * Калькулятор цен для разных типов транспорта
 * 
 * Использует формулы ценообразования из документации:
 * - Авиа: базовая цена + багаж + сборы
 * - ЖД: тариф × км
 * - Автобус: цена/км
 * - Паром: сезон + проезд + груз
 * - Зимник: фиксированный коэффициент
 * - Такси: фикс + км
 */

import type { PriceModel } from '../../../domain/smart-routing/value-objects/PriceModel';
import { createPriceModel } from '../../../domain/smart-routing/value-objects/PriceModel';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { CityConnection } from '../../../domain/smart-routing/data/connections-model';
import { Season } from '../../../domain/smart-routing/enums/Season';

/**
 * Параметры ценообразования
 */
export interface PricingParams {
  /**
   * Расстояние в километрах
   */
  distance: number;

  /**
   * Сезон
   */
  season: Season;

  /**
   * Класс обслуживания (для авиа и ЖД)
   */
  serviceClass?: 'economy' | 'business' | 'first';

  /**
   * Наличие багажа (для авиа)
   */
  hasBaggage?: boolean;

  /**
   * Вес багажа в кг (для авиа)
   */
  baggageWeight?: number;

  /**
   * Регион (для учёта региональных коэффициентов)
   */
  region?: 'russia' | 'yakutia' | 'arctic';

  /**
   * Коэффициент спроса (1.0 = нормальный, >1.0 = высокий спрос)
   */
  demandCoefficient?: number;

  /**
   * Дата поездки (для динамического ценообразования)
   */
  date?: Date;

  /**
   * Время отправления (для динамического ценообразования)
   */
  departureTime?: Date;

  /**
   * Количество пересадок (для доплаты за пересадки)
   */
  transfersCount?: number;

  /**
   * Расстояние до аэропорта/станции на такси (в км)
   */
  taxiDistanceToStop?: number;

  /**
   * Нужно ли питание (для ЖД)
   */
  needsMeal?: boolean;

  /**
   * Нужна ли страховка
   */
  needsInsurance?: boolean;
}

/**
 * Калькулятор цен
 */
export class PriceCalculator {
  /**
   * Базовые тарифы (руб/км)
   */
  private readonly BASE_RATES: Record<TransportType, number> = {
    [TransportType.AIRPLANE]: 5.0, // 5000₽ за 1000 км
    [TransportType.TRAIN]: 1.5, // 1500₽ за 1000 км
    [TransportType.BUS]: 4.0, // 4000₽ за 1000 км
    [TransportType.FERRY]: 6.0, // 6000₽ за 1000 км (выше из-за сезонности)
    [TransportType.WINTER_ROAD]: 7.5, // 7500₽ за 1000 км (выше из-за сложности)
    [TransportType.TAXI]: 15.0, // 15000₽ за 1000 км (самый дорогой)
    [TransportType.UNKNOWN]: 5.0, // По умолчанию как средний тариф
  };

  /**
   * Сезонные коэффициенты
   */
  private readonly SEASON_COEFFICIENTS: Record<Season, Record<TransportType, number>> = {
    [Season.SUMMER]: {
      [TransportType.AIRPLANE]: 1.0,
      [TransportType.TRAIN]: 1.0,
      [TransportType.BUS]: 1.0,
      [TransportType.FERRY]: 1.0, // Летом паромы доступны
      [TransportType.WINTER_ROAD]: 0.0, // Зимники недоступны летом
      [TransportType.TAXI]: 1.0,
      [TransportType.UNKNOWN]: 1.0, // Нейтральный коэффициент
    },
    [Season.WINTER]: {
      [TransportType.AIRPLANE]: 1.2, // Зимой дороже
      [TransportType.TRAIN]: 1.0,
      [TransportType.BUS]: 1.1,
      [TransportType.FERRY]: 0.0, // Паромы недоступны зимой
      [TransportType.WINTER_ROAD]: 1.0, // Зимники доступны
      [TransportType.TAXI]: 1.1,
      [TransportType.UNKNOWN]: 1.0, // Нейтральный коэффициент
    },
    [Season.TRANSITION]: {
      [TransportType.AIRPLANE]: 1.1,
      [TransportType.TRAIN]: 1.0,
      [TransportType.BUS]: 1.0,
      [TransportType.FERRY]: 0.5, // Ограниченное судоходство
      [TransportType.WINTER_ROAD]: 0.5, // Частично доступны
      [TransportType.TAXI]: 1.0,
      [TransportType.UNKNOWN]: 1.0, // Нейтральный коэффициент
    },
    [Season.ALL]: {
      [TransportType.AIRPLANE]: 1.0,
      [TransportType.TRAIN]: 1.0,
      [TransportType.BUS]: 1.0,
      [TransportType.FERRY]: 1.0,
      [TransportType.WINTER_ROAD]: 1.0,
      [TransportType.TAXI]: 1.0,
      [TransportType.UNKNOWN]: 1.0, // Нейтральный коэффициент
    },
  };

  /**
   * Региональные коэффициенты
   */
  private readonly REGION_COEFFICIENTS = {
    russia: 1.0,
    yakutia: 1.3, // В Якутии дороже
    arctic: 1.5, // В Арктике ещё дороже
  };

  /**
   * Коэффициенты класса обслуживания
   */
  private readonly SERVICE_CLASS_COEFFICIENTS = {
    economy: 1.0,
    business: 2.0,
    first: 3.5,
  };

  /**
   * Вычисляет коэффициент даты (динамическое ценообразование)
   * 
   * Чем ближе дата поездки, тем дороже билет
   */
  private calculateDateCoefficient(date?: Date): number {
    if (!date) {
      return 1.0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(date);
    tripDate.setHours(0, 0, 0, 0);
    
    const daysUntilTrip = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilTrip >= 30) {
      return 0.9; // За 30+ дней: скидка 10%
    } else if (daysUntilTrip >= 14) {
      return 1.0; // За 14-30 дней: обычная цена
    } else if (daysUntilTrip >= 7) {
      return 1.1; // За 7-14 дней: +10%
    } else if (daysUntilTrip >= 1) {
      return 1.2; // За 1-7 дней: +20%
    } else {
      return 1.3; // В день поездки: +30%
    }
  }

  /**
   * Вычисляет коэффициент времени отправления
   * 
   * Утренние и ночные рейсы дешевле, вечерние дороже
   */
  private calculateTimeCoefficient(departureTime?: Date): number {
    if (!departureTime) {
      return 1.0;
    }

    const hour = departureTime.getHours();

    if (hour >= 6 && hour < 12) {
      return 1.0; // Утренние (06:00-12:00): обычная цена
    } else if (hour >= 12 && hour < 18) {
      return 1.05; // Дневные (12:00-18:00): +5%
    } else if (hour >= 18 && hour < 24) {
      return 1.1; // Вечерние (18:00-24:00): +10%
    } else {
      return 0.95; // Ночные (00:00-06:00): -5%
    }
  }

  /**
   * Вычисляет коэффициент типа маршрута (для авиа)
   * 
   * Прямые рейсы дешевле, через хабы дороже
   */
  private calculateRouteTypeCoefficient(transportType: TransportType, viaHubsCount: number = 0): number {
    if (transportType !== TransportType.AIRPLANE) {
      return 1.0;
    }

    if (viaHubsCount === 0) {
      return 1.0; // Прямой рейс
    } else if (viaHubsCount === 1) {
      return 1.1; // Через один хаб: +10%
    } else {
      return 1.2; // Через два хаба: +20%
    }
  }

  /**
   * Вычисляет базовую цену для типа транспорта
   */
  public calculateBasePrice(
    transportType: TransportType,
    params: PricingParams,
    viaHubsCount: number = 0
  ): number {
    const baseRate = this.BASE_RATES[transportType] || 5.0;
    const seasonCoeff = this.SEASON_COEFFICIENTS[params.season]?.[transportType] || 1.0;
    const regionCoeff = this.REGION_COEFFICIENTS[params.region || 'russia'] || 1.0;
    const demandCoeff = params.demandCoefficient || 1.0;
    const dateCoeff = this.calculateDateCoefficient(params.date);
    const timeCoeff = this.calculateTimeCoefficient(params.departureTime);
    const routeTypeCoeff = this.calculateRouteTypeCoefficient(transportType, viaHubsCount);

    // Если сезонный коэффициент = 0, транспорт недоступен
    if (seasonCoeff === 0) {
      return 0;
    }

    const basePrice = baseRate * params.distance * seasonCoeff * regionCoeff * demandCoeff 
                     * dateCoeff * timeCoeff * routeTypeCoeff;

    // Применяем коэффициент класса обслуживания (для авиа и ЖД)
    if (
      (transportType === TransportType.AIRPLANE || transportType === TransportType.TRAIN) &&
      params.serviceClass
    ) {
      const classCoeff = this.SERVICE_CLASS_COEFFICIENTS[params.serviceClass] || 1.0;
      return Math.round(basePrice * classCoeff);
    }

    return Math.round(basePrice);
  }

  /**
   * Вычисляет стоимость такси до остановки
   * 
   * Формула: Посадочный тариф + (Расстояние × Тариф за км)
   * 
   * @param distance - Расстояние в километрах
   * @param cityId - ID города (для определения тарифов)
   */
  private calculateTaxiPrice(distance: number, cityId?: string): number {
    // Базовые тарифы по городам (руб/км)
    const taxiRates: Record<string, number> = {
      yakutsk: 35,
      moscow: 25,
      irkutsk: 30,
      mirny: 40,
      default: 30,
    };

    // Посадочные тарифы (руб)
    const boardingFees: Record<string, number> = {
      yakutsk: 120,
      moscow: 175,
      irkutsk: 125,
      mirny: 145,
      default: 120,
    };

    const rate = taxiRates[cityId || 'default'] || taxiRates.default;
    const boardingFee = boardingFees[cityId || 'default'] || boardingFees.default;

    // Минимальная стоимость поездки
    const minPrice = 200;
    const calculatedPrice = boardingFee + (distance * rate);

    return Math.max(minPrice, Math.round(calculatedPrice));
  }

  /**
   * Вычисляет дополнительные расходы
   */
  public calculateAdditionalExpenses(
    transportType: TransportType,
    params: PricingParams,
    basePrice: number,
    cityId?: string
  ): PriceModel['additional'] {
    const additional: PriceModel['additional'] = {
      taxi: 0,
      transfer: 0,
      baggage: 0,
      fees: 0,
    };

    // Такси до/от остановок (с учётом реального расстояния)
    if (params.taxiDistanceToStop && params.taxiDistanceToStop > 0) {
      additional.taxi = this.calculateTaxiPrice(params.taxiDistanceToStop, cityId);
    } else if (transportType === TransportType.AIRPLANE || transportType === TransportType.TRAIN) {
      // Если расстояние не указано, используем оценочное значение
      // Для аэропортов обычно дальше, для вокзалов ближе
      const estimatedDistance = transportType === TransportType.AIRPLANE ? 15 : 5;
      additional.taxi = this.calculateTaxiPrice(estimatedDistance, cityId);
    }

    // Багаж для авиа
    if (transportType === TransportType.AIRPLANE && params.hasBaggage) {
      const baggageWeight = params.baggageWeight || 20; // По умолчанию 20 кг
      if (baggageWeight > 20) {
        // Сверхнормативный багаж: 100-200₽ за каждый кг сверх 20
        const excessWeight = baggageWeight - 20;
        additional.baggage = excessWeight * 150; // Среднее значение
      } else {
        // Нормативный багаж (до 20 кг): 2000-3000₽
        additional.baggage = 2500;
      }
    }

    // Багаж для ЖД (сверх нормы)
    if (transportType === TransportType.TRAIN && params.hasBaggage && params.baggageWeight && params.baggageWeight > 36) {
      const excessWeight = params.baggageWeight - 36; // Норма для ЖД: 36 кг
      additional.baggage = excessWeight * 50; // 50₽ за кг сверх нормы
    }

    // Питание для ЖД
    if (transportType === TransportType.TRAIN && params.needsMeal) {
      // Питание в поезде: 500-1500₽
      additional.baggage = (additional.baggage || 0) + 1000; // Используем поле baggage для питания (можно расширить модель)
    }

    // Страховка
    if (params.needsInsurance) {
      // Страховка: 1-2% от базовой цены, минимум 500₽
      const insurance = Math.max(500, Math.round(basePrice * 0.015));
      additional.fees = (additional.fees || 0) + insurance;
    }

    // Сборы для авиа
    if (transportType === TransportType.AIRPLANE) {
      // Аэропортовый сбор: 500-1000₽
      const airportFee = 750;
      // Сбор за регистрацию: 500-1000₽
      const registrationFee = 750;
      additional.fees = (additional.fees || 0) + airportFee + registrationFee;
    }

    // Сборы для ЖД
    if (transportType === TransportType.TRAIN) {
      // Сервисный сбор: 2% от базовой цены, минимум 200₽
      const serviceFee = Math.max(200, Math.round(basePrice * 0.02));
      additional.fees = (additional.fees || 0) + serviceFee;
    }

    // Доплата за пересадки
    if (params.transfersCount && params.transfersCount > 0) {
      // Доплата за каждую пересадку: 500-1000₽
      additional.transfer = params.transfersCount * 750;
    }

    return additional;
  }

  /**
   * Создаёт модель цены для сегмента маршрута
   */
  public calculatePriceForSegment(
    transportType: TransportType,
    params: PricingParams,
    connection?: CityConnection,
    viaHubsCount: number = 0,
    cityId?: string
  ): PriceModel {
    // Если есть соединение из справочника, используем его цену как базу
    let basePrice: number;
    if (connection && connection.basePrice > 0) {
      basePrice = connection.basePrice;
      // Применяем все коэффициенты (сезонные, региональные, динамические)
      const seasonCoeff = this.SEASON_COEFFICIENTS[params.season]?.[transportType] || 1.0;
      const regionCoeff = this.REGION_COEFFICIENTS[params.region || 'russia'] || 1.0;
      const demandCoeff = params.demandCoefficient || 1.0;
      const dateCoeff = this.calculateDateCoefficient(params.date);
      const timeCoeff = this.calculateTimeCoefficient(params.departureTime);
      const routeTypeCoeff = this.calculateRouteTypeCoefficient(transportType, viaHubsCount);

      if (seasonCoeff === 0) {
        basePrice = 0;
      } else {
        basePrice = Math.round(basePrice * seasonCoeff * regionCoeff * demandCoeff 
                               * dateCoeff * timeCoeff * routeTypeCoeff);
      }
    } else {
      basePrice = this.calculateBasePrice(transportType, params, viaHubsCount);
    }

    const additional = this.calculateAdditionalExpenses(transportType, params, basePrice, cityId);

    return createPriceModel(basePrice, additional);
  }

  /**
   * Вычисляет общую цену для маршрута из нескольких сегментов
   */
  public calculateTotalPrice(segments: Array<{ price: PriceModel }>): PriceModel {
    const totalBase = segments.reduce((sum, seg) => sum + seg.price.base, 0);
    const totalAdditional = segments.reduce(
      (sum, seg) => ({
        taxi: sum.taxi + seg.price.additional.taxi,
        transfer: sum.transfer + seg.price.additional.transfer,
        baggage: sum.baggage + seg.price.additional.baggage,
        fees: sum.fees + seg.price.additional.fees,
      }),
      { taxi: 0, transfer: 0, baggage: 0, fees: 0 }
    );

    return createPriceModel(totalBase, totalAdditional);
  }
}

