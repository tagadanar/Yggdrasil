// packages/api-services/planning-service/src/openapi.ts
// OpenAPI specification for Planning Service

import { OpenAPIV3 } from 'openapi-types';

export const planningServiceOpenAPI: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Yggdrasil Planning Service API',
    description:
      'Comprehensive planning and scheduling service for the Yggdrasil educational platform',
    version: '1.0.0',
    contact: {
      name: 'Yggdrasil Development Team',
      email: 'dev@yggdrasil.edu',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3005/api',
      description: 'Development server',
    },
    {
      url: 'https://api.yggdrasil.edu/planning',
      description: 'Production server',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from authentication service',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', format: 'objectId' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['student', 'teacher', 'admin', 'staff'] },
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              studentId: { type: 'string' },
            },
          },
        },
      },
      Event: {
        type: 'object',
        required: ['title', 'startDate', 'endDate', 'type'],
        properties: {
          _id: { type: 'string', format: 'objectId' },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          location: { type: 'string', maxLength: 100 },
          type: {
            type: 'string',
            enum: ['lecture', 'lab', 'exam', 'workshop', 'seminar', 'meeting', 'other'],
          },
          linkedCourse: { type: 'string', format: 'objectId' },
          createdBy: { type: 'string', format: 'objectId' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          recurrence: {
            type: 'object',
            properties: {
              pattern: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
              interval: { type: 'integer', minimum: 1 },
              endDate: { type: 'string', format: 'date-time' },
              count: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
      Promotion: {
        type: 'object',
        required: ['name', 'semester', 'intake', 'academicYear', 'startDate', 'endDate'],
        properties: {
          _id: { type: 'string', format: 'objectId' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          semester: { type: 'integer', minimum: 1, maximum: 10 },
          intake: { type: 'string', enum: ['september', 'february'] },
          academicYear: { type: 'string', pattern: '^\\d{4}-\\d{4}$' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          description: { type: 'string', maxLength: 500 },
          status: { type: 'string', enum: ['draft', 'active', 'completed', 'archived'] },
          studentIds: {
            type: 'array',
            items: { type: 'string', format: 'objectId' },
          },
          eventIds: {
            type: 'array',
            items: { type: 'string', format: 'objectId' },
          },
          createdBy: { type: 'string', format: 'objectId' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PromotionWithDetails: {
        allOf: [
          { $ref: '#/components/schemas/Promotion' },
          {
            type: 'object',
            properties: {
              students: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' },
              },
              events: {
                type: 'array',
                items: { $ref: '#/components/schemas/Event' },
              },
            },
          },
        ],
      },
      ProgressData: {
        type: 'object',
        properties: {
          _id: { type: 'string', format: 'objectId' },
          studentId: { type: 'string', format: 'objectId' },
          promotionId: { type: 'string', format: 'objectId' },
          currentSemester: { type: 'integer', minimum: 1, maximum: 10 },
          targetSemester: { type: 'integer', minimum: 1, maximum: 10 },
          averageGrade: { type: 'number', minimum: 0, maximum: 100 },
          attendanceRate: { type: 'number', minimum: 0, maximum: 100 },
          overallProgress: { type: 'number', minimum: 0, maximum: 100 },
          validationStatus: {
            type: 'string',
            enum: ['pending_validation', 'validated', 'flagged', 'approved', 'rejected'],
          },
          nextValidationDate: { type: 'string', format: 'date-time' },
        },
      },
      AttendanceRecord: {
        type: 'object',
        required: ['studentId', 'eventId', 'attended'],
        properties: {
          _id: { type: 'string', format: 'objectId' },
          studentId: { type: 'string', format: 'objectId' },
          eventId: { type: 'string', format: 'objectId' },
          attended: { type: 'boolean' },
          markedAt: { type: 'string', format: 'date-time' },
          markedBy: { type: 'string', format: 'objectId' },
          notes: { type: 'string', maxLength: 500 },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          errors: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        required: ['success'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {},
          message: { type: 'string' },
          statusCode: { type: 'integer' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request - invalid input parameters',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Validation failed: Title is required',
              statusCode: 400,
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Authentication required',
              statusCode: 401,
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Only admin and staff can create events',
              statusCode: 403,
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Event not found',
              statusCode: 404,
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'An unexpected error occurred',
              statusCode: 500,
            },
          },
        },
      },
    },
    parameters: {
      EventIdParam: {
        name: 'eventId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'objectId' },
        description: 'Unique identifier for the event',
      },
      PromotionIdParam: {
        name: 'promotionId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'objectId' },
        description: 'Unique identifier for the promotion',
      },
      StudentIdParam: {
        name: 'studentId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'objectId' },
        description: 'Unique identifier for the student',
      },
      PageQuery: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number for pagination',
      },
      LimitQuery: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page',
      },
      StartDateQuery: {
        name: 'startDate',
        in: 'query',
        schema: { type: 'string', format: 'date-time' },
        description: 'Filter events starting from this date',
      },
      EndDateQuery: {
        name: 'endDate',
        in: 'query',
        schema: { type: 'string', format: 'date-time' },
        description: 'Filter events up to this date',
      },
    },
  },
  paths: {
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'List all events',
        description: 'Retrieve a list of events with optional filtering by date range and type',
        operationId: 'getEvents',
        parameters: [
          { $ref: '#/components/parameters/StartDateQuery' },
          { $ref: '#/components/parameters/EndDateQuery' },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['lecture', 'lab', 'exam', 'workshop', 'seminar', 'meeting', 'other'],
            },
            description: 'Filter events by type',
          },
          {
            name: 'courseId',
            in: 'query',
            schema: { type: 'string', format: 'objectId' },
            description: 'Filter events by linked course',
          },
        ],
        responses: {
          '200': {
            description: 'Events retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Event' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create a new event',
        description: 'Create a new event (requires teacher, admin, or staff role)',
        operationId: 'createEvent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'startDate', 'endDate', 'type'],
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 200 },
                  description: { type: 'string', maxLength: 1000 },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  location: { type: 'string', maxLength: 100 },
                  type: {
                    type: 'string',
                    enum: ['lecture', 'lab', 'exam', 'workshop', 'seminar', 'meeting', 'other'],
                  },
                  linkedCourse: { type: 'string', format: 'objectId' },
                  recurrence: {
                    type: 'object',
                    properties: {
                      pattern: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
                      interval: { type: 'integer', minimum: 1 },
                      endDate: { type: 'string', format: 'date-time' },
                      count: { type: 'integer', minimum: 1 },
                    },
                  },
                },
              },
              example: {
                title: 'Advanced Mathematics Lecture',
                description: 'Calculus and Linear Algebra concepts',
                startDate: '2024-09-15T09:00:00Z',
                endDate: '2024-09-15T10:30:00Z',
                location: 'Room A101',
                type: 'lecture',
                linkedCourse: '507f1f77bcf86cd799439011',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Event created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Event' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/events/{eventId}': {
      get: {
        tags: ['Events'],
        summary: 'Get event by ID',
        description: 'Retrieve a specific event by its ID',
        operationId: 'getEvent',
        parameters: [{ $ref: '#/components/parameters/EventIdParam' }],
        responses: {
          '200': {
            description: 'Event retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Event' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      put: {
        tags: ['Events'],
        summary: 'Update event',
        description: 'Update an existing event (requires teacher, admin, or staff role)',
        operationId: 'updateEvent',
        parameters: [{ $ref: '#/components/parameters/EventIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 200 },
                  description: { type: 'string', maxLength: 1000 },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  location: { type: 'string', maxLength: 100 },
                  type: {
                    type: 'string',
                    enum: ['lecture', 'lab', 'exam', 'workshop', 'seminar', 'meeting', 'other'],
                  },
                  linkedCourse: { type: 'string', format: 'objectId' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Event updated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Event' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      delete: {
        tags: ['Events'],
        summary: 'Delete event',
        description: 'Delete an event (requires admin role)',
        operationId: 'deleteEvent',
        parameters: [{ $ref: '#/components/parameters/EventIdParam' }],
        responses: {
          '200': {
            description: 'Event deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/promotions': {
      get: {
        tags: ['Promotions'],
        summary: 'List all promotions',
        description: 'Retrieve a list of promotions with optional filtering',
        operationId: 'getPromotions',
        parameters: [
          {
            name: 'semester',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 10 },
            description: 'Filter by semester',
          },
          {
            name: 'intake',
            in: 'query',
            schema: { type: 'string', enum: ['september', 'february'] },
            description: 'Filter by intake period',
          },
          {
            name: 'academicYear',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d{4}-\\d{4}$' },
            description: 'Filter by academic year (e.g., 2024-2025)',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['draft', 'active', 'completed', 'archived'] },
            description: 'Filter by status',
          },
        ],
        responses: {
          '200': {
            description: 'Promotions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Promotion' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      post: {
        tags: ['Promotions'],
        summary: 'Create a new promotion',
        description: 'Create a new promotion (requires admin or staff role)',
        operationId: 'createPromotion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'semester', 'intake', 'academicYear', 'startDate', 'endDate'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                  semester: { type: 'integer', minimum: 1, maximum: 10 },
                  intake: { type: 'string', enum: ['september', 'february'] },
                  academicYear: { type: 'string', pattern: '^\\d{4}-\\d{4}$' },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  description: { type: 'string', maxLength: 500 },
                },
              },
              example: {
                name: 'Computer Science S1 September 2024',
                semester: 1,
                intake: 'september',
                academicYear: '2024-2025',
                startDate: '2024-09-01T00:00:00Z',
                endDate: '2025-06-30T23:59:59Z',
                description: 'First semester of Computer Science program',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Promotion created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Promotion' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
  },
  tags: [
    {
      name: 'Events',
      description: 'Event management operations',
    },
    {
      name: 'Promotions',
      description: 'Promotion (class cohort) management operations',
    },
    {
      name: 'Progress',
      description: 'Student progress tracking operations',
    },
    {
      name: 'Attendance',
      description: 'Attendance management operations',
    },
    {
      name: 'System',
      description: 'System administration and monitoring operations',
    },
  ],
};
