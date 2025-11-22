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
  date: string; // Дата опциональна на уровне контроллера, но здесь обязательна для совместимости
  passengers: number;
}

export class RouteBuilder {
  constructor(
    private readonly graphBuilder: RouteGraphBuilder,
    private readonly pathFinder: PathFinder
  ) {}

  /**
   * Построить маршрут между двумя городами (с предварительно построенным графом)
   */
  async buildRouteFromGraph(
    graph: RouteGraph,
    params: IRouteBuilderParams
  ): Promise<IRouteBuilderResult> {
    const { fromCity, toCity, date, passengers } = params;

    // ВАЖНО: Используем переданный граф напрямую, без пересоздания
    console.log(`[RouteBuilder.buildRouteFromGraph] Получен граф: узлов=${graph.getAllNodes().length}, ID=${graph.constructor.name}`);
    const graphStats = graph.getGraphStats();
    console.log(`[RouteBuilder.buildRouteFromGraph] Статистика графа: узлов=${graphStats.nodes}, рёбер=${graphStats.edges}`);

    const fromNodes = graph.findNodesByCity(fromCity);
    const toNodes = graph.findNodesByCity(toCity);

    // Если узлы не найдены, пробуем найти все узлы и проверить, что происходит
    if (fromNodes.length === 0 || toNodes.length === 0) {
      // Пробуем найти все узлы в графе для отладки
      const allNodes = graph.getAllNodes();
      console.log(`[RouteBuilder] Поиск узлов для городов: "${fromCity}" -> "${toCity}"`);
      console.log(`[RouteBuilder] Найдено узлов для fromCity: ${fromNodes.length}, для toCity: ${toNodes.length}`);
      console.log(`[RouteBuilder] Всего узлов в графе: ${allNodes.length}`);
      
      if (allNodes.length > 0) {
        // Проверяем первые 5 узлов для отладки
        const sampleNodes = allNodes.slice(0, Math.min(5, allNodes.length));
        console.log(`[RouteBuilder] Примеры узлов в графе:`, sampleNodes.map(n => ({
          stopId: n.stopId,
          cityName: n.cityName,
          stopName: n.stopName
        })));
      }
      
      return {
        routes: [],
      };
    }

    const routes: IBuiltRoute[] = [];

    for (const fromNode of fromNodes) {
      for (const toNode of toNodes) {
        // ВАЖНО: Передаём тот же граф в PathFinder
        console.log(`[RouteBuilder.buildRouteFromGraph] Поиск пути: ${fromNode.stopId} -> ${toNode.stopId}`);
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
   * Построить маршрут между двумя городами (legacy метод)
   */
  async buildRoute(
    params: IRouteBuilderParams
  ): Promise<IRouteBuilderResult> {
    const { date } = params;
    const graph = await this.graphBuilder.buildGraph(date);
    return this.buildRouteFromGraph(graph, params);
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
    _graph: RouteGraph
  ): Promise<IBuiltRoute | null> {
    console.log(`[RouteBuilder.buildRouteFromPath] Построение маршрута: ${fromCity} -> ${toCity}, сегментов: ${pathResult.path.length}`);
    
    const segments: IRouteSegmentDetails[] = [];
    // Если дата не указана или некорректна, используем текущую дату
    let currentTime: Date;
    try {
      currentTime = date ? new Date(`${date}T00:00:00`) : new Date();
      if (isNaN(currentTime.getTime())) {
        currentTime = new Date(); // Если дата некорректна, используем текущую
      }
    } catch {
      currentTime = new Date(); // Если ошибка парсинга, используем текущую
    }

    console.log(`[RouteBuilder.buildRouteFromPath] Начальное время: ${currentTime.toISOString()}, сегментов для обработки: ${pathResult.path.length}`);

    for (let i = 0; i < pathResult.path.length; i++) {
      console.log(`[RouteBuilder.buildRouteFromPath] Обработка сегмента ${i + 1}/${pathResult.path.length}`);
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
      console.log(`[RouteBuilder.buildRouteFromPath] Сегмент ${i + 1}: ${edge.segment.fromStopId} -> ${edge.segment.toStopId}, доступно рейсов: ${availableFlights.length}`);
      
      const nextFlight = this.findNextAvailableFlight(
        availableFlights,
        currentTime
      );

      // Если рейс не найден на точное время, используем ближайший доступный
      // Это гарантирует, что маршрут будет построен, даже если на конкретную дату нет рейса
      const selectedFlight = nextFlight || availableFlights[0];

      if (!selectedFlight) {
        // Если вообще нет рейсов для этого сегмента - маршрут не может быть построен
        // Это не должно происходить, так как граф строится из всех рейсов
        // Но на всякий случай возвращаем null, чтобы не строить неполный маршрут
        console.log(`[RouteBuilder.buildRouteFromPath] ОШИБКА: Нет доступных рейсов для сегмента ${i + 1}: ${edge.segment.fromStopId} -> ${edge.segment.toStopId}`);
        return null;
      }
      
      console.log(`[RouteBuilder.buildRouteFromPath] Выбран рейс для сегмента ${i + 1}: ${selectedFlight.flightId}, отправление: ${selectedFlight.departureTime}`);

      const departureTime = new Date(selectedFlight.departureTime);
      const arrivalTime = new Date(selectedFlight.arrivalTime);

      // Не проверяем, что departureTime >= currentTime
      // Если рейс в прошлом, это нормально - мы используем ближайший доступный рейс
      // Это позволяет находить маршруты даже если на указанную дату нет рейсов

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
      console.log(`[RouteBuilder.buildRouteFromPath] Сегмент ${i + 1} обработан. Время прибытия: ${arrivalTime.toISOString()}, длительность: ${duration} мин, цена: ${price}`);
    }

    if (segments.length === 0) {
      console.log(`[RouteBuilder.buildRouteFromPath] ОШИБКА: Не создано ни одного сегмента!`);
      return null;
    }
    
    console.log(`[RouteBuilder.buildRouteFromPath] Все сегменты обработаны. Всего сегментов: ${segments.length}`);

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
  /**
   * Найти ближайший доступный рейс после указанного времени
   * 
   * Если рейс на точное время не найден, выбирает ближайший рейс после указанного времени.
   * Это гарантирует, что маршрут будет найден, даже если на конкретную дату нет рейса.
   */
  private findNextAvailableFlight(
    flights: IAvailableFlight[],
    afterTime: Date
  ): IAvailableFlight | null {
    if (flights.length === 0) {
      return null;
    }

    // Фильтруем рейсы, которые доступны (есть места) и после указанного времени
    const availableFlights = flights.filter((f) => {
      const depTime = new Date(f.departureTime);
      return depTime >= afterTime && (f.availableSeats || 0) > 0;
    });

    // Если есть рейсы после указанного времени - возвращаем ближайший
    if (availableFlights.length > 0) {
      return availableFlights.sort((a, b) => {
        const timeA = new Date(a.departureTime).getTime();
        const timeB = new Date(b.departureTime).getTime();
        return timeA - timeB;
      })[0];
    }

    // Если рейсов после указанного времени нет, но есть рейсы вообще - 
    // возвращаем ближайший рейс в будущем (может быть через несколько дней)
    const futureFlights = flights.filter((f) => {
      const depTime = new Date(f.departureTime);
      return depTime > afterTime;
    });

    if (futureFlights.length > 0) {
      return futureFlights.sort((a, b) => {
        const timeA = new Date(a.departureTime).getTime();
        const timeB = new Date(b.departureTime).getTime();
        return timeA - timeB;
      })[0];
    }

    // Если нет рейсов в будущем, но есть рейсы вообще - используем первый доступный
    // (это может быть рейс из прошлого, но лучше показать маршрут, чем ничего)
    const allFlights = flights.filter((f) => (f.availableSeats || 0) > 0);
    if (allFlights.length > 0) {
      return allFlights.sort((a, b) => {
        const timeA = new Date(a.departureTime).getTime();
        const timeB = new Date(b.departureTime).getTime();
        return timeA - timeB;
      })[0];
    }

    return null;
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

