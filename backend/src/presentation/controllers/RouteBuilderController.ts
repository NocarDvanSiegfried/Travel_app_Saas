/**
 * Контроллер для построения маршрутов (оптимизированная версия)
 * 
 * Использует новую архитектуру Phase 2:
 * - OptimizedBuildRouteUseCase
 * - Graph из Redis
 * - Readonly режим
 */

import { Request, Response } from 'express';
import { OptimizedBuildRouteUseCase } from '../../application/route-builder/use-cases';
import type { BuildRouteRequest } from '../../application/route-builder/use-cases';
import { DatabaseConfig } from '../../infrastructure/config/database.config';
import { RedisConfig } from '../../infrastructure/config/redis.config';
import { PostgresGraphRepository } from '../../infrastructure/repositories/PostgresGraphRepository';
import { PostgresFlightRepository } from '../../infrastructure/repositories/PostgresFlightRepository';
import { PostgresStopRepository } from '../../infrastructure/repositories/PostgresStopRepository';
import { PostgresRouteRepository } from '../../infrastructure/repositories/PostgresRouteRepository';
import { getStartupResult } from '../../index';

/**
 * @swagger
 * /routes/search:
 *   get:
 *     summary: Поиск маршрутов между городами
 *     description: Ищет маршруты между двумя городами. Использует оптимизированный алгоритм поиска на основе графа маршрутов.
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Город отправления
 *         example: Москва
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Город назначения
 *         example: Санкт-Петербург
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата поездки (по умолчанию - сегодня)
 *         example: 2024-12-20
 *       - in: query
 *         name: passengers
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Количество пассажиров
 *     responses:
 *       200:
 *         description: Маршруты успешно найдены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 executionTimeMs:
 *                   type: integer
 *                 graphAvailable:
 *                   type: boolean
 *                 graphVersion:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       503:
 *         description: Граф недоступен
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function searchRoute(req: Request, res: Response): Promise<void> {
  return buildRoute(req, res);
}

/**
 * @swagger
 * /routes/details:
 *   get:
 *     summary: Получить детали маршрута
 *     description: Возвращает детальную информацию о маршруте по его ID (пока не реализовано)
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID маршрута
 *     responses:
 *       501:
 *         description: Функционал пока не реализован
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getRouteDetails(req: Request, res: Response): Promise<void> {
  try {
    // routeId уже валидирован через middleware
    const _routeId = req.query.routeId;

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
 * Получить диагностику графа маршрутов (оптимизированная версия)
 */
export async function getRouteGraphDiagnostics(req: Request, res: Response): Promise<void> {
  try {
    const startup = getStartupResult();

    if (!startup?.metrics?.graphAvailable) {
      res.status(503).json({
        success: false,
        graphAvailable: false,
        message: 'Граф недоступен',
      });
      return;
    }

    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();

    const graphRepository = new PostgresGraphRepository(pool, redis);

    // Получаем статистику графа из Redis
    const stats = await graphRepository.getGraphStatistics();
    const metadata = await graphRepository.getGraphMetadata();

    res.status(200).json({
      success: true,
      graphAvailable: true,
      version: stats.version,
      statistics: {
        totalNodes: stats.totalNodes,
        totalEdges: stats.totalEdges,
        averageEdgesPerNode: stats.averageEdgesPerNode,
        densityPercentage: stats.densityPercentage,
      },
      metadata: {
        buildTimestamp: metadata ? new Date(metadata.buildTimestamp).toISOString() : null,
        datasetVersion: metadata?.datasetVersion,
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * @swagger
 * /routes/build:
 *   get:
 *     summary: Построить маршрут между двумя городами
 *     description: Строит оптимальный маршрут между двумя городами с использованием графа маршрутов. Использует оптимизированный алгоритм поиска.
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Город отправления
 *         example: Москва
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Город назначения
 *         example: Санкт-Петербург
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата поездки (по умолчанию - сегодня)
 *         example: 2024-12-20
 *       - in: query
 *         name: passengers
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Количество пассажиров
 *     responses:
 *       200:
 *         description: Маршрут успешно построен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 executionTimeMs:
 *                   type: integer
 *                 graphAvailable:
 *                   type: boolean
 *                 graphVersion:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       503:
 *         description: Граф недоступен
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function buildRoute(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    // Получаем параметры из query (уже валидированы через middleware)
    const fromCity = req.query.from as string;
    const toCity = req.query.to as string;
    const dateStr = req.query.date as string | undefined;
    const passengers = Number(req.query.passengers) || 1;

    // Парсим дату (по умолчанию сегодня)
    const date = dateStr ? new Date(dateStr) : new Date();

    // Проверяем доступность графа
    const startup = getStartupResult();
    if (!startup?.metrics?.graphAvailable) {
      res.status(503).json({
        success: false,
        error: {
          code: 'GRAPH_NOT_AVAILABLE',
          message: 'Граф недоступен. Запустите фоновый worker для построения графа.',
        },
        graphAvailable: false,
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Инициализируем репозитории
    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();

    const graphRepository = new PostgresGraphRepository(pool, redis);
    const flightRepository = new PostgresFlightRepository(pool);
    const stopRepository = new PostgresStopRepository(pool);
    const routeRepository = new PostgresRouteRepository(pool);

    // Выполняем поиск маршрута
    const useCase = new OptimizedBuildRouteUseCase(
      graphRepository,
      flightRepository,
      stopRepository,
      routeRepository
    );

    const request: BuildRouteRequest = {
      fromCity,
      toCity,
      date,
      passengers,
    };

    const result = await useCase.execute(request);
    const totalExecutionTime = Date.now() - requestStartTime;

    // Возвращаем результат
    if (result.success) {
      res.status(200).json({
        success: true,
        routes: result.routes,
        alternatives: result.alternatives,
        riskAssessment: result.riskAssessment,
        executionTimeMs: totalExecutionTime,
        graphVersion: result.graphVersion,
        graphAvailable: result.graphAvailable,
      });
    } else {
      // Маршруты не найдены
      if (result.error?.includes('not available')) {
        res.status(503).json({
          success: false,
          error: {
            code: 'GRAPH_NOT_AVAILABLE',
            message: result.error,
          },
          executionTimeMs: totalExecutionTime,
          graphAvailable: result.graphAvailable,
        });
      } else if (result.error?.includes('out of sync') || result.error?.includes('Missing nodes')) {
        // Graph synchronization issue - return 503 to indicate service degradation
        res.status(503).json({
          success: false,
          error: {
            code: 'GRAPH_OUT_OF_SYNC',
            message: result.error,
          },
          executionTimeMs: totalExecutionTime,
          graphAvailable: result.graphAvailable,
          graphVersion: result.graphVersion,
        });
      } else if (result.error?.includes('No stops found')) {
        // Stops not found in database - 404 is correct
        res.status(404).json({
          success: false,
          error: {
            code: 'STOPS_NOT_FOUND',
            message: result.error,
          },
          executionTimeMs: totalExecutionTime,
          graphAvailable: result.graphAvailable,
          graphVersion: result.graphVersion,
        });
      } else if (result.error?.includes('No route found') || result.error?.includes('No path found')) {
        // Route not found between existing stops - 404 is correct
        res.status(404).json({
          success: false,
          error: {
            code: 'ROUTES_NOT_FOUND',
            message: result.error,
          },
          executionTimeMs: totalExecutionTime,
          graphAvailable: result.graphAvailable,
          graphVersion: result.graphVersion,
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error,
          },
          executionTimeMs: totalExecutionTime,
        });
      }
    }
  } catch (error: any) {
    const totalExecutionTime = Date.now() - requestStartTime;
    const errorMessage = error?.message || String(error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      executionTimeMs: totalExecutionTime,
    });
  }
}

