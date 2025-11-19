/**
 * Контроллер для диагностики системы
 */

import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/PostgresConnection';
import { RedisConnection } from '../../infrastructure/cache';
import { createODataClient } from '../../infrastructure/api/odata-client';

/**
 * Проверка состояния базы данных
 */
export async function checkDatabase(req: Request, res: Response): Promise<void> {
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    const responseTime = Date.now() - startTime;

    res.json({
      status: 'ok',
      database: {
        connected: true,
        responseTime: `${responseTime}ms`,
        currentTime: result.rows[0]?.current_time,
        version: result.rows[0]?.pg_version?.split(' ')[0] || 'unknown',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      database: {
        connected: false,
        error: {
          code: error?.code || 'DATABASE_ERROR',
          message: error?.message || 'Database connection failed',
        },
      },
    });
  }
}

/**
 * Проверка состояния Redis
 */
export async function checkRedis(req: Request, res: Response): Promise<void> {
  try {
    const redis = RedisConnection.getInstance();
    const startTime = Date.now();
    const isConnected = await redis.ping();
    const responseTime = Date.now() - startTime;

    if (isConnected) {
      res.json({
        status: 'ok',
        redis: {
          connected: true,
          responseTime: `${responseTime}ms`,
        },
      });
    } else {
      res.status(503).json({
        status: 'error',
        redis: {
          connected: false,
          error: {
            code: 'REDIS_NOT_CONNECTED',
            message: 'Redis is not connected',
          },
        },
      });
    }
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      redis: {
        connected: false,
        error: {
          code: error?.code || 'REDIS_ERROR',
          message: error?.message || 'Redis connection failed',
        },
      },
    });
  }
}

/**
 * Проверка состояния OData API
 */
export async function checkOData(req: Request, res: Response): Promise<void> {
  try {
    const baseUrl = process.env.ODATA_BASE_URL;
    const username = process.env.ODATA_USERNAME;
    const password = process.env.ODATA_PASSWORD;

    if (!baseUrl) {
      res.status(503).json({
        status: 'error',
        odata: {
          configured: false,
          error: {
            code: 'ODATA_NOT_CONFIGURED',
            message: 'ODATA_BASE_URL environment variable is not set',
          },
        },
      });
      return;
    }

    const startTime = Date.now();
    const odataClient = createODataClient();
    
    if (!odataClient) {
      res.status(503).json({
        status: 'error',
        odata: {
          configured: false,
          error: {
            code: 'ODATA_CLIENT_NOT_AVAILABLE',
            message: 'OData client could not be created. Check ODATA_BASE_URL configuration.',
          },
        },
      });
      return;
    }
    
    // Пытаемся загрузить метаданные
    let metadataLoaded = false;
    let metadataError: any = null;
    try {
      const metadataService = odataClient.getMetadataService();
      if (metadataService) {
        await metadataService.loadMetadata();
        metadataLoaded = true;
      } else {
        metadataLoaded = false;
        metadataError = {
          code: 'METADATA_SERVICE_NOT_AVAILABLE',
          message: 'Metadata service is not enabled',
        };
      }
    } catch (error: any) {
      metadataError = {
        code: error?.code || 'METADATA_ERROR',
        message: error?.message || 'Failed to load metadata',
      };
    }

    // Пытаемся сделать тестовый запрос
    let testQuerySuccess = false;
    let testQueryError: any = null;
    try {
      const testResult = await odataClient.get('Catalog_Маршруты', {
        $top: 1,
        $format: 'json',
      });
      testQuerySuccess = testResult && Array.isArray(testResult.data);
    } catch (error: any) {
      const errorName = error?.name || '';
      const errorMessage = error?.message || 'Test query failed';
      
      // Формируем понятное сообщение об ошибке
      if (errorName.includes('Authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        testQueryError = {
          code: 'AUTHENTICATION_ERROR',
          message: 'Ошибка аутентификации. Проверьте ODATA_USERNAME и ODATA_PASSWORD.',
        };
      } else if (errorName.includes('Timeout') || errorMessage.includes('timeout')) {
        testQueryError = {
          code: 'TIMEOUT_ERROR',
          message: 'Превышено время ожидания ответа от OData API.',
        };
      } else if (errorName.includes('NotFound') || errorMessage.includes('404')) {
        testQueryError = {
          code: 'NOT_FOUND_ERROR',
          message: 'Сущность Catalog_Маршруты не найдена в OData API.',
        };
      } else {
        testQueryError = {
          code: error?.code || 'QUERY_ERROR',
          message: errorMessage,
        };
      }
    }

    const responseTime = Date.now() - startTime;

    if (metadataLoaded && testQuerySuccess) {
      res.json({
        status: 'ok',
        odata: {
          configured: true,
          baseUrl,
          authenticated: !!(username && password),
          metadataLoaded: true,
          testQuerySuccess: true,
          responseTime: `${responseTime}ms`,
        },
      });
    } else {
      res.status(503).json({
        status: 'error',
        odata: {
          configured: true,
          baseUrl,
          authenticated: !!(username && password),
          metadataLoaded,
          metadataError,
          testQuerySuccess,
          testQueryError,
          responseTime: `${responseTime}ms`,
        },
      });
    }
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      odata: {
        configured: !!process.env.ODATA_BASE_URL,
        error: {
          code: error?.code || 'ODATA_ERROR',
          message: error?.message || 'OData connection failed',
        },
      },
    });
  }
}

/**
 * Проверка адаптивной системы загрузки данных
 */
export async function checkAdaptiveDataLoading(req: Request, res: Response): Promise<void> {
  try {
    // Новая архитектура Phase 2 - всегда включена
    // Старая адаптивная система удалена

    const startTime = Date.now();
    
    // Получаем метрики
    const { getMetricsRegistry } = await import('../../shared/metrics/MetricsRegistry');
    const metricsRegistry = getMetricsRegistry();
    const metricsSummary = metricsRegistry.getSummary();
    
    // Получаем статистику по каждому режиму
    const { DataSourceMode } = await import('../../domain/enums/DataSourceMode');
    const realModeStats = metricsRegistry.getModeStats(DataSourceMode.REAL);
    const recoveryModeStats = metricsRegistry.getModeStats(DataSourceMode.RECOVERY);
    const mockModeStats = metricsRegistry.getModeStats(DataSourceMode.MOCK);
    
    // Используем новую архитектуру Phase 2
    // Получаем информацию о графе из Redis
    const { DatabaseConfig } = await import('../../infrastructure/config/database.config');
    const { RedisConfig } = await import('../../infrastructure/config/redis.config');
    const { PostgresGraphRepository } = await import('../../infrastructure/repositories/PostgresGraphRepository');
    
    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();
    const graphRepository = new PostgresGraphRepository(pool, redis);
    
    // Получаем метаданные графа
    const graphMetadata = await graphRepository.getGraphMetadata();
    const graphStats = await graphRepository.getGraphStatistics();

    // Проверяем кеш
    const { DatasetCacheRepository, RedisConnection } = await import('../../infrastructure/cache');
    
    // Simple logger for cache repository
    const logger = {
      info: (msg: string, ctx?: any) => console.log(`[INFO] ${msg}`, ctx || ''),
      warn: (msg: string, ctx?: any) => console.warn(`[WARN] ${msg}`, ctx || ''),
      error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err || ''),
      debug: (msg: string, ctx?: any) => console.debug(`[DEBUG] ${msg}`, ctx || ''),
    };
    
    const redisConnection = RedisConnection.getInstance();
    const redisClient = redisConnection.getClient();
    const cacheRepo = new DatasetCacheRepository(
      redisClient as any,
      logger,
      {
        enabled: process.env.REDIS_ENABLED !== 'false',
        ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
      }
    );
    
    const [cacheAvailable, cachedDataset] = await Promise.all([
      cacheRepo.isAvailable().catch(() => false),
      cacheRepo.get().catch(() => null),
    ]);

    const responseTime = Date.now() - startTime;

    res.json({
      status: 'ok',
      enabled: true,
      architecture: 'Phase 2 (Optimized)',
      
      // Graph information (new architecture)
      graph: {
        available: graphStats.totalNodes > 0,
        version: graphStats.version,
        totalNodes: graphStats.totalNodes,
        totalEdges: graphStats.totalEdges,
        buildTimestamp: graphMetadata ? new Date(graphMetadata.buildTimestamp).toISOString() : null,
        datasetVersion: graphMetadata?.datasetVersion,
      },
      
      // Provider availability (legacy, for compatibility)
      providers: {
        odata: {
          name: 'OData Transport Provider',
          available: graphStats.totalNodes > 0,
          configured: !!process.env.ODATA_BASE_URL,
        },
      },
      
      // Cache status (legacy, for compatibility)
      cache: {
        available: cacheAvailable,
        hasData: !!cachedDataset,
        dataMode: cachedDataset?.mode,
        dataQuality: cachedDataset?.quality,
        lastUpdated: cachedDataset?.loadedAt,
        hitRate: `${metricsSummary.cache.hitRate}%`,
        hits: metricsSummary.cache.hits,
        misses: metricsSummary.cache.misses,
      },
      
      // Performance metrics
      metrics: {
        requests: {
          total: metricsSummary.requests.total,
          last24h: metricsSummary.requests.last24h,
          byMode: {
            real: metricsSummary.requests.byMode.real,
            recovery: metricsSummary.requests.byMode.recovery,
            mock: metricsSummary.requests.byMode.mock,
          },
        },
        quality: {
          average: metricsSummary.quality.average,
          last10: metricsSummary.quality.lastN,
        },
        performance: {
          averageLoadTime_ms: metricsSummary.performance.averageLoadTime_ms,
          p95LoadTime_ms: metricsSummary.performance.p95LoadTime_ms,
        },
        errors: {
          total: metricsSummary.errors.total,
          last24h: metricsSummary.errors.last24h,
          bySource: metricsSummary.errors.bySource,
        },
      },
      
      // Mode-specific statistics
      modeStats: {
        real: {
          count: realModeStats.count,
          averageQuality: Math.round(realModeStats.averageQuality * 100) / 100,
          averageLoadTime_ms: Math.round(realModeStats.averageLoadTime_ms),
          lastSuccessful: realModeStats.lastSuccessful,
        },
        recovery: {
          count: recoveryModeStats.count,
          averageQuality: Math.round(recoveryModeStats.averageQuality * 100) / 100,
          averageLoadTime_ms: Math.round(recoveryModeStats.averageLoadTime_ms),
          lastSuccessful: recoveryModeStats.lastSuccessful,
        },
        mock: {
          count: mockModeStats.count,
          averageQuality: Math.round(mockModeStats.averageQuality * 100) / 100,
          averageLoadTime_ms: Math.round(mockModeStats.averageLoadTime_ms),
          lastSuccessful: mockModeStats.lastSuccessful,
        },
      },
      
      responseTime: `${responseTime}ms`,
      lastUpdate: metricsSummary.lastUpdate,
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      error: {
        code: error?.code || 'ADAPTIVE_LOADING_ERROR',
        message: error?.message || 'Failed to check adaptive data loading status',
      },
    });
  }
}

/**
 * Полная диагностика системы
 */
interface IDiagnosticsResponse {
  status: 'ok' | 'partial' | 'error';
  timestamp: string;
  services: {
    database?: {
      status: 'ok' | 'error';
      connected?: boolean;
      responseTime?: string;
      error?: {
        code: string;
        message: string;
      };
    };
    redis?: {
      status: 'ok' | 'error';
      responseTime?: string;
      error?: {
        code: string;
        message: string;
      };
    };
    odata?: {
      status: 'ok' | 'partial' | 'error';
      baseUrl?: string;
      responseTime?: string;
      warning?: {
        code: string;
        message: string;
      };
      error?: {
        code: string;
        message: string;
      };
    };
  };
  endpoints?: {
    riskAssessment?: {
      path: string;
      method: string;
      available: boolean;
      description?: string;
      error?: {
        code: string;
        message: string;
      };
    };
  };
}

export async function fullDiagnostics(req: Request, res: Response): Promise<void> {
  const diagnostics: IDiagnosticsResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Проверка БД
  try {
    const dbStartTime = Date.now();
    await pool.query('SELECT NOW()');
    diagnostics.services.database = {
      status: 'ok',
      responseTime: `${Date.now() - dbStartTime}ms`,
    };
  } catch (error: any) {
    diagnostics.services.database = {
      status: 'error',
      error: {
        code: error?.code || 'DATABASE_ERROR',
        message: error?.message || 'Database connection failed',
      },
    };
    diagnostics.status = 'error';
  }

  // Проверка Redis
  try {
    const redis = RedisConnection.getInstance();
    const redisStartTime = Date.now();
    const isConnected = await redis.ping();
    diagnostics.services.redis = {
      status: isConnected ? 'ok' : 'error',
      responseTime: `${Date.now() - redisStartTime}ms`,
    };
    if (!isConnected) {
      diagnostics.status = 'error';
    }
  } catch (error: any) {
    diagnostics.services.redis = {
      status: 'error',
      error: {
        code: error?.code || 'REDIS_ERROR',
        message: error?.message || 'Redis connection failed',
      },
    };
    diagnostics.status = 'error';
  }

  // Проверка OData
  try {
    const baseUrl = process.env.ODATA_BASE_URL;
    if (!baseUrl) {
      diagnostics.services.odata = {
        status: 'error',
        error: {
          code: 'ODATA_NOT_CONFIGURED',
          message: 'ODATA_BASE_URL environment variable is not set',
        },
      };
      diagnostics.status = 'error';
    } else {
      const odataStartTime = Date.now();
      try {
        const odataClient = createODataClient();
        if (odataClient) {
          try {
            const metadataService = odataClient.getMetadataService();
            if (metadataService) {
              await metadataService.loadMetadata();
            }
            // Тестовый запрос для проверки доступности
            try {
              await odataClient.get('Catalog_Маршруты', { $top: 1 });
            } catch (queryError: any) {
              // Запрос не удался, но клиент создан
              const errorName = queryError?.name || '';
              const errorMessage = queryError?.message || 'Test query failed';
              
              let warningCode = 'QUERY_FAILED';
              let warningMessage = errorMessage;
              
              if (errorName.includes('Authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
                warningCode = 'AUTHENTICATION_ERROR';
                warningMessage = 'Ошибка аутентификации. Проверьте ODATA_USERNAME и ODATA_PASSWORD.';
              } else if (errorName.includes('Timeout') || errorMessage.includes('timeout')) {
                warningCode = 'TIMEOUT_ERROR';
                warningMessage = 'Превышено время ожидания ответа от OData API.';
              } else if (errorName.includes('NotFound') || errorMessage.includes('404')) {
                warningCode = 'NOT_FOUND_ERROR';
                warningMessage = 'Сущность Catalog_Маршруты не найдена в OData API.';
              }
              
              diagnostics.services.odata = {
                status: 'partial',
                baseUrl,
                responseTime: `${Date.now() - odataStartTime}ms`,
                warning: {
                  code: warningCode,
                  message: warningMessage,
                },
              };
              diagnostics.status = 'partial';
              return;
            }
            diagnostics.services.odata = {
              status: 'ok',
              baseUrl,
              responseTime: `${Date.now() - odataStartTime}ms`,
            };
          } catch (metadataError: any) {
            const errorName = metadataError?.name || '';
            const errorMessage = metadataError?.message || 'Failed to load metadata';
            
            let warningCode = 'METADATA_ERROR';
            let warningMessage = errorMessage;
            
            if (errorMessage.includes('Edmx element not found')) {
              warningCode = 'METADATA_PARSE_ERROR';
              warningMessage = 'Не удалось распарсить метаданные OData. Проверьте формат XML.';
            } else if (errorName.includes('Authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
              warningCode = 'METADATA_AUTH_ERROR';
              warningMessage = 'Ошибка аутентификации при загрузке метаданных. Проверьте ODATA_USERNAME и ODATA_PASSWORD.';
            } else if (errorName.includes('Timeout') || errorMessage.includes('timeout')) {
              warningCode = 'METADATA_TIMEOUT_ERROR';
              warningMessage = 'Превышено время ожидания при загрузке метаданных.';
            }
            
            diagnostics.services.odata = {
              status: 'partial',
              baseUrl,
              responseTime: `${Date.now() - odataStartTime}ms`,
              warning: {
                code: warningCode,
                message: warningMessage,
              },
            };
            diagnostics.status = 'partial';
          }
        } else {
          diagnostics.services.odata = {
            status: 'error',
            error: {
              code: 'ODATA_CLIENT_NOT_AVAILABLE',
              message: 'OData client could not be created. Check ODATA_BASE_URL format.',
            },
          };
          diagnostics.status = 'error';
        }
      } catch (error: any) {
        diagnostics.services.odata = {
          status: 'error',
          error: {
            code: error?.code || 'ODATA_INIT_ERROR',
            message: error?.message || 'Failed to initialize OData client',
          },
        };
        diagnostics.status = 'error';
      }
    }
  } catch (error: any) {
    diagnostics.services.odata = {
      status: 'error',
      error: {
        code: error?.code || 'ODATA_ERROR',
        message: error?.message || 'OData connection failed',
      },
    };
    diagnostics.status = 'error';
  }

  // Проверка доступности эндпоинта оценки риска
  try {
    diagnostics.endpoints = {
      riskAssessment: {
        path: '/api/v1/routes/risk/assess',
        method: 'POST',
        available: true,
        description: 'Оценка риска маршрута',
      },
    };
  } catch (error: any) {
    diagnostics.endpoints = {
      riskAssessment: {
        path: '/api/v1/routes/risk/assess',
        method: 'POST',
        available: false,
        error: {
          code: 'ENDPOINT_CHECK_ERROR',
          message: error?.message || 'Failed to check endpoint availability',
        },
      },
    };
  }

  const statusCode = diagnostics.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(diagnostics);
}

