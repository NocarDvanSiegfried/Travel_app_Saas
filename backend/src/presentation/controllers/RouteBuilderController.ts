/**
 * Контроллер для построения маршрутов
 */

import { Request, Response } from 'express';
import { BuildRouteUseCase } from '../../application/route-builder';

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
      // Fallback на тестовые данные
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
    console.error('Error building route:', error);
    
    // Fallback на тестовые данные
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
        console.error('Fallback route creation failed:', fallbackError);
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

