/**
 * Контроллер для оценки риска маршрута
 */

import { Request, Response } from 'express';
import { AssessRouteRiskUseCase } from '../../application/risk-engine';
import { IBuiltRoute } from '../../domain/entities/BuiltRoute';

/**
 * @swagger
 * /routes/risk/assess:
 *   post:
 *     summary: Оценить риск маршрута
 *     description: Оценивает уровень риска для заданного маршрута на основе исторических данных, погодных условий и других факторов.
 *     tags: [Risk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               route:
 *                 type: object
 *                 description: Объект маршрута для оценки риска
 *           example:
 *             route:
 *               fromCity: Москва
 *               toCity: Санкт-Петербург
 *               segments: []
 *     responses:
 *       200:
 *         description: Оценка риска успешно выполнена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 riskLevel:
 *                   type: number
 *                   description: Уровень риска (0-1)
 *                 factors:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function assessRouteRisk(req: Request, res: Response): Promise<void> {
  try {
    // Тело запроса уже валидировано через middleware
    // Поддержка формата { "route": { ... } } и прямого формата { ... }
    const body = req.body;
    const route: IBuiltRoute = (body.route || body) as IBuiltRoute;

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

