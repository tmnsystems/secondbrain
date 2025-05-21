/**
 * Observability Integration
 * 
 * This module provides a unified interface for observability tools including
 * logging, metrics, and tracing. It also includes integration with Express
 * for automatic request instrumentation.
 */

import { Express } from 'express';
import { getLogger, Logger } from '../logging/logger';
import { getMetricsManager, MetricsManager } from '../metrics/metrics';
import { getTracingManager, TracingManager } from '../tracing/tracer';

// Interface for observability options
interface ObservabilityOptions {
  appName: string;
  environment: string;
  version: string;
  logging?: {
    level: string;
    enableConsole?: boolean;
    enableFile?: boolean;
    logDirectory?: string;
    enableJson?: boolean;
    redactFields?: string[];
  };
  metrics?: {
    prefix?: string;
    collectDefaultMetrics?: boolean;
    defaultMetricsInterval?: number;
    metricsEndpoint?: string;
  };
  tracing?: {
    exporter?: 'jaeger' | 'otlp' | 'zipkin';
    endpoint?: string;
    instrumentations?: string[];
    samplingRatio?: number;
  };
}

// Class for managing observability tools
export class Observability {
  private logger: Logger;
  private metricsManager: MetricsManager;
  private tracingManager: TracingManager;
  private options: ObservabilityOptions;
  
  constructor(options: ObservabilityOptions) {
    this.options = {
      appName: 'secondbrain',
      environment: 'development',
      version: '1.0.0',
      ...options
    };
    
    // Initialize logger
    this.logger = getLogger({
      appName: this.options.appName,
      environment: this.options.environment,
      level: this.options.logging?.level || 'info',
      enableConsole: this.options.logging?.enableConsole,
      enableFile: this.options.logging?.enableFile,
      logDirectory: this.options.logging?.logDirectory,
      enableJson: this.options.logging?.enableJson,
      redactFields: this.options.logging?.redactFields
    });
    
    // Initialize metrics manager
    this.metricsManager = getMetricsManager({
      appName: this.options.appName,
      environment: this.options.environment,
      prefix: this.options.metrics?.prefix,
      collectDefaultMetrics: this.options.metrics?.collectDefaultMetrics,
      defaultMetricsInterval: this.options.metrics?.defaultMetricsInterval
    });
    
    // Initialize tracing manager
    this.tracingManager = getTracingManager({
      appName: this.options.appName,
      environment: this.options.environment,
      version: this.options.version,
      exporter: this.options.tracing?.exporter || 'jaeger',
      endpoint: this.options.tracing?.endpoint,
      instrumentations: this.options.tracing?.instrumentations,
      samplingRatio: this.options.tracing?.samplingRatio
    });
  }
  
  // Initialize all observability tools
  public init(): void {
    // Initialize tracing
    if (!this.tracingManager.init()) {
      this.logger.warn('Failed to initialize tracing');
    }
  }
  
  // Register middleware with an Express app
  public registerMiddleware(app: Express): void {
    const metricsEndpoint = this.options.metrics?.metricsEndpoint || '/metrics';
    
    // Add request logger middleware
    app.use(this.logger.requestLogger());
    
    // Add metrics middleware
    app.use(this.metricsManager.httpMetricsMiddleware());
    
    // Add tracing middleware
    app.use(this.tracingManager.requestTracer());
    
    // Add metrics endpoint
    app.get(metricsEndpoint, this.metricsManager.metricsEndpoint());
    
    // Add health endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    
    this.logger.info('Observability middleware registered', {
      metricsEndpoint
    });
  }
  
  // Create a child logger with additional context
  public childLogger(context: Record<string, any>): Logger {
    return this.logger.child(context);
  }
  
  // Get the logger
  public getLogger(): Logger {
    return this.logger;
  }
  
  // Get the metrics manager
  public getMetricsManager(): MetricsManager {
    return this.metricsManager;
  }
  
  // Get the tracing manager
  public getTracingManager(): TracingManager {
    return this.tracingManager;
  }
  
  // Shut down all observability tools
  public async shutdown(): Promise<void> {
    try {
      await this.tracingManager.shutdown();
      this.logger.info('Observability shutdown complete');
    } catch (error) {
      this.logger.error('Error during observability shutdown', { error });
      throw error;
    }
  }
  
  // Record a business event with logs, metrics, and traces
  public recordEvent(
    eventName: string,
    details: Record<string, any>,
    metrics?: Record<string, number>,
    traceAttributes?: Record<string, string | number | boolean>
  ): void {
    // Log the event
    this.logger.info(`Event: ${eventName}`, details);
    
    // Record metrics
    if (metrics) {
      for (const [metricName, value] of Object.entries(metrics)) {
        const fullMetricName = `event_${metricName}`;
        
        // Create counter if it doesn't exist
        if (!this.metricsManager.getCounter(fullMetricName)) {
          this.metricsManager.createCounter({
            name: fullMetricName,
            help: `Counter for event metric ${metricName}`,
            labelNames: ['event_name']
          });
        }
        
        // Increment counter
        this.metricsManager.incrementCounter(fullMetricName, { event_name: eventName }, value);
      }
    }
    
    // Create span for the event
    this.tracingManager.createSpan(
      `event.${eventName}`,
      () => {
        // No-op function since we're just recording the event
      },
      {
        'event.name': eventName,
        ...traceAttributes
      }
    );
  }
  
  // Record an error with logs, metrics, and traces
  public recordError(
    error: Error,
    context?: Record<string, any>,
    metricName?: string
  ): void {
    // Log the error
    this.logger.logError(error, context);
    
    // Increment error counter
    const errorMetricName = metricName || 'errors_total';
    
    // Create counter if it doesn't exist
    if (!this.metricsManager.getCounter(errorMetricName)) {
      this.metricsManager.createCounter({
        name: errorMetricName,
        help: 'Total number of errors',
        labelNames: ['error_name', 'error_message']
      });
    }
    
    // Increment counter
    this.metricsManager.incrementCounter(errorMetricName, {
      error_name: error.name,
      error_message: error.message
    });
  }
}

// Create a singleton observability instance
let defaultObservability: Observability | null = null;

// Get or create the default observability instance
export function getObservability(options?: ObservabilityOptions): Observability {
  if (!defaultObservability && options) {
    defaultObservability = new Observability(options);
    defaultObservability.init();
  }
  
  if (!defaultObservability) {
    throw new Error('Observability not initialized. Call getObservability with options first.');
  }
  
  return defaultObservability;
}