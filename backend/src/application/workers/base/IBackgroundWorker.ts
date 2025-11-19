/**
 * Background Worker Interface
 * 
 * Base interface for all background workers.
 * Ensures consistent behavior and error handling.
 * 
 * @module application/workers/base
 */

/**
 * Worker execution result
 */
export type WorkerExecutionResult = {
  success: boolean;
  workerId: string;
  executionTimeMs: number;
  message: string;
  dataProcessed?: {
    added: number;
    updated: number;
    deleted: number;
  };
  nextWorker?: string;
  error?: string;
};

/**
 * Worker status
 */
export enum WorkerStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Worker metadata
 */
export type WorkerMetadata = {
  workerId: string;
  workerName: string;
  version: string;
  lastRun?: Date;
  lastStatus?: WorkerStatus;
  lastDuration?: number;
  runCount: number;
};

/**
 * Background Worker Interface
 * 
 * All background workers must implement this interface.
 * 
 * @interface
 */
export interface IBackgroundWorker {
  /**
   * Get worker metadata
   */
  getMetadata(): WorkerMetadata;

  /**
   * Execute worker logic
   * 
   * @returns Worker execution result
   */
  execute(): Promise<WorkerExecutionResult>;

  /**
   * Check if worker can run (idempotency check)
   * 
   * @returns True if worker should run
   */
  canRun(): Promise<boolean>;

  /**
   * Cancel running worker (if supported)
   */
  cancel(): Promise<void>;
}

