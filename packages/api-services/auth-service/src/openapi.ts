/**
 * OpenAPI documentation for Auth Service
 * Defines all authentication endpoints and schemas
 */

import { OpenAPIV3 } from 'openapi-types';
import { createOpenAPIDocument, addCommonResponses } from '@yggdrasil/shared-utilities/src/openapi';

export const createAuthServiceOpenAPI = (): OpenAPIV3.Document => {
  const doc = createOpenAPIDocument(
    'Yggdrasil Auth Service',
    '1.0.0',
    'Authentication and authorization service for the Yggdrasil educational platform',
    3001
  );

  // Add auth-specific schemas
  doc.components!.schemas = {
    ...doc.components!.schemas,
    
    RegisterRequest: {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName', 'role'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'student@yggdrasil.edu',
          description: 'User email address',
        },
        password: {
          type: 'string',
          minLength: 8,
          example: 'SecureP@ss123',
          description: 'User password (min 8 characters)',
        },
        firstName: {
          type: 'string',
          example: 'John',
          description: 'User first name',
        },
        lastName: {
          type: 'string',
          example: 'Doe',
          description: 'User last name',
        },
        role: {
          type: 'string',
          enum: ['student', 'teacher'],
          example: 'student',
          description: 'User role (admin/staff roles cannot be self-registered)',
        },
      },
    },

    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'student@yggdrasil.edu',
        },
        password: {
          type: 'string',
          example: 'SecureP@ss123',
        },
      },
    },

    RefreshRequest: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          description: 'JWT refresh token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },

    AuthResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            tokens: { $ref: '#/components/schemas/AuthTokens' },
          },
        },
      },
    },

    MeResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },

    RegistrationStatusResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            registrationEnabled: { type: 'boolean', example: true },
            allowedRoles: {
              type: 'array',
              items: { type: 'string' },
              example: ['student', 'teacher'],
            },
          },
        },
      },
    },
  };

  // Define tags
  doc.tags = [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
  ];

  // Define paths
  doc.paths = {
    '/register': {
      post: addCommonResponses({
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account with the specified role',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User successfully registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  success: false,
                  error: {
                    message: 'User with this email already exists',
                    code: 'CONFLICT',
                    statusCode: 409,
                  },
                },
              },
            },
          },
        },
      }, false, false),
    },

    '/login': {
      post: addCommonResponses({
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user credentials and return access tokens',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  success: false,
                  error: {
                    message: 'Invalid email or password',
                    code: 'UNAUTHORIZED',
                    statusCode: 401,
                  },
                },
              },
            },
          },
        },
      }, false, false),
    },

    '/refresh': {
      post: addCommonResponses({
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Exchange a valid refresh token for new access and refresh tokens',
        operationId: 'refresh',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tokens successfully refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        tokens: { $ref: '#/components/schemas/AuthTokens' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      }, false, false),
    },

    '/logout': {
      post: addCommonResponses({
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Invalidate user session and tokens',
        operationId: 'logout',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      }),
    },

    '/me': {
      get: addCommonResponses({
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Retrieve the authenticated user\'s profile information',
        operationId: 'getCurrentUser',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user information',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeResponse' },
              },
            },
          },
        },
      }),
    },

    '/registration-status': {
      get: addCommonResponses({
        tags: ['Authentication'],
        summary: 'Get registration status',
        description: 'Check if registration is enabled and which roles can be registered',
        operationId: 'getRegistrationStatus',
        responses: {
          '200': {
            description: 'Registration status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegistrationStatusResponse' },
              },
            },
          },
        },
      }, false, false),
    },
  };

  return doc;
};

// Export function to get OpenAPI JSON
export const getAuthServiceOpenAPIJSON = (): string => {
  return JSON.stringify(createAuthServiceOpenAPI(), null, 2);
};