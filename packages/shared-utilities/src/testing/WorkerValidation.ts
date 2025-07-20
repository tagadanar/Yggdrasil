// packages/shared-utilities/src/testing/WorkerValidation.ts
// Central worker ID validation - moved from testing-utilities to eliminate circular dependency

/**
 * Central Worker ID Validation System
 * Ensures all worker IDs are within acceptable bounds across all managers
 */
export class WorkerValidation {
  private static readonly MAX_WORKERS = 1; // Single worker only
  private static readonly DEFAULT_WORKER_ID = 0;

  /**
   * Validate and normalize worker ID to prevent explosion
   */
  static validateWorkerId(workerId?: number): number {
    // If no worker ID provided, detect from environment
    if (workerId === undefined || workerId === null) {
      return WorkerValidation.detectWorkerIdFromEnvironment();
    }

    // Validate provided worker ID
    if (isNaN(workerId) || workerId < 0) {
      console.warn(`⚠️ WORKER VALIDATION: Invalid worker ID ${workerId}, defaulting to ${WorkerValidation.DEFAULT_WORKER_ID}`);
      return WorkerValidation.DEFAULT_WORKER_ID;
    }

    const maxWorkerId = WorkerValidation.MAX_WORKERS - 1;
    if (workerId > maxWorkerId) {
      console.warn(`⚠️ WORKER VALIDATION: Worker ID ${workerId} exceeds max ${maxWorkerId}, clamping to ${maxWorkerId}`);
      return maxWorkerId;
    }

    console.log(`✅ WORKER VALIDATION: Validated worker ID: ${workerId}`);
    return workerId;
  }

  /**
   * Detect worker ID from environment with robust fallbacks
   */
  private static detectWorkerIdFromEnvironment(): number {
    // Try Playwright worker ID first (most reliable)
    const playwrightWorkerId = process.env.PLAYWRIGHT_WORKER_ID;
    if (playwrightWorkerId !== undefined && playwrightWorkerId !== null && playwrightWorkerId !== '') {
      const parsed = parseInt(playwrightWorkerId, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < WorkerValidation.MAX_WORKERS) {
        return parsed;
      }
    }

    // Try explicit worker ID
    const explicitWorkerId = process.env.WORKER_ID;
    if (explicitWorkerId !== undefined && explicitWorkerId !== null && explicitWorkerId !== '') {
      const parsed = parseInt(explicitWorkerId, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < WorkerValidation.MAX_WORKERS) {
        return parsed;
      }
    }

    // Try test worker index
    const testWorkerId = process.env.TEST_WORKER_INDEX;
    if (testWorkerId !== undefined && testWorkerId !== null && testWorkerId !== '') {
      const parsed = parseInt(testWorkerId, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < WorkerValidation.MAX_WORKERS) {
        return parsed;
      }
    }

    // Check if single worker mode
    const actualWorkerCount = WorkerValidation.getActualWorkerCount();
    if (actualWorkerCount === 1) {
      return 0;
    }

    // Last resort: PID-based with strict bounds
    const pid = process.pid;
    const rawWorkerIndex = Math.abs(pid % actualWorkerCount);
    
    // Double-check the result is within bounds
    if (rawWorkerIndex >= 0 && rawWorkerIndex < WorkerValidation.MAX_WORKERS) {
      return rawWorkerIndex;
    }

    // Final fallback
    console.warn(`⚠️ WORKER VALIDATION: All detection methods failed, using default worker 0`);
    return WorkerValidation.DEFAULT_WORKER_ID;
  }

  /**
   * Get actual worker count from environment
   */
  private static getActualWorkerCount(): number {
    // Check command line arguments for --workers flag
    const args = process.argv.join(' ');
    const workersMatch = args.match(/--workers[=\s]+(\d+)/);
    if (workersMatch) {
      const count = parseInt(workersMatch[1], 10);
      return Math.min(count, WorkerValidation.MAX_WORKERS); // Cap at max
    }
    
    // Check environment variable set by Playwright
    if (process.env.PLAYWRIGHT_WORKERS) {
      const count = parseInt(process.env.PLAYWRIGHT_WORKERS, 10);
      return Math.min(count, WorkerValidation.MAX_WORKERS); // Cap at max
    }
    
    // Default to single worker
    return WorkerValidation.MAX_WORKERS;
  }

  /**
   * Get maximum allowed worker ID (for bounds checking)
   */
  static getMaxWorkerId(): number {
    return WorkerValidation.MAX_WORKERS - 1;
  }

  /**
   * Check if worker ID is valid
   */
  static isValidWorkerId(workerId: number): boolean {
    return !isNaN(workerId) && workerId >= 0 && workerId < WorkerValidation.MAX_WORKERS;
  }
}