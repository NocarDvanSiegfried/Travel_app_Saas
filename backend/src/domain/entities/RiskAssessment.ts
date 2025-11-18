/**
 * Оценка риска маршрута
 */

export interface IRiskScore {
  value: number;
  level: RiskLevel;
  description: string;
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export interface IRiskAssessment {
  routeId: string;
  riskScore: IRiskScore;
  factors: IRiskFactors;
  recommendations?: string[];
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


