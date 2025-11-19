/**
 * Отчет о качестве транспортных данных
 * 
 * Содержит детальную информацию о полноте и корректности загруженных данных.
 * Используется для принятия решения о режиме работы системы (REAL/RECOVERY/MOCK).
 */

/**
 * Отчет о качестве данных
 */
export interface IQualityReport {
  /** Общий показатель качества (0-100) */
  overallScore: number;

  /** Показатель качества маршрутов (0-100) */
  routesScore: number;

  /** Показатель качества остановок (0-100) */
  stopsScore: number;

  /** Показатель качества координат (0-100) */
  coordinatesScore: number;

  /** Показатель качества расписания (0-100) */
  schedulesScore: number;

  /** Время проведения валидации */
  validatedAt: Date;

  /** Список недостающих полей */
  missingFields: string[];

  /** Рекомендации по восстановлению */
  recommendations: string[];

  /** Детальная информация по категориям */
  details?: {
    /** Количество маршрутов с полной информацией */
    completeRoutes?: number;

    /** Количество маршрутов с неполной информацией */
    incompleteRoutes?: number;

    /** Количество остановок без координат */
    stopsWithoutCoordinates?: number;

    /** Количество маршрутов без расписания */
    routesWithoutSchedule?: number;

    /** Дополнительные метрики */
    [key: string]: any;
  };
}

/**
 * Пороговые значения для определения режима работы
 */
export interface IQualityThresholds {
  /** Минимальное качество для режима REAL (по умолчанию 90) */
  realModeThreshold: number;

  /** Минимальное качество для режима RECOVERY (по умолчанию 50) */
  recoveryModeThreshold: number;

  /** Минимальное качество координат для применения восстановления */
  coordinatesThreshold?: number;

  /** Минимальное качество расписания для применения восстановления */
  schedulesThreshold?: number;
}

/**
 * Категории валидации данных
 */
export enum QualityCategory {
  /** Маршруты */
  ROUTES = 'routes',

  /** Остановки */
  STOPS = 'stops',

  /** Координаты */
  COORDINATES = 'coordinates',

  /** Расписание */
  SCHEDULES = 'schedules',

  /** Тарифы */
  TARIFFS = 'tariffs',
}

/**
 * Результат валидации отдельной категории
 */
export interface ICategoryValidation {
  /** Категория */
  category: QualityCategory;

  /** Показатель качества (0-100) */
  score: number;

  /** Количество корректных элементов */
  validCount: number;

  /** Общее количество элементов */
  totalCount: number;

  /** Список проблем */
  issues: string[];
}




