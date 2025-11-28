/**
 * Интерфейс провайдера данных для оценки риска
 * 
 * Определяет контракт для получения данных, необходимых для оценки риска маршрута или сегмента.
 * Реализации могут получать данные из различных источников: OData API, внешние API, кэш и т.д.
 */

import type { IBuiltRoute } from '../../entities/BuiltRoute';
import type { IRouteSegment } from '../../entities/RouteSegment';

/**
 * Контекст для получения данных о риске
 */
export interface IRiskDataContext {
  /**
   * Дата поездки
   */
  date: string;
  
  /**
   * Количество пассажиров
   */
  passengers?: number;
  
  /**
   * Дополнительные параметры контекста
   */
  [key: string]: unknown;
}

/**
 * Интерфейс провайдера данных для оценки риска
 */
export interface IRiskDataProvider {
  /**
   * Получить данные для оценки риска маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными для оценки риска
   */
  getDataForRoute(route: IBuiltRoute, context: IRiskDataContext): Promise<unknown>;
  
  /**
   * Получить данные для оценки риска сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными для оценки риска
   */
  getDataForSegment(segment: IRouteSegment, context: IRiskDataContext): Promise<unknown>;
  
  /**
   * Проверить доступность провайдера
   * 
   * @returns true, если провайдер доступен, false в противном случае
   */
  isAvailable(): Promise<boolean>;
}


