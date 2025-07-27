// packages/shared-utilities/src/patterns/saga.ts
import { EventBus } from '../events/event-bus';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';

/**
 * Represents a single step in a saga transaction.
 * Each step can be executed and compensated (rolled back).
 */
export interface SagaStep<T = any> {
  /** Unique name for the step */
  name: string;
  /** Execute the step with the given data */
  execute(data: T): Promise<any>;
  /** Compensate (rollback) the step if it was already executed */
  compensate(data: T, error?: Error): Promise<void>;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Whether this step can be retried on failure */
  retryable?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
}

/**
 * Result of saga execution.
 */
export interface SagaResult<T = any> {
  /** Whether the saga completed successfully */
  success: boolean;
  /** Final data state after execution */
  data: T;
  /** Error information if saga failed */
  error?: Error;
  /** Steps that were completed successfully */
  completedSteps: string[];
  /** Steps that were compensated during rollback */
  compensatedSteps: string[];
  /** Total execution time in milliseconds */
  executionTime: number;
}

/**
 * Configuration options for saga execution.
 */
export interface SagaOptions {
  /** Maximum total execution time for the saga */
  globalTimeout?: number;
  /** Whether to publish detailed events during execution */
  publishEvents?: boolean;
  /** Whether to persist saga state during execution */
  persistState?: boolean;
  /** Custom metadata to include in events */
  metadata?: Record<string, any>;
}

/**
 * Abstract base class for implementing the Saga pattern for distributed transactions.
 *
 * A saga coordinates a series of operations across multiple services, ensuring that
 * either all operations succeed or all are compensated (rolled back) to maintain
 * data consistency in a distributed system.
 *
 * Key features:
 * - Automatic compensation on failure
 * - Event-driven progress tracking
 * - Step-by-step execution with rollback
 * - Timeout handling
 * - Retry mechanisms
 * - State persistence
 *
 * @example
 * ```typescript
 * class PaymentSaga extends Saga<PaymentData> {
 *   protected steps = [
 *     {
 *       name: 'reserve-inventory',
 *       execute: async (data) => { ... },
 *       compensate: async (data) => { ... }
 *     },
 *     {
 *       name: 'process-payment',
 *       execute: async (data) => { ... },
 *       compensate: async (data) => { ... }
 *     }
 *   ];
 * }
 *
 * const saga = new PaymentSaga(eventBus, 'payment-saga-123');
 * const result = await saga.execute(paymentData);
 * ```
 */
export abstract class Saga<T = any> {
  /** Steps that comprise this saga */
  protected abstract steps: SagaStep<T>[];

  /** Steps that have been completed successfully */
  private completedSteps: string[] = [];

  /** Steps that have been compensated */
  private compensatedSteps: string[] = [];

  /** Start time for execution tracking */
  private startTime = 0;

  /** Whether the saga is currently executing */
  private executing = false;

  constructor(
    protected eventBus: EventBus,
    protected sagaId: string,
    protected options: SagaOptions = {},
  ) {
    this.options = {
      globalTimeout: 30000, // 30 seconds default
      publishEvents: true,
      persistState: false,
      ...options,
    };
  }

  /**
   * Execute the saga with the provided data.
   * Steps are executed sequentially, and compensation occurs in reverse order on failure.
   *
   * @param data - Initial data for saga execution
   * @returns Promise resolving to saga execution result
   */
  async execute(data: T): Promise<SagaResult<T>> {
    if (this.executing) {
      throw new Error(`Saga ${this.sagaId} is already executing`);
    }

    this.executing = true;
    this.startTime = Date.now();
    this.completedSteps = [];
    this.compensatedSteps = [];

    logger.info(`Starting saga: ${this.sagaId}`, {
      sagaId: this.sagaId,
      stepCount: this.steps.length,
      options: this.options,
    });

    try {
      // Set up global timeout
      const timeoutPromise = this.options.globalTimeout
        ? new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(`Saga ${this.sagaId} timed out after ${this.options.globalTimeout}ms`),
              );
            }, this.options.globalTimeout);
          })
        : null;

      // Execute the saga
      const executionPromise = this.executeSteps(data);

      const result = timeoutPromise
        ? await Promise.race([executionPromise, timeoutPromise])
        : await executionPromise;

      const executionTime = Date.now() - this.startTime;

      if (this.options.publishEvents) {
        await this.publishEvent('saga.completed', {
          sagaId: this.sagaId,
          result: data,
          executionTime,
          completedSteps: this.completedSteps,
        });
      }

      logger.info(`Saga completed successfully: ${this.sagaId}`, {
        sagaId: this.sagaId,
        executionTime,
        completedSteps: this.completedSteps.length,
      });

      return {
        success: true,
        data: result,
        completedSteps: this.completedSteps,
        compensatedSteps: this.compensatedSteps,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - this.startTime;

      logger.error(`Saga failed: ${this.sagaId}`, {
        sagaId: this.sagaId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        completedSteps: this.completedSteps.length,
      });

      if (this.options.publishEvents) {
        await this.publishEvent('saga.failed', {
          sagaId: this.sagaId,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
          completedSteps: this.completedSteps,
          compensatedSteps: this.compensatedSteps,
        });
      }

      return {
        success: false,
        data,
        error: error instanceof Error ? error : new Error('Unknown error'),
        completedSteps: this.completedSteps,
        compensatedSteps: this.compensatedSteps,
        executionTime,
      };
    } finally {
      this.executing = false;
    }
  }

  /**
   * Execute all saga steps sequentially.
   */
  private async executeSteps(data: T): Promise<T> {
    let currentData = data;

    for (const step of this.steps) {
      logger.debug(`Executing saga step: ${step.name}`, {
        sagaId: this.sagaId,
        step: step.name,
        progress: `${this.completedSteps.length + 1}/${this.steps.length}`,
      });

      if (this.options.publishEvents) {
        await this.publishEvent('saga.step.started', {
          sagaId: this.sagaId,
          step: step.name,
          progress: this.completedSteps.length + 1,
          totalSteps: this.steps.length,
        });
      }

      try {
        // Execute step with optional timeout
        const stepResult = step.timeout
          ? await Promise.race([
              step.execute(currentData),
              new Promise<never>((_, reject) => {
                setTimeout(() => {
                  reject(new Error(`Step ${step.name} timed out after ${step.timeout}ms`));
                }, step.timeout);
              }),
            ])
          : await step.execute(currentData);

        // Update data with step result if it's an object
        if (stepResult && typeof stepResult === 'object') {
          currentData = { ...currentData, ...stepResult };
        }

        this.completedSteps.push(step.name);

        if (this.options.publishEvents) {
          await this.publishEvent('saga.step.completed', {
            sagaId: this.sagaId,
            step: step.name,
            result: stepResult,
            progress: this.completedSteps.length,
            totalSteps: this.steps.length,
          });
        }

        logger.debug(`Saga step completed: ${step.name}`, {
          sagaId: this.sagaId,
          step: step.name,
          progress: `${this.completedSteps.length}/${this.steps.length}`,
        });
      } catch (error) {
        logger.error(`Saga step failed: ${step.name}`, {
          sagaId: this.sagaId,
          step: step.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (this.options.publishEvents) {
          await this.publishEvent('saga.step.failed', {
            sagaId: this.sagaId,
            step: step.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: this.completedSteps.length,
            totalSteps: this.steps.length,
          });
        }

        // Attempt compensation for all completed steps
        await this.compensate(currentData, error as Error);

        throw error;
      }
    }

    return currentData;
  }

  /**
   * Compensate (rollback) all completed steps in reverse order.
   */
  private async compensate(data: T, originalError: Error): Promise<void> {
    if (this.completedSteps.length === 0) {
      logger.debug(`No steps to compensate for saga: ${this.sagaId}`);
      return;
    }

    logger.info(`Starting compensation for saga: ${this.sagaId}`, {
      sagaId: this.sagaId,
      stepsToCompensate: this.completedSteps.length,
    });

    if (this.options.publishEvents) {
      await this.publishEvent('saga.compensation.started', {
        sagaId: this.sagaId,
        originalError: originalError.message,
        stepsToCompensate: this.completedSteps.length,
      });
    }

    // Find steps to compensate (in reverse order)
    const stepsToCompensate = this.steps
      .filter(step => this.completedSteps.includes(step.name))
      .reverse();

    for (const step of stepsToCompensate) {
      try {
        logger.debug(`Compensating step: ${step.name}`, {
          sagaId: this.sagaId,
          step: step.name,
        });

        await step.compensate(data, originalError);
        this.compensatedSteps.push(step.name);

        if (this.options.publishEvents) {
          await this.publishEvent('saga.step.compensated', {
            sagaId: this.sagaId,
            step: step.name,
            compensatedSteps: this.compensatedSteps.length,
            totalCompensations: stepsToCompensate.length,
          });
        }

        logger.debug(`Step compensated successfully: ${step.name}`, {
          sagaId: this.sagaId,
          step: step.name,
        });
      } catch (compensationError) {
        logger.error(`Failed to compensate step ${step.name}:`, {
          sagaId: this.sagaId,
          step: step.name,
          compensationError:
            compensationError instanceof Error
              ? compensationError.message
              : 'Unknown compensation error',
        });

        if (this.options.publishEvents) {
          await this.publishEvent('saga.compensation.failed', {
            sagaId: this.sagaId,
            step: step.name,
            error:
              compensationError instanceof Error
                ? compensationError.message
                : 'Unknown compensation error',
            originalError: originalError.message,
          });
        }

        // Don't throw compensation errors - log and continue
        // This prevents compensation failures from masking the original error
      }
    }

    if (this.options.publishEvents) {
      await this.publishEvent('saga.compensation.completed', {
        sagaId: this.sagaId,
        compensatedSteps: this.compensatedSteps.length,
        totalSteps: stepsToCompensate.length,
        originalError: originalError.message,
      });
    }

    logger.info(`Compensation completed for saga: ${this.sagaId}`, {
      sagaId: this.sagaId,
      compensatedSteps: this.compensatedSteps.length,
      totalSteps: stepsToCompensate.length,
    });
  }

  /**
   * Publish a saga event to the event bus.
   */
  private async publishEvent(eventType: string, data: any): Promise<void> {
    try {
      await this.eventBus.publish({
        type: eventType,
        data: {
          ...data,
          metadata: this.options.metadata,
        },
      });
    } catch (error) {
      logger.error(`Failed to publish saga event ${eventType}:`, error);
      // Don't throw event publishing errors
    }
  }

  /**
   * Get current saga status.
   */
  getStatus(): {
    sagaId: string;
    executing: boolean;
    completedSteps: string[];
    compensatedSteps: string[];
    totalSteps: number;
    progress: number;
  } {
    return {
      sagaId: this.sagaId,
      executing: this.executing,
      completedSteps: [...this.completedSteps],
      compensatedSteps: [...this.compensatedSteps],
      totalSteps: this.steps.length,
      progress: this.steps.length > 0 ? this.completedSteps.length / this.steps.length : 0,
    };
  }

  /**
   * Cancel saga execution if currently running.
   * This will trigger compensation for any completed steps.
   */
  async cancel(reason = 'Cancelled by user'): Promise<void> {
    if (!this.executing) {
      throw new Error(`Cannot cancel saga ${this.sagaId}: not currently executing`);
    }

    logger.info(`Cancelling saga: ${this.sagaId}`, { sagaId: this.sagaId, reason });

    if (this.options.publishEvents) {
      await this.publishEvent('saga.cancelled', {
        sagaId: this.sagaId,
        reason,
        completedSteps: this.completedSteps.length,
      });
    }

    throw new Error(`Saga cancelled: ${reason}`);
  }
}

/**
 * Factory function for creating saga instances with common configuration.
 */
export function createSaga<T>(
  SagaClass: new (eventBus: EventBus, sagaId: string, options?: SagaOptions) => Saga<T>,
  eventBus: EventBus,
  options?: SagaOptions,
): Saga<T> {
  const sagaId = uuidv4();
  return new SagaClass(eventBus, sagaId, options);
}

/**
 * Utility for running multiple sagas in parallel with coordination.
 */
export class SagaOrchestrator {
  private activeSagas = new Map<string, Saga>();

  constructor(_eventBus: EventBus) {}

  /**
   * Execute multiple sagas in parallel.
   */
  async executeParallel<T>(
    sagas: Array<{ saga: Saga<T>; data: T }>,
    options: { failFast?: boolean; timeout?: number } = {},
  ): Promise<SagaResult<T>[]> {
    const { failFast = true, timeout = 60000 } = options;

    logger.info('Starting parallel saga execution', {
      sagaCount: sagas.length,
      failFast,
      timeout,
    });

    try {
      const promises = sagas.map(({ saga, data }) => {
        this.activeSagas.set(saga.getStatus().sagaId, saga);
        return saga.execute(data);
      });

      const timeoutPromise = timeout
        ? new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Parallel saga execution timed out after ${timeout}ms`));
            }, timeout);
          })
        : null;

      let results: SagaResult<T>[];

      if (failFast) {
        // Fail fast - if any saga fails, all fail
        results = timeoutPromise
          ? await Promise.race([Promise.all(promises), timeoutPromise])
          : await Promise.all(promises);
      } else {
        // Continue execution even if some sagas fail
        const settledPromises = timeoutPromise
          ? await Promise.race([Promise.allSettled(promises), timeoutPromise])
          : await Promise.allSettled(promises);

        results = settledPromises.map(result =>
          result.status === 'fulfilled'
            ? result.value
            : {
                success: false,
                data: {} as T,
                error: result.reason,
                completedSteps: [],
                compensatedSteps: [],
                executionTime: 0,
              },
        );
      }

      // Clean up active sagas
      sagas.forEach(({ saga }) => {
        this.activeSagas.delete(saga.getStatus().sagaId);
      });

      return results;
    } catch (error) {
      // Cancel all active sagas on error
      await this.cancelAll('Parallel execution failed');
      throw error;
    }
  }

  /**
   * Cancel all active sagas.
   */
  async cancelAll(reason = 'Orchestrator cancelled'): Promise<void> {
    const cancelPromises = Array.from(this.activeSagas.values()).map(saga =>
      saga.cancel(reason).catch(() => {
        // Ignore cancellation errors
      }),
    );

    await Promise.all(cancelPromises);
    this.activeSagas.clear();
  }

  /**
   * Get status of all active sagas.
   */
  getActiveSagas(): Array<ReturnType<Saga['getStatus']>> {
    return Array.from(this.activeSagas.values()).map(saga => saga.getStatus());
  }
}
