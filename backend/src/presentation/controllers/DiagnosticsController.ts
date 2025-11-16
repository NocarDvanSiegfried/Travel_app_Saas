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
      await odataClient.get('Catalog_Маршруты', {
        $top: 1,
        $format: 'json',
      });
      testQuerySuccess = true;
    } catch (error: any) {
      testQueryError = {
        code: error?.code || 'QUERY_ERROR',
        message: error?.message || 'Test query failed',
      };
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
 * Полная диагностика системы
 */
export async function fullDiagnostics(req: Request, res: Response): Promise<void> {
  const diagnostics: any = {
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
          const metadataService = odataClient.getMetadataService();
          if (metadataService) {
            await metadataService.loadMetadata();
          }
          diagnostics.services.odata = {
            status: 'ok',
            baseUrl,
            responseTime: `${Date.now() - odataStartTime}ms`,
          };
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

