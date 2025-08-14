// src/openapi.ts
// OpenAPI specification for course service

import { OpenAPIV3 } from 'openapi-types';

export const courseServiceOpenAPI: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Yggdrasil Course Service API',
    version: '1.0.0',
    description: 'Course management service for the Yggdrasil educational platform',
    contact: {
      name: 'Yggdrasil Development Team',
      email: 'dev@yggdrasil.edu',
    },
  },
  servers: [
    {
      url: 'http://localhost:3004',
      description: 'Development server',
    },
    {
      url: 'https://api.yggdrasil.edu/courses',
      description: 'Production server',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the course service',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        service: { type: 'string', example: 'course-service' },
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string', example: '1.0.0' },
                      },
                    },
                    message: { type: 'string', example: 'Course service is healthy' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/courses': {
      get: {
        tags: ['Courses'],
        summary: 'Search courses',
        description: 'Search and filter courses with pagination',
        parameters: [
          {
            name: 'search',
            in: 'query',
            description: 'Search term for course title or description',
            schema: { type: 'string' },
          },
          {
            name: 'category',
            in: 'query',
            description: 'Filter by course category',
            schema: { type: 'string' },
          },
          {
            name: 'level',
            in: 'query',
            description: 'Filter by course level',
            schema: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
            },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Successfully retrieved courses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        courses: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Course' },
                        },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                      },
                    },
                    message: { type: 'string', example: 'Courses retrieved successfully' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Courses'],
        summary: 'Create a new course',
        description: 'Create a new course (teachers, staff, admins only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCourseRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Course created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Course' },
                    message: { type: 'string', example: 'Course created successfully' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/courses/{courseId}': {
      get: {
        tags: ['Courses'],
        summary: 'Get course by ID',
        description: 'Retrieve a specific course by its ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'courseId',
            in: 'path',
            required: true,
            description: 'Course ID',
            schema: { type: 'string', format: 'objectid' },
          },
        ],
        responses: {
          '200': {
            description: 'Course retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Course' },
                    message: { type: 'string', example: 'Course retrieved successfully' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Courses'],
        summary: 'Update course',
        description: 'Update an existing course (instructors, admins only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'courseId',
            in: 'path',
            required: true,
            description: 'Course ID',
            schema: { type: 'string', format: 'objectid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCourseRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Course updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Course' },
                    message: { type: 'string', example: 'Course updated successfully' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Courses'],
        summary: 'Delete course',
        description: 'Delete an existing course (instructors, admins only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'courseId',
            in: 'path',
            required: true,
            description: 'Course ID',
            schema: { type: 'string', format: 'objectid' },
          },
        ],
        responses: {
          '200': {
            description: 'Course deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', nullable: true },
                    message: { type: 'string', example: 'Course deleted successfully' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/courses/public/published': {
      get: {
        tags: ['Courses'],
        summary: 'Get published courses',
        description: 'Retrieve all published courses (public access)',
        responses: {
          '200': {
            description: 'Published courses retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Course' },
                    },
                    message: {
                      type: 'string',
                      example: 'Published courses retrieved successfully',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/courses/user/my-courses': {
      get: {
        tags: ['Courses'],
        summary: 'Get user courses',
        description: 'Get courses accessible to the authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User courses retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Course' },
                    },
                    message: { type: 'string', example: 'User courses retrieved successfully' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Course: {
        type: 'object',
        properties: {
          _id: { type: 'string', format: 'objectid' },
          title: { type: 'string', example: 'Introduction to Programming' },
          description: { type: 'string', example: 'Learn the basics of programming' },
          slug: { type: 'string', example: 'introduction-to-programming' },
          category: { type: 'string', example: 'Programming' },
          level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            example: 'beginner',
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            example: 'published',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['programming', 'basics', 'beginner'],
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
          estimatedDuration: { type: 'number', example: 40 },
          instructor: {
            type: 'object',
            properties: {
              _id: { type: 'string', format: 'objectid' },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            },
          },
          chapters: { type: 'array', items: { $ref: '#/components/schemas/Chapter' } },
          settings: { $ref: '#/components/schemas/CourseSettings' },
          stats: { $ref: '#/components/schemas/CourseStats' },
          version: { type: 'number', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          lastModified: { type: 'string', format: 'date-time' },
        },
      },
      Chapter: {
        type: 'object',
        properties: {
          _id: { type: 'string', format: 'objectid' },
          title: { type: 'string', example: 'Getting Started' },
          description: { type: 'string', example: 'Introduction to programming concepts' },
          order: { type: 'number', example: 1 },
          sections: { type: 'array', items: { $ref: '#/components/schemas/Section' } },
          isPublished: { type: 'boolean', example: true },
          estimatedDuration: { type: 'number', example: 10 },
        },
      },
      Section: {
        type: 'object',
        properties: {
          _id: { type: 'string', format: 'objectid' },
          title: { type: 'string', example: 'What is Programming?' },
          description: { type: 'string', example: 'Understanding programming fundamentals' },
          order: { type: 'number', example: 1 },
          content: { type: 'array', items: { $ref: '#/components/schemas/Content' } },
          isPublished: { type: 'boolean', example: true },
          estimatedDuration: { type: 'number', example: 5 },
        },
      },
      Content: {
        type: 'object',
        properties: {
          _id: { type: 'string', format: 'objectid' },
          type: {
            type: 'string',
            enum: ['text', 'video', 'exercise', 'quiz', 'file'],
            example: 'text',
          },
          title: { type: 'string', example: 'Programming Basics' },
          order: { type: 'number', example: 1 },
          data: { type: 'object', description: 'Content-specific data' },
          isPublished: { type: 'boolean', example: true },
        },
      },
      CourseSettings: {
        type: 'object',
        properties: {
          isPublic: { type: 'boolean', example: true },
          allowLateSubmissions: { type: 'boolean', example: true },
          enableDiscussions: { type: 'boolean', example: true },
          enableCollaboration: { type: 'boolean', example: false },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
      CourseStats: {
        type: 'object',
        properties: {
          averageRating: { type: 'number', example: 4.5 },
          totalRatings: { type: 'number', example: 120 },
          totalViews: { type: 'number', example: 1500 },
          lastAccessed: { type: 'string', format: 'date-time' },
        },
      },
      CreateCourseRequest: {
        type: 'object',
        required: ['title', 'description', 'category', 'level'],
        properties: {
          title: { type: 'string', example: 'Introduction to Programming' },
          description: { type: 'string', example: 'Learn the basics of programming' },
          category: { type: 'string', example: 'Programming' },
          level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            example: 'beginner',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['programming', 'basics'],
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
          estimatedDuration: { type: 'number', example: 40 },
          settings: { $ref: '#/components/schemas/CourseSettings' },
        },
      },
      UpdateCourseRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
          },
          estimatedDuration: { type: 'number' },
          settings: { $ref: '#/components/schemas/CourseSettings' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Invalid request data' },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Authentication required' },
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Access denied' },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Resource not found' },
              },
            },
          },
        },
      },
    },
  },
};
