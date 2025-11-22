/**
 * API Integration Test Helpers
 * 
 * Utilities for creating Express app instance and making HTTP requests in integration tests.
 */

import express, { type Express } from 'express';
import cors from 'cors';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import { setupIntegrationTests, teardownIntegrationTests } from '../setup';
import { errorHandler } from '../../../presentation/middleware/error-handler.middleware';
import { requestLogger } from '../../../presentation/middleware/request-logger.middleware';
import { securityHeaders } from '../../../presentation/middleware/security-headers.middleware';
import { getCorsConfig } from '../../../shared/utils/cors-config';
import { generalLimiter } from '../../../presentation/middleware/rate-limiter';
import { initializePrometheusMetrics } from '../../../shared/metrics/prometheus';
import { setupSwagger } from '../../../presentation/swagger/setup';
import { OptimizedStartup } from '../../../infrastructure/startup';
import type { StartupResult } from '../../../infrastructure/startup';
import supertest from 'supertest';
import type { SuperTest, Test } from 'supertest';

/**
 * Test Express app instance and startup result
 */
let testApp: Express | null = null;
let testStartupResult: StartupResult | null = null;

/**
 * Mock getStartupResult for health checks (must be before importing routes)
 * HealthController uses getStartupResult() from index.ts
 */
jest.mock('../../../index', () => {
  const actual = jest.requireActual('../../../index');
  return {
    ...actual,
    getStartupResult: jest.fn(() => testStartupResult),
  };
});

// Import routes after mock is set up
import apiRoutes from '../../../presentation/routes';

/**
 * Creates Express app instance for integration tests
 * 
 * Sets up a real Express application with all middleware and routes,
 * connected to test database and Redis.
 */
export async function createTestApp(): Promise<{
  app: Express;
  dbPool: Pool;
  redisClient: RedisClientType;
  startupResult: StartupResult;
}> {
  // Setup test database and Redis
  const { dbPool, redisClient } = await setupIntegrationTests();

  // Create Express app
  const app = express();
  const API_VERSION = 'v1';

  // Initialize Prometheus metrics
  initializePrometheusMetrics();

  // Middleware (same order as production)
  app.use(securityHeaders);
  app.use(cors(getCorsConfig()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Setup Swagger UI (optional for tests, but keeps app structure consistent)
  try {
    setupSwagger(app, `/api/${API_VERSION}`);
  } catch (error) {
    // Swagger setup is optional for tests
    console.log('Swagger setup skipped in test environment');
  }

  // Apply general rate limiting
  app.use(`/api/${API_VERSION}`, generalLimiter);

  // Apply API routes
  app.use(`/api/${API_VERSION}`, apiRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Initialize backend services (readonly mode for tests)
  // For tests, we create a simplified startup result
  // OptimizedStartup.initialize() uses DatabaseConfig.getPool() and RedisConfig.getInstance()
  // which are singletons, so we need to use the test pool and client directly
  const startupResult: StartupResult = {
    metrics: {
      totalDurationMs: 0,
      postgresConnectionMs: 0,
      redisConnectionMs: 0,
      graphLoadMs: 0,
      success: true,
      graphAvailable: false,
      errors: [],
    },
    postgresPool: dbPool,
    redisClient: redisClient,
  };

  // Try to load graph metadata from Redis (optional for tests)
  try {
    const { PostgresGraphRepository } = await import('../../../infrastructure/repositories/PostgresGraphRepository');
    const graphRepository = new PostgresGraphRepository(dbPool, redisClient);
    const graphVersion = await graphRepository.getGraphVersion();
    if (graphVersion) {
      const metadata = await graphRepository.getGraphMetadata();
      if (metadata) {
        startupResult.metrics.graphAvailable = true;
        startupResult.metrics.graphVersion = graphVersion;
        startupResult.graphMetadata = metadata;
      }
    }
  } catch (error) {
    // Graph not available - this is OK for tests
    console.log('Graph not available in test environment (this is OK)');
  }

  // Store for cleanup and mock
  testApp = app;
  testStartupResult = startupResult;

  // Update mock to return test startup result
  const indexModule = require('../../../index');
  if (indexModule.getStartupResult) {
    (indexModule.getStartupResult as jest.Mock).mockReturnValue(startupResult);
  }

  return {
    app,
    dbPool,
    redisClient,
    startupResult,
  };
}

/**
 * Creates SuperTest agent for making HTTP requests
 */
export function createTestAgent(app: Express): ReturnType<typeof supertest> {
  return supertest(app);
}

/**
 * Cleans up test app instance and connections
 */
export async function cleanupTestApp(): Promise<void> {
  testApp = null;
  testStartupResult = null;
  await teardownIntegrationTests();
}

/**
 * Gets test startup result (for health checks)
 */
export function getTestStartupResult(): StartupResult | null {
  return testStartupResult;
}

