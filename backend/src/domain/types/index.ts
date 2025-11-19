/**
 * Вспомогательные типы для Domain Layer
 * 
 * Содержит utility types для работы с доменными сущностями.
 */

import { ITransportDataset, IRoute, IStop, IFlight } from '../entities/TransportDataset';
import { DataSourceMode } from '../enums/DataSourceMode';
import { IQualityReport } from '../entities/QualityReport';

// Re-export ITransportDataset and related interfaces for convenience
export type { ITransportDataset, IRoute, IStop, IFlight } from '../entities/TransportDataset';

/**
 * Частичный датасет (все поля опциональны)
 */
export type PartialDataset = Partial<ITransportDataset>;

/**
 * Обязательные поля датасета
 */
export type RequiredDatasetFields = Pick<ITransportDataset, 'routes' | 'stops' | 'flights'>;

/**
 * Метаданные датасета
 */
export type DatasetMetadata = Pick<
  ITransportDataset,
  'mode' | 'quality' | 'loadedAt' | 'source' | 'metadata'
>;

/**
 * ID типов для строгой типизации
 */
export type RouteId = string;
export type StopId = string;
export type FlightId = string;

/**
 * Координаты (для удобства использования)
 */
export interface ICoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Фабрика для создания пустого датасета
 */
export interface IDatasetFactory {
  createEmpty(mode: DataSourceMode, source: string): ITransportDataset;
  createFromRoutes(routes: IRoute[], mode: DataSourceMode, source: string): ITransportDataset;
}

/**
 * Предикаты для проверки датасета
 */
export interface IDatasetPredicates {
  isEmpty(dataset: ITransportDataset): boolean;
  hasRoutes(dataset: ITransportDataset): boolean;
  hasStops(dataset: ITransportDataset): boolean;
  hasFlights(dataset: ITransportDataset): boolean;
  hasCoordinates(dataset: ITransportDataset): boolean;
  isValid(dataset: ITransportDataset): boolean;
}

/**
 * Константы качества данных
 */
export const QualityConstants = {
  /** Минимальное качество для режима REAL */
  REAL_MODE_THRESHOLD: 90,
  
  /** Минимальное качество для режима RECOVERY */
  RECOVERY_MODE_THRESHOLD: 50,
  
  /** Максимальное качество */
  MAX_QUALITY: 100,
  
  /** Минимальное качество */
  MIN_QUALITY: 0,
  
  /** Идеальное качество (для mock-данных) */
  PERFECT_QUALITY: 100,
} as const;

/**
 * Веса категорий для расчета общего качества
 */
export const CategoryWeights = {
  routes: 0.4,
  stops: 0.3,
  coordinates: 0.2,
  schedules: 0.1,
} as const;

/**
 * Type guard для проверки режима данных
 */
export function isRealMode(dataset: ITransportDataset): boolean {
  return dataset.mode === DataSourceMode.REAL;
}

export function isRecoveryMode(dataset: ITransportDataset): boolean {
  return dataset.mode === DataSourceMode.RECOVERY;
}

export function isMockMode(dataset: ITransportDataset): boolean {
  return dataset.mode === DataSourceMode.MOCK;
}

/**
 * Type guard для проверки качества
 */
export function isHighQuality(dataset: ITransportDataset): boolean {
  return dataset.quality >= QualityConstants.REAL_MODE_THRESHOLD;
}

export function isMediumQuality(dataset: ITransportDataset): boolean {
  return (
    dataset.quality >= QualityConstants.RECOVERY_MODE_THRESHOLD &&
    dataset.quality < QualityConstants.REAL_MODE_THRESHOLD
  );
}

export function isLowQuality(dataset: ITransportDataset): boolean {
  return dataset.quality < QualityConstants.RECOVERY_MODE_THRESHOLD;
}

/**
 * Результат валидации датасета
 */
export interface IDatasetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Опции для работы с датасетом
 */
export interface IDatasetOptions {
  /** Включить валидацию при создании */
  validate?: boolean;
  
  /** Применить восстановление автоматически */
  autoRecover?: boolean;
  
  /** Кешировать результат */
  cache?: boolean;
  
  /** TTL кеша (секунды) */
  cacheTTL?: number;
}

/**
 * Статистика датасета
 */
export interface IDatasetStats {
  routesCount: number;
  stopsCount: number;
  flightsCount: number;
  stopsWithCoordinates: number;
  routesWithSchedule: number;
  averageStopsPerRoute: number;
  averageFlightsPerRoute: number;
}




