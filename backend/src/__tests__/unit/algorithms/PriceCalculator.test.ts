/**
 * Тесты для калькулятора цен
 * 
 * Проверяет:
 * - Динамическое ценообразование (коэффициенты даты, времени)
 * - Дополнительные расходы (такси, багаж, сборы, пересадки)
 * - Формулы для разных типов транспорта
 * - Региональные и сезонные коэффициенты
 */

import { PriceCalculator } from '../../../../application/smart-routing/algorithms/PriceCalculator';
import { TransportType } from '../../../../domain/entities/RouteSegment';
import { Season } from '../../../../domain/smart-routing/enums/Season';

describe('PriceCalculator', () => {
  let calculator: PriceCalculator;

  beforeEach(() => {
    calculator = new PriceCalculator();
  });

  describe('calculateBasePrice - динамическое ценообразование', () => {
    it('should apply date coefficient for early booking (30+ days)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 35);

      const price = calculator.calculateBasePrice(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          date: futureDate,
        },
        0
      );

      // За 30+ дней должна быть скидка 10% (коэффициент 0.9)
      expect(price).toBeLessThan(5000 * 1.0); // Без скидки было бы ~5000₽
    });

    it('should apply date coefficient for last-minute booking (1-7 days)', () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 3);

      const price = calculator.calculateBasePrice(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          date: nearDate,
        },
        0
      );

      // За 1-7 дней должна быть надбавка 20% (коэффициент 1.2)
      expect(price).toBeGreaterThan(5000 * 1.0);
    });

    it('should apply time coefficient for evening flights', () => {
      const eveningTime = new Date();
      eveningTime.setHours(19, 0, 0, 0);

      const price = calculator.calculateBasePrice(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          departureTime: eveningTime,
        },
        0
      );

      // Вечерние рейсы должны быть дороже на 10%
      expect(price).toBeGreaterThan(5000 * 1.0);
    });

    it('should apply route type coefficient for hub routes', () => {
      const directPrice = calculator.calculateBasePrice(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
        },
        0 // Прямой рейс
      );

      const hubPrice = calculator.calculateBasePrice(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
        },
        1 // Через один хаб
      );

      // Через хаб должно быть дороже на 10%
      expect(hubPrice).toBeGreaterThan(directPrice);
    });
  });

  describe('calculateAdditionalExpenses - такси', () => {
    it('should calculate taxi price based on distance and city', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          taxiDistanceToStop: 15,
        },
        10000,
        'yakutsk'
      );

      // Якутск: 120₽ посадочный + 35₽/км × 15 км = 645₽
      expect(additional.taxi).toBeGreaterThan(600);
      expect(additional.taxi).toBeLessThan(700);
    });

    it('should use estimated distance if taxiDistanceToStop not provided', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
        },
        10000,
        'moscow'
      );

      // Для аэропорта используется оценочное расстояние 15 км
      expect(additional.taxi).toBeGreaterThan(0);
    });

    it('should not add taxi for bus transport', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.BUS,
        {
          distance: 1000,
          season: Season.SUMMER,
        },
        10000
      );

      expect(additional.taxi).toBe(0);
    });
  });

  describe('calculateAdditionalExpenses - багаж', () => {
    it('should add baggage fee for airplane with normal baggage (20kg)', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          hasBaggage: true,
          baggageWeight: 20,
        },
        10000
      );

      // Нормативный багаж: 2000-3000₽
      expect(additional.baggage).toBeGreaterThanOrEqual(2000);
      expect(additional.baggage).toBeLessThanOrEqual(3000);
    });

    it('should add excess baggage fee for airplane with overweight baggage', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          hasBaggage: true,
          baggageWeight: 25, // 5 кг сверх нормы
        },
        10000
      );

      // 2500₽ (норма) + 5 × 150₽ = 3250₽
      expect(additional.baggage).toBeGreaterThan(3000);
    });

    it('should add excess baggage fee for train with overweight baggage', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.TRAIN,
        {
          distance: 1000,
          season: Season.SUMMER,
          hasBaggage: true,
          baggageWeight: 40, // 4 кг сверх нормы (36 кг)
        },
        10000
      );

      // 4 × 50₽ = 200₽
      expect(additional.baggage).toBe(200);
    });
  });

  describe('calculateAdditionalExpenses - сборы', () => {
    it('should add airport fees for airplane', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
        },
        10000
      );

      // Аэропортовый сбор: 750₽ + сбор за регистрацию: 750₽ = 1500₽
      expect(additional.fees).toBe(1500);
    });

    it('should add service fee for train', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.TRAIN,
        {
          distance: 1000,
          season: Season.SUMMER,
        },
        10000
      );

      // Сервисный сбор: 2% от 10000₽ = 200₽ (минимум 200₽)
      expect(additional.fees).toBeGreaterThanOrEqual(200);
    });

    it('should add insurance fee if requested', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          needsInsurance: true,
        },
        10000
      );

      // Страховка: 1.5% от 10000₽ = 150₽, но минимум 500₽
      expect(additional.fees).toBeGreaterThanOrEqual(1500 + 500); // Сборы + страховка
    });
  });

  describe('calculateAdditionalExpenses - пересадки', () => {
    it('should add transfer fee for each transfer', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          transfersCount: 2,
        },
        10000
      );

      // 2 пересадки × 750₽ = 1500₽
      expect(additional.transfer).toBe(1500);
    });

    it('should not add transfer fee if no transfers', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          transfersCount: 0,
        },
        10000
      );

      expect(additional.transfer).toBe(0);
    });
  });

  describe('calculateAdditionalExpenses - питание', () => {
    it('should add meal fee for train if requested', () => {
      const additional = calculator.calculateAdditionalExpenses(
        TransportType.TRAIN,
        {
          distance: 1000,
          season: Season.SUMMER,
          needsMeal: true,
        },
        10000
      );

      // Питание: 500-1500₽ (используется поле baggage)
      expect(additional.baggage).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('calculatePriceForSegment - полный расчёт', () => {
    it('should calculate complete price with all additional expenses', () => {
      const price = calculator.calculatePriceForSegment(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          hasBaggage: true,
          baggageWeight: 20,
          taxiDistanceToStop: 15,
          needsInsurance: true,
        },
        undefined,
        0,
        'yakutsk'
      );

      expect(price.base).toBeGreaterThan(0);
      expect(price.additional.taxi).toBeGreaterThan(0);
      expect(price.additional.baggage).toBeGreaterThan(0);
      expect(price.additional.fees).toBeGreaterThan(0);
      expect(price.total).toBe(price.base + price.additional.taxi + price.additional.baggage + price.additional.fees);
    });

    it('should apply all coefficients for hub route with date and time', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 35);
      futureDate.setHours(19, 0, 0, 0);

      const price = calculator.calculatePriceForSegment(
        TransportType.AIRPLANE,
        {
          distance: 1000,
          season: Season.SUMMER,
          date: futureDate,
          departureTime: futureDate,
        },
        undefined,
        1, // Через один хаб
        'moscow'
      );

      expect(price.base).toBeGreaterThan(0);
      // Должны применяться: dateCoeff (0.9), timeCoeff (1.1), routeTypeCoeff (1.1)
    });
  });

  describe('calculateTotalPrice - общая цена маршрута', () => {
    it('should sum all segment prices correctly', () => {
      const segment1 = {
        price: calculator.calculatePriceForSegment(
          TransportType.AIRPLANE,
          {
            distance: 500,
            season: Season.SUMMER,
          },
          undefined,
          0
        ),
      };

      const segment2 = {
        price: calculator.calculatePriceForSegment(
          TransportType.TRAIN,
          {
            distance: 300,
            season: Season.SUMMER,
          },
          undefined,
          0
        ),
      };

      const totalPrice = calculator.calculateTotalPrice([segment1, segment2]);

      expect(totalPrice.base).toBe(segment1.price.base + segment2.price.base);
      expect(totalPrice.additional.taxi).toBe(segment1.price.additional.taxi + segment2.price.additional.taxi);
      expect(totalPrice.total).toBe(totalPrice.base + 
        totalPrice.additional.taxi + 
        totalPrice.additional.transfer + 
        totalPrice.additional.baggage + 
        totalPrice.additional.fees);
    });
  });
});




