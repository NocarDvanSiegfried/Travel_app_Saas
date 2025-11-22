/**
 * Metrics Controller
 * 
 * Exposes Prometheus metrics endpoint for monitoring.
 */

import { Request, Response } from 'express';
import { register } from '../../shared/metrics/prometheus';
import { getLogger } from '../../shared/logger/Logger';

const logger = getLogger('MetricsController');

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Получить метрики Prometheus
 *     description: Возвращает метрики в формате Prometheus для мониторинга производительности и состояния системы.
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Метрики в формате Prometheus
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getMetrics(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', error as Error, {
      module: 'MetricsController',
    });
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve metrics',
      },
    });
  }
}

