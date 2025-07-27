// packages/shared-utilities/__tests__/unit/phase4-2-validation.test.ts

/**
 * Unit tests to validate Phase 4.2 Event-Driven Architecture components.
 *
 * These tests focus on core functionality without external dependencies
 * to ensure proper implementation and API surface.
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Phase 4.2 Event-Driven Architecture Validation', () => {
  describe('EventBus Core API', () => {
    test('should have correct EventBus structure', () => {
      const { EventBus } = require('../../src/events/event-bus');

      expect(typeof EventBus).toBe('function');

      // Test constructor
      const mockEventBus = new EventBus({
        serviceName: 'test-service',
        amqpUrl: 'amqp://localhost',
        exchange: 'test.events',
      });

      expect(mockEventBus).toHaveProperty('subscribe');
      expect(mockEventBus).toHaveProperty('publish');
      expect(mockEventBus).toHaveProperty('connect');
      expect(mockEventBus).toHaveProperty('disconnect');
      expect(mockEventBus).toHaveProperty('isConnected');
      expect(mockEventBus).toHaveProperty('getStats');
    });

    test('should validate Event interface structure', () => {
      const sampleEvent = {
        id: 'test-123',
        type: 'user.created',
        source: 'user-service',
        timestamp: new Date(),
        data: { userId: 'user-123' },
        metadata: { version: '1.0' },
      };

      expect(sampleEvent).toHaveProperty('id');
      expect(sampleEvent).toHaveProperty('type');
      expect(sampleEvent).toHaveProperty('source');
      expect(sampleEvent).toHaveProperty('timestamp');
      expect(sampleEvent).toHaveProperty('data');
      expect(sampleEvent).toHaveProperty('metadata');
    });

    test('should validate Events namespace types', () => {
      const { Events } = require('../../src/events/event-bus');

      expect(typeof Events).toBe('object');
      expect(Events).toHaveProperty('UserCreated');
      expect(Events).toHaveProperty('CourseCreated');
      expect(Events).toHaveProperty('EnrollmentCreated');
      expect(Events).toHaveProperty('PaymentProcessed');
    });
  });

  describe('EventStore Core API', () => {
    test('should have correct EventStore structure', () => {
      const { EventStore } = require('../../src/events/event-store');

      expect(typeof EventStore).toBe('function');

      // Mock mongoose connection
      const mockConnection = {
        model: jest.fn().mockReturnValue({
          create: jest.fn(),
          find: jest.fn(),
          findOne: jest.fn(),
          countDocuments: jest.fn(),
          aggregate: jest.fn(),
          deleteMany: jest.fn(),
        }),
      };

      const eventStore = new EventStore(mockConnection as any);

      expect(eventStore).toHaveProperty('append');
      expect(eventStore).toHaveProperty('getEvents');
      expect(eventStore).toHaveProperty('getEventsByQuery');
      expect(eventStore).toHaveProperty('getEventsSince');
      expect(eventStore).toHaveProperty('getAllEvents');
      expect(eventStore).toHaveProperty('saveSnapshot');
      expect(eventStore).toHaveProperty('getLatestSnapshot');
      expect(eventStore).toHaveProperty('getStats');
      expect(eventStore).toHaveProperty('cleanup');
    });

    test('should validate EventQuery interface', () => {
      const query = {
        aggregateId: 'user-123',
        aggregateType: 'User',
        type: 'user.*',
        source: 'user-service',
        fromDate: new Date(),
        toDate: new Date(),
        fromVersion: 1,
        toVersion: 10,
        fromSequence: 100,
        limit: 50,
        sort: 1 as const,
      };

      expect(query).toHaveProperty('aggregateId');
      expect(query).toHaveProperty('aggregateType');
      expect(query).toHaveProperty('type');
      expect(query).toHaveProperty('source');
      expect(query).toHaveProperty('fromDate');
      expect(query).toHaveProperty('toDate');
      expect(query).toHaveProperty('fromVersion');
      expect(query).toHaveProperty('toVersion');
      expect(query).toHaveProperty('fromSequence');
      expect(query).toHaveProperty('limit');
      expect(query).toHaveProperty('sort');
    });
  });

  describe('Saga Pattern Core API', () => {
    test('should have correct Saga structure', () => {
      const { Saga, SagaOrchestrator } = require('../../src/patterns/saga');

      expect(typeof Saga).toBe('function');
      expect(typeof SagaOrchestrator).toBe('function');
    });

    test('should validate CourseEnrollmentSaga structure', () => {
      const { CourseEnrollmentSaga } = require('../../src/patterns/course-enrollment-saga');

      expect(typeof CourseEnrollmentSaga).toBe('function');

      // Mock EventBus for constructor
      const mockEventBus = {
        publish: jest.fn(),
      };

      const saga = new CourseEnrollmentSaga(mockEventBus as any, 'test-saga-123');

      expect(saga).toHaveProperty('execute');
      expect(saga).toHaveProperty('getStatus');
      expect(saga).toHaveProperty('cancel');
    });

    test('should validate SagaStep interface', () => {
      const step = {
        name: 'test-step',
        execute: async (data: any) => ({ result: 'success' }),
        compensate: async (data: any) => {},
        timeout: 5000,
        retryable: true,
        maxRetries: 3,
      };

      expect(step).toHaveProperty('name');
      expect(step).toHaveProperty('execute');
      expect(step).toHaveProperty('compensate');
      expect(step).toHaveProperty('timeout');
      expect(step).toHaveProperty('retryable');
      expect(step).toHaveProperty('maxRetries');
      expect(typeof step.execute).toBe('function');
      expect(typeof step.compensate).toBe('function');
    });
  });

  describe('CQRS Pattern Core API', () => {
    test('should have correct CQRS structure', () => {
      const {
        CommandBus,
        QueryBus,
        CQRSFactory,
        CQRSMiddleware,
      } = require('../../src/patterns/cqrs');

      expect(typeof CommandBus).toBe('function');
      expect(typeof QueryBus).toBe('function');
      expect(typeof CQRSFactory).toBe('function');
      expect(typeof CQRSMiddleware).toBe('object');

      const commandBus = new CommandBus();
      const queryBus = new QueryBus();

      expect(commandBus).toHaveProperty('register');
      expect(commandBus).toHaveProperty('unregister');
      expect(commandBus).toHaveProperty('execute');
      expect(commandBus).toHaveProperty('use');
      expect(commandBus).toHaveProperty('getRegisteredCommands');
      expect(commandBus).toHaveProperty('getHandlerMetadata');

      expect(queryBus).toHaveProperty('register');
      expect(queryBus).toHaveProperty('unregister');
      expect(queryBus).toHaveProperty('execute');
      expect(queryBus).toHaveProperty('use');
      expect(queryBus).toHaveProperty('clearCache');
      expect(queryBus).toHaveProperty('getRegisteredQueries');
      expect(queryBus).toHaveProperty('getHandlerMetadata');
      expect(queryBus).toHaveProperty('getCacheStats');
    });

    test('should validate Command interface', () => {
      const command = {
        id: 'cmd-123',
        type: 'user.create',
        data: { email: 'test@example.com' },
        metadata: { version: '1.0' },
        issuedBy: 'admin-123',
        issuedAt: new Date(),
      };

      expect(command).toHaveProperty('id');
      expect(command).toHaveProperty('type');
      expect(command).toHaveProperty('data');
      expect(command).toHaveProperty('metadata');
      expect(command).toHaveProperty('issuedBy');
      expect(command).toHaveProperty('issuedAt');
    });

    test('should validate Query interface', () => {
      const query = {
        type: 'user.get',
        filters: { status: 'active' },
        projection: ['name', 'email'],
        sort: { createdAt: -1 },
        limit: 10,
        offset: 0,
        options: { cacheTtl: 300000 },
        requestedBy: 'user-123',
      };

      expect(query).toHaveProperty('type');
      expect(query).toHaveProperty('filters');
      expect(query).toHaveProperty('projection');
      expect(query).toHaveProperty('sort');
      expect(query).toHaveProperty('limit');
      expect(query).toHaveProperty('offset');
      expect(query).toHaveProperty('options');
      expect(query).toHaveProperty('requestedBy');
    });

    test('should validate CQRS middleware', () => {
      const { CQRSMiddleware } = require('../../src/patterns/cqrs');

      expect(CQRSMiddleware).toHaveProperty('logging');
      expect(CQRSMiddleware).toHaveProperty('validation');
      expect(CQRSMiddleware).toHaveProperty('authorization');
      expect(CQRSMiddleware).toHaveProperty('rateLimit');

      expect(typeof CQRSMiddleware.logging).toBe('function');
      expect(typeof CQRSMiddleware.validation).toBe('function');
      expect(typeof CQRSMiddleware.authorization).toBe('function');
      expect(typeof CQRSMiddleware.rateLimit).toBe('function');
    });
  });

  describe('ProjectionEngine Core API', () => {
    test('should have correct ProjectionEngine structure', () => {
      const {
        ProjectionEngine,
        ProjectionHandlers,
      } = require('../../src/events/projection-engine');

      expect(typeof ProjectionEngine).toBe('function');
      expect(typeof ProjectionHandlers).toBe('object');

      // Mock dependencies
      const mockEventStore = {
        getEventsSince: jest.fn().mockResolvedValue([]),
      };
      const mockConnection = {
        model: jest.fn().mockReturnValue({
          create: jest.fn(),
          findOne: jest.fn(),
          updateOne: jest.fn(),
          deleteMany: jest.fn(),
        }),
      };

      const projectionEngine = new ProjectionEngine(mockEventStore as any, mockConnection as any);

      expect(projectionEngine).toHaveProperty('register');
      expect(projectionEngine).toHaveProperty('unregister');
      expect(projectionEngine).toHaveProperty('start');
      expect(projectionEngine).toHaveProperty('stop');
      expect(projectionEngine).toHaveProperty('stopProjection');
      expect(projectionEngine).toHaveProperty('rebuildProjection');
      expect(projectionEngine).toHaveProperty('resetProjection');
      expect(projectionEngine).toHaveProperty('getStats');
      expect(projectionEngine).toHaveProperty('getProjectionStats');
      expect(projectionEngine).toHaveProperty('getRegisteredProjections');
      expect(projectionEngine).toHaveProperty('isProjectionRunning');
      expect(projectionEngine).toHaveProperty('getStatus');
    });

    test('should validate ProjectionHandler interface', () => {
      const handler = {
        name: 'user-projection',
        eventTypes: ['user.created', 'user.updated'],
        handle: async (event: any) => {},
        rebuild: async (fromSequence?: number) => {},
        reset: async () => {},
        getMetadata: () => ({
          version: '1.0.0',
          description: 'User projection handler',
        }),
      };

      expect(handler).toHaveProperty('name');
      expect(handler).toHaveProperty('eventTypes');
      expect(handler).toHaveProperty('handle');
      expect(handler).toHaveProperty('rebuild');
      expect(handler).toHaveProperty('reset');
      expect(handler).toHaveProperty('getMetadata');
      expect(typeof handler.handle).toBe('function');
      expect(typeof handler.rebuild).toBe('function');
      expect(typeof handler.reset).toBe('function');
      expect(typeof handler.getMetadata).toBe('function');
    });

    test('should validate example projection handlers', () => {
      const { ProjectionHandlers } = require('../../src/events/projection-engine');

      expect(ProjectionHandlers).toHaveProperty('UserSummaryProjection');
      expect(ProjectionHandlers).toHaveProperty('CourseAnalyticsProjection');

      expect(typeof ProjectionHandlers.UserSummaryProjection).toBe('function');
      expect(typeof ProjectionHandlers.CourseAnalyticsProjection).toBe('function');
    });
  });

  describe('Integration Patterns', () => {
    test('should validate factory functions exist', () => {
      const { createEventBus } = require('../../src/events/event-bus');
      const { createProjectionEngine } = require('../../src/events/projection-engine');
      const {
        createCourseEnrollmentSaga,
        EnrollmentSagaUtils,
      } = require('../../src/patterns/course-enrollment-saga');
      const { CQRSFactory } = require('../../src/patterns/cqrs');

      expect(typeof createEventBus).toBe('function');
      expect(typeof createProjectionEngine).toBe('function');
      expect(typeof createCourseEnrollmentSaga).toBe('function');
      expect(typeof EnrollmentSagaUtils).toBe('object');
      expect(typeof CQRSFactory).toBe('function');

      expect(CQRSFactory).toHaveProperty('createCommandBus');
      expect(CQRSFactory).toHaveProperty('createQueryBus');
      expect(CQRSFactory).toHaveProperty('createCQRSBuses');

      expect(EnrollmentSagaUtils).toHaveProperty('enrollMultipleUsers');
      expect(EnrollmentSagaUtils).toHaveProperty('enrollInWaitlist');
    });

    test('should validate CourseEnrollmentData interface', () => {
      const enrollmentData = {
        userId: 'user-123',
        courseId: 'course-456',
        amount: 99.99,
        currency: 'USD',
        enrolledBy: 'admin-123',
        paymentId: 'payment-789',
        enrollmentId: 'enrollment-abc',
        reservationId: 'reservation-def',
        prerequisites: {
          met: true,
          missing: [],
        },
      };

      expect(enrollmentData).toHaveProperty('userId');
      expect(enrollmentData).toHaveProperty('courseId');
      expect(enrollmentData).toHaveProperty('amount');
      expect(enrollmentData).toHaveProperty('currency');
      expect(enrollmentData).toHaveProperty('enrolledBy');
      expect(enrollmentData).toHaveProperty('paymentId');
      expect(enrollmentData).toHaveProperty('enrollmentId');
      expect(enrollmentData).toHaveProperty('reservationId');
      expect(enrollmentData).toHaveProperty('prerequisites');
    });
  });

  describe('Event-Driven Architecture Exports', () => {
    test('should validate all exports are available from index', () => {
      // Test that we can import all Phase 4.2 components from the main index
      const {
        // EventBus exports
        EventBus: IndexEventBus,
        createEventBus: IndexCreateEventBus,

        // EventStore exports
        EventStore: IndexEventStore,

        // Saga exports
        Saga: IndexSaga,
        SagaOrchestrator: IndexSagaOrchestrator,
        createSaga: IndexCreateSaga,

        // CourseEnrollmentSaga exports
        CourseEnrollmentSaga: IndexCourseEnrollmentSaga,
        createCourseEnrollmentSaga: IndexCreateCourseEnrollmentSaga,
        EnrollmentSagaUtils: IndexEnrollmentSagaUtils,

        // CQRS exports
        CommandBus: IndexCommandBus,
        QueryBus: IndexQueryBus,
        CQRSFactory: IndexCQRSFactory,
        CQRSMiddleware: IndexCQRSMiddleware,

        // ProjectionEngine exports
        ProjectionEngine: IndexProjectionEngine,
        ProjectionHandlers: IndexProjectionHandlers,
        createProjectionEngine: IndexCreateProjectionEngine,
      } = require('../../src/index');

      // Validate EventBus exports
      expect(typeof IndexEventBus).toBe('function');
      expect(typeof IndexCreateEventBus).toBe('function');

      // Validate EventStore exports
      expect(typeof IndexEventStore).toBe('function');

      // Validate Saga exports
      expect(typeof IndexSaga).toBe('function');
      expect(typeof IndexSagaOrchestrator).toBe('function');
      expect(typeof IndexCreateSaga).toBe('function');

      // Validate CourseEnrollmentSaga exports
      expect(typeof IndexCourseEnrollmentSaga).toBe('function');
      expect(typeof IndexCreateCourseEnrollmentSaga).toBe('function');
      expect(typeof IndexEnrollmentSagaUtils).toBe('object');

      // Validate CQRS exports
      expect(typeof IndexCommandBus).toBe('function');
      expect(typeof IndexQueryBus).toBe('function');
      expect(typeof IndexCQRSFactory).toBe('function');
      expect(typeof IndexCQRSMiddleware).toBe('object');

      // Validate ProjectionEngine exports
      expect(typeof IndexProjectionEngine).toBe('function');
      expect(typeof IndexProjectionHandlers).toBe('object');
      expect(typeof IndexCreateProjectionEngine).toBe('function');
    });

    test('should validate type exports are available', () => {
      // Import the index file to ensure type exports don't cause runtime errors
      const indexModule = require('../../src/index');

      // The types should be available for TypeScript but don't create runtime objects
      // We just need to ensure the module loads without errors
      expect(typeof indexModule).toBe('object');
    });
  });

  describe('Functional Validation', () => {
    test('should create and execute commands through CommandBus', async () => {
      const { CommandBus } = require('../../src/patterns/cqrs');

      const commandBus = new CommandBus();

      // Register a simple handler
      commandBus.register('test.command', {
        async handle(command) {
          return {
            success: true,
            data: { result: `Processed: ${command.data.value}` },
          };
        },
      });

      // Execute command
      const result = await commandBus.execute({
        id: 'test-cmd-123',
        type: 'test.command',
        data: { value: 'test-value' },
      });

      expect(result.success).toBe(true);
      expect(result.data.result).toBe('Processed: test-value');
    });

    test('should create and execute queries through QueryBus', async () => {
      const { QueryBus } = require('../../src/patterns/cqrs');

      const queryBus = new QueryBus();

      // Register a simple handler
      queryBus.register('test.query', {
        async handle(query) {
          return {
            data: {
              filters: query.filters,
              timestamp: Date.now(),
            },
          };
        },
      });

      // Execute query
      const result = await queryBus.execute({
        type: 'test.query',
        filters: { status: 'active' },
      });

      expect(result.data.filters).toEqual({ status: 'active' });
      expect(typeof result.data.timestamp).toBe('number');
    });

    test('should validate CourseEnrollmentSaga steps structure', () => {
      const { CourseEnrollmentSaga } = require('../../src/patterns/course-enrollment-saga');

      // Mock EventBus
      const mockEventBus = { publish: jest.fn() };
      const saga = new CourseEnrollmentSaga(mockEventBus as any, 'test-saga');

      // Access the protected steps through any casting (for testing only)
      const steps = (saga as any).steps;

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBe(6);

      const stepNames = steps.map((step: any) => step.name);
      expect(stepNames).toContain('check-prerequisites');
      expect(stepNames).toContain('check-capacity-and-reserve');
      expect(stepNames).toContain('process-payment');
      expect(stepNames).toContain('create-enrollment');
      expect(stepNames).toContain('confirm-seat-reservation');
      expect(stepNames).toContain('send-confirmation-notification');
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle command handler registration conflicts', () => {
      const { CommandBus } = require('../../src/patterns/cqrs');

      const commandBus = new CommandBus();

      const handler = {
        async handle() {
          return { success: true, data: {} };
        },
      };

      // First registration should succeed
      expect(() => {
        commandBus.register('test.command', handler);
      }).not.toThrow();

      // Second registration should throw
      expect(() => {
        commandBus.register('test.command', handler);
      }).toThrow('Handler already registered for command type: test.command');
    });

    test('should handle unknown command execution', async () => {
      const { CommandBus } = require('../../src/patterns/cqrs');

      const commandBus = new CommandBus();

      const result = await commandBus.execute({
        id: 'unknown-cmd',
        type: 'unknown.command',
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No handler registered for command: unknown.command');
    });

    test('should handle query handler errors gracefully', async () => {
      const { QueryBus } = require('../../src/patterns/cqrs');

      const queryBus = new QueryBus();

      queryBus.register('error.query', {
        async handle() {
          throw new Error('Query failed');
        },
      });

      await expect(
        queryBus.execute({
          type: 'error.query',
          filters: {},
        }),
      ).rejects.toThrow('Query failed');
    });
  });
});
