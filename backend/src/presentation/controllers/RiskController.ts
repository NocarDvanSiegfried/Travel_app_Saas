/**
 * Контроллер для оценки риска маршрута
 */

import { Request, Response } from 'express';
import { AssessRouteRiskUseCase } from '../../application/risk-engine';
import { IBuiltRoute } from '../../domain/entities/BuiltRoute';

/**
 * Оценить риск маршрута
 * Принимает тело в формате: { "route": { ... } } или { ... } (маршрут напрямую)
 */
export async function assessRouteRisk(req: Request, res: Response): Promise<void> {
  try {
    // Поддержка формата { "route": { ... } } и прямого формата { ... }
    const body = req.body || {};
    const route: IBuiltRoute = (body.route || body) as IBuiltRoute;

    if (!route) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Тело запроса должно содержать маршрут в формате { "route": { ... } } или { ... }',
        },
      });
      return;
    }

    // Валидация обязательных полей маршрута
    if (!route.routeId || !route.segments || !Array.isArray(route.segments) || route.segments.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Маршрут должен содержать routeId и непустой массив segments',
          details: {
            hasRouteId: !!route.routeId,
            hasSegments: !!route.segments,
            segmentsLength: route.segments?.length || 0,
          },
        },
      });
      return;
    }

    const useCase = new AssessRouteRiskUseCase();
    const assessment = await useCase.execute(route);

    res.json(assessment);
  } catch (error) {
    console.error('Error assessing route risk:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
      },
    });
  }
}

