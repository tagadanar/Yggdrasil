/**
 * Contract Testing Utility for Yggdrasil Services
 * Tests real API responses against OpenAPI schemas - NO MOCKS!
 */

import { OpenAPIV3 } from 'openapi-types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';

export interface ContractTestConfig {
  serviceName: string;
  baseURL: string;
  openApiDoc: OpenAPIV3.Document;
}

export interface ContractTestResult {
  endpoint: string;
  method: string;
  statusCode: number;
  valid: boolean;
  errors: string[];
  response: any;
}

export class ContractTester {
  private ajv: Ajv;
  private config: ContractTestConfig;

  constructor(config: ContractTestConfig) {
    this.config = config;
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  /**
   * Test a real API endpoint against its OpenAPI schema
   */
  async testEndpoint(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    options: {
      data?: any;
      headers?: Record<string, string>;
      expectedStatus?: number;
      auth?: string; // Bearer token
    } = {},
  ): Promise<ContractTestResult> {
    const { data, headers = {}, expectedStatus: _expectedStatus = 200, auth } = options;

    // Add auth header if provided
    if (auth) {
      headers['Authorization'] = `Bearer ${auth}`;
    }

    const requestConfig: AxiosRequestConfig = {
      method,
      url: `${this.config.baseURL}${path}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data) {
      requestConfig.data = data;
    }

    try {
      // Make real API call
      const response: AxiosResponse = await axios(requestConfig);

      // Validate response against OpenAPI schema
      const validationResult = this.validateResponse(path, method, response.status, response.data);

      return {
        endpoint: path,
        method,
        statusCode: response.status,
        valid: validationResult.valid,
        errors: validationResult.errors,
        response: response.data,
      };
    } catch (error: any) {
      const status = error.response?.status || 500;
      const responseData = error.response?.data || { error: error.message };

      // Validate error response against schema
      const validationResult = this.validateResponse(path, method, status, responseData);

      return {
        endpoint: path,
        method,
        statusCode: status,
        valid: validationResult.valid,
        errors: validationResult.errors,
        response: responseData,
      };
    }
  }

  /**
   * Validate response data against OpenAPI schema
   */
  private validateResponse(
    path: string,
    method: string,
    statusCode: number,
    responseData: any,
  ): { valid: boolean; errors: string[] } {
    const pathItem = this.config.openApiDoc.paths?.[path];
    if (!pathItem) {
      return {
        valid: false,
        errors: [`Path ${path} not found in OpenAPI specification`],
      };
    }

    const operation = pathItem[method.toLowerCase() as keyof OpenAPIV3.PathItemObject];
    if (!operation || typeof operation !== 'object') {
      return {
        valid: false,
        errors: [`Method ${method} not found for path ${path}`],
      };
    }

    const responses = (operation as OpenAPIV3.OperationObject).responses;
    const responseSpec = responses?.[statusCode] || responses?.['default'];

    if (!responseSpec) {
      return {
        valid: false,
        errors: [`Response ${statusCode} not defined for ${method} ${path}`],
      };
    }

    // Get response schema
    if (typeof responseSpec === 'object' && 'content' in responseSpec) {
      const contentType = responseSpec.content?.['application/json'];
      if (contentType?.schema) {
        const schema = this.resolveSchema(contentType.schema);
        const validate = this.ajv.compile(schema);
        const valid = validate(responseData);

        if (!valid) {
          return {
            valid: false,
            errors: validate.errors?.map(err => `${err.instancePath} ${err.message}`) || [
              'Unknown validation error',
            ],
          };
        }
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Resolve OpenAPI schema references
   */
  private resolveSchema(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): any {
    if ('$ref' in schema) {
      // Resolve reference
      const refPath = schema.$ref.replace('#/', '').split('/');
      let resolved: any = this.config.openApiDoc;

      for (const segment of refPath) {
        resolved = resolved[segment];
      }

      return resolved;
    }

    return schema;
  }

  /**
   * Test multiple endpoints in sequence
   */
  async testMultipleEndpoints(
    tests: Array<{
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      options?: {
        data?: any;
        headers?: Record<string, string>;
        expectedStatus?: number;
        auth?: string;
      };
    }>,
  ): Promise<ContractTestResult[]> {
    const results: ContractTestResult[] = [];

    for (const test of tests) {
      const result = await this.testEndpoint(test.path, test.method, test.options);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate test summary
   */
  generateSummary(results: ContractTestResult[]): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    failures: ContractTestResult[];
  } {
    const failed = results.filter(r => !r.valid);

    return {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      passRate: ((results.length - failed.length) / results.length) * 100,
      failures: failed,
    };
  }
}
