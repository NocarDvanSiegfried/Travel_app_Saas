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
    const errorMessage = error instanceof Error 
      ? (error.message.includes('OData') || error.message.includes('authentication') || error.message.includes('timeout')
          ? error.message 
          : 'Ошибка при оценке риска маршрута')
      : 'Внутренняя ошибка сервера';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

