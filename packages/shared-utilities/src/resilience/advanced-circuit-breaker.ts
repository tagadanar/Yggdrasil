// packages/shared-utilities/src/resilience/advanced-circuit-breaker.ts

/**
 * Advanced Circuit Breaker implementation with comprehensive metrics and fallback strategies.
 *
 * Provides enhanced failure protection for distributed systems with:
 * - State management (CLOSED, OPEN, HALF_OPEN)
 * - Comprehensive metrics collection
 * - Configurable failure thresholds
 * - Custom error filtering
 * - Fallback strategy support
 * - Event-driven notifications
 * - Volume-based thresholds
 *
 * Features:
 * - Automatic state transitions based on failure rates
 * - Configurable reset timeouts
 * - Success threshold for HALF_OPEN to CLOSED transition
 * - Detailed metrics and monitoring
 * - Custom error filtering (ignore certain errors)
 * - Fallback execution on circuit open
 * - Event emission for monitoring integration
 *
 * @example
 * ```typescript
 * const circuitBreaker = new AdvancedCircuitBreaker('user-service', {
 *   failureThreshold: 5,
 *   successThreshold: 3,
 *   timeout: 60000,
 *   resetTimeout: 30000,
 *   volumeThreshold: 10,
 *   errorFilter: (error) => error.code !== 'TIMEOUT',
 *   fallback: async () => ({ cached: true, data: {} })
 * });
 *
 * // Execute operation through circuit breaker
 * const result = await circuitBreaker.execute(async () => {
 *   return await userService.getUser(userId);
 * });
 *
 * // Monitor circuit breaker events
 * circuitBreaker.on('stateChange', ({ from, to }) => {
 *   console.log(`Circuit breaker ${circuitBreaker.name}: ${from} -> ${to}`);
 * });
 * ```
 */

import { EventEmitter } from 'events';
import { logger } from '../logging/logger';

/**
 * Circuit breaker states.
 */
export enum CircuitState {
  /** Circuit is closed, requests pass through normally */
  CLOSED = 'CLOSED',
  /** Circuit is open, requests are rejected immediately */
  OPEN = 'OPEN',
  /** Circuit is half-open, allowing limited requests to test recovery */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Configuration options for the advanced circuit breaker.
 */
export interface CircuitBreakerOptions {
  /** Number of failures to open the circuit */
  failureThreshold?: number;
  /** Number of successes to close a half-open circuit */
  successThreshold?: number;
  /** Timeout for operations in milliseconds */
  timeout?: number;
  /** Time to wait before transitioning from OPEN to HALF_OPEN */
  resetTimeout?: number;
  /** Minimum number of requests required before applying failure threshold */
  volumeThreshold?: number;
  /** Function to filter which errors should count as failures */
  errorFilter?: (error: Error) => boolean;
  /** Fallback function to execute when circuit is open */
  fallback?: () => Promise<any>;
  /** Enable/disable metrics collection */
  enableMetrics?: boolean;
}

/**
 * Circuit breaker metrics.
 */
export interface CircuitBreakerMetrics {
  /** Total number of requests */
  totalRequests: number;
  /** Total number of failures */
  totalFailures: number;
  /** Total number of successes */
  totalSuccesses: number;
  /** Total number of timeouts */
  totalTimeouts: number;
  /** Total number of fallback executions */
  totalFallbacks: number;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Number of consecutive successes */
  consecutiveSuccesses: number;
  /** Current failure rate (0-1) */
  failureRate: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** State transition history */
  stateTransitions: Array<{
    from: CircuitState;
    to: CircuitState;
    timestamp: Date;
  }>;
}

/**
 * Advanced Circuit Breaker with comprehensive monitoring and fallback capabilities.
 *
 * Implements the circuit breaker pattern with enhanced features for production
 * use including detailed metrics, configurable thresholds, and fallback strategies.
 */
export class AdvancedCircuitBreaker extends EventEmitter {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private requests = 0;
  private nextAttempt?: Date;
  private responseTimes: number[] = [];

  // Metrics
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    totalTimeouts: 0,
    totalFallbacks: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    failureRate: 0,
    averageResponseTime: 0,
    stateTransitions: [],
  };

  private readonly options: Required<CircuitBreakerOptions>;

  /**
   * Create an advanced circuit breaker.
   *
   * @param name - Unique name for the circuit breaker
   * @param options - Configuration options
   */
  constructor(
    public readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    super();

    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 3,
      timeout: options.timeout || 30000,
      resetTimeout: options.resetTimeout || 60000,
      volumeThreshold: options.volumeThreshold || 10,
      errorFilter: options.errorFilter || (() => true),
      fallback: options.fallback || (() => Promise.reject(new Error('Circuit breaker open'))),
      enableMetrics: options.enableMetrics !== false,
    };

    logger.info(`Advanced circuit breaker initialized: ${name}`, {
      failureThreshold: this.options.failureThreshold,
      successThreshold: this.options.successThreshold,
      timeout: this.options.timeout,
      resetTimeout: this.options.resetTimeout,
    });
  }

  /**
   * Execute an operation through the circuit breaker.
   *
   * @param operation - Async operation to execute
   * @returns Operation result or fallback result
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;
    this.requests++;

    // Check if circuit should remain open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        return this.executeFallback();
      }
    }

    // For HALF_OPEN state, only allow limited requests
    if (this.state === CircuitState.HALF_OPEN) {
      return this.executeInHalfOpenState(operation);
    }

    // Execute operation normally (CLOSED state)
    return this.executeOperation(operation);
  }

  /**
   * Get current circuit breaker state.
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get comprehensive metrics.
   */
  getMetrics(): CircuitBreakerMetrics {
    this.updateFailureRate();
    this.updateAverageResponseTime();
    return { ...this.metrics };
  }

  /**
   * Reset the circuit breaker to CLOSED state.
   */
  reset(): void {
    logger.info(`Circuit breaker reset: ${this.name}`);

    this.failures = 0;
    this.successes = 0;
    this.requests = 0;
    this.nextAttempt = undefined;

    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Force the circuit breaker to OPEN state.
   */
  forceOpen(): void {
    logger.warn(`Circuit breaker forced open: ${this.name}`);
    this.transitionTo(CircuitState.OPEN);
    this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
  }

  /**
   * Check if the circuit breaker is healthy.
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED && this.metrics.failureRate < 0.5;
  }

  /**
   * Execute operation in normal (CLOSED) state.
   */
  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Execute operation in HALF_OPEN state.
   */
  private async executeInHalfOpenState<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccessInHalfOpen(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailureInHalfOpen(error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Execute operation with timeout.
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.metrics.totalTimeouts++;
        reject(new Error(`Operation timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute fallback when circuit is open.
   */
  private async executeFallback<T>(): Promise<T> {
    try {
      this.metrics.totalFallbacks++;
      const result = await this.options.fallback();

      logger.debug(`Circuit breaker fallback executed: ${this.name}`);
      this.emit('fallbackExecuted', { name: this.name });

      return result;
    } catch (error) {
      logger.error(`Circuit breaker fallback failed: ${this.name}`, error);
      this.emit('fallbackFailed', { name: this.name, error });
      throw error;
    }
  }

  /**
   * Handle successful operation.
   */
  private onSuccess(responseTime: number): void {
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.successes++;
    this.responseTimes.push(responseTime);

    // Keep only last 100 response times for rolling average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    logger.debug(`Circuit breaker success: ${this.name}`, {
      responseTime,
      consecutiveSuccesses: this.metrics.consecutiveSuccesses,
    });

    this.emit('success', {
      name: this.name,
      responseTime,
      consecutiveSuccesses: this.metrics.consecutiveSuccesses,
    });
  }

  /**
   * Handle failed operation.
   */
  private onFailure(error: Error, responseTime: number): void {
    // Check if this error should count as a failure
    if (!this.options.errorFilter(error)) {
      logger.debug(`Circuit breaker error filtered: ${this.name}`, { error: error.message });
      return;
    }

    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.failures++;
    this.responseTimes.push(responseTime);

    logger.debug(`Circuit breaker failure: ${this.name}`, {
      error: error.message,
      consecutiveFailures: this.metrics.consecutiveFailures,
      failures: this.failures,
      threshold: this.options.failureThreshold,
    });

    this.emit('failure', {
      name: this.name,
      error,
      consecutiveFailures: this.metrics.consecutiveFailures,
    });

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }
  }

  /**
   * Handle success in HALF_OPEN state.
   */
  private onSuccessInHalfOpen(responseTime: number): void {
    this.onSuccess(responseTime);

    // Check if we should close the circuit
    if (this.successes >= this.options.successThreshold) {
      this.transitionToClosed();
    }
  }

  /**
   * Handle failure in HALF_OPEN state.
   */
  private onFailureInHalfOpen(error: Error, responseTime: number): void {
    this.onFailure(error, responseTime);
    this.transitionToOpen();
  }

  /**
   * Check if circuit should be opened.
   */
  private shouldOpenCircuit(): boolean {
    // Need minimum volume of requests
    if (this.requests < this.options.volumeThreshold) {
      return false;
    }

    // Check failure threshold
    return this.failures >= this.options.failureThreshold;
  }

  /**
   * Check if we should attempt to reset from OPEN to HALF_OPEN.
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) {
      return false;
    }

    return Date.now() >= this.nextAttempt.getTime();
  }

  /**
   * Transition to OPEN state.
   */
  private transitionToOpen(): void {
    this.transitionTo(CircuitState.OPEN);
    this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);

    logger.warn(`Circuit breaker opened: ${this.name}`, {
      failures: this.failures,
      threshold: this.options.failureThreshold,
      nextAttempt: this.nextAttempt,
    });
  }

  /**
   * Transition to HALF_OPEN state.
   */
  private transitionToHalfOpen(): void {
    this.transitionTo(CircuitState.HALF_OPEN);
    this.successes = 0;
    this.failures = 0;
    this.requests = 0;

    logger.info(`Circuit breaker half-opened: ${this.name}`);
  }

  /**
   * Transition to CLOSED state.
   */
  private transitionToClosed(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.successes = 0;
    this.failures = 0;
    this.requests = 0;
    this.nextAttempt = undefined;

    logger.info(`Circuit breaker closed: ${this.name}`);
  }

  /**
   * Transition to a new state.
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // Record state transition
    this.metrics.stateTransitions.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
    });

    // Emit state change event
    this.emit('stateChange', {
      name: this.name,
      from: oldState,
      to: newState,
    });
  }

  /**
   * Update failure rate metric.
   */
  private updateFailureRate(): void {
    const total = this.metrics.totalSuccesses + this.metrics.totalFailures;
    this.metrics.failureRate = total > 0 ? this.metrics.totalFailures / total : 0;
  }

  /**
   * Update average response time metric.
   */
  private updateAverageResponseTime(): void {
    if (this.responseTimes.length === 0) {
      this.metrics.averageResponseTime = 0;
    } else {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageResponseTime = sum / this.responseTimes.length;
    }
  }
}

/**
 * Circuit Breaker Registry for managing multiple circuit breakers.
 *
 * Provides centralized management and monitoring of circuit breakers
 * across the application.
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, AdvancedCircuitBreaker>();

  /**
   * Get or create a circuit breaker.
   *
   * @param name - Circuit breaker name
   * @param options - Configuration options
   * @returns Circuit breaker instance
   */
  getCircuitBreaker(name: string, options?: CircuitBreakerOptions): AdvancedCircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new AdvancedCircuitBreaker(name, options);
      this.breakers.set(name, breaker);

      // Set up monitoring
      this.setupBreakerMonitoring(breaker);
    }

    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers.
   */
  getAllCircuitBreakers(): AdvancedCircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get circuit breaker by name.
   */
  getByName(name: string): AdvancedCircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Remove a circuit breaker.
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Get health status of all circuit breakers.
   */
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.isHealthy();
    });

    return status;
  }

  /**
   * Get metrics for all circuit breakers.
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });

    return metrics;
  }

  /**
   * Set up monitoring for a circuit breaker.
   */
  private setupBreakerMonitoring(breaker: AdvancedCircuitBreaker): void {
    breaker.on('stateChange', ({ name, from, to }) => {
      logger.info(`Circuit breaker state change: ${name}`, { from, to });
    });

    breaker.on('failure', ({ name, error, consecutiveFailures }) => {
      logger.warn(`Circuit breaker failure: ${name}`, {
        error: error.message,
        consecutiveFailures,
      });
    });

    breaker.on('fallbackExecuted', ({ name }) => {
      logger.info(`Circuit breaker fallback executed: ${name}`);
    });
  }
}

/**
 * Global circuit breaker registry instance.
 */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Factory function for creating circuit breakers.
 *
 * @param name - Circuit breaker name
 * @param options - Configuration options
 * @returns Circuit breaker instance
 */
export function createCircuitBreaker(
  name: string,
  options?: CircuitBreakerOptions,
): AdvancedCircuitBreaker {
  return circuitBreakerRegistry.getCircuitBreaker(name, options);
}
