import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export class TracingService {
  private provider: NodeTracerProvider;

  constructor(serviceName: string) {
    // Create provider
    this.provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env['SERVICE_VERSION'] || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env['NODE_ENV'] || 'development',
      }),
    });

    // Configure exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env['JAEGER_ENDPOINT'] || 'http://localhost:14268/api/traces',
    });

    // Add span processor
    this.provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          requestHook: (span, request) => {
            const body = (request as any).body;
            if (body) {
              span.setAttribute('http.request.body', JSON.stringify(body));
            }
          },
          responseHook: (span, response) => {
            const headers = (response as any).headers;
            if (headers && headers['content-length']) {
              span.setAttribute('http.response.size', headers['content-length']);
            }
          },
        }),
        new ExpressInstrumentation({
          requestHook: (span, info) => {
            span.setAttribute('express.route', info.route);
            span.setAttribute('express.params', JSON.stringify(info.request.params));
          },
        }),
        new MongoDBInstrumentation({
          enhancedDatabaseReporting: true,
        }),
      ],
    });

    // Register provider
    this.provider.register();
  }

  // Get tracer
  getTracer(name?: string) {
    return trace.getTracer(name || 'default');
  }

  // Create custom span
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
    },
  ): Promise<T> {
    const tracer = this.getTracer();
    const span = tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    });

    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Trace database operations
  async traceDatabase<T>(operation: string, collection: string, fn: () => Promise<T>): Promise<T> {
    return this.withSpan(`db.${operation}`, fn, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.operation': operation,
        'db.collection': collection,
        'db.system': 'mongodb',
      },
    });
  }

  // Trace external API calls
  async traceExternalCall<T>(service: string, operation: string, fn: () => Promise<T>): Promise<T> {
    return this.withSpan(`external.${service}.${operation}`, fn, {
      kind: SpanKind.CLIENT,
      attributes: {
        'external.service': service,
        'external.operation': operation,
      },
    });
  }

  // Shutdown tracing
  async shutdown() {
    await this.provider.shutdown();
  }
}

// Helper function to extract trace context from headers
export function extractTraceContext(headers: Record<string, string>) {
  return {
    traceId: headers['x-trace-id'],
    spanId: headers['x-span-id'],
    traceFlags: headers['x-trace-flags'],
  };
}

// Helper function to inject trace context into headers
export function injectTraceContext(span: any): Record<string, string> {
  const spanContext = span.spanContext();
  return {
    'x-trace-id': spanContext.traceId,
    'x-span-id': spanContext.spanId,
    'x-trace-flags': spanContext.traceFlags.toString(),
  };
}
