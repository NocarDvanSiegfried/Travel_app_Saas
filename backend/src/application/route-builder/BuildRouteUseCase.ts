/**
 * Use Case для построения маршрута
 */

import { RouteBuilder, IRouteBuilderParams } from './RouteBuilder';
import { RouteGraphBuilder } from './RouteGraphBuilder';
import { PathFinder } from './PathFinder';
import { IRouteBuilderResult } from '../../domain/entities/BuiltRoute';
import { createODataClient } from '../../infrastructure/api/odata-client';
import {
  RoutesService,
  StopsService,
  ScheduleService,
  FlightsService,
  TariffsService,
  SeatOccupancyService,
} from '../../infrastructure/api/odata-client';
import { AssessRouteRiskUseCase } from '../risk-engine';

export interface IBuildRouteRequest {
  fromCity: string;
  toCity: string;
  date: string;
  passengers: number;
}

export class BuildRouteUseCase {
  private routeBuilder: RouteBuilder | null = null;

  constructor() {
    try {
      const odataClient = createODataClient();
      if (!odataClient) {
        return;
      }

      const routesService = new RoutesService(odataClient);
      const stopsService = new StopsService(odataClient);
      const scheduleService = new ScheduleService(odataClient);
      const flightsService = new FlightsService(odataClient);
      const tariffsService = new TariffsService(odataClient);
      const seatOccupancyService = new SeatOccupancyService(odataClient);

      const graphBuilder = new RouteGraphBuilder(
        routesService,
        stopsService,
        scheduleService,
        flightsService,
        tariffsService,
        seatOccupancyService
      );

      const pathFinder = new PathFinder();

      this.routeBuilder = new RouteBuilder(graphBuilder, pathFinder);
    } catch (error) {
      // OData client не создан, будет использоваться fallback
    }
  }

  /**
   * Выполнить построение маршрута
   */
  async execute(request: IBuildRouteRequest): Promise<IRouteBuilderResult> {
    // Если routeBuilder не инициализирован, возвращаем пустой результат
    // Контроллер обработает это и использует fallback
    if (!this.routeBuilder) {
      return {
        routes: [],
      };
    }

    const params: IRouteBuilderParams = {
      fromCity: request.fromCity,
      toCity: request.toCity,
      date: request.date,
      passengers: request.passengers || 1,
    };

    try {
      const result = await this.routeBuilder.buildRoute(params);

      if (result.routes.length > 0 && !result.riskAssessment) {
        try {
          const riskUseCase = new AssessRouteRiskUseCase();
          const riskAssessment = await riskUseCase.execute(result.routes[0]);
          result.riskAssessment = riskAssessment;
        } catch (error) {
          // Оценка риска не удалась, продолжаем без неё
        }
      }

      return result;
    } catch (error) {
      return {
        routes: [],
      };
    }
  }
}

