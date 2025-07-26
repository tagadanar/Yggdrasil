import { ExternalServiceError } from './AppError';
import { logger } from '../logging/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private readonly name: string;
  private readonly threshold: number;
  // timeout parameter available for future use (e.g., operation timeouts)
  // private readonly _timeout: number;
  private readonly resetTimeout: number;

  constructor(options: {
    name: string;
    threshold?: number;
    timeout?: number;
    resetTimeout?: number;
  }) {
    this.name = options.name;
    this.threshold = options.threshold || 5;
    // this._timeout = options.timeout || 60000; // 1 minute - available for future use
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new ExternalServiceError(
          this.name,
          'Circuit breaker is OPEN',
          new Error('Service temporarily unavailable'),
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime
      ? Date.now() - this.lastFailureTime.getTime() > this.resetTimeout
      : false;
  }

  private onSuccess() {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.threshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        logger.info('Circuit breaker closed', { name: this.name });
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.threshold) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker opened', {
        name: this.name,
        failures: this.failures,
      });
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successes = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Usage in services
export class ExternalServiceClient {
  private circuitBreaker: CircuitBreaker;

  constructor(serviceName: string) {
    this.circuitBreaker = new CircuitBreaker({
      name: serviceName,
      threshold: 5,
      timeout: 60000,
      resetTimeout: 30000,
    });
  }

  async makeRequest<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }
}
