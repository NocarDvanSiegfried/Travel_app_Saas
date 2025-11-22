/**
 * Построенный маршрут - результат работы route-builder
 */

import { IRouteSegment, TransportType } from './RouteSegment';
import { IAvailableFlight } from './RouteEdge';
import { IRiskAssessment } from './RiskAssessment';

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

export interface IRouteBuilderResult {
  routes: IBuiltRoute[];
  alternatives?: IBuiltRoute[];
  mlData?: IRouteMLData;
  riskAssessment?: IRiskAssessment;

  /**
   * Режим источника данных (опционально, только при USE_ADAPTIVE_DATA_LOADING=true)
   * @see DataSourceMode для возможных значений
   */
  dataMode?: string;

  /**
   * Показатель качества транспортных данных (0-100)
   * Опционально, только при USE_ADAPTIVE_DATA_LOADING=true
   */
  dataQuality?: number;
}

export interface IRouteMLData {
  routeId: string;
  segments: IRouteSegmentMLData[];
  totalMetrics: {
    totalDuration: number;
    totalPrice: number;
    transferCount: number;
    complexity: number;
  };
  riskFactors: {
    weatherRisk?: number;
    delayRisk?: number;
    availabilityRisk?: number;
  };
}

export interface IRouteSegmentMLData {
  segmentId: string;
  transportType: TransportType;
  distance?: number;
  duration: number;
  price: number;
  historicalDelay?: number;
  occupancyRate?: number;
}

