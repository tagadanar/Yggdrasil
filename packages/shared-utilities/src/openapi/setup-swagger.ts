/**
 * Swagger UI setup for Express applications
 * Provides middleware to serve OpenAPI documentation
 */

import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIV3 } from 'openapi-types';
import { logger } from '@yggdrasil/shared-utilities';

/**
 * Setup Swagger UI for an Express app
 * 
 * @param app - Express application
 * @param openApiDoc - OpenAPI document
 * @param basePath - Base path for documentation (default: /api-docs)
 */
export const setupSwagger = (
  app: Express,
  openApiDoc: OpenAPIV3.Document,
  basePath = '/api-docs'
): void => {
  // Serve OpenAPI JSON
  app.get(`${basePath}/openapi.json`, (_req: Request, res: Response) => {
    res.json(openApiDoc);
  });

  // Serve Swagger UI
  app.use(
    basePath,
    swaggerUi.serve,
    swaggerUi.setup(openApiDoc, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin-bottom: 2rem }
        .swagger-ui .info .title { color: #2e7d32 }
        .swagger-ui .btn.authorize { background-color: #2e7d32; border-color: #2e7d32 }
        .swagger-ui .btn.authorize:hover { background-color: #1b5e20; border-color: #1b5e20 }
      `,
      customSiteTitle: `${openApiDoc.info.title} - API Documentation`,
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        displayOperationId: true,
        defaultModelRendering: 'model',
        defaultModelExpandDepth: 2,
        defaultModelsExpandDepth: 2,
        docExpansion: 'list',
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    })
  );

  // Log documentation URL
  const port = (app.get('port') || process.env['PORT'] || 3000);
  logger.debug(`📚 API Documentation available at http://localhost:${port}${basePath}`);
};

/**
 * Create a combined OpenAPI document from multiple services
 * Useful for API gateway documentation
 */
export const combineOpenAPIDocs = (
  title: string,
  version: string,
  services: Array<{
    name: string;
    doc: OpenAPIV3.Document;
    basePath: string;
  }>
): OpenAPIV3.Document => {
  const combinedDoc: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: {
      title,
      version,
      description: 'Combined API documentation for all Yggdrasil services',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development API Gateway',
      },
      {
        url: 'https://api.yggdrasil.edu',
        description: 'Production API Gateway',
      },
    ],
    paths: {},
    components: {
      schemas: {},
      responses: {},
      parameters: {},
      securitySchemes: {},
    },
    tags: [],
  };

  // Combine paths, components, and tags from all services
  services.forEach(({ name, doc, basePath }) => {
    // Add service tag
    combinedDoc.tags!.push({
      name,
      description: doc.info.description,
    });

    // Add paths with service prefix
    Object.entries(doc.paths || {}).forEach(([path, pathItem]) => {
      const prefixedPath = `${basePath}${path}`;
      combinedDoc.paths[prefixedPath] = {};

      // Add operations with service tag
      Object.entries(pathItem as OpenAPIV3.PathItemObject).forEach(([method, operation]) => {
        if (typeof operation === 'object' && 'tags' in operation) {
          combinedDoc.paths[prefixedPath][method] = {
            ...operation,
            tags: [name, ...(operation.tags || [])],
          };
        }
      });
    });

    // Merge components
    if (doc.components) {
      Object.entries(doc.components).forEach(([componentType, components]) => {
        if (components && typeof components === 'object') {
          combinedDoc.components![componentType] = {
            ...combinedDoc.components![componentType],
            ...components,
          };
        }
      });
    }
  });

  return combinedDoc;
};

/**
 * Middleware to add OpenAPI metadata to routes
 * Helps with automatic documentation generation
 */
export const documentRoute = (metadata: {
  summary: string;
  description?: string;
  tags?: string[];
  security?: boolean;
  deprecated?: boolean;
}) => {
  return (req: Request, _res: Response, next: Function) => {
    // Attach metadata to request for potential use by documentation generators
    (req as any).openapi = metadata;
    next();
  };
};