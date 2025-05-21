/**
 * Tracing System
 * 
 * This module provides distributed tracing capabilities using OpenTelemetry.
 * It integrates with Jaeger for trace visualization and analysis.
 */

import { Request, Response } from 'express';
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getLogger } from '../logging/logger';

const logger = getLogger();

// Interface for tracer options
interface TracerOptions {
  appName: string;
  environment: string;
  version: string;
  exporter: 'jaeger' | 'otlp' | 'zipkin';
  endpoint?: string;
  instrumentations?: string[];
  samplingRatio?: number;
  exportInterval?: number;
  maxQueueSize?: number;
  exportTimeout?: number;
  metricsPort?: number;
}

// Available instrumentations
enum Instrumentation {
  HTTP = 'http',
  HTTPS = 'https',
  EXPRESS = 'express',
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  POSTGRES = 'pg',
  REDIS = 'redis',
  GRAPHQL = 'graphql',
  AWS_SDK = 'aws-sdk',
  GRPC = 'grpc',
  FETCH = 'fetch'
}

// Class for managing distributed tracing
export class TracingManager {
  private sdk: opentelemetry.NodeSDK | null = null;
  private options: TracerOptions;
  private initialized = false;
  
  constructor(options: TracerOptions) {
    this.options = {
      appName: 'secondbrain',
      environment: 'development',
      version: '1.0.0',
      exporter: 'jaeger',
      instrumentations: Object.values(Instrumentation),
      samplingRatio: 1.0,
      exportInterval: 5000,
      maxQueueSize: 100,
      exportTimeout: 30000,
      ...options
    };
  }
  
  // Initialize the tracing SDK
  public init(): boolean {
    if (this.initialized) {
      logger.warn('Tracing already initialized');
      return false;
    }
    
    try {
      // Create resource attributes
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.options.appName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.options.version,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.options.environment
      });
      
      // Create exporter based on configuration
      const exporter = this.createExporter();
      
      // Select instrumentations
      const instrumentations = this.selectInstrumentations();
      
      // Configure the SDK
      this.sdk = new opentelemetry.NodeSDK({
        resource,
        traceExporter: exporter,
        metricReader: this.createMetricsExporter(),
        textMapPropagator: new W3CTraceContextPropagator(),
        spanProcessor: new SimpleSpanProcessor(exporter),
        instrumentations
      });
      
      // Start the SDK
      this.sdk.start();
      this.initialized = true;
      
      logger.info('Tracing initialized', {
        appName: this.options.appName,
        environment: this.options.environment,
        exporter: this.options.exporter,
        samplingRatio: this.options.samplingRatio,
        instrumentations: this.options.instrumentations
      });
      
      // Register shutdown handler
      this.registerShutdownHandler();
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize tracing', { error });
      return false;
    }
  }
  
  // Create trace exporter based on configuration
  private createExporter() {
    const commonOptions = {
      endpoint: this.options.endpoint,
      headers: {},
    };
    
    switch (this.options.exporter) {
      case 'jaeger':
        return new JaegerExporter({
          ...commonOptions,
          endpoint: this.options.endpoint || 'http://localhost:14268/api/traces',
        });
      
      case 'otlp':
        return new OTLPTraceExporter({
          ...commonOptions,
          url: this.options.endpoint || 'http://localhost:4318/v1/traces',
        });
      
      case 'zipkin':
        return new ZipkinExporter({
          ...commonOptions,
          url: this.options.endpoint || 'http://localhost:9411/api/v2/spans',
        });
      
      default:
        logger.warn(`Unknown exporter: ${this.options.exporter}, falling back to Jaeger`);
        return new JaegerExporter({
          ...commonOptions,
          endpoint: this.options.endpoint || 'http://localhost:14268/api/traces',
        });
    }
  }
  
  // Create metrics exporter
  private createMetricsExporter() {
    return new PrometheusExporter({
      port: this.options.metricsPort || 9464,
      prefix: 'tracing_'
    });
  }
  
  // Select instrumentations based on configuration
  private selectInstrumentations() {
    const instrumentations = getNodeAutoInstrumentations({
      // HTTP/HTTPS
      '@opentelemetry/instrumentation-http': {
        enabled: this.options.instrumentations?.includes(Instrumentation.HTTP) || 
                 this.options.instrumentations?.includes(Instrumentation.HTTPS),
        ignoreIncomingPaths: [
          '/health',
          '/metrics',
          '/favicon.ico'
        ]
      },
      
      // Express
      '@opentelemetry/instrumentation-express': {
        enabled: this.options.instrumentations?.includes(Instrumentation.EXPRESS)
      },
      
      // MongoDB
      '@opentelemetry/instrumentation-mongodb': {
        enabled: this.options.instrumentations?.includes(Instrumentation.MONGODB)
      },
      
      // MySQL
      '@opentelemetry/instrumentation-mysql': {
        enabled: this.options.instrumentations?.includes(Instrumentation.MYSQL)
      },
      
      // PostgreSQL
      '@opentelemetry/instrumentation-pg': {
        enabled: this.options.instrumentations?.includes(Instrumentation.POSTGRES)
      },
      
      // Redis
      '@opentelemetry/instrumentation-redis': {
        enabled: this.options.instrumentations?.includes(Instrumentation.REDIS)
      },
      
      // GraphQL
      '@opentelemetry/instrumentation-graphql': {
        enabled: this.options.instrumentations?.includes(Instrumentation.GRAPHQL)
      },
      
      // AWS SDK
      '@opentelemetry/instrumentation-aws-sdk': {
        enabled: this.options.instrumentations?.includes(Instrumentation.AWS_SDK)
      },
      
      // gRPC
      '@opentelemetry/instrumentation-grpc': {
        enabled: this.options.instrumentations?.includes(Instrumentation.GRPC)
      },
      
      // Fetch
      '@opentelemetry/instrumentation-fetch': {
        enabled: this.options.instrumentations?.includes(Instrumentation.FETCH)
      }
    });
    
    return instrumentations;
  }
  
  // Register shutdown handler
  private registerShutdownHandler(): void {
    if (!this.sdk) {
      return;
    }
    
    const shutdown = async () => {
      logger.info('Shutting down tracing');
      
      try {
        await this.sdk?.shutdown();
        logger.info('Tracing shutdown complete');
      } catch (error) {
        logger.error('Error shutting down tracing', { error });
      } finally {
        process.exit(0);
      }
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
  
  // Shutdown the tracing SDK
  public async shutdown(): Promise<void> {
    if (!this.initialized || !this.sdk) {
      logger.warn('Tracing not initialized, nothing to shut down');
      return;
    }
    
    try {
      await this.sdk.shutdown();
      this.initialized = false;
      logger.info('Tracing shut down successfully');
    } catch (error) {
      logger.error('Error shutting down tracing', { error });
      throw error;
    }
  }
  
  // Express middleware for request tracing
  public requestTracer() {
    return (req: Request, res: Response, next: Function) => {
      // OpenTelemetry instrumentation will automatically create spans
      // This middleware adds custom attributes to the span
      
      // Add request ID to the active span
      const requestId = req.headers['x-request-id'] as string;
      const correlationId = req.headers['x-correlation-id'] as string;
      const userId = (req as any).user?.id;
      
      const span = opentelemetry.trace.getSpan(opentelemetry.context.active());
      
      if (span) {
        // Add custom attributes to the span
        span.setAttribute('request.id', requestId);
        
        if (correlationId) {
          span.setAttribute('request.correlation_id', correlationId);
        }
        
        if (userId) {
          span.setAttribute('request.user_id', userId);
        }
        
        // Add business context if available
        if ((req as any).businessContext) {
          for (const [key, value] of Object.entries((req as any).businessContext)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              span.setAttribute(`business.${key}`, value);
            }
          }
        }
      }
      
      next();
    };
  }
  
  // Create a custom span
  public createSpan(name: string, fn: () => any, attributes?: Record<string, string | number | boolean>): any {
    const tracer = opentelemetry.trace.getTracer(this.options.appName);
    
    return tracer.startActiveSpan(name, async (span) => {
      try {
        // Add attributes to the span
        if (attributes) {
          for (const [key, value] of Object.entries(attributes)) {
            span.setAttribute(key, value);
          }
        }
        
        // Execute the function
        const result = await fn();
        
        // End the span
        span.end();
        
        return result;
      } catch (error) {
        // Record error and end the span
        span.recordException(error as Error);
        span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
        span.end();
        
        throw error;
      }
    });
  }
  
  // Create a child span
  public createChildSpan(name: string, parentSpan: any, fn: () => any, attributes?: Record<string, string | number | boolean>): any {
    const tracer = opentelemetry.trace.getTracer(this.options.appName);
    const ctx = opentelemetry.trace.setSpan(opentelemetry.context.active(), parentSpan);
    
    return tracer.startActiveSpan(name, {}, ctx, async (span) => {
      try {
        // Add attributes to the span
        if (attributes) {
          for (const [key, value] of Object.entries(attributes)) {
            span.setAttribute(key, value);
          }
        }
        
        // Execute the function
        const result = await fn();
        
        // End the span
        span.end();
        
        return result;
      } catch (error) {
        // Record error and end the span
        span.recordException(error as Error);
        span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
        span.end();
        
        throw error;
      }
    });
  }
}

// Create a singleton tracing manager
let defaultTracingManager: TracingManager | null = null;

// Get or create the default tracing manager
export function getTracingManager(options?: Partial<TracerOptions>): TracingManager {
  if (!defaultTracingManager) {
    const defaultOptions: TracerOptions = {
      appName: process.env.APP_NAME || 'secondbrain',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      exporter: (process.env.TRACING_EXPORTER || 'jaeger') as 'jaeger' | 'otlp' | 'zipkin',
      endpoint: process.env.TRACING_ENDPOINT,
      samplingRatio: parseFloat(process.env.TRACING_SAMPLING_RATIO || '1.0'),
      ...options
    };
    
    defaultTracingManager = new TracingManager(defaultOptions);
  }
  
  return defaultTracingManager;
}