/**
 * Контроллер для пересборки графа маршрутов
 * 
 * Предоставляет endpoint для принудительной пересборки графа в dev-режиме.
 * Используется для синхронизации графа в Redis с актуальными данными в БД.
 * 
 * @module presentation/controllers
 */

import { Request, Response } from 'express';
import { getLogger } from '../../shared/logger/Logger';
import { DatabaseConfig } from '../../infrastructure/config/database.config';
import { RedisConfig } from '../../infrastructure/config/redis.config';
import { getWorkerOrchestrator } from '../../application/workers';
import { initializeWorkers } from '../../infrastructure/workers/initializeWorkers';

const logger = getLogger('GraphRebuildController');

/**
 * Проверка, доступен ли endpoint в текущем окружении
 * 
 * Endpoint доступен только в dev-режиме (NODE_ENV !== 'production')
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * @swagger
 * /admin/rebuild-graph:
 *   post:
 *     summary: Пересобрать граф маршрутов
 *     description: |
 *       Принудительно пересобирает граф маршрутов на основе актуальных данных в БД.
 *       Доступно только в dev-режиме (NODE_ENV !== 'production').
 *       
 *       Выполняет полный pipeline:
 *       1. OData Sync Worker (загружает данные из мок-файлов или OData API)
 *       2. Virtual Entities Generator Worker (создает виртуальные остановки)
 *       3. Graph Builder Worker (строит граф и сохраняет в Redis)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Граф успешно пересобран
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 executionTimeMs:
 *                   type: number
 *                 workersExecuted:
 *                   type: number
 *                 graphVersion:
 *                   type: string
 *       403:
 *         description: Endpoint недоступен в production-режиме
 *       500:
 *         description: Ошибка при пересборке графа
 */
export async function rebuildGraph(req: Request, res: Response): Promise<void> {
  // Проверка dev-режима
  if (!isDevMode()) {
    logger.warn('Attempt to rebuild graph in production mode - rejected');
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Graph rebuild is only available in development mode',
      },
    });
    return;
  }

  const startTime = Date.now();

  try {
    logger.info('Starting graph rebuild...');

    // Получаем подключения
    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();

    if (!redis || !redis.isOpen) {
      throw new Error('Redis is not connected');
    }

    // Инициализируем workers
    logger.info('Initializing workers...');
    await initializeWorkers(pool, redis);

    // Получаем orchestrator
    const orchestrator = getWorkerOrchestrator();

    // Проверяем, не запущен ли уже pipeline
    if (orchestrator.isPipelineRunning()) {
      res.status(409).json({
        success: false,
        error: {
          code: 'PIPELINE_ALREADY_RUNNING',
          message: 'Graph rebuild is already in progress',
        },
      });
      return;
    }

    // Запускаем полный pipeline
    logger.info('Executing full pipeline...');
    const result = await orchestrator.executeFullPipeline();

    const executionTimeMs = Date.now() - startTime;

    if (result.success) {
      // Получаем новую версию графа
      const { PostgresGraphRepository } = await import('../../infrastructure/repositories/PostgresGraphRepository');
      const graphRepository = new PostgresGraphRepository(pool, redis);
      const graphVersion = await graphRepository.getGraphVersion();
      const graphMetadata = await graphRepository.getGraphMetadata();

      logger.info('Graph rebuild completed successfully', {
        executionTimeMs,
        workersExecuted: result.workersExecuted,
        graphVersion,
      });

      res.status(200).json({
        success: true,
        message: 'Graph rebuilt successfully',
        executionTimeMs,
        workersExecuted: result.workersExecuted,
        graphVersion: graphVersion || null,
        graphMetadata: graphMetadata ? {
          nodes: graphMetadata.nodes,
          edges: graphMetadata.edges,
          buildTimestamp: new Date(graphMetadata.buildTimestamp).toISOString(),
          datasetVersion: graphMetadata.datasetVersion,
        } : null,
      });
    } else {
      const errorMessage = result.error || 'Graph rebuild failed';
      logger.error('Graph rebuild failed', new Error(errorMessage));

      res.status(500).json({
        success: false,
        error: {
          code: 'REBUILD_FAILED',
          message: errorMessage,
        },
        executionTimeMs,
        workersExecuted: result.workersExecuted,
      });
    }
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error?.message || String(error);

    logger.error('Graph rebuild error', error as Error, {
      executionTimeMs,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      executionTimeMs,
    });
  }
}

