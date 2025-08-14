// packages/api-services/user-service/src/openapi.ts
// OpenAPI documentation for User Service

import { OpenAPIV3 } from 'openapi-types';

export const userServiceOpenAPI: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Yggdrasil User Service API',
    description: 'User management service for the Yggdrasil educational platform',
    version: '1.0.0',
    contact: {
      name: 'Yggdrasil Development Team',
      email: 'dev@yggdrasil.edu',
    },
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development server',
    },
    {
      url: 'https://api.yggdrasil.edu/users',
      description: 'Production server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        description: 'Returns the health status of the user service',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'user-service' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'List users',
        description: 'Get a paginated list of users (admin and staff only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'role',
            in: 'query',
            description: 'Filter users by role',
            schema: {
              type: 'string',
              enum: ['admin', 'staff', 'teacher', 'student'],
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of users to return',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of users to skip',
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserListResponse',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
      post: {
        summary: 'Create user',
        description: 'Create a new user (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateUserRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/users/profile': {
      get: {
        summary: 'Get current user profile',
        description: 'Get the profile of the currently authenticated user',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
      put: {
        summary: 'Update current user profile',
        description: 'Update the profile of the currently authenticated user',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProfileUpdateData',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get user by ID',
        description: 'Get user details by ID (ownership or teacher role required)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
          },
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
      put: {
        summary: 'Update user',
        description: 'Full user update including role and status (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateUserRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
      delete: {
        summary: 'Delete user',
        description: 'Delete a user (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
          },
        ],
        responses: {
          '200': {
            description: 'User deleted successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/users/{id}/profile': {
      patch: {
        summary: 'Update user profile',
        description: 'Update user profile (ownership or admin required)',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProfileUpdateData',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/users/{id}/preferences': {
      get: {
        summary: 'Get user preferences',
        description: 'Get user preferences (ownership or teacher role required)',
        tags: ['Preferences'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Preferences retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PreferencesResponse',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          email: { type: 'string', format: 'email', example: 'user@yggdrasil.edu' },
          role: {
            type: 'string',
            enum: ['admin', 'staff', 'teacher', 'student'],
            example: 'student',
          },
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string', example: 'John' },
              lastName: { type: 'string', example: 'Doe' },
              department: { type: 'string', example: 'Computer Science' },
              studentId: { type: 'string', example: 'CS12345' },
              bio: { type: 'string', example: 'Computer Science student' },
              officeHours: { type: 'string', example: 'Mon-Fri 2-4 PM' },
              specialties: {
                type: 'array',
                items: { type: 'string' },
                example: ['Web Development', 'Machine Learning'],
              },
              contactInfo: {
                type: 'object',
                properties: {
                  phone: { type: 'string', example: '+1-555-0123' },
                  address: { type: 'string', example: '123 University Ave' },
                },
              },
            },
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['email', 'password', 'role', 'profile'],
        properties: {
          email: { type: 'string', format: 'email', example: 'newuser@yggdrasil.edu' },
          password: { type: 'string', minLength: 6, example: 'SecurePass123!' },
          role: {
            type: 'string',
            enum: ['admin', 'staff', 'teacher', 'student'],
            example: 'student',
          },
          profile: {
            type: 'object',
            required: ['firstName', 'lastName'],
            properties: {
              firstName: { type: 'string', example: 'Jane' },
              lastName: { type: 'string', example: 'Smith' },
              department: { type: 'string', example: 'Mathematics' },
              title: { type: 'string', example: 'Assistant Professor' },
              grade: { type: 'string', example: 'Sophomore' },
              studentId: { type: 'string', example: 'MATH67890' },
            },
          },
          isActive: { type: 'boolean', default: true },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: {
            type: 'string',
            enum: ['admin', 'staff', 'teacher', 'student'],
          },
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              department: { type: 'string' },
              title: { type: 'string' },
              grade: { type: 'string' },
              studentId: { type: 'string' },
            },
          },
          isActive: { type: 'boolean' },
        },
      },
      ProfileUpdateData: {
        type: 'object',
        properties: {
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          department: { type: 'string', example: 'Computer Science' },
          studentId: { type: 'string', example: 'CS12345' },
          bio: { type: 'string', example: 'Updated bio' },
          officeHours: { type: 'string', example: 'Mon-Wed 3-5 PM' },
          specialties: {
            type: 'array',
            items: { type: 'string' },
            example: ['Data Science', 'AI'],
          },
          contactInfo: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+1-555-9876' },
              address: { type: 'string', example: '456 Campus Drive' },
            },
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'User retrieved successfully' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      UserListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Users retrieved successfully' },
          data: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' },
              },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'integer', example: 50 },
                  offset: { type: 'integer', example: 0 },
                  total: { type: 'integer', example: 156 },
                },
              },
            },
          },
        },
      },
      PreferencesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Preferences retrieved successfully' },
          data: {
            type: 'object',
            properties: {
              preferences: {
                type: 'object',
                properties: {
                  language: { type: 'string', example: 'en' },
                  notifications: {
                    type: 'object',
                    properties: {
                      scheduleChanges: { type: 'boolean', example: true },
                      newAnnouncements: { type: 'boolean', example: true },
                      assignmentReminders: { type: 'boolean', example: false },
                    },
                  },
                  accessibility: {
                    type: 'object',
                    properties: {
                      colorblindMode: { type: 'boolean', example: false },
                      fontSize: {
                        type: 'string',
                        enum: ['small', 'medium', 'large'],
                        example: 'medium',
                      },
                      highContrast: { type: 'boolean', example: false },
                    },
                  },
                },
              },
            },
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Error message' },
          statusCode: { type: 'integer', example: 400 },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Conflict: {
        description: 'Resource already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Health',
      description: 'Service health endpoints',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Profile',
      description: 'User profile operations',
    },
    {
      name: 'Preferences',
      description: 'User preference operations',
    },
  ],
};
