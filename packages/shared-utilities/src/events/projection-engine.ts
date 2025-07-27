// packages/shared-utilities/src/events/projection-engine.ts
import { EventStore } from './event-store';
import { Event } from './event-bus';
import { logger } from '../logging/logger';
import mongoose, { Schema, Document, Connection } from 'mongoose';

/**
 * Handler interface for processing events to update projections.
 * Each projection handler is responsible for one specific read model.
 */
export interface ProjectionHandler {
  /** Name of the projection for identification */
  name: string;
  /** Events this handler is interested in (patterns supported) */
  eventTypes: string[];
  /** Process an event and update the projection */
  handle(event: Event): Promise<void>;
  /** Rebuild the entire projection from scratch */
  rebuild?(fromSequence?: number): Promise<void>;
  /** Reset the projection to initial state */
  reset?(): Promise<void>;
  /** Get projection metadata */
  getMetadata?(): {
    version: string;
    description: string;
    lastUpdated?: Date;
    eventCount?: number;
  };
}

/**
 * Checkpoint document for tracking projection progress.
 */
interface CheckpointDocument extends Document {
  projectionName: string;
  lastProcessedSequence: number;
  lastProcessedAt: Date;
  status: 'running' | 'stopped' | 'rebuilding' | 'error';
  errorMessage?: string;
  eventsProcessed: number;
  version: string;
}

const CheckpointSchema = new Schema<CheckpointDocument>(
  {
    projectionName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastProcessedSequence: {
      type: Number,
      required: true,
      default: 0,
    },
    lastProcessedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['running', 'stopped', 'rebuilding', 'error'],
      default: 'stopped',
    },
    errorMessage: String,
    eventsProcessed: {
      type: Number,
      default: 0,
    },
    version: {
      type: String,
      required: true,
      default: '1.0.0',
    },
  },
  {
    collection: 'projection_checkpoints',
    timestamps: false,
    versionKey: false,
  },
);

/**
 * Options for configuring the projection engine.
 */
export interface ProjectionEngineOptions {
  /** Batch size for processing events */
  batchSize?: number;
  /** Polling interval for new events (ms) */
  pollingInterval?: number;
  /** Maximum retry attempts for failed events */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Enable automatic recovery from errors */
  autoRecover?: boolean;
  /** Concurrency level for processing projections */
  concurrency?: number;
}

/**
 * Statistics for projection processing.
 */
export interface ProjectionStats {
  projectionName: string;
  status: string;
  lastProcessedSequence: number;
  eventsProcessed: number;
  lastProcessedAt: Date;
  eventsPerSecond?: number;
  error?: string;
}

/**
 * ProjectionEngine coordinates the updating of read models based on events.
 *
 * Core responsibilities:
 * - Register and manage projection handlers
 * - Stream events from EventStore and dispatch to handlers
 * - Track processing checkpoints for resumability
 * - Handle errors and provide retry mechanisms
 * - Support projection rebuilding and reset operations
 * - Provide monitoring and statistics
 *
 * The engine processes events in sequence order to maintain consistency,
 * and supports multiple projections running concurrently with independent
 * checkpoints for each projection.
 *
 * @example
 * ```typescript
 * const projectionEngine = new ProjectionEngine(eventStore, connection);
 *
 * // Register a projection handler
 * await projectionEngine.register({
 *   name: 'user-summary',
 *   eventTypes: ['user.created', 'user.updated', 'user.deleted'],
 *   async handle(event) {
 *     // Update user summary projection
 *     await UserSummaryModel.updateFromEvent(event);
 *   }
 * });
 *
 * // Start processing
 * await projectionEngine.start();
 * ```
 */
export class ProjectionEngine {
  private handlers = new Map<string, ProjectionHandler>();
  private checkpointModel: mongoose.Model<CheckpointDocument>;
  private running = false;
  private processingPromises = new Map<string, Promise<void>>();
  private readonly options: Required<ProjectionEngineOptions>;

  constructor(
    private eventStore: EventStore,
    connection: Connection,
    options: ProjectionEngineOptions = {},
  ) {
    this.options = {
      batchSize: options.batchSize || 100,
      pollingInterval: options.pollingInterval || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      autoRecover: options.autoRecover !== false,
      concurrency: options.concurrency || 5,
      ...options,
    };

    this.checkpointModel = connection.model<CheckpointDocument>(
      'ProjectionCheckpoint',
      CheckpointSchema,
    );
  }

  /**
   * Register a projection handler.
   */
  async register(handler: ProjectionHandler): Promise<void> {
    if (this.handlers.has(handler.name)) {
      throw new Error(`Projection handler already registered: ${handler.name}`);
    }

    this.handlers.set(handler.name, handler);

    // Initialize checkpoint if it doesn't exist
    await this.initializeCheckpoint(handler);

    logger.info(`Registered projection handler: ${handler.name}`, {
      eventTypes: handler.eventTypes,
      hasRebuild: !!handler.rebuild,
      hasReset: !!handler.reset,
    });
  }

  /**
   * Unregister a projection handler.
   */
  async unregister(projectionName: string): Promise<void> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      return;
    }

    // Stop processing for this projection
    await this.stopProjection(projectionName);

    this.handlers.delete(projectionName);
    logger.info(`Unregistered projection handler: ${projectionName}`);
  }

  /**
   * Start the projection engine.
   * Begins processing events for all registered projections.
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Projection engine is already running');
      return;
    }

    this.running = true;
    logger.info('Starting projection engine...', {
      handlerCount: this.handlers.size,
      options: this.options,
    });

    // Start processing for each projection
    for (const [projectionName, handler] of this.handlers) {
      if (!this.processingPromises.has(projectionName)) {
        const promise = this.processProjection(projectionName, handler);
        this.processingPromises.set(projectionName, promise);
      }
    }

    logger.info('Projection engine started');
  }

  /**
   * Stop the projection engine.
   * Gracefully stops all projection processing.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('Stopping projection engine...');
    this.running = false;

    // Wait for all processing to complete
    await Promise.all(Array.from(this.processingPromises.values()));
    this.processingPromises.clear();

    logger.info('Projection engine stopped');
  }

  /**
   * Stop processing for a specific projection.
   */
  async stopProjection(projectionName: string): Promise<void> {
    const promise = this.processingPromises.get(projectionName);
    if (promise) {
      // Update status to stopped
      await this.updateCheckpoint(projectionName, {
        status: 'stopped',
      });

      this.processingPromises.delete(projectionName);
      logger.info(`Stopped projection: ${projectionName}`);
    }
  }

  /**
   * Rebuild a projection from the beginning.
   */
  async rebuildProjection(projectionName: string, fromSequence = 0): Promise<void> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      throw new Error(`Projection handler not found: ${projectionName}`);
    }

    logger.info(`Starting rebuild for projection: ${projectionName}`, { fromSequence });

    // Update status to rebuilding
    await this.updateCheckpoint(projectionName, {
      status: 'rebuilding',
      lastProcessedSequence: fromSequence,
      eventsProcessed: 0,
      errorMessage: undefined,
    });

    try {
      // Reset projection if handler supports it
      if (handler.reset) {
        await handler.reset();
        logger.info(`Reset projection: ${projectionName}`);
      }

      // Use custom rebuild if available
      if (handler.rebuild) {
        await handler.rebuild(fromSequence);
      } else {
        // Default rebuild: replay all events
        await this.replayEvents(projectionName, handler, fromSequence);
      }

      // Update status to running
      await this.updateCheckpoint(projectionName, {
        status: 'running',
      });

      logger.info(`Completed rebuild for projection: ${projectionName}`);
    } catch (error) {
      logger.error(`Failed to rebuild projection ${projectionName}:`, error);

      await this.updateCheckpoint(projectionName, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Reset a projection to its initial state.
   */
  async resetProjection(projectionName: string): Promise<void> {
    const handler = this.handlers.get(projectionName);
    if (!handler || !handler.reset) {
      throw new Error(`Projection ${projectionName} does not support reset`);
    }

    logger.info(`Resetting projection: ${projectionName}`);

    await handler.reset();

    await this.updateCheckpoint(projectionName, {
      lastProcessedSequence: 0,
      eventsProcessed: 0,
      status: 'stopped',
      errorMessage: undefined,
    });

    logger.info(`Reset completed for projection: ${projectionName}`);
  }

  /**
   * Get statistics for all projections.
   */
  async getStats(): Promise<ProjectionStats[]> {
    const checkpoints = await this.checkpointModel.find().lean();

    return checkpoints.map(checkpoint => ({
      projectionName: checkpoint.projectionName,
      status: checkpoint.status,
      lastProcessedSequence: checkpoint.lastProcessedSequence,
      eventsProcessed: checkpoint.eventsProcessed,
      lastProcessedAt: checkpoint.lastProcessedAt,
      error: checkpoint.errorMessage,
    }));
  }

  /**
   * Get statistics for a specific projection.
   */
  async getProjectionStats(projectionName: string): Promise<ProjectionStats | null> {
    const checkpoint = await this.checkpointModel.findOne({ projectionName }).lean();
    if (!checkpoint) return null;

    return {
      projectionName: checkpoint.projectionName,
      status: checkpoint.status,
      lastProcessedSequence: checkpoint.lastProcessedSequence,
      eventsProcessed: checkpoint.eventsProcessed,
      lastProcessedAt: checkpoint.lastProcessedAt,
      error: checkpoint.errorMessage,
    };
  }

  /**
   * Process events for a specific projection.
   */
  private async processProjection(
    projectionName: string,
    handler: ProjectionHandler,
  ): Promise<void> {
    logger.info(`Starting processing for projection: ${projectionName}`);

    while (this.running) {
      try {
        const checkpoint = await this.getCheckpoint(projectionName);
        if (!checkpoint || checkpoint.status === 'stopped') {
          break;
        }

        if (checkpoint.status === 'rebuilding') {
          // Skip normal processing during rebuild
          await this.sleep(this.options.pollingInterval);
          continue;
        }

        // Get events since last processed sequence
        const events = await this.eventStore.getEventsSince(
          checkpoint.lastProcessedSequence,
          this.options.batchSize,
        );

        if (events.length === 0) {
          // No new events, wait before polling again
          await this.sleep(this.options.pollingInterval);
          continue;
        }

        // Filter events for this projection
        const relevantEvents = events.filter(event =>
          this.isEventRelevant(event, handler.eventTypes),
        );

        if (relevantEvents.length === 0) {
          // Update checkpoint even if no relevant events
          const lastEvent = events[events.length - 1];
          await this.updateCheckpoint(projectionName, {
            lastProcessedSequence:
              lastEvent?.metadata?.['sequence'] || checkpoint.lastProcessedSequence,
          });
          continue;
        }

        // Process events in sequence
        for (const event of relevantEvents) {
          await this.processEventWithRetry(projectionName, handler, event);

          await this.updateCheckpoint(projectionName, {
            lastProcessedSequence: event.metadata?.['sequence'] || checkpoint.lastProcessedSequence,
            eventsProcessed: checkpoint.eventsProcessed + 1,
            lastProcessedAt: new Date(),
            status: 'running',
          });
        }

        logger.debug(`Processed ${relevantEvents.length} events for projection: ${projectionName}`);
      } catch (error) {
        logger.error(`Error processing projection ${projectionName}:`, error);

        if (this.options.autoRecover) {
          await this.updateCheckpoint(projectionName, {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });

          // Wait before retrying
          await this.sleep(this.options.retryDelay);
        } else {
          break;
        }
      }
    }

    logger.info(`Stopped processing for projection: ${projectionName}`);
  }

  /**
   * Process a single event with retry logic.
   */
  private async processEventWithRetry(
    projectionName: string,
    handler: ProjectionHandler,
    event: Event,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        await handler.handle(event);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        logger.warn(
          `Failed to process event for projection ${projectionName} (attempt ${attempt}):`,
          {
            eventId: event.id,
            eventType: event.type,
            error: lastError.message,
          },
        );

        if (attempt < this.options.maxRetries) {
          await this.sleep(this.options.retryDelay * attempt);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to process event after ${this.options.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Replay events for projection rebuild.
   */
  private async replayEvents(
    projectionName: string,
    handler: ProjectionHandler,
    fromSequence: number,
  ): Promise<void> {
    logger.info(`Replaying events for projection: ${projectionName}`, { fromSequence });

    let processedCount = 0;
    let lastSequence = fromSequence;

    while (true) {
      const events = await this.eventStore.getEventsSince(lastSequence, this.options.batchSize);

      if (events.length === 0) {
        break; // No more events
      }

      // Filter relevant events
      const relevantEvents = events.filter(event =>
        this.isEventRelevant(event, handler.eventTypes),
      );

      // Process events
      for (const event of relevantEvents) {
        await handler.handle(event);
        processedCount++;
      }

      // Update checkpoint
      const lastEvent = events[events.length - 1];
      lastSequence = lastEvent?.metadata?.['sequence'] || lastSequence;

      await this.updateCheckpoint(projectionName, {
        lastProcessedSequence: lastSequence,
        eventsProcessed: processedCount,
        lastProcessedAt: new Date(),
      });

      logger.debug(
        `Replayed ${relevantEvents.length} events for ${projectionName} (total: ${processedCount})`,
      );
    }

    logger.info(`Completed replay for projection: ${projectionName}`, {
      totalProcessed: processedCount,
      lastSequence,
    });
  }

  /**
   * Check if an event is relevant for the given event types.
   */
  private isEventRelevant(event: Event, eventTypes: string[]): boolean {
    return eventTypes.some(pattern => {
      if (pattern.includes('*')) {
        // Simple wildcard matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(event.type);
      }
      return event.type === pattern;
    });
  }

  /**
   * Initialize checkpoint for a projection handler.
   */
  private async initializeCheckpoint(handler: ProjectionHandler): Promise<void> {
    const existing = await this.checkpointModel.findOne({
      projectionName: handler.name,
    });

    if (!existing) {
      const metadata = handler.getMetadata?.() || { version: '1.0.0', description: '' };

      await this.checkpointModel.create({
        projectionName: handler.name,
        lastProcessedSequence: 0,
        lastProcessedAt: new Date(),
        status: 'stopped',
        eventsProcessed: 0,
        version: metadata.version,
      });

      logger.info(`Initialized checkpoint for projection: ${handler.name}`);
    }
  }

  /**
   * Get checkpoint for a projection.
   */
  private async getCheckpoint(projectionName: string): Promise<CheckpointDocument | null> {
    return this.checkpointModel.findOne({ projectionName }).lean();
  }

  /**
   * Update checkpoint for a projection.
   */
  private async updateCheckpoint(
    projectionName: string,
    updates: Partial<CheckpointDocument>,
  ): Promise<void> {
    await this.checkpointModel.updateOne({ projectionName }, { $set: updates });
  }

  /**
   * Sleep for the specified number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get list of registered projection names.
   */
  getRegisteredProjections(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a projection is currently running.
   */
  isProjectionRunning(projectionName: string): boolean {
    return this.processingPromises.has(projectionName);
  }

  /**
   * Get the projection engine status.
   */
  getStatus(): {
    running: boolean;
    projectionCount: number;
    activeProjections: number;
  } {
    return {
      running: this.running,
      projectionCount: this.handlers.size,
      activeProjections: this.processingPromises.size,
    };
  }
}

/**
 * Example projection handlers for common use cases.
 */
export namespace ProjectionHandlers {
  /**
   * User summary projection handler.
   * Maintains a denormalized view of user data for fast queries.
   */
  export class UserSummaryProjection implements ProjectionHandler {
    name = 'user-summary';
    eventTypes = ['user.created', 'user.updated', 'user.deleted', 'enrollment.created'];

    constructor(private userSummaryModel: mongoose.Model<any>) {}

    async handle(event: Event): Promise<void> {
      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event);
          break;
        case 'enrollment.created':
          await this.handleEnrollmentCreated(event);
          break;
      }
    }

    private async handleUserCreated(event: Event): Promise<void> {
      const { userId, email, role, profile } = event.data;

      await this.userSummaryModel.create({
        userId,
        email,
        role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        department: profile.department,
        enrollmentCount: 0,
        lastLoginAt: null,
        createdAt: event.timestamp,
      });
    }

    private async handleUserUpdated(event: Event): Promise<void> {
      const { userId, changes } = event.data;

      await this.userSummaryModel.updateOne({ userId }, { $set: changes });
    }

    private async handleUserDeleted(event: Event): Promise<void> {
      const { userId } = event.data;

      await this.userSummaryModel.deleteOne({ userId });
    }

    private async handleEnrollmentCreated(event: Event): Promise<void> {
      const { userId } = event.data;

      await this.userSummaryModel.updateOne({ userId }, { $inc: { enrollmentCount: 1 } });
    }

    async reset(): Promise<void> {
      await this.userSummaryModel.deleteMany({});
    }

    getMetadata() {
      return {
        version: '1.0.0',
        description: 'Maintains denormalized user summary data for fast queries',
      };
    }
  }

  /**
   * Course analytics projection handler.
   * Maintains analytics data about course enrollments and progress.
   */
  export class CourseAnalyticsProjection implements ProjectionHandler {
    name = 'course-analytics';
    eventTypes = ['enrollment.created', 'enrollment.cancelled', 'progress.updated'];

    constructor(private analyticsModel: mongoose.Model<any>) {}

    async handle(event: Event): Promise<void> {
      switch (event.type) {
        case 'enrollment.created':
          await this.handleEnrollmentCreated(event);
          break;
        case 'enrollment.cancelled':
          await this.handleEnrollmentCancelled(event);
          break;
        case 'progress.updated':
          await this.handleProgressUpdated(event);
          break;
      }
    }

    private async handleEnrollmentCreated(event: Event): Promise<void> {
      const { courseId, userId } = event.data;

      await this.analyticsModel.updateOne(
        { courseId },
        {
          $inc: { enrollmentCount: 1 },
          $addToSet: { enrolledUsers: userId },
          $setOnInsert: {
            courseId,
            completionCount: 0,
            averageProgress: 0,
          },
        },
        { upsert: true },
      );
    }

    private async handleEnrollmentCancelled(event: Event): Promise<void> {
      const { courseId, userId } = event.data;

      await this.analyticsModel.updateOne(
        { courseId },
        {
          $inc: { enrollmentCount: -1 },
          $pull: { enrolledUsers: userId },
        },
      );
    }

    private async handleProgressUpdated(event: Event): Promise<void> {
      const { courseId, progress } = event.data;

      if (progress >= 100) {
        await this.analyticsModel.updateOne({ courseId }, { $inc: { completionCount: 1 } });
      }
    }

    async reset(): Promise<void> {
      await this.analyticsModel.deleteMany({});
    }

    getMetadata() {
      return {
        version: '1.0.0',
        description: 'Maintains course analytics and enrollment statistics',
      };
    }
  }
}

/**
 * Factory function for creating projection engine instances.
 */
export function createProjectionEngine(
  eventStore: EventStore,
  connection: mongoose.Connection,
  options?: ProjectionEngineOptions,
): ProjectionEngine {
  return new ProjectionEngine(eventStore, connection, options);
}
