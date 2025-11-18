/**
 * Контроллер для построения маршрутов
 */

import { Request, Response } from 'express';
import { BuildRouteUseCase } from '../../application/route-builder';

/**
 * Поиск маршрутов (алиас для buildRoute)
 */
export async function searchRoute(req: Request, res: Response): Promise<void> {
  return buildRoute(req, res);
}

/**
 * Получить детали маршрута
 */
export async function getRouteDetails(req: Request, res: Response): Promise<void> {
  try {
    const { routeId } = req.query;

    if (!routeId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Параметр routeId обязателен',
        },
      });
      return;
    }

    // TODO: Реализовать получение деталей маршрута по ID
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Получение деталей маршрута пока не реализовано',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Внутренняя ошибка сервера';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * Получить диагностику графа маршрутов
 */
export async function getRouteGraphDiagnostics(req: Request, res: Response): Promise<void> {
  try {
    const { createODataClient } = await import('../../infrastructure/api/odata-client');
    const odataClient = createODataClient();

    if (!odataClient) {
      res.json({
        status: 'error',
        message: 'OData клиент недоступен',
        graph: null,
      });
      return;
    }

    // TODO: Реализовать диагностику графа маршрутов
    res.json({
      status: 'ok',
      message: 'Граф маршрутов доступен',
      graph: {
        nodes: 0,
        edges: 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Внутренняя ошибка сервера';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * Построить маршрут между двумя городами
 */
export async function buildRoute(req: Request, res: Response): Promise<void> {
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
      // Fallback только если OData недоступен
      const { createODataClient } = await import('../../infrastructure/api/odata-client');
      const odataClient = createODataClient();
      if (!odataClient) {
        const { createFallbackRoute } = await import('../../infrastructure/api/odata-client/fallback-data');
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
    // Fallback только если OData недоступен
    const { createODataClient } = await import('../../infrastructure/api/odata-client');
    const odataClient = createODataClient();
    if (!odataClient) {
      const { from, to, date } = req.query;
      if (from && to && date) {
        try {
          const { createFallbackRoute } = await import('../../infrastructure/api/odata-client/fallback-data');
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
        } catch (fallbackError) {
          // Fallback не удался, возвращаем ошибку
        }
      }
    }

    const errorMessage = error instanceof Error 
      ? (error.message.includes('OData') || error.message.includes('authentication') || error.message.includes('timeout')
          ? error.message 
          : 'Ошибка при построении маршрута')
      : 'Внутренняя ошибка сервера';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

