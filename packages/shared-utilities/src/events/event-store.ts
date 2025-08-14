// packages/shared-utilities/src/events/event-store.ts
import mongoose, { Schema, Document, Connection } from 'mongoose';
import { SystemEvent } from './event-bus';
import { logger } from '../logging/logger';

/**
 * Stored event document interface extending the base Event with persistence fields.
 */
interface StoredEvent extends Document {
  /** Unique event identifier */
  eventId: string;
  /** Event type in dot notation */
  type: string;
  /** Service that published the event */
  source: string;
  /** When the event occurred */
  timestamp: Date;
  /** Event payload data */
  data: any;
  /** Additional metadata */
  metadata: Record<string, any>;
  /** Aggregate identifier for event sourcing */
  aggregateId?: string;
  /** Aggregate type name */
  aggregateType?: string;
  /** Version number for aggregate consistency */
  version?: number;
  /** Global sequence number for ordering */
  sequence?: number;
}

/**
 * MongoDB schema for storing events with optimized indexes.
 */
const EventSchema = new Schema<StoredEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    aggregateId: {
      type: String,
      index: true,
      sparse: true,
    },
    aggregateType: {
      type: String,
      index: true,
      sparse: true,
    },
    version: {
      type: Number,
      sparse: true,
    },
    sequence: {
      type: Number,
      index: true,
      unique: true,
      sparse: true,
    },
  },
  {
    collection: 'events',
    timestamps: false,
    versionKey: false,
  },
);

// Compound indexes for efficient queries
EventSchema.index({ aggregateId: 1, version: 1 }, { unique: true, sparse: true });
EventSchema.index({ type: 1, timestamp: -1 });
EventSchema.index({ source: 1, timestamp: -1 });
EventSchema.index({ aggregateType: 1, timestamp: -1 });
EventSchema.index({ timestamp: -1, sequence: -1 });

/**
 * Snapshot document for aggregate state optimization.
 */
interface SnapshotDocument extends Document {
  aggregateId: string;
  aggregateType: string;
  data: any;
  version: number;
  timestamp: Date;
}

const SnapshotSchema = new Schema<SnapshotDocument>(
  {
    aggregateId: {
      type: String,
      required: true,
      index: true,
    },
    aggregateType: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'snapshots',
    timestamps: false,
    versionKey: false,
  },
);

SnapshotSchema.index({ aggregateId: 1, version: -1 });
SnapshotSchema.index({ aggregateType: 1, timestamp: -1 });

/**
 * Query options for retrieving events.
 */
export interface EventQuery {
  /** Filter by aggregate ID */
  aggregateId?: string;
  /** Filter by aggregate type */
  aggregateType?: string;
  /** Filter by event type pattern */
  type?: string | RegExp;
  /** Filter by source service */
  source?: string;
  /** Start date filter */
  fromDate?: Date;
  /** End date filter */
  toDate?: Date;
  /** Starting version (for aggregate queries) */
  fromVersion?: number;
  /** Ending version (for aggregate queries) */
  toVersion?: number;
  /** Starting sequence number */
  fromSequence?: number;
  /** Maximum number of events to return */
  limit?: number;
  /** Sort direction (1 for ascending, -1 for descending) */
  sort?: 1 | -1;
}

/**
 * Event Store implementation for event sourcing using MongoDB.
 *
 * Provides:
 * - Durable event storage with ordering guarantees
 * - Aggregate-based event retrieval
 * - Snapshot support for performance optimization
 * - Global event ordering with sequence numbers
 * - Optimistic concurrency control
 *
 * @example
 * ```typescript
 * const eventStore = new EventStore(mongoConnection);
 *
 * // Append events to an aggregate
 * await eventStore.append(event, 'user-123', 'User');
 *
 * // Get all events for an aggregate
 * const events = await eventStore.getEvents('user-123');
 *
 * // Save a snapshot
 * await eventStore.saveSnapshot('user-123', 'User', userData, 10);
 * ```
 */
export class EventStore {
  private eventModel: mongoose.Model<StoredEvent>;
  private snapshotModel: mongoose.Model<SnapshotDocument>;
  private sequenceCounter = 0;
  private lastSequenceUpdate = 0;

  constructor(connection: Connection) {
    this.eventModel = connection.model<StoredEvent>('Event', EventSchema);
    this.snapshotModel = connection.model<SnapshotDocument>('Snapshot', SnapshotSchema);

    // Initialize sequence counter
    this.initializeSequenceCounter();
  }

  /**
   * Append an event to the event store.
   * Automatically assigns version numbers for aggregates and sequence numbers globally.
   *
   * @param event - Event to append
   * @param aggregateId - Aggregate identifier (optional)
   * @param aggregateType - Aggregate type (optional)
   * @returns Promise resolving to the stored event's sequence number
   */
  async append(event: SystemEvent, aggregateId?: string, aggregateType?: string): Promise<number> {
    try {
      let version: number | undefined;

      // Get next version for aggregate-based events
      if (aggregateId) {
        version = await this.getNextVersion(aggregateId);
      }

      // Get next global sequence number
      const sequence = await this.getNextSequence();

      // Create stored event
      await this.eventModel.create({
        eventId: event.id,
        type: event.type,
        source: event.source,
        timestamp: event.timestamp,
        data: event.data,
        metadata: event.metadata || {},
        aggregateId,
        aggregateType,
        version,
        sequence,
      });

      logger.debug(`Event appended to store: ${event.type}`, {
        eventId: event.id,
        aggregateId,
        version,
        sequence,
      });

      return sequence;
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error(
          `Concurrency conflict: Event ${event.id} already exists or version conflict for aggregate ${aggregateId}`,
        );
      }

      logger.error('Failed to append event to store:', error);
      throw error;
    }
  }

  /**
   * Retrieve events for a specific aggregate.
   *
   * @param aggregateId - Aggregate identifier
   * @param fromVersion - Starting version (inclusive)
   * @param toVersion - Ending version (inclusive)
   * @returns Promise resolving to array of events in version order
   */
  async getEvents(aggregateId: string, fromVersion?: number, toVersion?: number): Promise<SystemEvent[]> {
    try {
      const query: any = { aggregateId };

      if (fromVersion !== undefined || toVersion !== undefined) {
        query.version = {};
        if (fromVersion !== undefined) query.version.$gte = fromVersion;
        if (toVersion !== undefined) query.version.$lte = toVersion;
      }

      const events = await this.eventModel.find(query).sort({ version: 1 }).lean();

      return events.map(this.mapToEvent);
    } catch (error) {
      logger.error(`Failed to get events for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve events by type with optional filtering.
   *
   * @param query - Query parameters for event retrieval
   * @returns Promise resolving to array of matching events
   */
  async getEventsByQuery(query: EventQuery): Promise<SystemEvent[]> {
    try {
      const mongoQuery: any = {};
      const options: any = {};

      // Build query filters
      if (query.aggregateId) mongoQuery.aggregateId = query.aggregateId;
      if (query.aggregateType) mongoQuery.aggregateType = query.aggregateType;
      if (query.type) mongoQuery.type = query.type;
      if (query.source) mongoQuery.source = query.source;

      if (query.fromDate || query.toDate) {
        mongoQuery.timestamp = {};
        if (query.fromDate) mongoQuery.timestamp.$gte = query.fromDate;
        if (query.toDate) mongoQuery.timestamp.$lte = query.toDate;
      }

      if (query.fromVersion !== undefined || query.toVersion !== undefined) {
        mongoQuery.version = {};
        if (query.fromVersion !== undefined) mongoQuery.version.$gte = query.fromVersion;
        if (query.toVersion !== undefined) mongoQuery.version.$lte = query.toVersion;
      }

      if (query.fromSequence !== undefined) {
        mongoQuery.sequence = { $gte: query.fromSequence };
      }

      // Set options
      if (query.limit) options.limit = query.limit;

      const sortField = query.aggregateId ? 'version' : 'timestamp';
      const sortDirection = query.sort || 1;
      options.sort = { [sortField]: sortDirection };

      const events = await this.eventModel.find(mongoQuery, null, options).lean();

      return events.map(this.mapToEvent);
    } catch (error) {
      logger.error('Failed to query events:', error);
      throw error;
    }
  }

  /**
   * Get all events since a specific sequence number.
   * Useful for projection catch-up and replication.
   *
   * @param fromSequence - Starting sequence number
   * @param limit - Maximum number of events to return
   * @returns Promise resolving to array of events in sequence order
   */
  async getEventsSince(fromSequence: number, limit = 1000): Promise<SystemEvent[]> {
    try {
      const events = await this.eventModel
        .find({ sequence: { $gt: fromSequence } })
        .sort({ sequence: 1 })
        .limit(limit)
        .lean();

      return events.map(this.mapToEvent);
    } catch (error) {
      logger.error(`Failed to get events since sequence ${fromSequence}:`, error);
      throw error;
    }
  }

  /**
   * Get all events in the store.
   * Warning: This can be memory intensive for large event stores.
   *
   * @param fromSequence - Optional starting sequence number
   * @returns Promise resolving to all events in sequence order
   */
  async getAllEvents(fromSequence?: number): Promise<SystemEvent[]> {
    try {
      const query = fromSequence ? { sequence: { $gte: fromSequence } } : {};

      const events = await this.eventModel.find(query).sort({ sequence: 1 }).lean();

      return events.map(this.mapToEvent);
    } catch (error) {
      logger.error('Failed to get all events:', error);
      throw error;
    }
  }

  /**
   * Save a snapshot of aggregate state for performance optimization.
   *
   * @param aggregateId - Aggregate identifier
   * @param aggregateType - Aggregate type
   * @param data - Aggregate state data
   * @param version - Version at which snapshot was taken
   * @returns Promise resolving when snapshot is saved
   */
  async saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    data: any,
    version: number,
  ): Promise<void> {
    try {
      await this.snapshotModel.findOneAndUpdate(
        { aggregateId },
        {
          aggregateId,
          aggregateType,
          data,
          version,
          timestamp: new Date(),
        },
        { upsert: true, new: true },
      );

      logger.debug(`Snapshot saved for aggregate ${aggregateId} at version ${version}`);
    } catch (error) {
      logger.error(`Failed to save snapshot for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  /**
   * Get the latest snapshot for an aggregate.
   *
   * @param aggregateId - Aggregate identifier
   * @returns Promise resolving to snapshot data and version, or null if no snapshot exists
   */
  async getLatestSnapshot(aggregateId: string): Promise<{
    data: any;
    version: number;
    timestamp: Date;
  } | null> {
    try {
      const snapshot = await this.snapshotModel
        .findOne({ aggregateId })
        .sort({ version: -1 })
        .lean();

      if (!snapshot) return null;

      return {
        data: snapshot.data,
        version: snapshot.version,
        timestamp: snapshot.timestamp,
      };
    } catch (error) {
      logger.error(`Failed to get snapshot for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  /**
   * Get the next version number for an aggregate.
   * Ensures sequential version numbering for optimistic concurrency control.
   */
  private async getNextVersion(aggregateId: string): Promise<number> {
    const lastEvent = await this.eventModel
      .findOne({ aggregateId })
      .sort({ version: -1 })
      .select('version')
      .lean();

    return lastEvent?.version ? lastEvent.version + 1 : 1;
  }

  /**
   * Get the next global sequence number.
   * Provides ordering across all events in the store.
   */
  private async getNextSequence(): Promise<number> {
    // Update sequence counter every 100 events to reduce contention
    if (this.sequenceCounter === 0 || Date.now() - this.lastSequenceUpdate > 60000) {
      await this.updateSequenceCounter();
    }

    return ++this.sequenceCounter;
  }

  /**
   * Initialize the sequence counter from the database.
   */
  private async initializeSequenceCounter(): Promise<void> {
    try {
      const lastEvent = await this.eventModel
        .findOne({}, { sequence: 1 })
        .sort({ sequence: -1 })
        .lean();

      this.sequenceCounter = lastEvent?.sequence || 0;
      this.lastSequenceUpdate = Date.now();
    } catch (error) {
      logger.error('Failed to initialize sequence counter:', error);
      this.sequenceCounter = 0;
    }
  }

  /**
   * Update the sequence counter from the database.
   */
  private async updateSequenceCounter(): Promise<void> {
    try {
      const lastEvent = await this.eventModel
        .findOne({}, { sequence: 1 })
        .sort({ sequence: -1 })
        .lean();

      this.sequenceCounter = lastEvent?.sequence || 0;
      this.lastSequenceUpdate = Date.now();
    } catch (error) {
      logger.error('Failed to update sequence counter:', error);
    }
  }

  /**
   * Map stored event document to domain event.
   */
  private mapToEvent(storedEvent: any): SystemEvent {
    return {
      id: storedEvent.eventId,
      type: storedEvent.type,
      source: storedEvent.source,
      timestamp: storedEvent.timestamp,
      data: storedEvent.data,
      metadata: storedEvent.metadata,
    };
  }

  /**
   * Get statistics about the event store.
   */
  async getStats(): Promise<{
    totalEvents: number;
    totalSnapshots: number;
    lastSequence: number;
    eventTypes: { type: string; count: number }[];
    sources: { source: string; count: number }[];
  }> {
    try {
      const [totalEvents, totalSnapshots, lastEvent, eventTypeStats, sourceStats] =
        await Promise.all([
          this.eventModel.countDocuments(),
          this.snapshotModel.countDocuments(),
          this.eventModel.findOne().sort({ sequence: -1 }).select('sequence').lean(),
          this.eventModel.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
          this.eventModel.aggregate([
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
        ]);

      return {
        totalEvents,
        totalSnapshots,
        lastSequence: lastEvent?.sequence || 0,
        eventTypes: eventTypeStats.map((item: any) => ({
          type: item._id,
          count: item.count,
        })),
        sources: sourceStats.map((item: any) => ({
          source: item._id,
          count: item.count,
        })),
      };
    } catch (error) {
      logger.error('Failed to get event store stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old events and snapshots based on retention policies.
   *
   * @param retentionDays - Number of days to retain events
   * @param keepSnapshots - Whether to keep snapshots for aggregates with old events
   */
  async cleanup(
    retentionDays = 365,
    keepSnapshots = true,
  ): Promise<{
    eventsDeleted: number;
    snapshotsDeleted: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete old events
      const eventResult = await this.eventModel.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      let snapshotResult = { deletedCount: 0 };

      if (!keepSnapshots) {
        // Delete old snapshots
        snapshotResult = await this.snapshotModel.deleteMany({
          timestamp: { $lt: cutoffDate },
        });
      }

      logger.info(
        `Event store cleanup completed: ${eventResult.deletedCount} events, ${snapshotResult.deletedCount} snapshots deleted`,
      );

      return {
        eventsDeleted: eventResult.deletedCount || 0,
        snapshotsDeleted: snapshotResult.deletedCount || 0,
      };
    } catch (error) {
      logger.error('Failed to cleanup event store:', error);
      throw error;
    }
  }
}
