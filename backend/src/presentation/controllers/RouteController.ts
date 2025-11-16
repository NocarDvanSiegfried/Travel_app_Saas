/**
 * Контроллер для работы с маршрутами через OData API
 */

import { Request, Response } from 'express';
import { createODataClient } from '../../infrastructure/api/odata-client';
import {
  RoutesService,
  StopsService,
  ScheduleService,
  FlightsService,
  TariffsService,
  SeatOccupancyService,
} from '../../infrastructure/api/odata-client';
import { BuildRouteUseCase } from '../../application/route-builder';
import { createFallbackRoute } from '../../infrastructure/api/odata-client/fallback-data';
import { RouteGraphBuilder } from '../../application/route-builder/RouteGraphBuilder';

/**
 * Получить данные маршрута по параметрам поиска
 */
export async function getRouteDetails(req: Request, res: Response): Promise<void> {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Параметры from, to и date обязательны',
        },
      });
      return;
    }

    const fromStr = String(from);
    const toStr = String(to);
    const dateStr = String(date);

    const odataClient = createODataClient();
    if (!odataClient) {
      // Fallback на тестовые данные
      const fallbackRoute = createFallbackRoute(fromStr, toStr, dateStr);
      if (fallbackRoute) {
        res.json({
          from: { Наименование: fromStr, Код: fromStr.toUpperCase() },
          to: { Наименование: toStr, Код: toStr.toUpperCase() },
          date: dateStr,
          routes: [fallbackRoute],
          fallback: true,
        });
        return;
      }
      res.status(503).json({
        error: {
          code: 'ODATA_NOT_AVAILABLE',
          message: 'OData API недоступен и fallback данные не найдены',
        },
      });
      return;
    }

    const routesService = new RoutesService(odataClient);
    const stopsService = new StopsService(odataClient);
    const scheduleService = new ScheduleService(odataClient);
    const flightsService = new FlightsService(odataClient);
    const tariffsService = new TariffsService(odataClient);
    const seatOccupancyService = new SeatOccupancyService(odataClient);

    const allRoutes = await routesService.getAllRoutes();
    const allStops = await stopsService.getAllStops();

    const fromStop = allStops.find(
      (stop) =>
        stop.Наименование?.toLowerCase().includes(fromStr.toLowerCase()) ||
        stop.Код?.toLowerCase() === fromStr.toLowerCase() ||
        stop.Наименование?.toLowerCase() === fromStr.toLowerCase()
    );

    const toStop = allStops.find(
      (stop) =>
        stop.Наименование?.toLowerCase().includes(toStr.toLowerCase()) ||
        stop.Код?.toLowerCase() === toStr.toLowerCase() ||
        stop.Наименование?.toLowerCase() === toStr.toLowerCase()
    );

    if (!fromStop || !toStop) {
      res.status(404).json({
        error: {
          code: 'STOPS_NOT_FOUND',
          message: 'Остановки не найдены',
        },
      });
      return;
    }

    const routesWithStops = await Promise.all(
      allRoutes.map(async (route) => {
        const routeStops = await routesService.getRouteStops(route.Ref_Key);
        const hasFromStop = routeStops.some(
          (rs) => rs.Остановка_Key === fromStop.Ref_Key
        );
        const hasToStop = routeStops.some(
          (rs) => rs.Остановка_Key === toStop.Ref_Key
        );
        const fromIndex = routeStops.findIndex(
          (rs) => rs.Остановка_Key === fromStop.Ref_Key
        );
        const toIndex = routeStops.findIndex(
          (rs) => rs.Остановка_Key === toStop.Ref_Key
        );

        if (hasFromStop && hasToStop && fromIndex < toIndex) {
          return {
            route,
            routeStops: routeStops.slice(fromIndex, toIndex + 1),
            fromIndex,
            toIndex,
          };
        }
        return null;
      })
    );

    const validRoutes = routesWithStops.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    if (validRoutes.length === 0) {
      res.status(404).json({
        error: {
          code: 'ROUTES_NOT_FOUND',
          message: 'Маршруты не найдены',
        },
      });
      return;
    }

    const routeData = await Promise.all(
      validRoutes.map(async ({ route, routeStops }) => {
        const schedule = await scheduleService.getScheduleByRoute(route.Ref_Key);
        const flights = await flightsService.getFlightsByDate(dateStr);
        const routeFlights = flights.filter(
          (f) => f.Маршрут_Key === route.Ref_Key
        );

        const flightsWithDetails = await Promise.all(
          routeFlights.map(async (flight) => {
            const tariffs = await tariffsService.getFlightTariffs(flight.Ref_Key);
            const occupancy = await seatOccupancyService.getSeatOccupancyByFlight(
              flight.Ref_Key
            );
            const availableSeats = await seatOccupancyService.getAvailableSeatsCount(
              flight.Ref_Key
            );

            return {
              ...flight,
              tariffs,
              occupancy,
              availableSeats,
            };
          })
        );

        const segments = await Promise.all(
          routeStops.map(async (rs, index) => {
            if (index === routeStops.length - 1) {
              return null;
            }
            const currentStop = await stopsService.getStopById(
              rs.Остановка_Key || ''
            );
            const nextStop = await stopsService.getStopById(
              routeStops[index + 1]?.Остановка_Key || ''
            );

            return {
              from: currentStop,
              to: nextStop,
              order: rs.Порядок || index,
            };
          })
        );

        return {
          route,
          segments: segments.filter(
            (s): s is NonNullable<typeof s> => s !== null
          ),
          schedule,
          flights: flightsWithDetails,
        };
      })
    );

    res.json({
      from: fromStop,
      to: toStop,
      date: dateStr,
      routes: routeData,
    });
  } catch (error) {
    console.error('Error fetching route details:', error);
    
    // Fallback на тестовые данные
    const { from, to, date } = req.query;
    if (from && to && date) {
      const fromStr = String(from);
      const toStr = String(to);
      const dateStr = String(date);
      const fallbackRoute = createFallbackRoute(fromStr, toStr, dateStr);
      if (fallbackRoute) {
        res.json({
          from: { Наименование: fromStr, Код: fromStr.toUpperCase() },
          to: { Наименование: toStr, Код: toStr.toUpperCase() },
          date: dateStr,
          routes: [fallbackRoute],
          fallback: true,
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
      },
    });
  }
}

/**
 * Поиск маршрута (основной эндпоинт)
 */
export async function searchRoute(req: Request, res: Response): Promise<void> {
  try {
    const { from, to, date, passengers } = req.query;

    if (!from || !to || !date) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Параметры from, to и date обязательны',
        },
      });
      return;
    }

    const useCase = new BuildRouteUseCase();
    const result = await useCase.execute({
      fromCity: String(from),
      toCity: String(to),
      date: String(date),
      passengers: passengers ? parseInt(String(passengers), 10) : 1,
    });

    if (result.routes.length === 0) {
      // Fallback на тестовые данные
      const fallbackRoute = createFallbackRoute(
        String(from),
        String(to),
        String(date)
      );
      if (fallbackRoute) {
        res.json({
          routes: [fallbackRoute],
          alternatives: [],
          fallback: true,
        });
        return;
      }

      res.status(404).json({
        error: {
          code: 'ROUTES_NOT_FOUND',
          message: 'Маршруты не найдены',
        },
      });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error searching route:', error);
    
    // Fallback на тестовые данные
    const { from, to, date } = req.query;
    if (from && to && date) {
      const fromStr = String(from);
      const toStr = String(to);
      const dateStr = String(date);
      const fallbackRoute = createFallbackRoute(fromStr, toStr, dateStr);
      if (fallbackRoute) {
        res.json({
          routes: [fallbackRoute],
          alternatives: [],
          fallback: true,
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
      },
    });
  }
}

/**
 * Диагностика графа маршрутов
 */
export async function getRouteGraphDiagnostics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { date } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];

    const odataClient = createODataClient();
    if (!odataClient) {
      res.status(503).json({
        status: 'error',
        error: {
          code: 'ODATA_NOT_AVAILABLE',
          message: 'OData API недоступен. Используется fallback режим.',
        },
        graph: {
          nodes: [],
          edges: [],
          nodeCount: 0,
          edgeCount: 0,
          fallback: true,
        },
      });
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

    const graph = await graphBuilder.buildGraph(targetDate);

    const allNodes = graph.getAllNodes();
    const allEdges: any[] = [];
    
    // Собираем все рёбра из всех узлов
    allNodes.forEach((node) => {
      const edges = graph.getEdgesFrom(node.stopId);
      allEdges.push(...edges.map((edge) => ({
        from: edge.fromStopId,
        to: edge.toStopId,
        routeId: edge.segment?.routeId || '',
        transportType: edge.segment?.transportType || 'unknown',
        availableFlights: edge.availableFlights?.length || 0,
      })));
    });

    res.json({
      status: 'ok',
      date: targetDate,
      graph: {
        nodes: allNodes.map((node) => ({
          stopId: node.stopId,
          stopName: node.stopName,
          cityName: node.cityName,
          coordinates: node.coordinates,
        })),
        edges: allEdges,
        nodeCount: allNodes.length,
        edgeCount: allEdges.length,
      },
    });
  } catch (error) {
    console.error('Error getting route graph diagnostics:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
      },
    });
  }
}

