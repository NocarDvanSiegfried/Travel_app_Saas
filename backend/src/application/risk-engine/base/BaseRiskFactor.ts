/**
 * Базовый класс для факторов риска
 * 
 * Предоставляет общую реализацию для факторов риска, упрощая создание новых факторов.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type {
  IRiskFactor,
  IRiskFactorResult,
} from '../../../domain/interfaces/risk-engine/IRiskFactor';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';

/**
 * Базовый класс для факторов риска
 */
export abstract class BaseRiskFactor implements IRiskFactor {
  /**
   * Уникальное имя фактора
   */
  abstract readonly name: string;
  
  /**
   * Приоритет фактора (чем выше, тем раньше вычисляется)
   */
  abstract readonly priority: number;
  
  /**
   * Вычислить вклад фактора для маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @param data - Данные от провайдеров
   * @returns Promise с результатом оценки фактора
   */
  abstract calculateForRoute(
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
  abstract calculateForSegment(
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
  abstract isApplicable(transportType: TransportType): boolean;
  
  /**
   * Создать результат фактора с дефолтными значениями
   * 
   * @param value - Значение фактора
   * @param weight - Вес фактора
   * @param description - Описание фактора
   * @param metadata - Дополнительные метаданные
   * @returns Результат фактора
   */
  protected createResult(
    value: number,
    weight: number,
    description: string,
    metadata?: Record<string, unknown>
  ): IRiskFactorResult {
    return {
      value,
      weight,
      description,
      metadata,
    };
  }
}

