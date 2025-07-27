// packages/shared-utilities/__tests__/integration/event-driven-architecture.test.ts

// Set up test environment variables before any imports
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] =
  'test-jwt-secret-that-is-definitely-longer-than-32-characters-for-security';
process.env['JWT_REFRESH_SECRET'] =
  'test-refresh-secret-that-is-definitely-longer-than-32-characters-for-security';
process.env['MONGODB_URI'] = 'mongodb://localhost:27018/yggdrasil-test-event-driven';

import { EventBus } from '../../src/events/event-bus';
import { EventStore } from '../../src/events/event-store';
import { ProjectionEngine } from '../../src/events/projection-engine';
import { CommandBus, QueryBus } from '../../src/patterns/cqrs';
import { Saga } from '../../src/patterns/saga';
import { CourseEnrollmentSaga } from '../../src/patterns/course-enrollment-saga';
import mongoose from 'mongoose';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Mock amqplib for testing without RabbitMQ
jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockReturnValue(true),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock ServiceClientFactory to avoid actual HTTP calls
jest.mock('../../src/patterns/service-client', () => ({
  ServiceClientFactory: {
    getCourseServiceClient: () => ({
      get: jest.fn().mockResolvedValue({
        prerequisites: [],
        title: 'Test Course',
      }),
      post: jest.fn().mockResolvedValue({
        id: 'test-reservation-123',
      }),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    }),
    getUserServiceClient: () => ({
      get: jest.fn().mockResolvedValue({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
        completedCourses: [],
      }),
    }),
    getEnrollmentServiceClient: () => ({
      post: jest.fn().mockResolvedValue({
        id: 'test-enrollment-123',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    }),
    create: jest.fn().mockReturnValue({
      post: jest.fn().mockResolvedValue({
        id: 'test-payment-123',
        status: 'completed',
        transactionId: 'txn-123',
      }),
    }),
  },
}));

/**
 * Integration tests for Event-Driven Architecture.
 *
 * Tests the complete workflow:
 * 1. EventBus - Message publishing and subscribing
 * 2. EventStore - Event persistence and retrieval
 * 3. CQRS - Command and Query separation
 * 4. Saga - Distributed transaction coordination
 * 5. ProjectionEngine - Read model maintenance
 *
 * Validates that all components work together seamlessly
 * in realistic scenarios.
 */
describe('Event-Driven Architecture Integration Tests', () => {
  let mongoConnection: mongoose.Connection;
  let eventBus: EventBus;
  let eventStore: EventStore;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let projectionEngine: ProjectionEngine;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect('mongodb://localhost:27018/yggdrasil-test-event-driven');
    mongoConnection = mongoose.connection;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up collections
    await mongoConnection.db.collection('events').deleteMany({});
    await mongoConnection.db.collection('snapshots').deleteMany({});
    await mongoConnection.db.collection('projection_checkpoints').deleteMany({});
    await mongoConnection.db.collection('test_projections').deleteMany({});

    // Initialize components
    eventBus = new EventBus({
      serviceName: 'test-service',
      amqpUrl: 'amqp://localhost:5672',
      exchange: 'test.events',
    });

    eventStore = new EventStore(mongoConnection);
    commandBus = new CommandBus(eventBus);
    queryBus = new QueryBus(eventBus);
    projectionEngine = new ProjectionEngine(eventStore, mongoConnection);

    // Connect EventBus (mocked)
    await eventBus.connect();
  });

  afterEach(async () => {
    await eventBus.disconnect();
    await projectionEngine.stop();
  });

  describe('EventBus Integration', () => {
    test('should publish and subscribe to events', async () => {
      const receivedEvents: any[] = [];

      // Subscribe to events
      eventBus.subscribe('test.*', event => {
        receivedEvents.push(event);
      });

      // Publish event
      await eventBus.publish({
        type: 'test.event',
        data: { message: 'Hello World' },
      });

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        type: 'test.event',
        data: { message: 'Hello World' },
        source: 'test-service',
      });
      expect(receivedEvents[0].id).toBeDefined();
      expect(receivedEvents[0].timestamp).toBeDefined();
    });

    test('should handle multiple subscribers', async () => {
      const subscriber1Events: any[] = [];
      const subscriber2Events: any[] = [];

      eventBus.subscribe('user.*', event => subscriber1Events.push(event));
      eventBus.subscribe('user.created', event => subscriber2Events.push(event));

      await eventBus.publish({
        type: 'user.created',
        data: { userId: 'user-123', email: 'test@example.com' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(subscriber1Events).toHaveLength(1);
      expect(subscriber2Events).toHaveLength(1);
    });
  });

  describe('EventStore Integration', () => {
    test('should store and retrieve events', async () => {
      const event = {
        id: 'event-123',
        type: 'user.created',
        source: 'user-service',
        timestamp: new Date(),
        data: { userId: 'user-123', email: 'test@example.com' },
        metadata: {},
      };

      // Store event
      const sequence = await eventStore.append(event, 'user-123', 'User');

      expect(sequence).toBeGreaterThan(0);

      // Retrieve events
      const events = await eventStore.getEvents('user-123');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: 'event-123',
        type: 'user.created',
        data: { userId: 'user-123', email: 'test@example.com' },
      });
    });

    test('should handle event versioning', async () => {
      const aggregateId = 'user-456';

      // Add multiple events
      await eventStore.append(
        {
          id: 'event-1',
          type: 'user.created',
          source: 'user-service',
          timestamp: new Date(),
          data: { userId: aggregateId },
          metadata: {},
        },
        aggregateId,
        'User',
      );

      await eventStore.append(
        {
          id: 'event-2',
          type: 'user.updated',
          source: 'user-service',
          timestamp: new Date(),
          data: { userId: aggregateId, changes: { email: 'new@example.com' } },
          metadata: {},
        },
        aggregateId,
        'User',
      );

      const events = await eventStore.getEvents(aggregateId);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('user.created');
      expect(events[1].type).toBe('user.updated');
    });

    test('should support snapshots', async () => {
      const aggregateId = 'user-789';
      const snapshotData = {
        userId: aggregateId,
        email: 'snapshot@example.com',
        version: 5,
      };

      await eventStore.saveSnapshot(aggregateId, 'User', snapshotData, 5);

      const snapshot = await eventStore.getLatestSnapshot(aggregateId);
      expect(snapshot).toMatchObject({
        data: snapshotData,
        version: 5,
      });
    });
  });

  describe('CQRS Integration', () => {
    test('should execute commands and queries', async () => {
      // Register command handler
      commandBus.register('user.create', {
        async handle(command) {
          return {
            success: true,
            data: { userId: command.data.email.replace('@', '-').replace('.', '-') },
            events: [
              {
                type: 'user.created',
                data: command.data,
              },
            ],
          };
        },
      });

      // Register query handler
      queryBus.register('user.get', {
        async handle(query) {
          return {
            data: {
              userId: query.filters?.userId,
              email: 'test@example.com',
              status: 'active',
            },
          };
        },
      });

      // Execute command
      const commandResult = await commandBus.execute({
        id: 'cmd-123',
        type: 'user.create',
        data: { email: 'test@example.com', name: 'Test User' },
      });

      expect(commandResult.success).toBe(true);
      expect(commandResult.data.userId).toBeDefined();
      expect(commandResult.events).toHaveLength(1);

      // Execute query
      const queryResult = await queryBus.execute({
        type: 'user.get',
        filters: { userId: 'user-123' },
      });

      expect(queryResult.data).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
        status: 'active',
      });
    });

    test('should handle command failures', async () => {
      commandBus.register('user.fail', {
        async handle() {
          throw new Error('Command failed intentionally');
        },
      });

      const result = await commandBus.execute({
        id: 'cmd-fail',
        type: 'user.fail',
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Command failed intentionally');
    });

    test('should cache query results', async () => {
      let queryCount = 0;

      queryBus.register('user.cached', {
        async handle() {
          queryCount++;
          return {
            data: { count: queryCount, timestamp: Date.now() },
          };
        },
      });

      // First query
      const result1 = await queryBus.execute({
        type: 'user.cached',
        options: { cacheTtl: 5000 },
      });

      // Second query (should be cached)
      const result2 = await queryBus.execute({
        type: 'user.cached',
        options: { cacheTtl: 5000 },
      });

      expect(queryCount).toBe(1); // Handler called only once
      expect(result1.data.count).toBe(result2.data.count);
    });
  });

  describe('Saga Integration', () => {
    test('should execute course enrollment saga', async () => {
      const saga = new CourseEnrollmentSaga(eventBus, 'enrollment-saga-123');

      const enrollmentData = {
        userId: 'user-123',
        courseId: 'course-456',
        amount: 99.99,
        currency: 'USD',
        enrolledBy: 'user-123',
      };

      const result = await saga.execute(enrollmentData);

      expect(result.success).toBe(true);
      expect(result.completedSteps).toHaveLength(6);
      expect(result.data).toMatchObject({
        ...enrollmentData,
        reservationId: 'test-reservation-123',
        paymentId: 'test-payment-123',
        enrollmentId: 'test-enrollment-123',
      });
    });

    test('should handle saga compensation', async () => {
      // Mock a service to fail
      const mockFailingService = {
        post: jest.fn().mockRejectedValue(new Error('Service unavailable')),
      };

      jest.doMock('../../src/patterns/service-client', () => ({
        ServiceClientFactory: {
          getCourseServiceClient: () => ({
            get: jest.fn().mockResolvedValue({ prerequisites: [] }),
            post: jest.fn().mockResolvedValue({ id: 'reservation-123' }),
          }),
          getUserServiceClient: () => ({
            get: jest.fn().mockResolvedValue({
              profile: { firstName: 'John', lastName: 'Doe' },
              completedCourses: [],
            }),
          }),
          getEnrollmentServiceClient: () => mockFailingService,
          create: () => ({
            post: jest.fn().mockResolvedValue({
              id: 'payment-123',
              status: 'completed',
            }),
          }),
        },
      }));

      const saga = new CourseEnrollmentSaga(eventBus, 'failing-saga-123');

      const result = await saga.execute({
        userId: 'user-123',
        courseId: 'course-456',
        amount: 99.99,
        currency: 'USD',
        enrolledBy: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Service unavailable');
      expect(result.compensatedSteps.length).toBeGreaterThan(0);
    });
  });

  describe('ProjectionEngine Integration', () => {
    test('should maintain read model projections', async () => {
      // Create test projection model
      const TestProjectionSchema = new mongoose.Schema({
        userId: String,
        email: String,
        eventCount: { type: Number, default: 0 },
      });
      const TestProjectionModel = mongoConnection.model('TestProjection', TestProjectionSchema);

      // Register projection handler
      await projectionEngine.register({
        name: 'user-projection',
        eventTypes: ['user.created', 'user.updated'],
        async handle(event) {
          if (event.type === 'user.created') {
            await TestProjectionModel.create({
              userId: event.data.userId,
              email: event.data.email,
              eventCount: 1,
            });
          } else if (event.type === 'user.updated') {
            await TestProjectionModel.updateOne(
              { userId: event.data.userId },
              { $inc: { eventCount: 1 } },
            );
          }
        },
        async reset() {
          await TestProjectionModel.deleteMany({});
        },
      });

      // Add events to event store
      await eventStore.append({
        id: 'event-1',
        type: 'user.created',
        source: 'test',
        timestamp: new Date(),
        data: { userId: 'user-123', email: 'test@example.com' },
        metadata: { sequence: 1 },
      });

      await eventStore.append({
        id: 'event-2',
        type: 'user.updated',
        source: 'test',
        timestamp: new Date(),
        data: { userId: 'user-123', changes: { name: 'Updated Name' } },
        metadata: { sequence: 2 },
      });

      // Start projection engine
      await projectionEngine.start();

      // Wait for projection processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check projection
      const projection = await TestProjectionModel.findOne({ userId: 'user-123' });
      expect(projection).toBeTruthy();
      expect(projection?.email).toBe('test@example.com');
      expect(projection?.eventCount).toBe(2);

      // Get projection stats
      const stats = await projectionEngine.getProjectionStats('user-projection');
      expect(stats?.projectionName).toBe('user-projection');
      expect(stats?.status).toBe('running');
    });

    test('should support projection rebuilding', async () => {
      const TestProjectionSchema = new mongoose.Schema({
        aggregateId: String,
        eventCount: { type: Number, default: 0 },
      });
      const TestProjectionModel = mongoConnection.model('TestProjection2', TestProjectionSchema);

      let eventCount = 0;

      await projectionEngine.register({
        name: 'rebuild-projection',
        eventTypes: ['test.*'],
        async handle(event) {
          eventCount++;
          await TestProjectionModel.updateOne(
            { aggregateId: event.data.aggregateId },
            { $inc: { eventCount: 1 } },
            { upsert: true },
          );
        },
        async reset() {
          eventCount = 0;
          await TestProjectionModel.deleteMany({});
        },
      });

      // Add test events
      for (let i = 1; i <= 5; i++) {
        await eventStore.append({
          id: `event-${i}`,
          type: 'test.event',
          source: 'test',
          timestamp: new Date(),
          data: { aggregateId: 'agg-123', value: i },
          metadata: { sequence: i },
        });
      }

      // Rebuild projection
      await projectionEngine.rebuildProjection('rebuild-projection');

      // Check that all events were processed
      expect(eventCount).toBe(5);
      const projection = await TestProjectionModel.findOne({ aggregateId: 'agg-123' });
      expect(projection?.eventCount).toBe(5);
    });
  });

  describe('End-to-End Event-Driven Workflow', () => {
    test('should handle complete user creation workflow', async () => {
      // Set up all components for a complete workflow
      const UserProjectionSchema = new mongoose.Schema({
        userId: String,
        email: String,
        status: String,
        createdAt: Date,
        eventCount: { type: Number, default: 0 },
      });
      const UserProjectionModel = mongoConnection.model('UserProjection', UserProjectionSchema);

      // Register CQRS handlers
      commandBus.register('user.create', {
        async handle(command) {
          const event = {
            id: `user-created-${Date.now()}`,
            type: 'user.created',
            source: 'user-service',
            timestamp: new Date(),
            data: command.data,
            metadata: {},
          };

          // Store event
          await eventStore.append(event, command.data.userId, 'User');

          // Publish event
          await eventBus.publish({
            type: event.type,
            data: event.data,
          });

          return {
            success: true,
            data: { userId: command.data.userId },
            events: [{ type: event.type, data: event.data }],
          };
        },
      });

      queryBus.register('user.get', {
        async handle(query) {
          const user = await UserProjectionModel.findOne({ userId: query.filters?.userId });
          return {
            data: user || null,
          };
        },
      });

      // Register projection
      await projectionEngine.register({
        name: 'user-workflow-projection',
        eventTypes: ['user.created', 'user.updated'],
        async handle(event) {
          if (event.type === 'user.created') {
            await UserProjectionModel.create({
              userId: event.data.userId,
              email: event.data.email,
              status: 'active',
              createdAt: event.timestamp,
              eventCount: 1,
            });
          }
        },
      });

      // Start projection engine
      await projectionEngine.start();

      // Execute complete workflow
      const userId = 'workflow-user-123';

      // 1. Create user via command
      const createResult = await commandBus.execute({
        id: 'create-cmd-123',
        type: 'user.create',
        data: {
          userId,
          email: 'workflow@example.com',
          name: 'Workflow User',
        },
      });

      expect(createResult.success).toBe(true);

      // 2. Wait for projection to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Query user via query bus
      const queryResult = await queryBus.execute({
        type: 'user.get',
        filters: { userId },
      });

      expect(queryResult.data).toBeTruthy();
      expect(queryResult.data.email).toBe('workflow@example.com');
      expect(queryResult.data.status).toBe('active');

      // 4. Verify event was stored
      const events = await eventStore.getEvents(userId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('user.created');

      // 5. Verify projection stats
      const stats = await projectionEngine.getProjectionStats('user-workflow-projection');
      expect(stats?.eventsProcessed).toBe(1);
      expect(stats?.status).toBe('running');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle projection errors gracefully', async () => {
      let errorCount = 0;

      await projectionEngine.register({
        name: 'error-projection',
        eventTypes: ['error.test'],
        async handle(event) {
          errorCount++;
          if (event.data.shouldFail) {
            throw new Error('Projection error');
          }
        },
      });

      // Add events - some will fail
      await eventStore.append({
        id: 'success-event',
        type: 'error.test',
        source: 'test',
        timestamp: new Date(),
        data: { shouldFail: false },
        metadata: { sequence: 1 },
      });

      await eventStore.append({
        id: 'fail-event',
        type: 'error.test',
        source: 'test',
        timestamp: new Date(),
        data: { shouldFail: true },
        metadata: { sequence: 2 },
      });

      await projectionEngine.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should handle errors without stopping
      const stats = await projectionEngine.getProjectionStats('error-projection');
      expect(stats?.status).toBe('error'); // Status shows error
      expect(errorCount).toBeGreaterThan(0);
    });
  });
});
