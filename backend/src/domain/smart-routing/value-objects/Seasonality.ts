import { Season } from '../enums/Season';

/**
 * Сезонность доступности транспорта
 * 
 * Определяет, в какие сезоны доступен маршрут/сегмент
 * 
 * @example
 * ```typescript
 * const seasonality = new Seasonality({
 *   available: true,
 *   season: Season.SUMMER,
 *   period: {
 *     start: '2024-06-01',
 *     end: '2024-10-18'
 *   }
 * });
 * ```
 */
export interface Seasonality {
  /**
   * Доступен ли маршрут в текущий момент
   */
  available: boolean;

  /**
   * Сезон доступности
   */
  season: Season;

  /**
   * Период доступности (опционально, для сезонных маршрутов)
   */
  period?: {
    /**
     * Дата начала доступности (ISO 8601)
     */
    start: string;

    /**
     * Дата окончания доступности (ISO 8601)
     */
    end: string;
  };
}

/**
 * Создаёт модель сезонности
 */
export function createSeasonality(
  season: Season,
  period?: { start: string; end: string },
  currentDate?: Date
): Seasonality {
  const now = currentDate || new Date();
  let available = false;

  if (season === Season.ALL) {
    available = true;
  } else if (period) {
    const start = new Date(period.start);
    const end = new Date(period.end);
    available = now >= start && now <= end;
  } else {
    // Определяем сезон по текущей дате
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    if (season === Season.SUMMER) {
      // Летний период: 1 июня - 18 октября
      available =
        (month === 6 && day >= 1) ||
        (month >= 7 && month <= 9) ||
        (month === 10 && day <= 18);
    } else if (season === Season.WINTER) {
      // Зимний период: 1 ноября - 15 апреля (синхронизировано с getSeasonFromDate)
      available =
        (month === 11 && day >= 1) ||
        month === 12 ||
        month === 1 ||
        month === 2 ||
        month === 3 ||
        (month === 4 && day <= 15);
    } else if (season === Season.TRANSITION) {
      // Переходный период: 16 апреля - 31 мая, 19 октября - 31 октября
      // (ноябрь теперь входит в зимний период)
      available =
        (month === 4 && day >= 16) ||
        month === 5 ||
        (month === 10 && day >= 19 && day <= 31);
    }
  }

  return {
    available,
    season,
    period,
  };
}

/**
 * Проверяет доступность маршрута в указанную дату
 */
export function isAvailableOnDate(seasonality: Seasonality, date: Date): boolean {
  if (seasonality.season === Season.ALL) {
    return true;
  }

  if (seasonality.period) {
    const start = new Date(seasonality.period.start);
    const end = new Date(seasonality.period.end);
    return date >= start && date <= end;
  }

  // Определяем сезон по дате
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (seasonality.season === Season.SUMMER) {
    return (
      (month === 6 && day >= 1) ||
      (month >= 7 && month <= 9) ||
      (month === 10 && day <= 18)
    );
  } else if (seasonality.season === Season.WINTER) {
    return (
      (month === 11 && day >= 1) ||
      month === 12 ||
      month === 1 ||
      month === 2 ||
      month === 3 ||
      (month === 4 && day <= 15)
    );
  } else if (seasonality.season === Season.TRANSITION) {
    return (
      (month === 4 && day >= 16) ||
      month === 5 ||
      (month === 10 && day >= 19 && day <= 31)
    );
  }

  return false;
}




