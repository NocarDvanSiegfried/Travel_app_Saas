/**
 * Унифицированный датасет транспортных данных
 * 
 * Представляет загруженные и валидированные данные о транспортной сети.
 * Используется для построения графа маршрутов независимо от источника данных.
 */

import { DataSourceMode } from '../enums/DataSourceMode';

/**
 * Маршрут транспортной сети
 */
export interface IRoute {
  /** Уникальный идентификатор маршрута */
  id: string;

  /** Название маршрута */
  name: string;

  /** Номер маршрута (например, "М-7", "125") */
  routeNumber?: string;

  /** Тип транспорта */
  transportType: string;

  /** Массив идентификаторов остановок в порядке следования */
  stops: string[];

  /** Базовый тариф */
  baseFare?: number;

  /** Дополнительные метаданные */
  metadata?: Record<string, any>;
}

/**
 * Остановка транспортной сети
 */
export interface IStop {
  /** Уникальный идентификатор остановки */
  id: string;

  /** Название остановки */
  name: string;

  /** Координаты остановки */
  coordinates?: {
    /** Широта */
    latitude: number;
    /** Долгота */
    longitude: number;
  };

  /** Тип остановки (автобусная, ж/д вокзал, аэропорт и т.д.) */
  type?: string;

  /** Дополнительные метаданные */
  metadata?: Record<string, any>;
}

/**
 * Рейс (расписание)
 */
export interface IFlight {
  /** Уникальный идентификатор рейса */
  id: string;

  /** Идентификатор маршрута */
  routeId: string;

  /** Время отправления (ISO 8601) */
  departureTime: string;

  /** Время прибытия (ISO 8601) */
  arrivalTime: string;

  /** Идентификатор начальной остановки */
  fromStopId: string;

  /** Идентификатор конечной остановки */
  toStopId: string;

  /** Стоимость рейса */
  price?: number;

  /** Доступные места */
  availableSeats?: number;

  /** Дополнительные метаданные */
  metadata?: Record<string, any>;
}

/**
 * Унифицированный датасет транспортных данных
 * 
 * Содержит все необходимые данные для построения графа маршрутов:
 * маршруты, остановки, расписание и метаданные о качестве данных.
 */
export interface ITransportDataset {
  /** Массив маршрутов */
  routes: IRoute[];

  /** Массив остановок */
  stops: IStop[];

  /** Массив рейсов (расписание) */
  flights: IFlight[];

  /** Режим источника данных */
  mode: DataSourceMode;

  /** Показатель качества данных (0-100) */
  quality: number;

  /** Время загрузки данных */
  loadedAt: Date;

  /** Источник данных (название провайдера) */
  source: string;

  /** Дополнительные метаданные */
  metadata?: {
    /** Флаг применения восстановления данных */
    recoveryApplied?: boolean;

    /** Список восстановленных полей */
    recoveredFields?: string[];

    /** Версия данных */
    version?: string;

    /** Дополнительная информация */
    [key: string]: any;
  };
}

/**
 * Тип-хелпер для проверки пустоты датасета
 */
export interface IDatasetValidation {
  /** Датасет содержит маршруты */
  hasRoutes: boolean;

  /** Датасет содержит остановки */
  hasStops: boolean;

  /** Датасет содержит рейсы */
  hasFlights: boolean;

  /** Датасет пустой */
  isEmpty: boolean;
}




