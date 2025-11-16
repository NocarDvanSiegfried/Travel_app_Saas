/**
 * Сборщик данных о регулярности расписания
 */

import { ScheduleService } from '../../../infrastructure/api/odata-client';
import { IBuiltRoute } from '../../../domain/entities/BuiltRoute';

export class ScheduleRegularityCollector {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * Вычислить регулярность расписания для маршрута
   * Возвращает значение от 0 до 1, где 1 - идеальная регулярность
   */
  async calculateRegularity(route: IBuiltRoute): Promise<number> {
    const regularities: number[] = [];

    for (const segment of route.segments) {
      const routeId = segment.segment.routeId;
      if (!routeId) {
        regularities.push(0);
        continue;
      }

      try {
        const schedule = await this.scheduleService.getScheduleByRoute(routeId);
        if (!schedule || schedule.length === 0) {
          regularities.push(0);
          continue;
        }

        const regularity = this.calculateSegmentRegularity(schedule);
        regularities.push(regularity);
      } catch (error) {
        // Пропускаем ошибки получения расписания
        regularities.push(0);
        continue;
      }
    }

    if (regularities.length === 0) {
      return 0;
    }

    return (
      regularities.reduce((sum, r) => sum + r, 0) / regularities.length
    );
  }

  /**
   * Вычислить регулярность для сегмента
   */
  private calculateSegmentRegularity(
    schedule: Array<{
      ДеньНедели?: number;
      ВремяОтправления?: string;
      Активен?: boolean;
    }>
  ): number {
    const activeSchedule = schedule.filter((s) => s.Активен !== false);

    if (activeSchedule.length === 0) {
      return 0;
    }

    const daysOfWeek = new Set(
      activeSchedule.map((s) => s.ДеньНедели || 0)
    );

    const regularityByDays = daysOfWeek.size / 7;

    const times = activeSchedule
      .map((s) => s.ВремяОтправления)
      .filter((t): t is string => !!t);

    if (times.length === 0) {
      return regularityByDays;
    }

    const timeRegularity = this.calculateTimeRegularity(times);

    return (regularityByDays + timeRegularity) / 2;
  }

  /**
   * Вычислить регулярность времени отправления
   */
  private calculateTimeRegularity(times: string[]): number {
    if (times.length < 2) {
      return 1;
    }

    const timeValues = times
      .map((t) => {
        try {
          const date = new Date(t);
          return date.getHours() * 60 + date.getMinutes();
        } catch {
          return null;
        }
      })
      .filter((t): t is number => t !== null);

    if (timeValues.length < 2) {
      return 1;
    }

    timeValues.sort((a, b) => a - b);

    const intervals: number[] = [];
    for (let i = 1; i < timeValues.length; i++) {
      intervals.push(timeValues[i] - timeValues[i - 1]);
    }

    if (intervals.length === 0) {
      return 1;
    }

    const avgInterval =
      intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    const variance =
      intervals.reduce(
        (sum, i) => sum + Math.pow(i - avgInterval, 2),
        0
      ) / intervals.length;

    const coefficientOfVariation = Math.sqrt(variance) / avgInterval;

    return Math.max(0, 1 - coefficientOfVariation);
  }
}

