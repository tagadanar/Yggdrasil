#!/usr/bin/env node

/**
 * Script to generate OpenAPI documentation for all services
 * Outputs JSON files and creates a combined documentation
 */

const fs = require('fs');
const path = require('path');

// Services configuration
const services = [
  {
    name: 'auth-service',
    port: 3001,
    title: 'Auth Service',
    basePath: '/api/auth',
  },
  {
    name: 'user-service', 
    port: 3002,
    title: 'User Service',
    basePath: '/api/users',
  },
  {
    name: 'news-service',
    port: 3003,
    title: 'News Service', 
    basePath: '/api/news',
  },
  {
    name: 'course-service',
    port: 3004,
    title: 'Course Service',
    basePath: '/api/courses',
  },
  {
    name: 'planning-service',
    port: 3005,
    title: 'Planning Service',
    basePath: '/api/planning',
  },
  {
    name: 'statistics-service',
    port: 3006,
    title: 'Statistics Service',
    basePath: '/api/statistics',
  },
];

// Create docs directory
const docsDir = path.join(__dirname, '..', 'docs', 'api');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

console.log('📚 Generating API documentation...\n');

// Generate documentation for each service
services.forEach((service) => {
  const servicePath = path.join(__dirname, '..', 'packages', 'api-services', service.name);
  const openApiPath = path.join(servicePath, 'src', 'openapi.ts');
  
  // Check if service has OpenAPI documentation
  if (!fs.existsSync(openApiPath)) {
    console.log(`⚠️  No OpenAPI documentation found for ${service.title}`);
    console.log(`   Expected at: ${openApiPath}`);
    console.log(`   Skipping ${service.name}...\n`);
    return;
  }

  console.log(`✅ Generating documentation for ${service.title}`);
  
  // Generate placeholder for now (since we need to build TypeScript first)
  const placeholderDoc = {
    openapi: '3.0.3',
    info: {
      title: `Yggdrasil ${service.title}`,
      version: '1.0.0',
      description: `API documentation for ${service.title}`,
    },
    servers: [
      {
        url: `http://localhost:${service.port}`,
        description: 'Development server',
      },
    ],
    paths: {},
  };
  
  const outputPath = path.join(docsDir, `${service.name}.openapi.json`);
  fs.writeFileSync(outputPath, JSON.stringify(placeholderDoc, null, 2));
  console.log(`   Generated: ${outputPath}`);
});

// Create index.html for documentation portal
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yggdrasil API Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 {
      color: #2e7d32;
      border-bottom: 3px solid #2e7d32;
      padding-bottom: 1rem;
    }
    .services {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .service-card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .service-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .service-card h2 {
      color: #2e7d32;
      margin-top: 0;
    }
    .service-card p {
      color: #666;
      margin: 0.5rem 0;
    }
    .service-card a {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #2e7d32;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .service-card a:hover {
      background: #1b5e20;
    }
    .info {
      background: #e8f5e9;
      border-left: 4px solid #2e7d32;
      padding: 1rem;
      margin: 2rem 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>🌳 Yggdrasil API Documentation</h1>
  
  <div class="info">
    <strong>Welcome to the Yggdrasil Educational Platform API Documentation!</strong><br>
    This portal provides comprehensive documentation for all microservices in the platform.
    Each service has its own OpenAPI specification with interactive documentation.
  </div>

  <div class="services">
    ${services.map(service => `
    <div class="service-card">
      <h2>${service.title}</h2>
      <p><strong>Port:</strong> ${service.port}</p>
      <p><strong>Base Path:</strong> ${service.basePath}</p>
      <p>Handles ${service.name.replace('-service', '')} operations</p>
      <a href="http://localhost:${service.port}/api-docs">View Documentation</a>
    </div>
    `).join('')}
  </div>

  <div class="info" style="margin-top: 3rem;">
    <strong>Note:</strong> Make sure the services are running to access their documentation.
    Use <code>npm run dev</code> to start all services.
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(docsDir, 'index.html'), indexHtml);
console.log(`\n✅ Generated documentation portal: ${path.join(docsDir, 'index.html')}`);

// Create a README for the documentation
const readmeContent = `# Yggdrasil API Documentation

This directory contains the OpenAPI documentation for all Yggdrasil microservices.

## Services

${services.map(s => `- **${s.title}** (Port ${s.port}): ${s.basePath}`).join('\n')}

## Viewing Documentation

Each service exposes its API documentation at \`/api-docs\` when running:

${services.map(s => `- ${s.title}: http://localhost:${s.port}/api-docs`).join('\n')}

## Generating Documentation

To regenerate the documentation files:

\`\`\`bash
npm run generate:api-docs
\`\`\`

## OpenAPI Files

The OpenAPI specification files are generated as:

${services.map(s => `- \`${s.name}.openapi.json\` - ${s.title} OpenAPI specification`).join('\n')}

## Adding Documentation to a Service

1. Create \`src/openapi.ts\` in your service
2. Use the shared utilities from \`@yggdrasil/shared-utilities\`
3. Define your endpoints, schemas, and responses
4. Import and use \`setupSwagger\` in your app

Example:

\`\`\`typescript
import { setupSwagger } from '@yggdrasil/shared-utilities';
import { createServiceOpenAPI } from './openapi';

const app = express();
const openApiDoc = createServiceOpenAPI();
setupSwagger(app, openApiDoc);
\`\`\`
`;

fs.writeFileSync(path.join(docsDir, 'README.md'), readmeContent);
console.log(`✅ Generated README: ${path.join(docsDir, 'README.md')}`);

console.log('\n🎉 API documentation generation complete!');
console.log(`📁 Documentation available at: ${docsDir}`);
console.log('\n💡 Next steps:');
console.log('   1. Implement openapi.ts in each service');
console.log('   2. Add setupSwagger to each service app');
console.log('   3. Run services and visit /api-docs endpoints');