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

export interface IRouteBuilderResult {
  routes: IBuiltRoute[];
  alternatives?: IBuiltRoute[];
  mlData?: unknown;
  riskAssessment?: IRiskAssessment;
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
      occupancy: Array<unknown>;
      availableSeats: number;
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
