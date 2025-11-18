/**
 * Узел графа маршрутов - остановка
 */

export interface IRouteNode {
  stopId: string;
  stopName: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  cityName?: string;
}

export class RouteNode implements IRouteNode {
  constructor(
    public readonly stopId: string,
    public readonly stopName: string,
    public readonly coordinates?: { lat: number; lng: number },
    public readonly cityName?: string
  ) {}
}


