import { HealthCheckDto } from '../dto/health.dto';
import { pool } from '@infrastructure/database/PostgresConnection';
import { logger } from '@shared/utils/logger';

/**
 * Интерфейс для storage health check
 */
export interface IStorageHealthCheck {
  checkConnection(): Promise<{ status: 'connected' | 'disconnected'; bucket?: string }>;
}

// Экспорт для использования в routes
export type { IStorageHealthCheck };

/**
 * Use-case для проверки здоровья системы
 */
export class HealthCheckUseCase {
  constructor(private readonly storageHealthCheck: IStorageHealthCheck) {}

  async execute(): Promise<HealthCheckDto> {
    try {
      // Проверка базы данных
      const dbStartTime = Date.now();
      let dbStatus: 'connected' | 'disconnected' = 'disconnected';
      let dbResponseTime: number | undefined;

      try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
        dbResponseTime = Date.now() - dbStartTime;
      } catch (error) {
        logger.error('Database health check failed', error);
      }

      // Проверка хранилища
      const storageStatus = await this.storageHealthCheck.checkConnection();

      const isHealthy = dbStatus === 'connected' && storageStatus.status === 'connected';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbStatus,
            responseTime: dbResponseTime,
          },
          storage: storageStatus,
        },
      };
    } catch (error) {
      logger.error('Error during health check', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'disconnected',
          },
          storage: {
            status: 'disconnected',
          },
        },
      };
    }
  }
}

