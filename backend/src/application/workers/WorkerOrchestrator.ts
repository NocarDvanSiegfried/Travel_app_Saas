/**
 * Worker Orchestrator
 * 
 * Manages execution of background workers in correct order.
 * Handles worker lifecycle, error recovery, and notifications.
 * 
 * Execution Order:
 * 1. OData Sync Worker → 2. Virtual Entities Generator → 3. Graph Builder
 * 
 * @module application/workers
 */

import type { IBackgroundWorker, WorkerExecutionResult } from './base/IBackgroundWorker';

/**
 * Orchestration result
 */
export type OrchestrationResult = {
  success: boolean;
  totalExecutionTimeMs: number;
  workersExecuted: number;
  workerResults: WorkerExecutionResult[];
  error?: string;
};

/**
 * Worker Orchestrator
 * 
 * Coordinates execution of all background workers.
 * 
 * @class
 */
export class WorkerOrchestrator {
  private workers: Map<string, IBackgroundWorker> = new Map();
  private isRunning: boolean = false;

  /**
   * Register a worker
   */
  public registerWorker(workerId: string, worker: IBackgroundWorker): void {
    this.workers.set(workerId, worker);
    console.log(`[WorkerOrchestrator] ✅ Registered worker: ${workerId}`);
  }

  /**
   * Execute full data synchronization pipeline
   * 
   * Runs all workers in sequence:
   * 1. OData Sync Worker
   * 2. Virtual Entities Generator Worker
   * 3. Graph Builder Worker
   */
  public async executeFullPipeline(): Promise<OrchestrationResult> {
    const startTime = Date.now();

    if (this.isRunning) {
      return {
        success: false,
        totalExecutionTimeMs: Date.now() - startTime,
        workersExecuted: 0,
        workerResults: [],
        error: 'Pipeline is already running',
      };
    }

    this.isRunning = true;
    const workerResults: WorkerExecutionResult[] = [];

    try {
      console.log('[WorkerOrchestrator] 🚀 Starting full pipeline execution...');

      // ====================================================================
      // Step 1: OData Sync Worker
      // ====================================================================
      const odataSyncWorker = this.workers.get('odata-sync-worker');
      if (!odataSyncWorker) {
        throw new Error('OData Sync Worker not registered');
      }

      console.log('[WorkerOrchestrator] Step 1: Executing OData Sync Worker...');
      const odataResult = await odataSyncWorker.execute();
      workerResults.push(odataResult);

      if (!odataResult.success) {
        console.error('[WorkerOrchestrator] ❌ OData Sync Worker failed:', odataResult.error);
        
        // Don't continue if OData sync failed
        return {
          success: false,
          totalExecutionTimeMs: Date.now() - startTime,
          workersExecuted: 1,
          workerResults,
          error: `OData Sync Worker failed: ${odataResult.error}`,
        };
      }

      console.log('[WorkerOrchestrator] ✅ OData Sync Worker completed');

      // ====================================================================
      // Step 2: Air Route Generator Worker
      // ====================================================================
      const airRouteGeneratorWorker = this.workers.get('air-route-generator-worker');
      if (!airRouteGeneratorWorker) {
        throw new Error('Air Route Generator Worker not registered');
      }

      console.log('[WorkerOrchestrator] Step 2: Executing Air Route Generator Worker...');
      const airRouteResult = await airRouteGeneratorWorker.execute();
      workerResults.push(airRouteResult);

      if (!airRouteResult.success) {
        console.error('[WorkerOrchestrator] ❌ Air Route Generator Worker failed:', airRouteResult.error);
        
        // Continue anyway - air routes are optional
        console.warn('[WorkerOrchestrator] ⚠️ Continuing without air routes');
      } else {
        console.log('[WorkerOrchestrator] ✅ Air Route Generator Worker completed');
      }

      // ====================================================================
      // Step 3: Virtual Entities Generator Worker
      // ====================================================================
      const virtualEntitiesWorker = this.workers.get('virtual-entities-generator');
      if (!virtualEntitiesWorker) {
        throw new Error('Virtual Entities Generator Worker not registered');
      }

      console.log('[WorkerOrchestrator] Step 3: Executing Virtual Entities Generator Worker...');
      const virtualEntitiesResult = await virtualEntitiesWorker.execute();
      workerResults.push(virtualEntitiesResult);

      if (!virtualEntitiesResult.success) {
        console.error('[WorkerOrchestrator] ❌ Virtual Entities Generator Worker failed:', virtualEntitiesResult.error);
        
        // Continue anyway - virtual entities are optional
        console.warn('[WorkerOrchestrator] ⚠️ Continuing without virtual entities');
      } else {
        console.log('[WorkerOrchestrator] ✅ Virtual Entities Generator Worker completed');
      }

      // ====================================================================
      // Step 4: Graph Builder Worker
      // ====================================================================
      const graphBuilderWorker = this.workers.get('graph-builder');
      if (!graphBuilderWorker) {
        throw new Error('Graph Builder Worker not registered');
      }

      console.log('[WorkerOrchestrator] Step 4: Executing Graph Builder Worker...');
      const graphBuilderResult = await graphBuilderWorker.execute();
      workerResults.push(graphBuilderResult);

      if (!graphBuilderResult.success) {
        console.error('[WorkerOrchestrator] ❌ Graph Builder Worker failed:', graphBuilderResult.error);
        
        return {
          success: false,
          totalExecutionTimeMs: Date.now() - startTime,
          workersExecuted: 4,
          workerResults,
          error: `Graph Builder Worker failed: ${graphBuilderResult.error}`,
        };
      }

      console.log('[WorkerOrchestrator] ✅ Graph Builder Worker completed');

      // ====================================================================
      // Success
      // ====================================================================
      const totalExecutionTime = Date.now() - startTime;
      console.log(`[WorkerOrchestrator] 🎉 Full pipeline completed in ${totalExecutionTime}ms`);

      return {
        success: true,
        totalExecutionTimeMs: totalExecutionTime,
        workersExecuted: 3,
        workerResults,
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('[WorkerOrchestrator] ❌ Pipeline execution failed:', errorMessage);

      return {
        success: false,
        totalExecutionTimeMs: Date.now() - startTime,
        workersExecuted: workerResults.length,
        workerResults,
        error: errorMessage,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute single worker by ID
   */
  public async executeWorker(workerId: string): Promise<WorkerExecutionResult> {
    const worker = this.workers.get(workerId);
    
    if (!worker) {
      return {
        success: false,
        workerId,
        executionTimeMs: 0,
        message: 'Worker not found',
        error: 'WORKER_NOT_FOUND',
      };
    }

    console.log(`[WorkerOrchestrator] Executing single worker: ${workerId}...`);
    
    const result = await worker.execute();
    
    console.log(`[WorkerOrchestrator] Worker ${workerId} ${result.success ? 'completed' : 'failed'}`);

    return result;
  }

  /**
   * Get all registered workers
   */
  public getRegisteredWorkers(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Get worker metadata
   */
  public getWorkerMetadata(workerId: string) {
    const worker = this.workers.get(workerId);
    return worker ? worker.getMetadata() : null;
  }

  /**
   * Get all workers metadata
   */
  public getAllWorkersMetadata() {
    const metadata: Record<string, any> = {};
    
    for (const [workerId, worker] of this.workers.entries()) {
      metadata[workerId] = worker.getMetadata();
    }
    
    return metadata;
  }

  /**
   * Check if pipeline is running
   */
  public isPipelineRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Cancel all workers (best effort)
   */
  public async cancelAllWorkers(): Promise<void> {
    console.log('[WorkerOrchestrator] ⚠️ Cancelling all workers...');
    
    const promises = Array.from(this.workers.values()).map(worker => worker.cancel());
    await Promise.allSettled(promises);
    
    console.log('[WorkerOrchestrator] All workers cancelled');
  }
}

/**
 * Global singleton orchestrator instance
 */
let orchestratorInstance: WorkerOrchestrator | null = null;

/**
 * Get orchestrator singleton
 */
export function getWorkerOrchestrator(): WorkerOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new WorkerOrchestrator();
  }
  return orchestratorInstance;
}




