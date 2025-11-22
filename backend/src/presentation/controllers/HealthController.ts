/**
 * Health Check Controller
 * 
 * Provides health check endpoints for monitoring and orchestration:
 * - /health - General health status
 * - /health/live - Liveness probe (service is running)
 * - /health/ready - Readiness probe (service is ready to accept traffic)
 */

import { Request, Response } from 'express';
import { getStartupResult } from '../../index';
import { DatabaseConfig } from '../../infrastructure/config/database.config';
import { RedisConnection } from '../../infrastructure/cache';
import { getLogger } from '../../shared/logger/Logger';

const logger = getLogger('HealthController');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Общая проверка здоровья сервиса
 *     description: Возвращает общий статус здоровья сервиса, включая состояние подключений к БД, Redis и доступность графа маршрутов.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Сервис работает нормально
 *       503:
 *         description: Сервис работает в деградированном режиме
 */
export async function check(req: Request, res: Response): Promise<void> {
  try {
    const startupResult = getStartupResult();
    const metrics = startupResult?.metrics;

    // Check database connection
    let dbStatus = 'unknown';
    let dbResponseTime = 0;
    try {
      const dbStartTime = Date.now();
      await DatabaseConfig.testConnection();
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
      logger.warn('Database health check failed', { error: (error as Error).message });
    }

    // Check Redis connection
    let redisStatus = 'unknown';
    let redisResponseTime = 0;
    try {
      const redis = RedisConnection.getInstance();
      const redisStartTime = Date.now();
      const isConnected = await redis.ping();
      redisResponseTime = Date.now() - redisStartTime;
      redisStatus = isConnected ? 'connected' : 'disconnected';
    } catch (error) {
      redisStatus = 'disconnected';
      logger.warn('Redis health check failed', { error: (error as Error).message });
    }

    // Determine overall status
    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';
    const status = isHealthy ? 'ok' : 'degraded';

    res.status(isHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        redis: {
          status: redisStatus,
          responseTime: `${redisResponseTime}ms`,
        },
        graph: {
          available: metrics?.graphAvailable || false,
          version: metrics?.graphVersion || null,
        },
      },
      startup: {
        totalDurationMs: metrics?.totalDurationMs || 0,
        postgresConnected: (metrics?.postgresConnectionMs || 0) > 0,
        redisConnected: (metrics?.redisConnectionMs || 0) > 0,
        graphAvailable: metrics?.graphAvailable || false,
        graphVersion: metrics?.graphVersion || null,
      },
    });
  } catch (error) {
    logger.error('Health check failed', error as Error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Health check failed',
      },
    });
  }
}

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Проверка живости сервиса. Используется оркестраторами (Kubernetes, Docker Swarm) для определения необходимости перезапуска контейнера.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Сервис жив и работает
 */
export function live(req: Request, res: Response): void {
  // Liveness check: service is running if it can respond
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Проверка готовности сервиса к обработке запросов. Используется оркестраторами для определения, должен ли сервис получать трафик. Проверяет подключения к БД и Redis.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Сервис готов к обработке запросов
 *       503:
 *         description: Сервис не готов (критичные зависимости недоступны)
 */
export async function ready(req: Request, res: Response): Promise<void> {
  try {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Check database connection
    try {
      const dbStartTime = Date.now();
      const isConnected = await DatabaseConfig.testConnection();
      const dbResponseTime = Date.now() - dbStartTime;

      if (isConnected) {
        checks.database = {
          status: 'ready',
          message: `Connected (${dbResponseTime}ms)`,
        };
      } else {
        checks.database = {
          status: 'not_ready',
          message: 'Database connection test failed',
        };
      }
    } catch (error) {
      checks.database = {
        status: 'not_ready',
        message: error instanceof Error ? error.message : 'Database connection error',
      };
    }

    // Check Redis connection
    try {
      const redis = RedisConnection.getInstance();
      const redisStartTime = Date.now();
      const isConnected = await redis.ping();
      const redisResponseTime = Date.now() - redisStartTime;

      if (isConnected) {
        checks.redis = {
          status: 'ready',
          message: `Connected (${redisResponseTime}ms)`,
        };
      } else {
        checks.redis = {
          status: 'not_ready',
          message: 'Redis ping failed',
        };
      }
    } catch (error) {
      checks.redis = {
        status: 'not_ready',
        message: error instanceof Error ? error.message : 'Redis connection error',
      };
    }

    // Check graph availability (optional - service can work without graph)
    const startupResult = getStartupResult();
    const graphAvailable = startupResult?.metrics?.graphAvailable || false;
    checks.graph = {
      status: graphAvailable ? 'available' : 'unavailable',
      message: graphAvailable
        ? `Graph version: ${startupResult?.metrics?.graphVersion || 'unknown'}`
        : 'Graph not built yet (service can work in limited mode)',
    };

    // Determine overall readiness
    const isReady = checks.database.status === 'ready' && checks.redis.status === 'ready';
    const status = isReady ? 'ready' : 'not_ready';

    res.status(isReady ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    logger.error('Readiness check failed', error as Error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: {
        code: 'READINESS_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Readiness check failed',
      },
    });
  }
}



