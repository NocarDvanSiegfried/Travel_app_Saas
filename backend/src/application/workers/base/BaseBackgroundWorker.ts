/**
 * Base Background Worker
 * 
 * Abstract base class for all background workers.
 * Provides common functionality like logging, error handling, and metrics.
 * 
 * @module application/workers/base
 */

import type {
  IBackgroundWorker,
  WorkerExecutionResult,
  WorkerMetadata,
  WorkerStatus,
} from './IBackgroundWorker';

/**
 * Base Background Worker
 * 
 * Abstract class that implements common worker functionality.
 * Concrete workers should extend this class.
 * 
 * @abstract
 */
export abstract class BaseBackgroundWorker implements IBackgroundWorker {
  protected lastRun?: Date;
  protected lastStatus: WorkerStatus = 'idle' as WorkerStatus;
  protected lastDuration?: number;
  protected runCount: number = 0;
  protected isRunning: boolean = false;
  protected shouldCancel: boolean = false;

  constructor(
    protected readonly workerId: string,
    protected readonly workerName: string,
    protected readonly version: string = '1.0.0'
  ) {}

  /**
   * Get worker metadata
   */
  public getMetadata(): WorkerMetadata {
    return {
      workerId: this.workerId,
      workerName: this.workerName,
      version: this.version,
      lastRun: this.lastRun,
      lastStatus: this.lastStatus,
      lastDuration: this.lastDuration,
      runCount: this.runCount,
    };
  }

  /**
   * Execute worker with error handling and metrics
   */
  public async execute(): Promise<WorkerExecutionResult> {
    const startTime = Date.now();

    try {
      // Check if already running
      if (this.isRunning) {
        return {
          success: false,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: 'Worker is already running',
          error: 'ALREADY_RUNNING',
        };
      }

      // Check if can run (idempotency)
      const canRun = await this.canRun();
      if (!canRun) {
        return {
          success: false,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: 'Worker cannot run (idempotency check failed)',
          error: 'CANNOT_RUN',
        };
      }

      // Mark as running
      this.isRunning = true;
      this.shouldCancel = false;
      this.lastStatus = 'running' as WorkerStatus;

      this.log('INFO', 'Worker started');

      // Execute worker logic (implemented by concrete class)
      const result = await this.executeWorkerLogic();

      // Update metadata
      this.lastRun = new Date();
      this.lastStatus = result.success ? ('success' as WorkerStatus) : ('failed' as WorkerStatus);
      this.lastDuration = Date.now() - startTime;
      this.runCount++;
      this.isRunning = false;

      this.log('INFO', `Worker finished: ${result.message}`);

      return {
        ...result,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.lastStatus = 'failed' as WorkerStatus;
      this.lastDuration = Date.now() - startTime;
      this.isRunning = false;

      const errorMessage = error?.message || String(error);
      this.log('ERROR', `Worker failed: ${errorMessage}`);

      return {
        success: false,
        workerId: this.workerId,
        executionTimeMs: Date.now() - startTime,
        message: 'Worker execution failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Cancel running worker
   */
  public async cancel(): Promise<void> {
    if (this.isRunning) {
      this.shouldCancel = true;
      this.log('WARN', 'Worker cancellation requested');
    }
  }

  /**
   * Check if cancellation was requested
   */
  protected isCancelled(): boolean {
    return this.shouldCancel;
  }

  /**
   * Check if worker should run (idempotency check)
   * 
   * Override this method in concrete workers for custom logic.
   * By default, allows running if not already running.
   */
  public async canRun(): Promise<boolean> {
    return !this.isRunning;
  }

  /**
   * Execute worker logic (implemented by concrete workers)
   * 
   * @abstract
   */
  protected abstract executeWorkerLogic(): Promise<WorkerExecutionResult>;

  /**
   * Log message with worker context
   */
  protected log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.workerId}]`;

    switch (level) {
      case 'INFO':
        console.log(`${prefix} ℹ️ ${message}`, data || '');
        break;
      case 'WARN':
        console.warn(`${prefix} ⚠️ ${message}`, data || '');
        break;
      case 'ERROR':
        console.error(`${prefix} ❌ ${message}`, data || '');
        break;
    }
  }
}

