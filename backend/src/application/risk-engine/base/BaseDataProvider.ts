/**
 * Базовый класс для провайдеров данных
 * 
 * Предоставляет общую реализацию для провайдеров данных, упрощая создание новых провайдеров.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import type {
  IRiskDataProvider,
  IRiskDataContext,
} from '../../../domain/interfaces/risk-engine/IRiskDataProvider';

/**
 * Базовый класс для провайдеров данных
 */
export abstract class BaseDataProvider implements IRiskDataProvider {
  /**
   * Получить данные для оценки риска маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными для оценки риска
   */
  abstract getDataForRoute(route: IBuiltRoute, context: IRiskDataContext): Promise<unknown>;
  
  /**
   * Получить данные для оценки риска сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными для оценки риска
   */
  abstract getDataForSegment(segment: IRouteSegment, context: IRiskDataContext): Promise<unknown>;
  
  /**
   * Проверить доступность провайдера
   * 
   * @returns true, если провайдер доступен, false в противном случае
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.checkAvailability();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Проверить доступность провайдера (внутренний метод)
   * 
   * @throws Error, если провайдер недоступен
   */
  protected abstract checkAvailability(): Promise<void>;
  
  /**
   * Обработать ошибку получения данных
   * 
   * @param error - Ошибка
   * @param fallback - Значение по умолчанию
   * @returns Значение по умолчанию или выбрасывает ошибку
   */
  protected handleError<T>(error: unknown, fallback?: T): T {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}


