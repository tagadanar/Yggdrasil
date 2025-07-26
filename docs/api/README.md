# Yggdrasil API Documentation

This directory contains the OpenAPI documentation for all Yggdrasil microservices.

## Services

- **Auth Service** (Port 3001): /api/auth
- **User Service** (Port 3002): /api/users
- **News Service** (Port 3003): /api/news
- **Course Service** (Port 3004): /api/courses
- **Planning Service** (Port 3005): /api/planning
- **Statistics Service** (Port 3006): /api/statistics

## Viewing Documentation

Each service exposes its API documentation at `/api-docs` when running:

- Auth Service: http://localhost:3001/api-docs
- User Service: http://localhost:3002/api-docs
- News Service: http://localhost:3003/api-docs
- Course Service: http://localhost:3004/api-docs
- Planning Service: http://localhost:3005/api-docs
- Statistics Service: http://localhost:3006/api-docs

## Generating Documentation

To regenerate the documentation files:

```bash
npm run generate:api-docs
```

## OpenAPI Files

The OpenAPI specification files are generated as:

- `auth-service.openapi.json` - Auth Service OpenAPI specification
- `user-service.openapi.json` - User Service OpenAPI specification
- `news-service.openapi.json` - News Service OpenAPI specification
- `course-service.openapi.json` - Course Service OpenAPI specification
- `planning-service.openapi.json` - Planning Service OpenAPI specification
- `statistics-service.openapi.json` - Statistics Service OpenAPI specification

## Adding Documentation to a Service

1. Create `src/openapi.ts` in your service
2. Use the shared utilities from `@yggdrasil/shared-utilities`
3. Define your endpoints, schemas, and responses
4. Import and use `setupSwagger` in your app

Example:

```typescript
import { setupSwagger } from '@yggdrasil/shared-utilities';
import { createServiceOpenAPI } from './openapi';

const app = express();
const openApiDoc = createServiceOpenAPI();
setupSwagger(app, openApiDoc);
```
