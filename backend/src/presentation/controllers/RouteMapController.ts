/**
 * Route Map Controller
 * 
 * Контроллер для получения данных маршрута для отображения на карте.
 * 
 * Endpoints:
 * - GET /api/v1/routes/map?routeId={routeId} - Получить данные карты по routeId (из кэша)
 * - POST /api/v1/routes/map - Получить данные карты из полного маршрута (body)
 * 
 * @module presentation/controllers
 */

import type { Request, Response } from 'express';
import { BuildRouteMapDataUseCase } from '../../application/route-builder/use-cases/BuildRouteMapDataUseCase';
import { PostgresStopRepository } from '../../infrastructure/repositories/PostgresStopRepository';
import { DatabaseConfig } from '../../infrastructure/config/database.config';
import { routeMapDataQuerySchema, routeMapDataBodySchema } from '../validators/route.validator';
import { getLogger } from '../../shared/logger/Logger';
import { RedisCacheService } from '../../infrastructure/cache/RedisCacheService';
import type { IBuiltRoute } from '../../domain/entities/BuiltRoute';

const logger = getLogger('RouteMapController');
const cacheService = new RedisCacheService();

/**
 * Ключ для кэширования маршрута в Redis
 */
function getRouteCacheKey(routeId: string): string {
  return `route:${routeId}`;
}

/**
 * TTL для кэширования маршрутов (1 час)
 */
const ROUTE_CACHE_TTL = 3600;

/**
 * Get route map data by routeId (GET)
 * 
 * GET /api/v1/routes/map?routeId={routeId}
 * 
 * Query parameters:
 * - routeId: Route identifier (required)
 * 
 * Response:
 * - 200: Success with map data
 * - 400: Validation error (missing routeId)
 * - 404: Route not found in cache
 * - 500: Internal server error
 */
export async function getRouteMapData(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    // ========================================================================
    // Step 1: Validate Query Parameters
    // ========================================================================
    const validationResult = routeMapDataQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors,
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    const { routeId } = validationResult.data;

    // ========================================================================
    // Step 2: Load Route from Cache
    // ========================================================================
    const cacheKey = getRouteCacheKey(routeId);
    const cachedRoute = await cacheService.get<IBuiltRoute>(cacheKey);

    if (!cachedRoute) {
      logger.warn('Route not found in cache', {
        routeId,
        cacheKey,
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route with id ${routeId} not found. Please ensure the route was recently built and cached.`,
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    logger.debug('Route loaded from cache', {
      routeId,
      segmentsCount: cachedRoute.segments.length,
    });

    // ========================================================================
    // Step 3: Initialize Repositories and Use Case
    // ========================================================================
    const pool = DatabaseConfig.getPool();
    const stopRepository = new PostgresStopRepository(pool);
    const useCase = new BuildRouteMapDataUseCase(stopRepository);

    // ========================================================================
    // Step 4: Execute Use Case
    // ========================================================================
    const mapData = await useCase.execute({
      route: cachedRoute,
    });

    // ========================================================================
    // Step 5: Return Response
    // ========================================================================
    const totalExecutionTime = Date.now() - requestStartTime;

    res.status(200).json({
      success: true,
      data: mapData,
      executionTimeMs: totalExecutionTime,
    });
  } catch (error: any) {
    const totalExecutionTime = Date.now() - requestStartTime;
    const errorMessage = error?.message || String(error);

    logger.error('Failed to get route map data', error as Error, {
      routeId: req.query.routeId,
      duration_ms: totalExecutionTime,
    });

    // Определение типа ошибки
    if (errorMessage.includes('Route') && errorMessage.includes('required')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
        },
        executionTimeMs: totalExecutionTime,
      });
    } else if (errorMessage.includes('not found') || errorMessage.includes('empty')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: errorMessage,
        },
        executionTimeMs: totalExecutionTime,
      });
    } else {
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
}

/**
 * Get route map data from full route object (POST)
 * 
 * POST /api/v1/routes/map
 * 
 * Body:
 * - routeId: Route identifier (optional, for caching)
 * - route: Full route object (IBuiltRoute) (required if routeId not provided)
 * 
 * Response:
 * - 200: Success with map data
 * - 400: Validation error
 * - 500: Internal server error
 */
export async function postRouteMapData(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    // ========================================================================
    // Step 1: Validate Body
    // ========================================================================
    const validationResult = routeMapDataBodySchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: errors,
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    const { routeId, route: routeFromBody } = validationResult.data;

    // ========================================================================
    // Step 2: Load Route (from cache or body)
    // ========================================================================
    let route: IBuiltRoute | null = null;

    if (routeId) {
      // Попытка загрузить из кэша
      const cacheKey = getRouteCacheKey(routeId);
      route = await cacheService.get<IBuiltRoute>(cacheKey);

      if (route) {
        logger.debug('Route loaded from cache', {
          routeId,
          segmentsCount: route.segments.length,
        });
      }
    }

    // Если не найден в кэше, используем из body
    if (!route && routeFromBody) {
      route = routeFromBody as IBuiltRoute;
      logger.debug('Route taken from request body', {
        routeId: route.routeId,
        segmentsCount: route.segments.length,
      });

      // Кэшируем маршрут для будущих запросов
      if (route.routeId) {
        const cacheKey = getRouteCacheKey(route.routeId);
        await cacheService.set(cacheKey, route, ROUTE_CACHE_TTL);
        logger.debug('Route cached for future requests', {
          routeId: route.routeId,
          cacheKey,
        });
      }
    }

    if (!route) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Route not provided and not found in cache. Please provide route in body or ensure routeId exists in cache.',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // ========================================================================
    // Step 3: Initialize Repositories and Use Case
    // ========================================================================
    const pool = DatabaseConfig.getPool();
    const stopRepository = new PostgresStopRepository(pool);
    const useCase = new BuildRouteMapDataUseCase(stopRepository);

    // ========================================================================
    // Step 4: Execute Use Case
    // ========================================================================
    const mapData = await useCase.execute({
      route,
    });

    // ========================================================================
    // Step 5: Return Response
    // ========================================================================
    const totalExecutionTime = Date.now() - requestStartTime;

    res.status(200).json({
      success: true,
      data: mapData,
      executionTimeMs: totalExecutionTime,
    });
  } catch (error: any) {
    const totalExecutionTime = Date.now() - requestStartTime;
    const errorMessage = error?.message || String(error);

    logger.error('Failed to build route map data', error as Error, {
      routeId: req.body?.routeId,
      duration_ms: totalExecutionTime,
    });

    // Определение типа ошибки
    if (errorMessage.includes('Route') && errorMessage.includes('required')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
        },
        executionTimeMs: totalExecutionTime,
      });
    } else if (errorMessage.includes('not found') || errorMessage.includes('empty')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: errorMessage,
        },
        executionTimeMs: totalExecutionTime,
      });
    } else {
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
}

