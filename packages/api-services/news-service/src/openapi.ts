/**
 * OpenAPI documentation for News Service
 * Defines all news management endpoints and schemas
 */

import { OpenAPIV3 } from 'openapi-types';
import { createOpenAPIDocument } from '@yggdrasil/shared-utilities';

export const createNewsServiceOpenAPI = (): OpenAPIV3.Document => {
  const doc = createOpenAPIDocument(
    'Yggdrasil News Service',
    '1.0.0',
    'News and announcements service for the Yggdrasil educational platform',
    3003,
  );

  // Add news-specific schemas
  doc.components!.schemas = {
    ...doc.components!.schemas,

    NewsArticle: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        title: { type: 'string', example: 'Important Platform Update' },
        content: { type: 'string', example: 'We are pleased to announce...' },
        summary: { type: 'string', example: 'Brief summary of the article' },
        slug: { type: 'string', example: 'important-platform-update' },
        category: {
          type: 'string',
          enum: ['general', 'academic', 'events', 'announcements'],
          example: 'announcements',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['update', 'platform', 'important'],
        },
        author: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Jane Smith' },
            role: { type: 'string', example: 'admin' },
          },
        },
        isPublished: { type: 'boolean', example: true },
        isPinned: { type: 'boolean', example: false },
        publishedAt: { type: 'string', format: 'date-time' },
        viewCount: { type: 'number', example: 42 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },

    CreateNewsArticleRequest: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title: { type: 'string', maxLength: 300 },
        content: { type: 'string' },
        summary: { type: 'string', maxLength: 500 },
        category: {
          type: 'string',
          enum: ['general', 'academic', 'events', 'announcements'],
          default: 'general',
        },
        tags: {
          type: 'array',
          items: { type: 'string', maxLength: 50 },
          maxItems: 10,
        },
        isPublished: { type: 'boolean', default: false },
        isPinned: { type: 'boolean', default: false },
      },
    },

    NewsListResponse: {
      type: 'object',
      properties: {
        articles: {
          type: 'array',
          items: { $ref: '#/components/schemas/NewsArticle' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        totalPages: { type: 'number', example: 15 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false },
      },
    },
  };

  // Add paths
  doc.paths = {
    '/api/news': {
      get: {
        summary: 'Get service information',
        tags: ['Service Info'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Service information retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string' },
                    message: { type: 'string' },
                    user: { type: 'object' },
                    endpoints: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/news/articles': {
      get: {
        summary: 'List news articles',
        tags: ['Articles'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'category',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['general', 'academic', 'events', 'announcements'],
            },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Articles retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewsListResponse' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new article',
        tags: ['Articles'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateNewsArticleRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Article created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewsArticle' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/news/articles/id/{id}': {
      get: {
        summary: 'Get article by ID',
        tags: ['Articles'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
          },
        ],
        responses: {
          '200': {
            description: 'Article retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewsArticle' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/news/articles/{id}': {
      put: {
        summary: 'Update an article',
        tags: ['Articles'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateNewsArticleRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Article updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewsArticle' },
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
        summary: 'Delete an article',
        tags: ['Articles'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
          },
        ],
        responses: {
          '200': {
            description: 'Article deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/news/articles/{id}/publish': {
      post: {
        summary: 'Publish an article',
        tags: ['Article Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
          },
        ],
        responses: {
          '200': {
            description: 'Article published successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewsArticle' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/news/articles/{id}/pin': {
      post: {
        summary: 'Pin an article',
        tags: ['Article Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
          },
        ],
        responses: {
          '200': {
            description: 'Article pinned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewsArticle' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  };

  // Add tags
  doc.tags = [
    { name: 'Service Info', description: 'Service information endpoints' },
    { name: 'Articles', description: 'News article CRUD operations' },
    { name: 'Article Management', description: 'Article publishing and management' },
  ];

  return doc;
};
