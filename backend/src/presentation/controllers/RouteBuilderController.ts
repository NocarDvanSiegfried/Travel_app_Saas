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
 * Построить маршрут между двумя городами (оптимизированная версия)
 * 
 * Использует новую архитектуру Phase 2:
 * - Graph из Redis (readonly)
 * - OptimizedBuildRouteUseCase
 * - Быстрый поиск (< 10ms)
 * 
 * Параметры:
 * - from (обязательный) - город отправления
 * - to (обязательный) - город назначения
 * - date (опциональный) - дата поездки (если не указана, используется текущая дата)
 * - passengers (опциональный) - количество пассажиров (по умолчанию 1)
 */
export async function buildRoute(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    // Получаем параметры из query или body
    const fromCity = (req.query.from || req.body?.from) as string;
    const toCity = (req.query.to || req.body?.to) as string;
    const dateStr = (req.query.date || req.body?.date) as string;
    const passengersStr = (req.query.passengers || req.body?.passengers) as string;

    // Проверяем обязательные параметры
    if (!fromCity || !toCity) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Параметры "from" и "to" обязательны',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Парсим дату (по умолчанию сегодня)
    let date: Date;
    try {
      date = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Неверный формат даты. Используйте YYYY-MM-DD.',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Парсим количество пассажиров (по умолчанию 1)
    const passengers = passengersStr ? parseInt(passengersStr, 10) : 1;
    if (isNaN(passengers) || passengers < 1 || passengers > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Количество пассажиров должно быть от 1 до 100',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

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
      } else if (result.error?.includes('No stops found') || result.error?.includes('No path found')) {
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

