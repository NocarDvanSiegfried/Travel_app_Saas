/**
 * Интерфейс валидатора качества данных
 * 
 * Определяет контракт для оценки качества загруженных транспортных данных.
 * Используется для принятия решения о режиме работы системы.
 */

import { ITransportDataset } from '../entities/TransportDataset';
import { IQualityReport, IQualityThresholds } from '../entities/QualityReport';

/**
 * Валидатор качества транспортных данных
 * 
 * Оценивает полноту и корректность данных в датасете.
 * Результатом является отчет с показателями качества по категориям.
 */
export interface IDataQualityValidator {
  /**
   * Валидировать качество транспортных данных
   * 
   * Проверяет полноту маршрутов, остановок, координат, расписания.
   * Рассчитывает взвешенный общий показатель качества (0-100).
   * 
   * @param dataset Датасет для валидации
   * @param thresholds Пороговые значения (опционально)
   * @returns Отчет о качестве данных
   */
  validate(
    dataset: ITransportDataset,
    thresholds?: IQualityThresholds
  ): Promise<IQualityReport>;

  /**
   * Проверить, требуется ли восстановление данных
   * 
   * Определяет на основе отчета о качестве, нужно ли применять восстановление.
   * 
   * @param report Отчет о качестве
   * @returns true если требуется восстановление
   */
  shouldRecover(report: IQualityReport): boolean;

  /**
   * Получить рекомендации по восстановлению
   * 
   * Возвращает список рекомендуемых действий для улучшения качества данных.
   * 
   * @param report Отчет о качестве
   * @returns Массив рекомендаций
   */
  getRecoveryRecommendations(report: IQualityReport): string[];
}







