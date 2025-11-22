/**
 * Контроллер для переинициализации демо-данных в dev-окружении
 * 
 * Предоставляет endpoint для очистки и перезагрузки демо-данных.
 * Используется для обновления данных после изменения мок-файлов.
 * 
 * @module presentation/controllers
 */

import { Request, Response } from 'express';
import { getLogger } from '../../shared/logger/Logger';
import { DatabaseConfig } from '../../infrastructure/config/database.config';
import { RedisConfig } from '../../infrastructure/config/redis.config';
import { getWorkerOrchestrator } from '../../application/workers';
import { initializeWorkers } from '../../infrastructure/workers/initializeWorkers';
import {
  PostgresStopRepository,
  PostgresRouteRepository,
  PostgresFlightRepository,
  PostgresDatasetRepository,
  PostgresGraphRepository,
} from '../../infrastructure/repositories';

const logger = getLogger('DataReinitController');

/**
 * Проверка, доступен ли endpoint в текущем окружении
 * 
 * Endpoint доступен только в dev-режиме (NODE_ENV !== 'production')
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Очистить демо-данные из БД
 * 
 * Удаляет только данные, связанные с демо-окружением:
 * - Все stops (real и virtual)
 * - Все routes (real и virtual)
 * - Все flights
 * - Все datasets
 * - Все graph metadata
 * 
 * НЕ удаляет:
 * - Схему БД (таблицы остаются)
 * - Миграции
 * 
 * @param pool - PostgreSQL connection pool
 */
async function clearDemoData(pool: any): Promise<void> {
  logger.info('Clearing demo data from database...');

  const stopRepository = new PostgresStopRepository(pool);
  const routeRepository = new PostgresRouteRepository(pool);
  const flightRepository = new PostgresFlightRepository(pool);
  const datasetRepository = new PostgresDatasetRepository(pool);

  // Получаем все записи для удаления
  const [allRealStops, allVirtualStops, allRoutes, allVirtualRoutes, allFlights, allDatasets] = await Promise.all([
    stopRepository.getAllRealStops(),
    stopRepository.getAllVirtualStops(),
    routeRepository.getAllRoutes(),
    routeRepository.getAllVirtualRoutes(),
    flightRepository.getAllFlights(true), // Include virtual flights
    datasetRepository.getAllDatasets(),
  ]);

  logger.info(`Found ${allRealStops.length} real stops, ${allVirtualStops.length} virtual stops, ${allRoutes.length} routes, ${allVirtualRoutes.length} virtual routes, ${allFlights.length} flights, ${allDatasets.length} datasets to delete`);

  // Удаляем в правильном порядке (сначала зависимые, потом основные)
  // Flights должны быть удалены первыми (зависят от routes)
  for (const flight of allFlights) {
    await flightRepository.deleteFlight(flight.id);
  }

  // Routes (зависят от stops)
  for (const route of [...allRoutes, ...allVirtualRoutes]) {
    await routeRepository.deleteRoute(route.id);
  }

  // Stops (основные сущности)
  for (const stop of allRealStops) {
    await stopRepository.deleteRealStop(stop.id);
  }
  // Виртуальные остановки удаляем все сразу (есть метод deleteAllVirtualStops)
  await stopRepository.deleteAllVirtualStops();

  // Datasets (удаляем все, кроме активного, если есть)
  for (const dataset of allDatasets) {
    try {
      await datasetRepository.deleteDataset(dataset.id);
    } catch (error: any) {
      // Игнорируем ошибку, если dataset активный (защита от удаления)
      if (!error?.message?.includes('active')) {
        throw error;
      }
    }
  }

  logger.info('Demo data cleared successfully');
}

/**
 * Очистить граф из Redis
 * 
 * @param pool - PostgreSQL connection pool
 * @param redis - Redis client
 */
async function clearGraph(pool: any, redis: any): Promise<void> {
  logger.info('Clearing graph from Redis...');

  const graphRepository = new PostgresGraphRepository(pool, redis);

  // Получаем текущую версию графа
  const currentVersion = await graphRepository.getGraphVersion();

  // Удаляем текущий граф, если он есть
  if (currentVersion) {
    await graphRepository.deleteGraph(currentVersion);
  }

  // Также удаляем все метаданные графов из PostgreSQL (кроме активных)
  const allGraphMetadata = await graphRepository.getAllGraphMetadata();
  for (const graph of allGraphMetadata) {
    try {
      await graphRepository.deleteGraphMetadata(graph.id);
    } catch (error: any) {
      // Игнорируем ошибку, если граф активный (защита от удаления)
      if (!error?.message?.includes('active')) {
        throw error;
      }
    }
  }

  // Сбрасываем текущую версию в Redis (удаляем ключ)
  await redis.del('graph:current:version');
  await redis.del('graph:current:metadata');

  logger.info('Graph cleared successfully');
}

/**
 * @swagger
 * /admin/reinit-data:
 *   post:
 *     summary: Переинициализировать демо-данные
 *     description: |
 *       Очищает все демо-данные из БД и Redis, затем загружает новые данные из мок-файлов.
 *       Доступно только в dev-режиме (NODE_ENV !== 'production').
 *       
 *       Выполняет:
 *       1. Очистку всех stops, routes, flights, datasets из БД
 *       2. Очистку графа из Redis
 *       3. Полный pipeline загрузки данных:
 *          - OData Sync Worker (загружает данные из мок-файлов)
 *          - Virtual Entities Generator Worker (создает виртуальные остановки)
 *          - Graph Builder Worker (строит граф и сохраняет в Redis)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Данные успешно переинициализированы
 *       403:
 *         description: Endpoint недоступен в production-режиме
 *       500:
 *         description: Ошибка при переинициализации данных
 */
export async function reinitData(req: Request, res: Response): Promise<void> {
  // Проверка dev-режима
  if (!isDevMode()) {
    logger.warn('Attempt to reinit data in production mode - rejected');
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Data reinitialization is only available in development mode',
      },
    });
    return;
  }

  const startTime = Date.now();

  try {
    logger.info('Starting data reinitialization...');

    // Получаем подключения
    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();

    if (!redis || !redis.isOpen) {
      throw new Error('Redis is not connected');
    }

    // Шаг 1: Очищаем демо-данные из БД
    logger.info('Step 1: Clearing demo data from database...');
    await clearDemoData(pool);

    // Шаг 2: Очищаем граф из Redis
    logger.info('Step 2: Clearing graph from Redis...');
    await clearGraph(pool, redis);

    // Шаг 3: Инициализируем workers
    logger.info('Step 3: Initializing workers...');
    await initializeWorkers(pool, redis);

    // Шаг 4: Получаем orchestrator
    const orchestrator = getWorkerOrchestrator();

    // Проверяем, не запущен ли уже pipeline
    if (orchestrator.isPipelineRunning()) {
      res.status(409).json({
        success: false,
        error: {
          code: 'PIPELINE_ALREADY_RUNNING',
          message: 'Data reinitialization is already in progress',
        },
      });
      return;
    }

    // Шаг 5: Запускаем полный pipeline
    logger.info('Step 4: Executing full pipeline...');
    const result = await orchestrator.executeFullPipeline();

    const executionTimeMs = Date.now() - startTime;

    if (result.success) {
      // Получаем новую версию графа и статистику данных
      const graphRepository = new PostgresGraphRepository(pool, redis);
      const stopRepository = new PostgresStopRepository(pool);
      const routeRepository = new PostgresRouteRepository(pool);
      const flightRepository = new PostgresFlightRepository(pool);
      const datasetRepository = new PostgresDatasetRepository(pool);

      const [graphVersion, graphMetadata, realStopsCount, virtualStopsCount, routesCount, flightsCount, datasetsCount] = await Promise.all([
        graphRepository.getGraphVersion(),
        graphRepository.getGraphMetadata(),
        stopRepository.countRealStops(),
        stopRepository.countVirtualStops(),
        routeRepository.countRoutes(),
        flightRepository.countFlights(true),
        datasetRepository.countDatasets(),
      ]);

      logger.info('Data reinitialization completed successfully', {
        executionTimeMs,
        workersExecuted: result.workersExecuted,
        graphVersion,
        realStopsCount,
        virtualStopsCount,
        routesCount,
        flightsCount,
        datasetsCount,
      });

      res.status(200).json({
        success: true,
        message: 'Data reinitialized successfully',
        executionTimeMs,
        workersExecuted: result.workersExecuted,
        graphVersion: graphVersion || null,
        graphMetadata: graphMetadata ? {
          nodes: graphMetadata.nodes,
          edges: graphMetadata.edges,
          buildTimestamp: new Date(graphMetadata.buildTimestamp).toISOString(),
          datasetVersion: graphMetadata.datasetVersion,
        } : null,
        dataStatistics: {
          realStopsCount,
          virtualStopsCount,
          routesCount,
          flightsCount,
          datasetsCount,
        },
      });
    } else {
      const errorMessage = result.error || 'Data reinitialization failed';
      logger.error('Data reinitialization failed', new Error(errorMessage));

      res.status(500).json({
        success: false,
        error: {
          code: 'REINIT_FAILED',
          message: errorMessage,
        },
        executionTimeMs,
        workersExecuted: result.workersExecuted,
      });
    }
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error?.message || String(error);

    logger.error('Data reinitialization error', error as Error, {
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

