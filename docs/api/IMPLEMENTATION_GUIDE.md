# OpenAPI/Swagger Implementation Guide

This guide explains how to add OpenAPI documentation to Yggdrasil microservices.

## Overview

Each microservice can expose interactive API documentation using OpenAPI 3.0 specification and Swagger UI.

## Implementation Steps

### 1. Create OpenAPI Specification

Create `src/openapi.ts` in your service:

```typescript
import { OpenAPIV3 } from 'openapi-types';
import { createOpenAPIDocument, addCommonResponses } from '@yggdrasil/shared-utilities';

export const createServiceOpenAPI = (): OpenAPIV3.Document => {
  const doc = createOpenAPIDocument(
    'Service Name',
    '1.0.0',
    'Service description',
    3001 // Service port
  );

  // Add service-specific schemas
  doc.components!.schemas = {
    ...doc.components!.schemas,
    // Your schemas here
  };

  // Define tags
  doc.tags = [
    {
      name: 'TagName',
      description: 'Tag description',
    },
  ];

  // Define paths
  doc.paths = {
    '/endpoint': {
      get: addCommonResponses({
        tags: ['TagName'],
        summary: 'Endpoint summary',
        description: 'Detailed description',
        operationId: 'getEndpoint',
        parameters: [],
        responses: {
          '200': {
            description: 'Success response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/YourSchema' },
              },
            },
          },
        },
      }),
    },
  };

  return doc;
};
```

### 2. Integrate with Express App

Update your `src/app.ts`:

```typescript
import { setupSwagger } from '@yggdrasil/shared-utilities';
import { createServiceOpenAPI } from './openapi';

export const createApp = (): express.Application => {
  const app = express();

  // ... other middleware ...

  // Setup OpenAPI documentation (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    const openApiDoc = createServiceOpenAPI();
    setupSwagger(app, openApiDoc);
  }

  // ... routes ...

  return app;
};
```

### 3. Install Dependencies

The required dependencies are already in `@yggdrasil/shared-utilities`:
- `openapi-types` - TypeScript types for OpenAPI
- `swagger-ui-express` - Swagger UI middleware

### 4. Access Documentation

Once your service is running, access the documentation at:
```
http://localhost:PORT/api-docs
```

## Shared Components

The following are available from `@yggdrasil/shared-utilities`:

### Schemas
- `Error` - Standard error response
- `User` - User model
- `AuthTokens` - JWT tokens
- `Course` - Course model
- `Chapter`, `Section`, `Content` - Course structure
- `PaginationMeta` - Pagination metadata
- `SuccessResponse` - Generic success response

### Responses
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ValidationError` (422)
- `RateLimitError` (429)
- `InternalServerError` (500)

### Parameters
- `pageParam` - Page number
- `limitParam` - Items per page
- `sortParam` - Sort field
- `searchParam` - Search query
- `idParam` - Resource ID

### Helper Functions
- `addCommonResponses()` - Adds standard error responses
- `createPaginatedResponse()` - Creates paginated response schema

## Example: User Service Endpoints

```typescript
doc.paths = {
  '/users': {
    get: addCommonResponses({
      tags: ['Users'],
      summary: 'List users',
      description: 'Get paginated list of users',
      operationId: 'listUsers',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/pageParam' },
        { $ref: '#/components/parameters/limitParam' },
        { $ref: '#/components/parameters/searchParam' },
      ],
      responses: {
        '200': {
          description: 'Users list',
          content: {
            'application/json': {
              schema: createPaginatedResponse('User'),
            },
          },
        },
      },
    }),
    post: addCommonResponses({
      tags: ['Users'],
      summary: 'Create user',
      description: 'Create a new user (admin only)',
      operationId: 'createUser',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateUserRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'User created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
    }),
  },
};
```

## Best Practices

1. **Use Shared Components**: Leverage the shared schemas and responses for consistency
2. **Add Examples**: Include example values in schemas for better documentation
3. **Document Security**: Always specify security requirements for protected endpoints
4. **Group with Tags**: Use tags to organize endpoints logically
5. **Descriptive Names**: Use clear operation IDs and summaries
6. **Validate Schemas**: Ensure schemas match actual response/request data
7. **Environment Checks**: Skip Swagger setup in test environments

## Testing Documentation

1. Start your service: `npm run dev`
2. Visit: `http://localhost:PORT/api-docs`
3. Try endpoints using "Try it out" button
4. Verify request/response formats match documentation

## Generating Combined Documentation

Run the documentation generator to create static files:

```bash
npm run generate:api-docs
```

This creates:
- Individual OpenAPI JSON files for each service
- Combined documentation portal
- README with links to all services