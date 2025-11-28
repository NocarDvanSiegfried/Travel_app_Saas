/**
 * Интерфейс фактора риска
 * 
 * Определяет контракт для факторов, влияющих на оценку риска маршрута или сегмента.
 * Каждый фактор вычисляет свой вклад в общую оценку риска.
 */

import type { IBuiltRoute } from '../../entities/BuiltRoute';
import type { IRouteSegment } from '../../entities/RouteSegment';
import { TransportType } from '../../entities/RouteSegment';
import type { IRiskDataContext } from './IRiskDataProvider';

/**
 * Результат оценки фактора риска
 */
export interface IRiskFactorResult {
  /**
   * Значение фактора (обычно от 0 до максимального значения)
   */
  value: number;
  
  /**
   * Вес фактора в общей оценке
   */
  weight: number;
  
  /**
   * Описание фактора
   */
  description: string;
  
  /**
   * Дополнительные метаданные
   */
  metadata?: Record<string, unknown>;
}

/**
 * Интерфейс фактора риска
 */
export interface IRiskFactor {
  /**
   * Уникальное имя фактора
   */
  readonly name: string;
  
  /**
   * Приоритет фактора (чем выше, тем раньше вычисляется)
   */
  readonly priority: number;
  
  /**
   * Вычислить вклад фактора для маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @param data - Данные от провайдеров
   * @returns Promise с результатом оценки фактора
   */
  calculateForRoute(
    route: IBuiltRoute,
    context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult>;
  
  /**
   * Вычислить вклад фактора для сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @param data - Данные от провайдеров
   * @returns Promise с результатом оценки фактора
   */
  calculateForSegment(
    segment: IRouteSegment,
    context: IRiskDataContext,
    data: Map<string, unknown>
  ): Promise<IRiskFactorResult>;
  
  /**
   * Проверить, применим ли фактор к типу транспорта
   * 
   * @param transportType - Тип транспорта
   * @returns true, если фактор применим
   */
  isApplicable(transportType: TransportType): boolean;
}

