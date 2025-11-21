/**
 * Optimized Route Builder Controller
 * 
 * Uses readonly graph from Redis for fast route search.
 * No heavy processing, pure graph traversal.
 * 
 * Target response time: < 10ms
 * 
 * @module presentation/controllers
 */

import type { Request, Response } from 'express';
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
 * Search route handler (optimized)
 * 
 * GET /api/v1/routes/search?from={city}&to={city}&date={date}&passengers={number}
 * 
 * Query parameters:
 * - from: Origin city name (required)
 * - to: Destination city name (required)
 * - date: Departure date in YYYY-MM-DD format (optional, defaults to today)
 * - passengers: Number of passengers (optional, defaults to 1)
 * 
 * Response:
 * - 200: Success with routes array
 * - 400: Validation error (missing from/to)
 * - 404: No routes found
 * - 503: Graph not available
 * - 500: Internal server error
 */
export async function searchRouteOptimized(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    // ========================================================================
    // Step 1: Validate Parameters
    // ========================================================================
    const fromCity = req.query.from as string;
    const toCity = req.query.to as string;
    const dateStr = req.query.date as string;
    const passengersStr = req.query.passengers as string;

    if (!fromCity || !toCity) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameters "from" and "to" are required',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Parse date (default to today)
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
          message: 'Invalid date format. Use YYYY-MM-DD.',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Parse passengers (default to 1)
    const passengers = passengersStr ? parseInt(passengersStr, 10) : 1;
    
    if (isNaN(passengers) || passengers < 1 || passengers > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Passengers must be between 1 and 100',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // ========================================================================
    // Step 2: Check Graph Availability
    // ========================================================================
    const startup = getStartupResult();

    if (!startup?.metrics?.graphAvailable) {
      res.status(503).json({
        success: false,
        error: {
          code: 'GRAPH_NOT_AVAILABLE',
          message: 'Graph is not available. Please wait for background worker to build graph.',
        },
        graphAvailable: false,
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // ========================================================================
    // Step 3: Initialize Repositories (from startup connections)
    // ========================================================================
    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();

    const graphRepository = new PostgresGraphRepository(pool, redis);
    const flightRepository = new PostgresFlightRepository(pool);
    const stopRepository = new PostgresStopRepository(pool);
    const routeRepository = new PostgresRouteRepository(pool);

    // ========================================================================
    // Step 4: Execute Route Search (Optimized Use Case)
    // ========================================================================
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

    // ========================================================================
    // Step 5: Return Response
    // ========================================================================
    const totalExecutionTime = Date.now() - requestStartTime;

    if (result.success) {
      res.status(200).json({
        success: true,
        routes: result.routes,
        executionTimeMs: totalExecutionTime,
        graphVersion: result.graphVersion,
        graphAvailable: result.graphAvailable,
      });
    } else {
      // No routes found
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

/**
 * Get graph diagnostics
 * 
 * GET /api/v1/routes/graph/diagnostics
 * 
 * Response:
 * - 200: Graph statistics and status
 * - 503: Graph not available
 */
export async function getGraphDiagnostics(req: Request, res: Response): Promise<void> {
  try {
    const startup = getStartupResult();

    if (!startup?.metrics?.graphAvailable) {
      res.status(503).json({
        success: false,
        graphAvailable: false,
        message: 'Graph not available',
      });
      return;
    }

    const pool = DatabaseConfig.getPool();
    const redis = RedisConfig.getClient();

    const graphRepository = new PostgresGraphRepository(pool, redis);

    // Get graph statistics from Redis
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




