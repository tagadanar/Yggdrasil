import { OpenAPIV3 } from 'openapi-types';
import * as fs from 'fs';
import * as path from 'path';

export class OpenAPIGenerator {
  private document: OpenAPIV3.Document;

  constructor(
    private serviceName: string,
    version: string,
    baseUrl: string,
  ) {
    this.document = {
      openapi: '3.0.3',
      info: {
        title: `${serviceName} API`,
        version: version,
        description: this.getServiceDescription(),
        contact: {
          name: 'Yggdrasil API Support',
          email: 'api-support@yggdrasil.edu',
          url: 'https://docs.yggdrasil.edu',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: baseUrl,
          description: 'Current environment',
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
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for service-to-service communication',
          },
        },
        schemas: {},
        responses: this.getCommonResponses(),
        parameters: this.getCommonParameters(),
      },
      paths: {},
      tags: [],
    };
  }

  private getServiceDescription(): string {
    const descriptions: Record<string, string> = {
      'auth-service': 'Authentication and authorization service for Yggdrasil platform',
      'user-service': 'User management and profile service',
      'course-service': 'Course creation and management service',
      'news-service': 'News and announcements service',
      'planning-service': 'Schedule and event planning service',
      'statistics-service': 'Analytics and reporting service',
    };
    return descriptions[this.serviceName] || 'Yggdrasil platform service';
  }

  private getCommonResponses(): Record<string, OpenAPIV3.ResponseObject> {
    return {
      BadRequest: {
        description: 'Bad request - Invalid input data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                validationErrors: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                  },
                ],
              },
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
                statusCode: 401,
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      NotFound: {
        description: 'Not found - Resource does not exist',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    };
  }

  private getCommonParameters(): Record<string, OpenAPIV3.ParameterObject> {
    return {
      pageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      sortParam: {
        name: 'sort',
        in: 'query',
        description: 'Sort field and order (e.g., "-createdAt" for descending)',
        schema: {
          type: 'string',
        },
      },
    };
  }

  // Add endpoint documentation
  addEndpoint(endpoint: {
    path: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    summary: string;
    description?: string;
    tags: string[];
    security?: Array<Record<string, string[]>>;
    parameters?: OpenAPIV3.ParameterObject[];
    requestBody?: OpenAPIV3.RequestBodyObject;
    responses: Record<string, OpenAPIV3.ResponseObject>;
    deprecated?: boolean;
  }) {
    if (!this.document.paths[endpoint.path]) {
      this.document.paths[endpoint.path] = {};
    }

    const pathObject = this.document.paths[endpoint.path]!;
    pathObject[endpoint.method] = {
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      security: endpoint.security || [{ bearerAuth: [] }],
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
      deprecated: endpoint.deprecated,
    };

    // Add tags if not exists
    endpoint.tags.forEach(tag => {
      if (!this.document.tags) {
        this.document.tags = [];
      }
      if (!this.document.tags.find(t => t.name === tag)) {
        this.document.tags.push({
          name: tag,
          description: `${tag} operations`,
        });
      }
    });
  }

  // Add schema definition
  addSchema(name: string, schema: OpenAPIV3.SchemaObject) {
    if (!this.document.components) {
      this.document.components = { schemas: {} };
    }
    if (!this.document.components.schemas) {
      this.document.components.schemas = {};
    }
    this.document.components.schemas[name] = schema;
  }

  // Generate common schemas
  generateCommonSchemas() {
    this.addSchema('ErrorResponse', {
      type: 'object',
      required: ['success', 'error'],
      properties: {
        success: {
          type: 'boolean',
          enum: [false],
        },
        error: {
          type: 'object',
          required: ['message', 'statusCode'],
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
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
          },
        },
      },
    });

    this.addSchema('SuccessResponse', {
      type: 'object',
      required: ['success'],
      properties: {
        success: {
          type: 'boolean',
          enum: [true],
        },
        data: {
          type: 'object',
          description: 'Response data',
        },
        meta: {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' },
              },
            },
          },
        },
      },
    });

    this.addSchema('User', {
      type: 'object',
      required: ['id', 'email', 'role', 'profile'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: {
          type: 'string',
          enum: ['admin', 'staff', 'teacher', 'student'],
        },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            photo: { type: 'string' },
            department: { type: 'string' },
          },
        },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    });
  }

  // Export documentation
  export(outputPath: string) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(this.document, null, 2));

    // Also generate YAML version
    const yaml = require('js-yaml');
    const yamlPath = outputPath.replace('.json', '.yaml');
    fs.writeFileSync(yamlPath, yaml.dump(this.document));
  }
}
