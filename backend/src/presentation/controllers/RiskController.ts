/**
 * Контроллер для оценки риска маршрута
 */

import type { Request, Response } from 'express';
import { AssessRouteRiskUseCase, AssessSegmentRiskUseCase } from '../../application/risk-engine';
import type { IBuiltRoute } from '../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../domain/entities/RouteSegment';
import { RiskContext } from '../../application/risk-engine/base/RiskContext';

/**
 * @swagger
 * /routes/risk/assess:
 *   post:
 *     summary: Оценить риск маршрута
 *     description: Оценивает уровень риска для заданного маршрута на основе исторических данных, погодных условий, дорожных условий и других факторов. Возвращает оценку риска в диапазоне от 1 до 10.
 *     tags: [Risk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - route
 *                 properties:
 *                   route:
 *                     type: object
 *                     required:
 *                       - routeId
 *                       - segments
 *                     properties:
 *                       routeId:
 *                         type: string
 *                         description: Уникальный идентификатор маршрута
 *                       segments:
 *                         type: array
 *                         minItems: 1
 *                         items:
 *                           type: object
 *                       totalDuration:
 *                         type: number
 *                         description: Общая длительность маршрута в минутах
 *                       totalPrice:
 *                         type: number
 *                         description: Общая цена маршрута
 *               - type: object
 *                 required:
 *                   - routeId
 *                   - segments
 *                 properties:
 *                   routeId:
 *                     type: string
 *                   segments:
 *                     type: array
 *                     minItems: 1
 *           example:
 *             route:
 *               routeId: "route-123"
 *               fromCity: "Москва"
 *               toCity: "Санкт-Петербург"
 *               date: "2024-12-25"
 *               passengers: 2
 *               segments:
 *                 - segmentId: "seg-1"
 *                   transportType: "airplane"
 *               totalDuration: 120
 *               totalPrice: 5000
 *     responses:
 *       200:
 *         description: Оценка риска успешно выполнена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - routeId
 *                 - riskScore
 *                 - factors
 *               properties:
 *                 routeId:
 *                   type: string
 *                   description: ID маршрута
 *                 riskScore:
 *                   $ref: '#/components/schemas/RiskScore'
 *                 factors:
 *                   type: object
 *                   description: Факторы риска
 *                   properties:
 *                     transferCount:
 *                       type: number
 *                     transportTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     historicalDelays:
 *                       type: object
 *                     cancellations:
 *                       type: object
 *                     occupancy:
 *                       type: object
 *                     weather:
 *                       type: object
 *                     seasonality:
 *                       type: object
 *                     scheduleRegularity:
 *                       type: number
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Рекомендации по снижению риска
 *             example:
 *               routeId: "route-123"
 *               riskScore:
 *                 value: 5
 *                 level: "medium"
 *                 description: "Средний риск задержек"
 *               factors:
 *                 transferCount: 1
 *                 transportTypes: ["airplane"]
 *                 historicalDelays:
 *                   averageDelay30Days: 15
 *                   averageDelay60Days: 18
 *                   averageDelay90Days: 20
 *                   delayFrequency: 0.1
 *                 cancellations:
 *                   cancellationRate30Days: 0.02
 *                   cancellationRate60Days: 0.03
 *                   cancellationRate90Days: 0.04
 *                   totalCancellations: 5
 *                 occupancy:
 *                   averageOccupancy: 0.75
 *                   highOccupancySegments: 1
 *                   lowAvailabilitySegments: 0
 *                 weather:
 *                   riskLevel: 0.2
 *                   conditions: []
 *                 seasonality:
 *                   month: 12
 *                   dayOfWeek: 3
 *                   seasonFactor: 1.1
 *                 scheduleRegularity: 0.9
 *               recommendations:
 *                 - "Рекомендуем оформить страховку на случай задержек"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
/**
 * Оценить риск маршрута
 * 
 * @param req - Express request
 * @param res - Express response
 */
export async function assessRouteRisk(req: Request, res: Response): Promise<void> {
  try {
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

/**
 * @swagger
 * /routes/risk/segment:
 *   post:
 *     summary: Оценить риск сегмента маршрута
 *     description: Оценивает уровень риска для отдельного сегмента маршрута на основе типа транспорта, погодных условий и других факторов.
 *     tags: [Risk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - segment
 *             properties:
 *               segment:
 *                 type: object
 *                 required:
 *                   - segmentId
 *                   - fromStopId
 *                   - toStopId
 *                   - routeId
 *                   - transportType
 *                 properties:
 *                   segmentId:
 *                     type: string
 *                     description: Уникальный идентификатор сегмента
 *                   fromStopId:
 *                     type: string
 *                     description: ID остановки отправления
 *                   toStopId:
 *                     type: string
 *                     description: ID остановки назначения
 *                   routeId:
 *                     type: string
 *                     description: ID маршрута
 *                   transportType:
 *                     type: string
 *                     enum: [airplane, train, bus, ferry, taxi, winter_road]
 *                     description: Тип транспорта
 *                   distance:
 *                     type: number
 *                     description: Расстояние в километрах
 *                   estimatedDuration:
 *                     type: number
 *                     description: Ожидаемая длительность в минутах
 *                   basePrice:
 *                     type: number
 *                     description: Базовая цена
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Дата поездки (опционально, по умолчанию текущая дата)
 *               passengers:
 *                 type: number
 *                 description: Количество пассажиров (опционально)
 *           example:
 *             segment:
 *               segmentId: "seg-123"
 *               fromStopId: "stop-1"
 *               toStopId: "stop-2"
 *               routeId: "route-456"
 *               transportType: "airplane"
 *               distance: 500
 *               estimatedDuration: 120
 *               basePrice: 5000
 *             date: "2024-12-25"
 *             passengers: 2
 *     responses:
 *       200:
 *         description: Оценка риска сегмента успешно выполнена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 segmentId:
 *                   type: string
 *                   description: ID сегмента
 *                 riskScore:
 *                   $ref: '#/components/schemas/RiskScore'
 *                 segment:
 *                   type: object
 *                   description: Сегмент маршрута
 *                 factors:
 *                   type: object
 *                   description: Факторы риска
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Рекомендации
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function assessSegmentRisk(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;
    const segment: IRouteSegment = (body.segment || body) as IRouteSegment;
    const date = body.date || new Date().toISOString().split('T')[0];
    const passengers = body.passengers || 1;

    const context = new RiskContext(date, passengers);
    const useCase = new AssessSegmentRiskUseCase();
    const assessment = await useCase.execute(segment, context);

    res.json(assessment);
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? (error.message.includes('OData') || error.message.includes('authentication') || error.message.includes('timeout')
          ? error.message 
          : 'Ошибка при оценке риска сегмента')
      : 'Внутренняя ошибка сервера';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

