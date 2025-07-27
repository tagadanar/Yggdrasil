import { Router } from 'express';
import { OpenAPIGenerator } from './openapi-generator';

export class RouteDocumenter {
  constructor(
    private generator: OpenAPIGenerator,
    private router: Router,
  ) {}

  documentRoute(config: {
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    summary: string;
    description?: string;
    tags: string[];
    security?: boolean;
    request?: {
      params?: Record<string, any>;
      query?: Record<string, any>;
      body?: {
        description: string;
        schema: any;
        required?: boolean;
      };
    };
    responses: {
      200?: { description: string; schema?: any };
      201?: { description: string; schema?: any };
      400?: { description: string };
      401?: { description: string };
      403?: { description: string };
      404?: { description: string };
      500?: { description: string };
    };
  }) {
    // Add to OpenAPI document
    const parameters: any[] = [];

    // Add path parameters
    if (config.request?.params) {
      Object.entries(config.request.params).forEach(([name, schema]) => {
        parameters.push({
          name,
          in: 'path',
          required: true,
          schema,
        });
      });
    }

    // Add query parameters
    if (config.request?.query) {
      Object.entries(config.request.query).forEach(([name, schema]) => {
        parameters.push({
          name,
          in: 'query',
          required: false,
          schema,
        });
      });
    }

    // Build responses
    const responses: Record<string, any> = {};
    Object.entries(config.responses).forEach(([code, response]) => {
      if (response) {
        const hasSchema = 'schema' in response && response.schema;
        responses[code] = {
          description: response.description,
          content: hasSchema
            ? {
                'application/json': {
                  schema: (response as any).schema,
                },
              }
            : undefined,
        };
      }
    });

    this.generator.addEndpoint({
      path: config.path,
      method: config.method,
      summary: config.summary,
      description: config.description,
      tags: config.tags,
      security: config.security !== false ? [{ bearerAuth: [] }] : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody: config.request?.body
        ? {
            description: config.request.body.description,
            required: config.request.body.required !== false,
            content: {
              'application/json': {
                schema: config.request.body.schema,
              },
            },
          }
        : undefined,
      responses,
    });

    // Also add the route to Express
    const handler = (_req: any, _res: any, next: any) => next();
    (this.router as any)[config.method](config.path, handler);

    return this;
  }
}

// Usage example in auth routes
export function documentAuthRoutes(generator: OpenAPIGenerator, router: Router) {
  const documenter = new RouteDocumenter(generator, router);

  documenter
    .documentRoute({
      method: 'post',
      path: '/auth/login',
      summary: 'User login',
      description: 'Authenticate user with email and password',
      tags: ['Authentication'],
      security: false,
      request: {
        body: {
          description: 'Login credentials',
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid request data' },
        401: { description: 'Invalid credentials' },
      },
    })
    .documentRoute({
      method: 'post',
      path: '/auth/refresh',
      summary: 'Refresh access token',
      description: 'Get new access token using refresh token',
      tags: ['Authentication'],
      security: false,
      request: {
        body: {
          description: 'Refresh token',
          schema: {
            type: 'object',
            required: ['refreshToken'],
            properties: {
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Token refreshed successfully',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Invalid or expired refresh token' },
      },
    })
    .documentRoute({
      method: 'get',
      path: '/auth/me',
      summary: 'Get current user',
      description: 'Get authenticated user information',
      tags: ['Authentication'],
      responses: {
        200: {
          description: 'User information retrieved',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        401: { description: 'Not authenticated' },
      },
    })
    .documentRoute({
      method: 'post',
      path: '/auth/logout',
      summary: 'Logout user',
      description: 'Invalidate user tokens and end session',
      tags: ['Authentication'],
      responses: {
        200: {
          description: 'Logout successful',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
        401: { description: 'Not authenticated' },
      },
    });
}
