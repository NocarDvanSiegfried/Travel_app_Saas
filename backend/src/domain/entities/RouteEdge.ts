/**
 * Ребро графа маршрутов - связь между остановками
 */

import { IRouteSegment, TransportType } from './RouteSegment';

export interface IRouteEdge {
  fromStopId: string;
  toStopId: string;
  segment: IRouteSegment;
  weight: number;
  availableFlights?: IAvailableFlight[];
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

export class RouteEdge implements IRouteEdge {
  constructor(
    public readonly fromStopId: string,
    public readonly toStopId: string,
    public readonly segment: IRouteSegment,
    public readonly weight: number,
    public readonly availableFlights?: IAvailableFlight[]
  ) {}
}


