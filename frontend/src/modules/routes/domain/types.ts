/**
 * Типы для адаптера данных маршрутов
 * Преобразование из backend структуры (IBuiltRoute) в frontend формат (RouteDetailsData)
 */

export enum TransportType {
  AIRPLANE = 'airplane',
  BUS = 'bus',
  TRAIN = 'train',
  FERRY = 'ferry',
  TAXI = 'taxi',
  WINTER_ROAD = 'winter_road',
  UNKNOWN = 'unknown',
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export interface IRouteSegment {
  segmentId: string;
  fromStopId: string;
  toStopId: string;
  routeId: string;
  transportType: TransportType;
  distance?: number;
  estimatedDuration?: number;
  basePrice?: number;
}

export interface IAvailableFlight {
  flightId: string;
  flightNumber?: string;
  departureTime: string;
  arrivalTime: string;
  price?: number;
  availableSeats: number;
  status?: string;
}

export interface IRouteSegmentDetails {
  segment: IRouteSegment;
  selectedFlight?: IAvailableFlight;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  transferTime?: number;
  /**
   * Оценка риска для сегмента (опционально)
   */
  riskScore?: IRiskScore & {
    factors?: {
      weather?: {
        temperature?: number;
        visibility?: number;
        wind?: number;
        storms?: boolean;
      };
      delays?: {
        avg30: number;
        avg60: number;
        avg90: number;
        delayFreq: number;
      };
      cancellations?: {
        rate30: number;
        rate60: number;
        rate90: number;
        total: number;
      };
      occupancy?: {
        avg: number;
        highLoadPercent: number;
      };
      seasonality?: {
        month: number;
        riskFactor: number;
      };
      schedule?: {
        regularityScore: number;
      };
    };
  };
  /**
   * Предупреждения для сегмента (опционально)
   */
  warnings?: string[];
  /**
   * Валидация сегмента (опционально)
   */
  segmentValidation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface IBuiltRoute {
  routeId: string;
  fromCity: string;
  toCity: string;
  date: string;
  passengers: number;
  segments: IRouteSegmentDetails[];
  totalDuration: number;
  totalPrice: number;
  transferCount: number;
  transportTypes: TransportType[];
  departureTime: string;
  arrivalTime: string;
}

export interface IRiskScore {
  value: number;
  level: RiskLevel;
  description: string;
}

export interface IHistoricalDelayData {
  averageDelay30Days: number;
  averageDelay60Days: number;
  averageDelay90Days: number;
  delayFrequency: number;
}

export interface ICancellationData {
  cancellationRate30Days: number;
  cancellationRate60Days: number;
  cancellationRate90Days: number;
  totalCancellations: number;
}

export interface IOccupancyData {
  averageOccupancy: number;
  highOccupancySegments: number;
  lowAvailabilitySegments: number;
}

export interface IWeatherData {
  riskLevel: number;
  conditions?: string[];
}

export interface ISeasonalityData {
  month: number;
  dayOfWeek: number;
  seasonFactor: number;
}

export interface IRiskFactors {
  transferCount: number;
  transportTypes: string[];
  totalDuration: number;
  historicalDelays: IHistoricalDelayData;
  cancellations: ICancellationData;
  occupancy: IOccupancyData;
  weather?: IWeatherData;
  seasonality: ISeasonalityData;
  scheduleRegularity: number;
}

export interface IRiskAssessment {
  routeId: string;
  riskScore: IRiskScore;
  factors: IRiskFactors;
  recommendations?: string[];
}

/**
 * Типы страховых продуктов
 */
export enum InsuranceProductType {
  /** Страхование багажа */
  BAGGAGE = 'baggage',
  /** Страхование всей семьи */
  FAMILY = 'family',
  /** Страхование поездки (Travel Insurance) */
  TRAVEL = 'travel',
  /** Страхование отмены поездки (Trip Cancellation) */
  TRIP_CANCELLATION = 'trip_cancellation',
  /** Страхование задержки рейса (Delay Coverage) */
  DELAY_COVERAGE = 'delay_coverage',
}

/**
 * Интерфейс страхового продукта
 */
export interface IInsuranceProduct {
  id: string;
  type: InsuranceProductType;
  name: string;
  description: string;
  basePrice: number; // в копейках
  minPrice: number; // в копейках
  maxPrice: number; // в копейках
  riskMultiplier: number;
  minRiskLevel: RiskLevel;
  maxRiskLevel?: RiskLevel;
  isActive: boolean;
  displayOrder: number;
}

/**
 * Интерфейс предложения страхового продукта
 */
export interface IInsuranceOffer {
  product: IInsuranceProduct;
  price: number; // в копейках
  riskScore: IRiskScore;
  isRecommended: boolean;
  priority: number;
}

export enum DataSourceMode {
  REAL = 'real',
  RECOVERY = 'recovery',
  MOCK = 'mock',
  UNKNOWN = 'unknown',
}

/**
 * Данные машинного обучения для маршрута
 * Содержит предсказания и метаданные модели
 */
export interface MLData {
  /**
   * Предсказания модели (задержки, цены и т.д.)
   */
  predictions?: {
    /**
     * Предсказанная задержка в минутах
     */
    delay?: number
    /**
     * Предсказанная цена
     */
    price?: number
  }
  /**
   * Уровень уверенности модели (0-1)
   */
  confidence?: number
  /**
   * Версия модели, использованной для предсказания
   */
  modelVersion?: string
}

/**
 * Данные о занятости сегмента маршрута
 */
export interface OccupancyData {
  /**
   * ID сегмента
   */
  segmentId: string
  /**
   * Количество занятых мест
   */
  occupied: number
  /**
   * Общее количество мест
   */
  total: number
  /**
   * Процент занятости (0-100)
   */
  percentage: number
  /**
   * Дата и время последнего обновления
   */
  lastUpdated?: string
}

export interface IRouteBuilderResult {
  routes: IBuiltRoute[]
  alternatives?: IBuiltRoute[]
  /**
   * Данные машинного обучения для маршрута
   * Содержит предсказания задержек, цен и метаданные модели
   */
  mlData?: MLData
  riskAssessment?: IRiskAssessment
  dataMode?: DataSourceMode | string
  dataQuality?: number
}

export interface RouteDetailsData {
  from: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
    Адрес?: string;
    Координаты?: string;
  };
  to: {
    Ref_Key: string;
    Наименование?: string;
    Код?: string;
    Адрес?: string;
    Координаты?: string;
  };
  date: string;
  routes: Array<{
    route: {
      Ref_Key: string;
      Наименование?: string;
      Код?: string;
      Description?: string;
    };
    segments: Array<{
      from: {
        Наименование?: string;
        Код?: string;
        Адрес?: string;
      } | null;
      to: {
        Наименование?: string;
        Код?: string;
        Адрес?: string;
      } | null;
      order: number;
    }>;
    schedule: Array<{
      type: 'departure' | 'arrival';
      time: string;
      stop: string;
    }>;
    flights: Array<{
      Ref_Key: string;
      НомерРейса?: string;
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
      Статус?: string;
      tariffs: Array<{
        Цена?: number;
        Наименование?: string;
        Код?: string;
      }>;
      /**
       * Данные о занятости по сегментам рейса
       */
      occupancy: Array<OccupancyData>
      availableSeats: number
    }>;
  }>;
  riskAssessment?: {
    riskScore: {
      value: number;
      level: string;
      description: string;
    };
    factors?: {
      transferCount: number;
      historicalDelays?: {
        averageDelay90Days: number;
        delayFrequency: number;
      };
      cancellations?: {
        cancellationRate90Days: number;
      };
      occupancy?: {
        averageOccupancy: number;
      };
    };
    recommendations?: string[];
  };
}

