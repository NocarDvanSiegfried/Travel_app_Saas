/**
 * Основной класс для построения маршрутов
 */

import { RouteGraph } from './RouteGraph';
import { RouteGraphBuilder } from './RouteGraphBuilder';
import { PathFinder } from './PathFinder';
import {
  IBuiltRoute,
  IRouteSegmentDetails,
  IRouteBuilderResult,
  IRouteMLData,
  IRouteSegmentMLData,
} from '../../domain/entities/BuiltRoute';
import { IAvailableFlight } from '../../domain/entities/RouteEdge';
import { TransportType } from '../../domain/entities/RouteSegment';
import { AssessRouteRiskUseCase } from '../risk-engine';

export interface IRouteBuilderParams {
  fromCity: string;
  toCity: string;
  date: string;
  passengers: number;
}

export class RouteBuilder {
  constructor(
    private readonly graphBuilder: RouteGraphBuilder,
    private readonly pathFinder: PathFinder
  ) {}

  /**
   * Построить маршрут между двумя городами
   */
  async buildRoute(
    params: IRouteBuilderParams
  ): Promise<IRouteBuilderResult> {
    const { fromCity, toCity, date, passengers } = params;

    const graph = await this.graphBuilder.buildGraph(date);

    const fromNodes = graph.findNodesByCity(fromCity);
    const toNodes = graph.findNodesByCity(toCity);

    if (fromNodes.length === 0 || toNodes.length === 0) {
      return {
        routes: [],
      };
    }

    const routes: IBuiltRoute[] = [];

    for (const fromNode of fromNodes) {
      for (const toNode of toNodes) {
        const pathResult = this.pathFinder.findShortestPath(
          graph,
          fromNode.stopId,
          toNode.stopId,
          date
        );

        if (pathResult && pathResult.path.length > 0) {
          const builtRoute = await this.buildRouteFromPath(
            pathResult,
            fromNode.stopName,
            toNode.stopName,
            date,
            passengers,
            graph
          );
          if (builtRoute) {
            routes.push(builtRoute);
          }
        }
      }
    }

    routes.sort((a, b) => {
      if (a.totalDuration !== b.totalDuration) {
        return a.totalDuration - b.totalDuration;
      }
      return a.totalPrice - b.totalPrice;
    });

    const primaryRoute = routes[0];
    const alternatives = routes.slice(1, 4);

    const mlData = primaryRoute
      ? this.prepareMLData(primaryRoute)
      : undefined;

    let riskAssessment = undefined;
    if (primaryRoute) {
      try {
        const riskUseCase = new AssessRouteRiskUseCase();
        riskAssessment = await riskUseCase.execute(primaryRoute);
      } catch (error) {
        // Оценка риска не удалась, продолжаем без неё
      }
    }

    return {
      routes: primaryRoute ? [primaryRoute] : [],
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      mlData,
      riskAssessment,
    };
  }

  /**
   * Построить маршрут из пути
   */
  private async buildRouteFromPath(
    pathResult: { path: unknown[]; totalDuration: number; totalPrice: number },
    fromCity: string,
    toCity: string,
    date: string,
    passengers: number,
    graph: RouteGraph
  ): Promise<IBuiltRoute | null> {
    const segments: IRouteSegmentDetails[] = [];
    let currentTime = new Date(`${date}T00:00:00`);

    for (let i = 0; i < pathResult.path.length; i++) {
      const edge = pathResult.path[i] as {
        segment: {
          segmentId: string;
          fromStopId: string;
          toStopId: string;
          routeId: string;
          transportType: TransportType;
          estimatedDuration?: number;
        };
        availableFlights?: IAvailableFlight[];
      };

      const availableFlights = edge.availableFlights || [];
      const nextFlight = this.findNextAvailableFlight(
        availableFlights,
        currentTime
      );

      if (!nextFlight && availableFlights.length === 0) {
        return null;
      }

      const selectedFlight = nextFlight || availableFlights[0];

      const departureTime = new Date(selectedFlight.departureTime);
      const arrivalTime = new Date(selectedFlight.arrivalTime);

      if (departureTime < currentTime) {
        return null;
      }

      const duration = Math.round(
        (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60)
      );

      const price = (selectedFlight.price || 0) * passengers;

      const transferTime =
        i > 0
          ? Math.max(
              0,
              Math.round(
                (departureTime.getTime() - currentTime.getTime()) / (1000 * 60)
              )
            )
          : 0;

      segments.push({
        segment: edge.segment,
        selectedFlight,
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
        duration,
        price,
        transferTime: transferTime > 0 ? transferTime : undefined,
      });

      currentTime = arrivalTime;
    }

    if (segments.length === 0) {
      return null;
    }

    const totalDuration = segments.reduce(
      (sum, seg) => sum + seg.duration + (seg.transferTime || 0),
      0
    );
    const totalPrice = segments.reduce((sum, seg) => sum + seg.price, 0);
    const transferCount = segments.filter((seg) => seg.transferTime).length;
    const transportTypes = segments.map((seg) => seg.segment.transportType);

    return {
      routeId: `route-${Date.now()}`,
      fromCity,
      toCity,
      date,
      passengers,
      segments,
      totalDuration,
      totalPrice,
      transferCount,
      transportTypes: Array.from(new Set(transportTypes)),
      departureTime: segments[0].departureTime,
      arrivalTime: segments[segments.length - 1].arrivalTime,
    };
  }

  /**
   * Найти ближайший доступный рейс
   */
  private findNextAvailableFlight(
    flights: IAvailableFlight[],
    afterTime: Date
  ): IAvailableFlight | null {
    const availableFlights = flights.filter((f) => {
      const depTime = new Date(f.departureTime);
      return depTime >= afterTime && (f.availableSeats || 0) > 0;
    });

    if (availableFlights.length === 0) {
      return null;
    }

    return availableFlights.sort((a, b) => {
      const timeA = new Date(a.departureTime).getTime();
      const timeB = new Date(b.departureTime).getTime();
      return timeA - timeB;
    })[0];
  }

  /**
   * Подготовить данные для ML-модели
   */
  private prepareMLData(route: IBuiltRoute): IRouteMLData {
    const segmentMLData: IRouteSegmentMLData[] = route.segments.map(
      (seg) => ({
        segmentId: seg.segment.segmentId,
        transportType: seg.segment.transportType,
        distance: seg.segment.distance,
        duration: seg.duration,
        price: seg.price,
        occupancyRate:
          seg.selectedFlight?.availableSeats !== undefined
            ? 1 - seg.selectedFlight.availableSeats / 100
            : undefined,
      })
    );

    const complexity =
      route.transferCount * 2 +
      route.segments.length +
      (route.totalDuration > 1440 ? 1 : 0);

    return {
      routeId: route.routeId,
      segments: segmentMLData,
      totalMetrics: {
        totalDuration: route.totalDuration,
        totalPrice: route.totalPrice,
        transferCount: route.transferCount,
        complexity,
      },
      riskFactors: {
        delayRisk: this.calculateDelayRisk(route),
        availabilityRisk: this.calculateAvailabilityRisk(route),
      },
    };
  }

  /**
   * Вычислить риск задержки
   */
  private calculateDelayRisk(route: IBuiltRoute): number {
    let risk = 0;

    for (const seg of route.segments) {
      if (seg.segment.transportType === TransportType.AIRPLANE) {
        risk += 0.1;
      } else if (seg.segment.transportType === TransportType.FERRY) {
        risk += 0.2;
      } else {
        risk += 0.15;
      }

      if (seg.transferTime && seg.transferTime < 30) {
        risk += 0.1;
      }
    }

    return Math.min(1, risk);
  }

  /**
   * Вычислить риск доступности
   */
  private calculateAvailabilityRisk(route: IBuiltRoute): number {
    let risk = 0;

    for (const seg of route.segments) {
      const availableSeats = seg.selectedFlight?.availableSeats || 0;
      if (availableSeats === 0) {
        risk += 0.5;
      } else if (availableSeats < 10) {
        risk += 0.2;
      }
    }

    return Math.min(1, risk / route.segments.length);
  }
}

