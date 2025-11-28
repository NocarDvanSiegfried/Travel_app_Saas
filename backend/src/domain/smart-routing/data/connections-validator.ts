/**
 * Валидатор соединений для проверки реалистичности маршрутов
 * 
 * Проверяет:
 * - Автобусные маршруты > 1500 км
 * - Прямые авиарейсы между малыми аэропортами
 * - Нереалистичные расстояния и цены
 */

import type { CityConnection } from './connections-model';
import { ALL_CITIES } from './cities-reference';

/**
 * Результат валидации соединения
 */
export interface ConnectionValidationResult {
  /**
   * Валидно ли соединение
   */
  isValid: boolean;

  /**
   * Причина невалидности (если isValid = false)
   */
  reason?: string;

  /**
   * Рекомендации по исправлению
   */
  recommendations?: string[];
}

/**
 * Валидатор соединений
 */
export class ConnectionsValidator {
  /**
   * Максимальное расстояние для автобусных маршрутов (км)
   */
  private static readonly MAX_BUS_DISTANCE = 1500;

  /**
   * Максимальное расстояние для прямых авиарейсов между малыми аэропортами (км)
   */
  private static readonly MAX_DIRECT_AIRPLANE_DISTANCE_SMALL_AIRPORTS = 500;

  /**
   * Валидирует одно соединение
   */
  public static validateConnection(connection: CityConnection): ConnectionValidationResult {
    // Проверка автобусных маршрутов
    if (connection.type === 'bus') {
      if (connection.distance > this.MAX_BUS_DISTANCE) {
        return {
          isValid: false,
          reason: `Автобусный маршрут ${connection.fromCityId} → ${connection.toCityId} на расстояние ${connection.distance} км превышает максимальное (${this.MAX_BUS_DISTANCE} км)`,
          recommendations: [
            'Удалить прямой автобусный маршрут',
            'Заменить на комбинированный маршрут (авиа + автобус)',
            'Использовать промежуточные города для разбиения маршрута',
          ],
        };
      }
    }

    // Проверка прямых авиарейсов между малыми аэропортами
    if (connection.type === 'airplane' && connection.isDirect) {
      const fromCity = ALL_CITIES.find((c) => c.id === connection.fromCityId);
      const toCity = ALL_CITIES.find((c) => c.id === connection.toCityId);

      if (fromCity && toCity) {
        const fromIsSmallAirport =
          fromCity.infrastructure.hasAirport &&
          fromCity.infrastructure.airportClass === 'D' &&
          !fromCity.isHub;
        const toIsSmallAirport =
          toCity.infrastructure.hasAirport &&
          toCity.infrastructure.airportClass === 'D' &&
          !toCity.isHub;

        // Если оба города - малые аэропорты
        if (fromIsSmallAirport && toIsSmallAirport) {
          if (connection.distance > this.MAX_DIRECT_AIRPLANE_DISTANCE_SMALL_AIRPORTS) {
            return {
              isValid: false,
              reason: `Прямой авиарейс между малыми аэропортами ${connection.fromCityId} → ${connection.toCityId} на расстояние ${connection.distance} км невозможен`,
              recommendations: [
                'Удалить прямой рейс',
                'Использовать маршрут через региональный хаб',
                'Добавить пересадку через Якутск или другой региональный хаб',
              ],
            };
          }
        }

        // Если один из городов - малый аэропорт, а другой - не хаб
        if (
          (fromIsSmallAirport && !toCity.isHub) ||
          (toIsSmallAirport && !fromCity.isHub)
        ) {
          if (connection.distance > this.MAX_DIRECT_AIRPLANE_DISTANCE_SMALL_AIRPORTS) {
            return {
              isValid: false,
              reason: `Прямой авиарейс из малого аэропорта ${fromIsSmallAirport ? connection.fromCityId : connection.toCityId} в не-хаб ${fromIsSmallAirport ? connection.toCityId : connection.fromCityId} на расстояние ${connection.distance} км невозможен`,
              recommendations: [
                'Удалить прямой рейс',
                'Использовать маршрут через региональный хаб',
              ],
            };
          }
        }
      }
    }

    // Проверка нереалистичных расстояний
    if (connection.distance <= 0) {
      return {
        isValid: false,
        reason: `Расстояние должно быть положительным, получено: ${connection.distance}`,
        recommendations: ['Исправить расстояние в данных'],
      };
    }

    if (connection.distance > 10000) {
      return {
        isValid: false,
        reason: `Расстояние ${connection.distance} км слишком большое и может быть ошибкой`,
        recommendations: ['Проверить корректность расстояния'],
      };
    }

    // Проверка нереалистичных цен
    if (connection.basePrice <= 0) {
      return {
        isValid: false,
        reason: `Цена должна быть положительной, получено: ${connection.basePrice}`,
        recommendations: ['Исправить цену в данных'],
      };
    }

    // Проверка нереалистичного времени в пути
    if (connection.duration <= 0) {
      return {
        isValid: false,
        reason: `Время в пути должно быть положительным, получено: ${connection.duration}`,
        recommendations: ['Исправить время в пути в данных'],
      };
    }

    // Проверка скорости (нереалистично медленно или быстро)
    const speedKmh = (connection.distance / connection.duration) * 60; // км/ч
    const minSpeed = 20; // Минимальная скорость (км/ч) - даже автобусы едут быстрее
    const maxSpeed = 1000; // Максимальная скорость (км/ч) - даже самолёты не летят быстрее

    if (speedKmh < minSpeed || speedKmh > maxSpeed) {
      return {
        isValid: false,
        reason: `Скорость ${speedKmh.toFixed(1)} км/ч нереалистична для типа транспорта ${connection.type}`,
        recommendations: [
          'Проверить расстояние и время в пути',
          'Убедиться, что данные соответствуют реальным маршрутам',
        ],
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Валидирует массив соединений и возвращает только валидные
   */
  public static validateAndFilterConnections(
    connections: CityConnection[]
  ): {
    valid: CityConnection[];
    invalid: Array<{ connection: CityConnection; reason: string }>;
  } {
    const valid: CityConnection[] = [];
    const invalid: Array<{ connection: CityConnection; reason: string }> = [];

    for (const connection of connections) {
      const validation = this.validateConnection(connection);
      if (validation.isValid) {
        valid.push(connection);
      } else {
        invalid.push({
          connection,
          reason: validation.reason || 'Неизвестная причина',
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Находит проблемные соединения в массиве
   */
  public static findProblematicConnections(
    connections: CityConnection[]
  ): Array<{ connection: CityConnection; reason: string; recommendations?: string[] }> {
    const problematic: Array<{
      connection: CityConnection;
      reason: string;
      recommendations?: string[];
    }> = [];

    for (const connection of connections) {
      const validation = this.validateConnection(connection);
      if (!validation.isValid) {
        problematic.push({
          connection,
          reason: validation.reason || 'Неизвестная причина',
          recommendations: validation.recommendations,
        });
      }
    }

    return problematic;
  }
}






