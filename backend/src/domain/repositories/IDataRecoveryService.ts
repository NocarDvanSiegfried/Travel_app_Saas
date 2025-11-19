/**
 * Интерфейс сервиса восстановления данных
 * 
 * Определяет контракт для автоматического восстановления недостающих или некорректных данных.
 * Применяется при работе в режиме RECOVERY.
 */

import { ITransportDataset } from '../entities/TransportDataset';
import { IQualityReport } from '../entities/QualityReport';

/**
 * Результат восстановления данных
 */
export interface IRecoveryResult {
  /** Восстановленный датасет */
  dataset: ITransportDataset;

  /** Флаг успешного восстановления */
  success: boolean;

  /** Количество восстановленных элементов */
  recoveredCount: number;

  /** Список применённых операций восстановления */
  appliedOperations: string[];

  /** Новый показатель качества после восстановления */
  newQuality?: number;
}

/**
 * Сервис восстановления транспортных данных
 * 
 * Автоматически восстанавливает недостающие данные:
 * - Координаты остановок (геокодирование, интерполяция)
 * - Расписание (генерация по шаблонам)
 * - Названия остановок (fallback значения)
 */
export interface IDataRecoveryService {
  /**
   * Восстановить транспортные данные
   * 
   * Применяет различные алгоритмы восстановления в зависимости от типа недостающих данных.
   * 
   * @param dataset Исходный датасет с неполными данными
   * @param qualityReport Отчет о качестве для определения проблем
   * @returns Результат восстановления с новым датасетом
   */
  recover(
    dataset: ITransportDataset,
    qualityReport: IQualityReport
  ): Promise<IRecoveryResult>;

  /**
   * Восстановить координаты остановок
   * 
   * Использует интерполяцию между соседними остановками или fallback на центр региона.
   * 
   * @param dataset Датасет с остановками без координат
   * @returns Датасет с восстановленными координатами
   */
  recoverCoordinates(dataset: ITransportDataset): Promise<ITransportDataset>;

  /**
   * Восстановить расписание маршрутов
   * 
   * Генерирует расписание на основе шаблонов для типа транспорта.
   * 
   * @param dataset Датасет с маршрутами без расписания
   * @returns Датасет с восстановленным расписанием
   */
  recoverSchedules(dataset: ITransportDataset): Promise<ITransportDataset>;

  /**
   * Заполнить недостающие названия
   * 
   * Устанавливает fallback названия для остановок и маршрутов без имён.
   * 
   * @param dataset Датасет с объектами без названий
   * @returns Датасет с заполненными названиями
   */
  fillMissingNames(dataset: ITransportDataset): Promise<ITransportDataset>;
}

/**
 * Опции восстановления данных
 */
export interface IRecoveryOptions {
  /** Восстанавливать координаты */
  recoverCoordinates?: boolean;

  /** Восстанавливать расписание */
  recoverSchedules?: boolean;

  /** Заполнять недостающие названия */
  fillNames?: boolean;

  /** Fallback координаты центра региона */
  regionCenter?: {
    latitude: number;
    longitude: number;
  };

  /** Дополнительные параметры */
  [key: string]: any;
}




