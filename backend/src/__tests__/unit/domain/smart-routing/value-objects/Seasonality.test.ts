/**
 * Unit Tests: Seasonality
 * 
 * Тесты для модели сезонности.
 * Цель: 100% покрытие кода.
 * 
 * Проверяет:
 * - Создание сезонности
 * - Проверку доступности по дате
 * - Летний/зимний/переходный периоды
 * - Круглогодичная доступность
 * - Граничные условия
 * - Негативные сценарии
 */

import { createSeasonality, isAvailableOnDate } from '../../../../../domain/smart-routing/value-objects/Seasonality';
import { Season } from '../../../../../domain/smart-routing/enums/Season';
import type { Seasonality } from '../../../../../domain/smart-routing/value-objects/Seasonality';

describe('Seasonality', () => {
  describe('createSeasonality', () => {
    describe('Season.ALL', () => {
      it('should create seasonality for all seasons', () => {
        const seasonality = createSeasonality(Season.ALL);

        expect(seasonality.season).toBe(Season.ALL);
        expect(seasonality.available).toBe(true);
        expect(seasonality.period).toBeUndefined();
      });

      it('should be available at any date for ALL season', () => {
        const dates = [
          new Date('2024-01-15'), // Зима
          new Date('2024-06-15'), // Лето
          new Date('2024-10-15'), // Осень
        ];

        dates.forEach((date) => {
          const seasonality = createSeasonality(Season.ALL, undefined, date);
          expect(seasonality.available).toBe(true);
        });
      });
    });

    describe('Season.SUMMER', () => {
      it('should create seasonality for summer season', () => {
        const summerDate = new Date('2024-07-15');
        const seasonality = createSeasonality(Season.SUMMER, undefined, summerDate);

        expect(seasonality.season).toBe(Season.SUMMER);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on June 1 (start of summer)', () => {
        const date = new Date('2024-06-01');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on June 15 (middle of summer)', () => {
        const date = new Date('2024-06-15');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on July 15 (middle of summer)', () => {
        const date = new Date('2024-07-15');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on August 15 (middle of summer)', () => {
        const date = new Date('2024-08-15');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on September 15 (middle of summer)', () => {
        const date = new Date('2024-09-15');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on October 18 (end of summer)', () => {
        const date = new Date('2024-10-18');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should not be available on October 19 (start of transition)', () => {
        const date = new Date('2024-10-19');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(false);
      });

      it('should not be available on May 31 (end of transition)', () => {
        const date = new Date('2024-05-31');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(false);
      });

      it('should not be available in winter', () => {
        const date = new Date('2024-01-15');
        const seasonality = createSeasonality(Season.SUMMER, undefined, date);
        expect(seasonality.available).toBe(false);
      });
    });

    describe('Season.WINTER', () => {
      it('should create seasonality for winter season', () => {
        const winterDate = new Date('2024-01-15');
        const seasonality = createSeasonality(Season.WINTER, undefined, winterDate);

        expect(seasonality.season).toBe(Season.WINTER);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on December 1 (start of winter)', () => {
        const date = new Date('2024-12-01');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on January 15 (middle of winter)', () => {
        const date = new Date('2024-01-15');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on February 15 (middle of winter)', () => {
        const date = new Date('2024-02-15');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on March 15 (middle of winter)', () => {
        const date = new Date('2024-03-15');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on April 15 (end of winter)', () => {
        const date = new Date('2024-04-15');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should not be available on April 16 (start of transition)', () => {
        const date = new Date('2024-04-16');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(false);
      });

      it('should not be available in summer', () => {
        const date = new Date('2024-07-15');
        const seasonality = createSeasonality(Season.WINTER, undefined, date);
        expect(seasonality.available).toBe(false);
      });
    });

    describe('Season.TRANSITION', () => {
      it('should create seasonality for transition season', () => {
        const transitionDate = new Date('2024-05-15');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, transitionDate);

        expect(seasonality.season).toBe(Season.TRANSITION);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on April 16 (start of spring transition)', () => {
        const date = new Date('2024-04-16');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on May 15 (middle of spring transition)', () => {
        const date = new Date('2024-05-15');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on May 31 (end of spring transition)', () => {
        const date = new Date('2024-05-31');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on October 19 (start of autumn transition)', () => {
        const date = new Date('2024-10-19');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on November 15 (middle of autumn transition)', () => {
        const date = new Date('2024-11-15');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should be available on November 30 (end of autumn transition)', () => {
        const date = new Date('2024-11-30');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(true);
      });

      it('should not be available in summer', () => {
        const date = new Date('2024-07-15');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(false);
      });

      it('should not be available in winter', () => {
        const date = new Date('2024-01-15');
        const seasonality = createSeasonality(Season.TRANSITION, undefined, date);
        expect(seasonality.available).toBe(false);
      });
    });

    describe('with period', () => {
      it('should create seasonality with custom period', () => {
        const period = {
          start: '2024-06-01',
          end: '2024-10-18',
        };
        const date = new Date('2024-07-15');
        const seasonality = createSeasonality(Season.SUMMER, period, date);

        expect(seasonality.period).toEqual(period);
        expect(seasonality.available).toBe(true);
      });

      it('should be available within custom period', () => {
        const period = {
          start: '2024-06-01',
          end: '2024-10-18',
        };
        const date = new Date('2024-07-15');
        const seasonality = createSeasonality(Season.SUMMER, period, date);

        expect(seasonality.available).toBe(true);
      });

      it('should not be available before custom period start', () => {
        const period = {
          start: '2024-06-01',
          end: '2024-10-18',
        };
        const date = new Date('2024-05-31');
        const seasonality = createSeasonality(Season.SUMMER, period, date);

        expect(seasonality.available).toBe(false);
      });

      it('should not be available after custom period end', () => {
        const period = {
          start: '2024-06-01',
          end: '2024-10-18',
        };
        const date = new Date('2024-10-19');
        const seasonality = createSeasonality(Season.SUMMER, period, date);

        expect(seasonality.available).toBe(false);
      });

      it('should be available on period start date', () => {
        const period = {
          start: '2024-06-01',
          end: '2024-10-18',
        };
        const date = new Date('2024-06-01');
        const seasonality = createSeasonality(Season.SUMMER, period, date);

        expect(seasonality.available).toBe(true);
      });

      it('should be available on period end date', () => {
        const period = {
          start: '2024-06-01',
          end: '2024-10-18',
        };
        const date = new Date('2024-10-18');
        const seasonality = createSeasonality(Season.SUMMER, period, date);

        expect(seasonality.available).toBe(true);
      });
    });
  });

  describe('isAvailableOnDate', () => {
    it('should return true for ALL season at any date', () => {
      const seasonality: Seasonality = {
        available: true,
        season: Season.ALL,
      };

      const dates = [
        new Date('2024-01-15'),
        new Date('2024-06-15'),
        new Date('2024-10-15'),
      ];

      dates.forEach((date) => {
        expect(isAvailableOnDate(seasonality, date)).toBe(true);
      });
    });

    it('should return true for SUMMER season in summer', () => {
      const seasonality: Seasonality = {
        available: true,
        season: Season.SUMMER,
      };

      const summerDate = new Date('2024-07-15');
      expect(isAvailableOnDate(seasonality, summerDate)).toBe(true);
    });

    it('should return false for SUMMER season in winter', () => {
      const seasonality: Seasonality = {
        available: false,
        season: Season.SUMMER,
      };

      const winterDate = new Date('2024-01-15');
      expect(isAvailableOnDate(seasonality, winterDate)).toBe(false);
    });

    it('should return true for WINTER season in winter', () => {
      const seasonality: Seasonality = {
        available: true,
        season: Season.WINTER,
      };

      const winterDate = new Date('2024-01-15');
      expect(isAvailableOnDate(seasonality, winterDate)).toBe(true);
    });

    it('should return false for WINTER season in summer', () => {
      const seasonality: Seasonality = {
        available: false,
        season: Season.WINTER,
      };

      const summerDate = new Date('2024-07-15');
      expect(isAvailableOnDate(seasonality, summerDate)).toBe(false);
    });

    it('should return true for TRANSITION season in transition period', () => {
      const seasonality: Seasonality = {
        available: true,
        season: Season.TRANSITION,
      };

      const transitionDate = new Date('2024-05-15');
      expect(isAvailableOnDate(seasonality, transitionDate)).toBe(true);
    });

    it('should return false for TRANSITION season in summer', () => {
      const seasonality: Seasonality = {
        available: false,
        season: Season.TRANSITION,
      };

      const summerDate = new Date('2024-07-15');
      expect(isAvailableOnDate(seasonality, summerDate)).toBe(false);
    });

    it('should use custom period if provided', () => {
      const seasonality: Seasonality = {
        available: true,
        season: Season.SUMMER,
        period: {
          start: '2024-06-01',
          end: '2024-10-18',
        },
      };

      const dateInPeriod = new Date('2024-07-15');
      const dateBeforePeriod = new Date('2024-05-31');
      const dateAfterPeriod = new Date('2024-10-19');

      expect(isAvailableOnDate(seasonality, dateInPeriod)).toBe(true);
      expect(isAvailableOnDate(seasonality, dateBeforePeriod)).toBe(false);
      expect(isAvailableOnDate(seasonality, dateAfterPeriod)).toBe(false);
    });

    it('should handle edge dates correctly', () => {
      const seasonality: Seasonality = {
        available: true,
        season: Season.SUMMER,
      };

      // June 1 - start
      expect(isAvailableOnDate(seasonality, new Date('2024-06-01'))).toBe(true);
      // October 18 - end
      expect(isAvailableOnDate(seasonality, new Date('2024-10-18'))).toBe(true);
      // May 31 - before
      expect(isAvailableOnDate(seasonality, new Date('2024-05-31'))).toBe(false);
      // October 19 - after
      expect(isAvailableOnDate(seasonality, new Date('2024-10-19'))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year dates', () => {
      const seasonality = createSeasonality(Season.SUMMER, undefined, new Date('2024-02-29'));
      expect(seasonality.available).toBe(false); // February is winter
    });

    it('should handle year boundary (December to January)', () => {
      const decDate = new Date('2024-12-31');
      const janDate = new Date('2025-01-01');

      const winterSeasonality = createSeasonality(Season.WINTER, undefined, decDate);
      expect(winterSeasonality.available).toBe(true);

      const winterSeasonality2 = createSeasonality(Season.WINTER, undefined, janDate);
      expect(winterSeasonality2.available).toBe(true);
    });

    it('should handle different years correctly', () => {
      const seasonality2024 = createSeasonality(Season.SUMMER, undefined, new Date('2024-07-15'));
      const seasonality2025 = createSeasonality(Season.SUMMER, undefined, new Date('2025-07-15'));

      expect(seasonality2024.available).toBe(true);
      expect(seasonality2025.available).toBe(true);
    });
  });
});






