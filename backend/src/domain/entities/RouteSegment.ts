/**
 * Сегмент маршрута - часть пути между двумя остановками
 */

export enum TransportType {
  AIRPLANE = 'airplane',
  BUS = 'bus',
  TRAIN = 'train',
  FERRY = 'ferry',
  TAXI = 'taxi',
  UNKNOWN = 'unknown',
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

export class RouteSegment implements IRouteSegment {
  constructor(
    public readonly segmentId: string,
    public readonly fromStopId: string,
    public readonly toStopId: string,
    public readonly routeId: string,
    public readonly transportType: TransportType,
    public readonly distance?: number,
    public readonly estimatedDuration?: number,
    public readonly basePrice?: number
  ) {}
}


