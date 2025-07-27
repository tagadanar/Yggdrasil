import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIV3 } from 'openapi-types';

export class APIExplorer {
  private app: express.Express;

  constructor(
    private port: number = 4000,
    private services: Array<{
      name: string;
      url: string;
      docsPath: string;
    }>,
  ) {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Home page with service list
    this.app.get('/', (_req, res) => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Yggdrasil API Explorer</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 1200px;
              margin: 0 auto;
              padding: 2rem;
              background: #f5f5f5;
            }
            .header {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              margin-bottom: 2rem;
            }
            .services {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
              gap: 1.5rem;
            }
            .service-card {
              background: white;
              padding: 1.5rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              transition: transform 0.2s;
            }
            .service-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            .service-card h3 {
              margin: 0 0 1rem 0;
              color: #333;
            }
            .service-card a {
              display: inline-block;
              padding: 0.5rem 1rem;
              background: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin-right: 0.5rem;
            }
            .service-card a:hover {
              background: #0056b3;
            }
            .status {
              display: inline-block;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.875rem;
              margin-left: 0.5rem;
            }
            .status.healthy { background: #d4edda; color: #155724; }
            .status.unhealthy { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Yggdrasil API Explorer</h1>
            <p>Interactive documentation and testing for all platform services</p>
          </div>
          <div class="services">
            ${this.services
              .map(
                service => `
              <div class="service-card">
                <h3>${service.name}
                  <span class="status" id="status-${service.name}">checking...</span>
                </h3>
                <p>Base URL: ${service.url}</p>
                <a href="/docs/${service.name}">API Docs</a>
                <a href="/test/${service.name}">Test Console</a>
              </div>
            `,
              )
              .join('')}
          </div>
          <script>
            // Check service health
            ${this.services
              .map(
                service => `
              fetch('${service.url}/health')
                .then(res => res.json())
                .then(data => {
                  const status = document.getElementById('status-${service.name}');
                  if (data.status === 'healthy') {
                    status.textContent = 'healthy';
                    status.className = 'status healthy';
                  } else {
                    status.textContent = 'unhealthy';
                    status.className = 'status unhealthy';
                  }
                })
                .catch(() => {
                  const status = document.getElementById('status-${service.name}');
                  status.textContent = 'offline';
                  status.className = 'status unhealthy';
                });
            `,
              )
              .join('')}
          </script>
        </body>
        </html>
      `;
      res.send(html);
    });

    // Setup Swagger UI for each service
    this.services.forEach(service => {
      // Load OpenAPI spec
      const spec = require(service.docsPath);

      // Swagger UI options
      const options = {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: `${service.name} API Documentation`,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          tryItOutEnabled: true,
        },
      };

      // API documentation route
      this.app.use(`/docs/${service.name}`, swaggerUi.serve, swaggerUi.setup(spec, options));

      // Test console route
      this.app.get(`/test/${service.name}`, (_req, res) => {
        res.send(this.generateTestConsole(service, spec));
      });
    });

    // Combined API spec
    this.app.get('/openapi.json', (_req, res) => {
      const combined = this.combineSpecs();
      res.json(combined);
    });
  }

  private generateTestConsole(service: any, spec: OpenAPIV3.Document): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${service.name} Test Console</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
          }
          .header {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
          }
          .console {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .endpoint {
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
            padding: 1rem;
          }
          .method {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            margin-right: 0.5rem;
          }
          .method.get { background: #61affe; }
          .method.post { background: #49cc90; }
          .method.put { background: #fca130; }
          .method.delete { background: #f93e3e; }
          .input-group {
            margin: 1rem 0;
          }
          .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
          }
          .input-group input, .input-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
          }
          .btn:hover {
            background: #0056b3;
          }
          .response {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 4px;
            margin-top: 1rem;
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${service.name} API Test Console</h1>
          <p>Interactive testing interface for ${service.name} endpoints</p>
        </div>
        <div class="console" id="test-console">
          ${this.generateEndpointForms(spec)}
        </div>
        <script>
          function makeRequest(endpoint, method, path) {
            const form = document.getElementById(endpoint + '-form');
            const formData = new FormData(form);
            const data = {};
            
            // Collect form data
            for (let [key, value] of formData.entries()) {
              data[key] = value;
            }
            
            // Build request options
            const options = {
              method: method.toUpperCase(),
              headers: {
                'Content-Type': 'application/json',
              }
            };
            
            // Add authorization header if provided
            if (data.authorization) {
              options.headers['Authorization'] = 'Bearer ' + data.authorization;
              delete data.authorization;
            }
            
            // Add body for POST/PUT requests
            if (method !== 'get' && method !== 'delete') {
              options.body = JSON.stringify(data);
            }
            
            // Build URL with query params for GET requests
            let url = '${service.url}' + path;
            if (method === 'get' && Object.keys(data).length > 0) {
              const params = new URLSearchParams(data);
              url += '?' + params.toString();
            }
            
            // Make request
            fetch(url, options)
              .then(response => response.json())
              .then(data => {
                document.getElementById(endpoint + '-response').innerHTML = 
                  '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              })
              .catch(error => {
                document.getElementById(endpoint + '-response').innerHTML = 
                  '<pre>Error: ' + error.message + '</pre>';
              });
          }
        </script>
      </body>
      </html>
    `;
  }

  private generateEndpointForms(spec: OpenAPIV3.Document): string {
    let html = '';

    Object.entries(spec.paths || {}).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const endpointId = `${method}-${path}`.replace(/[^a-zA-Z0-9]/g, '-');

          html += `
            <div class="endpoint">
              <h3>
                <span class="method ${method}">${method.toUpperCase()}</span>
                ${path}
              </h3>
              <p>${operation.summary || 'No description'}</p>
              <form id="${endpointId}-form">
                <div class="input-group">
                  <label>Authorization Token (if required):</label>
                  <input type="text" name="authorization" placeholder="JWT token">
                </div>
                
                ${this.generateParameterInputs(operation.parameters || [])}
                ${this.generateBodyInput(operation.requestBody)}
                
                <button type="button" class="btn" onclick="makeRequest('${endpointId}', '${method}', '${path}')">
                  Send Request
                </button>
              </form>
              <div class="response" id="${endpointId}-response"></div>
            </div>
          `;
        }
      });
    });

    return html;
  }

  private generateParameterInputs(parameters: any[]): string {
    return parameters
      .map(
        param => `
      <div class="input-group">
        <label>${param.name} (${param.in})${param.required ? ' *' : ''}:</label>
        <input type="text" name="${param.name}" placeholder="${param.description || ''}">
      </div>
    `,
      )
      .join('');
  }

  private generateBodyInput(requestBody: any): string {
    if (!requestBody) return '';

    return `
      <div class="input-group">
        <label>Request Body:</label>
        <textarea name="body" rows="10" placeholder="JSON request body"></textarea>
      </div>
    `;
  }

  private combineSpecs(): OpenAPIV3.Document {
    // Combine all service specs into one
    const combined: OpenAPIV3.Document = {
      openapi: '3.0.3',
      info: {
        title: 'Yggdrasil Platform API',
        version: '1.0.0',
        description: 'Complete API documentation for Yggdrasil platform',
      },
      servers: [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
    };

    this.services.forEach(service => {
      try {
        const spec = require(service.docsPath);

        // Merge paths with service prefix
        Object.entries(spec.paths || {}).forEach(([path, methods]) => {
          combined.paths[`/${service.name}${path}`] = methods as any;
        });

        // Merge schemas
        Object.assign(combined.components!.schemas!, spec.components?.schemas || {});
      } catch (error) {
        console.warn(`Could not load spec for ${service.name}:`, error);
      }
    });

    return combined;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 API Explorer running at http://localhost:${this.port}`);
    });
  }
}
