/**
 * Построитель графа маршрутов из OData данных
 */

import { RouteGraph } from './RouteGraph';
import { RouteEdge, IAvailableFlight } from '../../domain/entities/RouteEdge';
import { RouteSegment, TransportType } from '../../domain/entities/RouteSegment';
import { RouteNode } from '../../domain/entities/RouteNode';
import {
  RoutesService,
  StopsService,
  ScheduleService,
  FlightsService,
  TariffsService,
  SeatOccupancyService,
} from '../../infrastructure/api/odata-client';
import { ODataClient } from '../../infrastructure/api/odata-client';

export class RouteGraphBuilder {
  constructor(
    private readonly routesService: RoutesService,
    private readonly stopsService: StopsService,
    private readonly scheduleService: ScheduleService,
    private readonly flightsService: FlightsService,
    private readonly tariffsService: TariffsService,
    private readonly seatOccupancyService: SeatOccupancyService
  ) {}

  /**
   * Построить граф маршрутов
   */
  async buildGraph(date: string): Promise<RouteGraph> {
    const graph = new RouteGraph();

    const allStops = await this.stopsService.getAllStops();
    const allRoutes = await this.routesService.getAllRoutes();
    const allFlights = await this.flightsService.getFlightsByDate(date);

    for (const stop of allStops) {
      const coordinates = this.parseCoordinates(stop.Координаты);
      const stopName = stop.Наименование || stop.Код || '';
      const cityName = this.extractCityName(stop.Наименование, stop.Адрес, stop.Код);
      const node = new RouteNode(
        stop.Ref_Key,
        stopName,
        coordinates,
        cityName
      );
      graph.addNode(node);
    }

    for (const route of allRoutes) {
      const routeStops = await this.routesService.getRouteStops(
        route.Ref_Key
      );
      const schedule = await this.scheduleService.getScheduleByRoute(
        route.Ref_Key
      );

      const transportType = this.detectTransportType(route);

      for (let i = 0; i < routeStops.length - 1; i++) {
        const fromStop = routeStops[i];
        const toStop = routeStops[i + 1];

        if (!fromStop.Остановка_Key || !toStop.Остановка_Key) continue;

      const routeFlights = allFlights.filter(
        (f) => f.Маршрут_Key === route.Ref_Key
      ) as Array<{
        Ref_Key: string;
        НомерРейса?: string;
        ВремяОтправления?: string;
        ВремяПрибытия?: string;
        Статус?: string;
        Маршрут_Key?: string;
      }>;

        const segment = new RouteSegment(
          `${route.Ref_Key}-${fromStop.Остановка_Key}-${toStop.Остановка_Key}`,
          fromStop.Остановка_Key,
          toStop.Остановка_Key,
          route.Ref_Key,
          transportType,
          undefined,
          this.calculateEstimatedDuration(schedule),
          undefined
        );

        const availableFlights = await this.getAvailableFlights(
          routeFlights,
          fromStop.Остановка_Key,
          toStop.Остановка_Key
        );

        const weight = this.calculateWeight(
          segment,
          availableFlights,
          toStop.Порядок || 0,
          fromStop.Порядок || 0
        );

        const edge = new RouteEdge(
          fromStop.Остановка_Key,
          toStop.Остановка_Key,
          segment,
          weight,
          availableFlights
        );

        graph.addEdge(edge);
      }
    }

    return graph;
  }

  /**
   * Получить доступные рейсы для сегмента
   */
  private async getAvailableFlights(
    flights: Array<{
      Ref_Key: string;
      НомерРейса?: string;
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
      Статус?: string;
      Маршрут_Key?: string;
    }>,
    fromStopId: string,
    toStopId: string
  ): Promise<IAvailableFlight[]> {
    const availableFlights: IAvailableFlight[] = [];

    for (const f of flights) {
      if (!f.ВремяОтправления || !f.ВремяПрибытия) continue;

      const tariffs = await this.tariffsService.getFlightTariffs(f.Ref_Key);
      const availableSeats = await this.seatOccupancyService.getAvailableSeatsCount(
        f.Ref_Key
      );

      const minPrice = tariffs.length > 0
        ? Math.min(...tariffs.map((t) => t.Цена || Infinity).filter((p) => p !== Infinity))
        : undefined;

      availableFlights.push({
        flightId: f.Ref_Key,
        flightNumber: f.НомерРейса,
        departureTime: f.ВремяОтправления,
        arrivalTime: f.ВремяПрибытия,
        price: minPrice,
        availableSeats,
        status: f.Статус,
      });
    }

    return availableFlights.sort((a, b) => {
      const timeA = new Date(a.departureTime).getTime();
      const timeB = new Date(b.departureTime).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Вычислить вес ребра для алгоритма поиска пути
   */
  private calculateWeight(
    segment: RouteSegment,
    flights: IAvailableFlight[],
    toOrder: number,
    fromOrder: number
  ): number {
    let weight = 1000;

    if (segment.estimatedDuration) {
      weight += segment.estimatedDuration * 10;
    }

    if (flights.length === 0) {
      weight += 5000;
    }

    const orderDiff = toOrder - fromOrder;
    if (orderDiff > 1) {
      weight += orderDiff * 100;
    }

    switch (segment.transportType) {
      case TransportType.AIRPLANE:
        weight -= 100;
        break;
      case TransportType.BUS:
        weight += 50;
        break;
      case TransportType.FERRY:
        weight += 200;
        break;
      default:
        weight += 100;
    }

    return weight;
  }

  /**
   * Определить тип транспорта по маршруту
   */
  private detectTransportType(route: {
    Наименование?: string;
    Код?: string;
    Description?: string;
  }): TransportType {
    const name = (
      route.Наименование ||
      route.Код ||
      route.Description ||
      ''
    ).toLowerCase();

    if (name.includes('авиа') || name.includes('самолет')) {
      return TransportType.AIRPLANE;
    }
    if (name.includes('автобус') || name.includes('bus')) {
      return TransportType.BUS;
    }
    if (name.includes('поезд') || name.includes('train')) {
      return TransportType.TRAIN;
    }
    if (name.includes('паром') || name.includes('ferry')) {
      return TransportType.FERRY;
    }
    if (name.includes('такси') || name.includes('taxi')) {
      return TransportType.TAXI;
    }

    return TransportType.UNKNOWN;
  }

  /**
   * Вычислить примерную длительность по расписанию
   */
  private calculateEstimatedDuration(
    schedule: Array<{
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
    }>
  ): number | undefined {
    if (schedule.length === 0) return undefined;

    const durations: number[] = [];

    for (const sch of schedule) {

      if (sch.ВремяОтправления && sch.ВремяПрибытия) {
        try {
          const dep = new Date(sch.ВремяОтправления);
          const arr = new Date(sch.ВремяПрибытия);
          const diff = arr.getTime() - dep.getTime();
          durations.push(Math.max(0, diff / (1000 * 60)));
        } catch {
          continue;
        }
      }
    }

    if (durations.length === 0) return undefined;

    const avgDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avgDuration);
  }

  /**
   * Извлечь название города из наименования остановки или адреса
   */
  private extractCityName(
    наименование?: string,
    адрес?: string,
    код?: string
  ): string {
    if (наименование) {
      const name = наименование.trim();
      const parts = name.split(',');
      if (parts.length > 1) {
        return parts[parts.length - 1].trim();
      }
      if (parts.length === 1) {
        const firstPart = parts[0].trim();
        const words = firstPart.split(/\s+/);
        if (words.length > 1) {
          return words[words.length - 1];
        }
        return firstPart;
      }
    }

    if (адрес) {
      const addressParts = адрес.split(',');
      if (addressParts.length > 0) {
        return addressParts[addressParts.length - 1].trim();
      }
    }

    if (код) {
      return код.trim();
    }

    return наименование || '';
  }

  /**
   * Парсинг координат из строки
   */
  private parseCoordinates(
    coordinates?: string
  ): { lat: number; lng: number } | undefined {
    if (!coordinates) return undefined;

    const parts = coordinates.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    return undefined;
  }
}

