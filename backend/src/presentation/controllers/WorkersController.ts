/**
 * Workers Controller
 * 
 * REST API endpoints for managing background workers.
 * 
 * Endpoints:
 * - GET /api/v1/workers - List all workers with metadata
 * - POST /api/v1/workers/execute - Execute full pipeline
 * - POST /api/v1/workers/:workerId/execute - Execute specific worker
 * - GET /api/v1/workers/:workerId/status - Get worker status
 * 
 * @module presentation/controllers
 */

import type { Request, Response } from 'express';
import { getWorkerOrchestrator } from '../../application/workers';

/**
 * List all workers with metadata
 * 
 * GET /api/v1/workers
 */
export async function listWorkers(req: Request, res: Response): Promise<void> {
  try {
    const orchestrator = getWorkerOrchestrator();
    const workers = orchestrator.getAllWorkersMetadata();

    res.status(200).json({
      success: true,
      workers,
      count: Object.keys(workers).length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || String(error),
      },
    });
  }
}

/**
 * Execute full workers pipeline
 * 
 * POST /api/v1/workers/execute
 * 
 * Executes all workers in sequence:
 * 1. OData Sync Worker
 * 2. Virtual Entities Generator Worker
 * 3. Graph Builder Worker
 */
export async function executeFullPipeline(req: Request, res: Response): Promise<void> {
  try {
    const orchestrator = getWorkerOrchestrator();

    // Check if already running
    if (orchestrator.isPipelineRunning()) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_RUNNING',
          message: 'Pipeline is already running',
        },
      });
      return;
    }

    console.log('[WorkersController] Starting full pipeline execution...');

    // Execute pipeline (async)
    const result = await orchestrator.executeFullPipeline();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Pipeline executed successfully',
        totalExecutionTimeMs: result.totalExecutionTimeMs,
        workersExecuted: result.workersExecuted,
        workerResults: result.workerResults,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Pipeline execution failed',
        error: result.error,
        totalExecutionTimeMs: result.totalExecutionTimeMs,
        workersExecuted: result.workersExecuted,
        workerResults: result.workerResults,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || String(error),
      },
    });
  }
}

/**
 * Execute specific worker
 * 
 * POST /api/v1/workers/:workerId/execute
 * 
 * Executes a single worker by ID.
 */
export async function executeWorker(req: Request, res: Response): Promise<void> {
  try {
    const { workerId } = req.params;

    if (!workerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Worker ID is required',
        },
      });
      return;
    }

    const orchestrator = getWorkerOrchestrator();

    console.log(`[WorkersController] Executing worker: ${workerId}...`);

    const result = await orchestrator.executeWorker(workerId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Worker ${workerId} executed successfully`,
        result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Worker ${workerId} execution failed`,
        error: result.error,
        result,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || String(error),
      },
    });
  }
}

/**
 * Get worker status
 * 
 * GET /api/v1/workers/:workerId/status
 * 
 * Returns metadata and status for specific worker.
 */
export async function getWorkerStatus(req: Request, res: Response): Promise<void> {
  try {
    const { workerId } = req.params;

    if (!workerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Worker ID is required',
        },
      });
      return;
    }

    const orchestrator = getWorkerOrchestrator();
    const metadata = orchestrator.getWorkerMetadata(workerId);

    if (!metadata) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WORKER_NOT_FOUND',
          message: `Worker ${workerId} not found`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      worker: metadata,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || String(error),
      },
    });
  }
}

/**
 * Get pipeline status
 * 
 * GET /api/v1/workers/pipeline/status
 * 
 * Returns whether pipeline is currently running.
 */
export async function getPipelineStatus(req: Request, res: Response): Promise<void> {
  try {
    const orchestrator = getWorkerOrchestrator();
    const isRunning = orchestrator.isPipelineRunning();

    res.status(200).json({
      success: true,
      pipeline: {
        isRunning,
        workers: orchestrator.getRegisteredWorkers(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || String(error),
      },
    });
  }
}

