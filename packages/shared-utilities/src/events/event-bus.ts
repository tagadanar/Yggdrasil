// packages/shared-utilities/src/events/event-bus.ts
import { EventEmitter } from 'events';
import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';

/**
 * Core event interface for the event-driven architecture.
 * All events in the system must conform to this structure.
 */
export interface Event<T = any> {
  /** Unique identifier for the event */
  id: string;
  /** Event type in dot notation (e.g., 'user.created', 'course.updated') */
  type: string;
  /** Service that published the event */
  source: string;
  /** When the event occurred */
  timestamp: Date;
  /** Event payload data */
  data: T;
  /** Additional metadata for the event */
  metadata?: Record<string, any>;
}

/**
 * Handler function for processing events.
 * Can be synchronous or asynchronous.
 */
export interface EventHandler<T = any> {
  (event: Event<T>): Promise<void> | void;
}

/**
 * Configuration options for EventBus initialization.
 */
export interface EventBusOptions {
  /** RabbitMQ connection URL */
  amqpUrl: string;
  /** Service name for queue naming */
  serviceName: string;
  /** Exchange name for routing events */
  exchange?: string;
  /** Enable retry mechanism */
  enableRetries?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Event-driven message bus using RabbitMQ for distributed messaging
 * and local EventEmitter for same-service communication.
 *
 * Features:
 * - RabbitMQ integration for cross-service messaging
 * - Local event handling for same-service events
 * - Automatic retry mechanism
 * - Dead letter handling
 * - Topic-based routing
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus({
 *   serviceName: 'user-service',
 *   amqpUrl: 'amqp://localhost:5672'
 * });
 *
 * await eventBus.connect();
 *
 * // Publish an event
 * await eventBus.publish({
 *   type: 'user.created',
 *   data: { userId: '123', email: 'user@example.com' }
 * });
 *
 * // Subscribe to events
 * eventBus.subscribe('user.*', async (event) => {
 *   console.log('User event:', event.type, event.data);
 * });
 * ```
 */
export class EventBus {
  private connection?: any;
  private channel?: any;
  private localEmitter = new EventEmitter();
  private handlers = new Map<string, Set<EventHandler>>();
  private readonly exchange: string;
  private readonly serviceName: string;
  private readonly amqpUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private connected = false;

  constructor(options: EventBusOptions) {
    this.serviceName = options.serviceName;
    this.amqpUrl = options.amqpUrl;
    this.exchange = options.exchange || 'yggdrasil.events';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;

    // Increase EventEmitter max listeners to handle many subscriptions
    this.localEmitter.setMaxListeners(100);
  }

  /**
   * Connect to RabbitMQ and set up the event infrastructure.
   * Creates exchange, queues, and starts consuming messages.
   */
  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to event bus for ${this.serviceName}...`);

      // Connect to RabbitMQ
      this.connection = await amqp.connect(this.amqpUrl);
      this.channel = await this.connection.createChannel();

      // Set up connection error handlers
      this.connection.on('error', (err: Error) => {
        logger.error('RabbitMQ connection error:', err);
        this.connected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connected = false;
        this.reconnect();
      });

      // Create topic exchange for event routing
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });

      // Create service-specific queue
      const queueName = `${this.serviceName}.events`;
      const queue = await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000, // 1 hour
          'x-max-length': 10000,
          'x-dead-letter-exchange': `${this.exchange}.dlx`,
          'x-dead-letter-routing-key': 'dead',
        },
      });

      // Create dead letter exchange for failed messages
      await this.channel.assertExchange(`${this.exchange}.dlx`, 'direct', {
        durable: true,
      });

      const dlq = await this.channel.assertQueue(`${this.serviceName}.dead`, {
        durable: true,
      });

      await this.channel.bindQueue(dlq.queue, `${this.exchange}.dlx`, 'dead');

      // Set up consumer
      await this.channel.consume(queue.queue, async (msg: any) => {
        if (!msg) return;

        try {
          const event: Event = JSON.parse(msg.content.toString());
          await this.handleEvent(event);
          this.channel!.ack(msg);
        } catch (error) {
          logger.error('Failed to process event:', error);

          // Check retry count
          const retryCount = msg.properties.headers?.['x-retry-count'] || 0;

          if (retryCount < this.maxRetries) {
            // Requeue with retry count
            setTimeout(
              () => {
                this.channel!.nack(msg, false, true);
              },
              this.retryDelay * (retryCount + 1),
            );
          } else {
            // Send to dead letter queue
            this.channel!.nack(msg, false, false);
          }
        }
      });

      this.connected = true;
      logger.info(`Event bus connected for ${this.serviceName}`);
    } catch (error) {
      logger.error('Failed to connect to event bus:', error);
      throw error;
    }
  }

  /**
   * Publish an event to the event bus.
   * Events are routed based on service name and event type.
   *
   * @param event - Event to publish (without id, timestamp, and source)
   */
  async publish<T>(event: Omit<Event<T>, 'id' | 'timestamp' | 'source'>): Promise<void> {
    const fullEvent: Event<T> = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
      source: this.serviceName,
    };

    try {
      // Publish to RabbitMQ for cross-service delivery
      if (this.channel && this.connected) {
        const routingKey = `${this.serviceName}.${event.type}`;
        const published = this.channel.publish(
          this.exchange,
          routingKey,
          Buffer.from(JSON.stringify(fullEvent)),
          {
            persistent: true,
            contentType: 'application/json',
            headers: {
              'event-id': fullEvent.id,
              'event-type': fullEvent.type,
              source: this.serviceName,
            },
          },
        );

        if (!published) {
          // Channel is flow controlled, wait for drain
          await new Promise(resolve => this.channel!.once('drain', resolve));
        }
      }

      // Also emit locally for same-service handlers
      this.localEmitter.emit(event.type, fullEvent);

      logger.debug(`Published event: ${event.type}`, {
        eventId: fullEvent.id,
        source: fullEvent.source,
        dataSize: JSON.stringify(fullEvent.data).length,
      });
    } catch (error) {
      logger.error(`Failed to publish event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events matching a pattern.
   * Supports wildcard patterns using RabbitMQ topic routing.
   *
   * @param pattern - Event pattern to match (e.g., 'user.*', 'course.created')
   * @param handler - Function to handle matching events
   */
  subscribe(pattern: string, handler: EventHandler): void {
    try {
      // Subscribe to RabbitMQ pattern
      if (this.channel && this.connected) {
        this.channel.bindQueue(`${this.serviceName}.events`, this.exchange, pattern);
      }

      // Store handler for local events
      const eventType = pattern.split('.').pop() || pattern;
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, new Set());
      }
      this.handlers.get(eventType)!.add(handler);

      // Subscribe to local events (convert pattern to exact match for local emitter)
      this.localEmitter.on(eventType, handler);

      logger.debug(`Subscribed to event pattern: ${pattern}`);
    } catch (error) {
      logger.error(`Failed to subscribe to pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from events matching a pattern.
   *
   * @param pattern - Event pattern to unsubscribe from
   * @param handler - Specific handler to remove (optional)
   */
  unsubscribe(pattern: string, handler?: EventHandler): void {
    const eventType = pattern.split('.').pop() || pattern;

    if (handler) {
      // Remove specific handler
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
      this.localEmitter.removeListener(eventType, handler);
    } else {
      // Remove all handlers for this pattern
      this.handlers.delete(eventType);
      this.localEmitter.removeAllListeners(eventType);
    }

    logger.debug(`Unsubscribed from event pattern: ${pattern}`);
  }

  /**
   * Handle incoming events by dispatching to registered handlers.
   */
  private async handleEvent(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      logger.debug(`No handlers for event type: ${event.type}`);
      return;
    }

    logger.debug(`Processing event: ${event.type}`, {
      eventId: event.id,
      source: event.source,
      handlerCount: handlers.size,
    });

    // Execute handlers in parallel
    const promises = Array.from(handlers).map(handler =>
      Promise.resolve(handler(event)).catch(error => {
        logger.error(`Handler error for ${event.type}:`, {
          eventId: event.id,
          error: error.message,
          stack: error.stack,
        });
        // Don't throw to prevent other handlers from failing
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Attempt to reconnect to RabbitMQ on connection loss.
   */
  private async reconnect(): Promise<void> {
    if (this.connected) return;

    logger.info('Attempting to reconnect to event bus...');

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts && !this.connected) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempts)));
        await this.connect();
        break;
      } catch (error) {
        attempts++;
        logger.error(`Reconnection attempt ${attempts} failed:`, error);

        if (attempts >= maxAttempts) {
          logger.error('Max reconnection attempts reached. Event bus will remain disconnected.');
          break;
        }
      }
    }
  }

  /**
   * Get current connection status.
   */
  isConnected(): boolean {
    return this.connected && this.connection !== undefined;
  }

  /**
   * Get statistics about the event bus.
   */
  getStats(): {
    connected: boolean;
    subscriptions: number;
    serviceName: string;
    exchange: string;
  } {
    return {
      connected: this.isConnected(),
      subscriptions: this.handlers.size,
      serviceName: this.serviceName,
      exchange: this.exchange,
    };
  }

  /**
   * Gracefully disconnect from the event bus.
   */
  async disconnect(): Promise<void> {
    try {
      this.connected = false;

      if (this.channel) {
        await this.channel.close();
        this.channel = undefined;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = undefined;
      }

      this.localEmitter.removeAllListeners();
      this.handlers.clear();

      logger.info(`Event bus disconnected for ${this.serviceName}`);
    } catch (error) {
      logger.error('Error disconnecting from event bus:', error);
    }
  }
}

/**
 * Typed event definitions for the Yggdrasil platform.
 * These provide type safety for event data structures.
 */
export namespace Events {
  export interface UserCreated {
    userId: string;
    email: string;
    role: string;
    profile: {
      firstName: string;
      lastName: string;
      department?: string;
    };
  }

  export interface UserUpdated {
    userId: string;
    changes: Record<string, any>;
    changedBy: string;
  }

  export interface UserDeleted {
    userId: string;
    deletedBy: string;
    reason?: string;
  }

  export interface CourseCreated {
    courseId: string;
    teacherId: string;
    title: string;
    description: string;
    category: string;
  }

  export interface CourseUpdated {
    courseId: string;
    changes: Record<string, any>;
    updatedBy: string;
  }

  export interface CoursePublished {
    courseId: string;
    publishedBy: string;
    publishedAt: Date;
  }

  export interface EnrollmentCreated {
    enrollmentId: string;
    userId: string;
    courseId: string;
    enrolledBy: string;
    paymentId?: string;
  }

  export interface EnrollmentCancelled {
    enrollmentId: string;
    cancelledBy: string;
    reason: string;
    refundId?: string;
  }

  export interface ProgressUpdated {
    userId: string;
    courseId: string;
    enrollmentId: string;
    progress: number;
    sectionId?: string;
    exerciseId?: string;
  }

  export interface CertificateIssued {
    userId: string;
    courseId: string;
    certificateId: string;
    completedAt: Date;
    score: number;
  }

  export interface PaymentProcessed {
    paymentId: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'completed' | 'failed' | 'pending';
    transactionId?: string;
  }

  export interface NotificationSent {
    notificationId: string;
    userId: string;
    type: 'email' | 'sms' | 'push';
    status: 'sent' | 'failed' | 'delivered';
    subject?: string;
  }
}

// Factory function for creating event bus instances
export function createEventBus(options: EventBusOptions): EventBus {
  return new EventBus(options);
}
