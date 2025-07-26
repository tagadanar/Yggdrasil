/**
 * OpenAPI documentation generator for Yggdrasil microservices
 * Provides shared OpenAPI schemas and utilities for all services
 */

import { OpenAPIV3 } from 'openapi-types';

/**
 * Base OpenAPI document configuration
 */
export const createOpenAPIDocument = (
  title: string,
  version: string,
  description: string,
  port: number
): OpenAPIV3.Document => ({
  openapi: '3.0.3',
  info: {
    title,
    version,
    description,
    contact: {
      name: 'Yggdrasil Support',
      email: 'support@yggdrasil.edu',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Development server',
    },
    {
      url: `https://api.yggdrasil.edu`,
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token',
      },
    },
    schemas: getSharedSchemas(),
    responses: getSharedResponses(),
    parameters: getSharedParameters(),
  },
  tags: [],
  paths: {},
});

/**
 * Shared schemas used across all services
 */
export const getSharedSchemas = (): Record<string, OpenAPIV3.SchemaObject> => ({
  Error: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        required: ['message', 'code', 'statusCode', 'timestamp'],
        properties: {
          message: { type: 'string', example: 'An error occurred' },
          code: { type: 'string', example: 'INTERNAL_ERROR' },
          statusCode: { type: 'integer', example: 500 },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', example: 'req-123' },
          validationErrors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
          retryAfter: { type: 'integer', description: 'Seconds to wait before retry' },
        },
      },
      debug: {
        type: 'object',
        description: 'Debug information (development only)',
        properties: {
          stack: { type: 'string' },
          context: { type: 'object' },
        },
      },
    },
  },
  
  User: {
    type: 'object',
    required: ['_id', 'email', 'role', 'profile'],
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      email: { type: 'string', format: 'email', example: 'user@yggdrasil.edu' },
      role: {
        type: 'string',
        enum: ['admin', 'staff', 'teacher', 'student'],
        example: 'student',
      },
      profile: {
        type: 'object',
        required: ['firstName', 'lastName'],
        properties: {
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          dateOfBirth: { type: 'string', format: 'date', example: '1990-01-01' },
          bio: { type: 'string', example: 'Passionate learner' },
          avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
        },
      },
      isActive: { type: 'boolean', example: true },
      lastLogin: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  AuthTokens: {
    type: 'object',
    required: ['accessToken', 'refreshToken'],
    properties: {
      accessToken: {
        type: 'string',
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      refreshToken: {
        type: 'string',
        description: 'JWT refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  },

  Course: {
    type: 'object',
    required: ['_id', 'title', 'slug', 'instructor', 'status'],
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      title: { type: 'string', example: 'Introduction to Programming' },
      slug: { type: 'string', example: 'intro-to-programming' },
      description: { type: 'string', example: 'Learn the basics of programming' },
      instructor: { type: 'string', example: '507f1f77bcf86cd799439012' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        example: ['programming', 'beginner'],
      },
      status: {
        type: 'string',
        enum: ['draft', 'published', 'archived'],
        example: 'published',
      },
      level: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        example: 'beginner',
      },
      duration: {
        type: 'object',
        properties: {
          hours: { type: 'integer', example: 40 },
          weeks: { type: 'integer', example: 8 },
        },
      },
      chapters: {
        type: 'array',
        items: { $ref: '#/components/schemas/Chapter' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  Chapter: {
    type: 'object',
    required: ['_id', 'title', 'order'],
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
      title: { type: 'string', example: 'Getting Started' },
      description: { type: 'string' },
      order: { type: 'integer', example: 1 },
      sections: {
        type: 'array',
        items: { $ref: '#/components/schemas/Section' },
      },
    },
  },

  Section: {
    type: 'object',
    required: ['_id', 'title', 'order'],
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439014' },
      title: { type: 'string', example: 'Setting Up Your Environment' },
      order: { type: 'integer', example: 1 },
      content: {
        type: 'array',
        items: { $ref: '#/components/schemas/Content' },
      },
    },
  },

  Content: {
    type: 'object',
    required: ['_id', 'type', 'data'],
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439015' },
      type: {
        type: 'string',
        enum: ['video', 'text', 'quiz', 'exercise'],
        example: 'video',
      },
      data: {
        type: 'object',
        description: 'Content-specific data',
      },
    },
  },

  PaginationMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 100 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      totalPages: { type: 'integer', example: 5 },
    },
  },

  SuccessResponse: {
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation completed successfully' },
    },
  },
});

/**
 * Shared API responses
 */
export const getSharedResponses = (): Record<string, OpenAPIV3.ResponseObject> => ({
  UnauthorizedError: {
    description: 'Authentication required',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
            statusCode: 401,
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
  },
  
  ForbiddenError: {
    description: 'Insufficient permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          success: false,
          error: {
            message: 'Access denied',
            code: 'FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
  },

  NotFoundError: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          success: false,
          error: {
            message: 'Resource not found',
            code: 'NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
  },

  ValidationError: {
    description: 'Validation failed',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            statusCode: 422,
            timestamp: new Date().toISOString(),
            validationErrors: [
              { field: 'email', message: 'Email is required' },
              { field: 'password', message: 'Password must be at least 8 characters' },
            ],
          },
        },
      },
    },
  },

  RateLimitError: {
    description: 'Too many requests',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          success: false,
          error: {
            message: 'Too many requests',
            code: 'RATE_LIMIT',
            statusCode: 429,
            timestamp: new Date().toISOString(),
            retryAfter: 60,
          },
        },
      },
    },
  },

  InternalServerError: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            statusCode: 500,
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
  },
});

/**
 * Shared query parameters
 */
export const getSharedParameters = (): Record<string, OpenAPIV3.ParameterObject> => ({
  pageParam: {
    name: 'page',
    in: 'query',
    description: 'Page number',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  
  limitParam: {
    name: 'limit',
    in: 'query',
    description: 'Items per page',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },

  sortParam: {
    name: 'sort',
    in: 'query',
    description: 'Sort field and order (e.g., "-createdAt" for descending)',
    schema: { type: 'string' },
  },

  searchParam: {
    name: 'search',
    in: 'query',
    description: 'Search query',
    schema: { type: 'string' },
  },

  idParam: {
    name: 'id',
    in: 'path',
    description: 'Resource ID',
    required: true,
    schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
  },
});

/**
 * Helper to add common error responses to an operation
 */
export const addCommonResponses = (
  operation: OpenAPIV3.OperationObject,
  includeAuth = true,
  includeNotFound = true
): OpenAPIV3.OperationObject => {
  const responses = {
    ...operation.responses,
    '422': { $ref: '#/components/responses/ValidationError' },
    '429': { $ref: '#/components/responses/RateLimitError' },
    '500': { $ref: '#/components/responses/InternalServerError' },
  };

  if (includeAuth) {
    (responses as any)['401'] = { $ref: '#/components/responses/UnauthorizedError' };
    (responses as any)['403'] = { $ref: '#/components/responses/ForbiddenError' };
  }

  if (includeNotFound) {
    (responses as any)['404'] = { $ref: '#/components/responses/NotFoundError' };
  }

  return {
    ...operation,
    responses,
  };
};

/**
 * Helper to create paginated response schema
 */
export const createPaginatedResponse = (itemSchema: string): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'array',
      items: { $ref: `#/components/schemas/${itemSchema}` },
    },
    meta: { $ref: '#/components/schemas/PaginationMeta' },
  },
});