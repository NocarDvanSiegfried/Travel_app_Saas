/**
 * Test Utilities
 * 
 * Вспомогательные функции для тестов.
 */

import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { Season } from '../../../domain/smart-routing/enums/Season';

/**
 * Создаёт координаты для тестов
 */
export function createTestCoordinates(
  latitude: number,
  longitude: number
): Coordinates {
  return new Coordinates(latitude, longitude);
}

/**
 * Создаёт дату для тестов
 */
export function createTestDate(
  year: number,
  month: number,
  day: number
): Date {
  return new Date(year, month - 1, day);
}

/**
 * Определяет сезон по дате
 */
export function getSeasonFromDate(date: Date): Season {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  if (month === 12 || month === 1 || month === 2 || month === 3 || (month === 4 && day <= 15)) {
    return Season.WINTER;
  } else if (
    (month === 6 && day >= 1) ||
    (month >= 7 && month <= 9) ||
    (month === 10 && day <= 18)
  ) {
    return Season.SUMMER;
  } else {
    return Season.TRANSITION;
  }
}

/**
 * Ожидает промис с таймаутом
 */
export function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      if (await condition()) {
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Создаёт случайное число в диапазоне
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Создаёт случайное число с плавающей точкой в диапазоне
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Создаёт случайную строку
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Создаёт случайный ID города
 */
export function randomCityId(): string {
  return `city-${randomString(8)}`;
}

/**
 * Округляет число до указанного количества знаков после запятой
 */
export function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Проверяет, находятся ли два числа в пределах допуска
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

/**
 * Проверяет, находятся ли два числа в пределах процентного допуска
 */
export function isWithinPercentTolerance(
  actual: number,
  expected: number,
  percentTolerance: number
): boolean {
  const tolerance = (expected * percentTolerance) / 100;
  return isWithinTolerance(actual, expected, tolerance);
}






