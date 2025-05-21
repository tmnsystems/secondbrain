/**
 * Metrics System
 * 
 * This module provides utilities for collecting, aggregating, and exporting
 * metrics to monitoring systems such as Prometheus.
 */

import { Request, Response } from 'express';
import client from 'prom-client';
import { getLogger } from '../logging/logger';

const logger = getLogger();

// Interface for metrics options
interface MetricsOptions {
  appName: string;
  environment: string;
  prefix?: string;
  defaultLabels?: Record<string, string>;
  collectDefaultMetrics?: boolean;
  defaultMetricsInterval?: number;
}

// Interface for metric registry
interface MetricRegistry {
  counters: Map<string, client.Counter<string>>;
  gauges: Map<string, client.Gauge<string>>;
  histograms: Map<string, client.Histogram<string>>;
  summaries: Map<string, client.Summary<string>>;
}

// Class for managing metrics collection
export class MetricsManager {
  private registry: client.Registry;
  private metrics: MetricRegistry;
  private options: MetricsOptions;
  
  constructor(options: MetricsOptions) {
    this.options = {
      appName: 'secondbrain',
      environment: 'development',
      prefix: 'app_',
      defaultLabels: {},
      collectDefaultMetrics: true,
      defaultMetricsInterval: 10000,
      ...options
    };
    
    // Create a new registry
    this.registry = new client.Registry();
    
    // Set default labels
    this.registry.setDefaultLabels({
      app: this.options.appName,
      environment: this.options.environment,
      ...this.options.defaultLabels
    });
    
    // Initialize metric collections
    this.metrics = {
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
      summaries: new Map()
    };
    
    // Collect default metrics if enabled
    if (this.options.collectDefaultMetrics) {
      client.collectDefaultMetrics({
        register: this.registry,
        prefix: this.options.prefix,
        interval: this.options.defaultMetricsInterval
      });
      
      logger.info('Default metrics collection started', {
        prefix: this.options.prefix,
        interval: this.options.defaultMetricsInterval
      });
    }
    
    // Register HTTP metrics
    this.registerHttpMetrics();
  }
  
  // Register common HTTP metrics
  private registerHttpMetrics(): void {
    // HTTP request counter
    this.createCounter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status']
    });
    
    // HTTP request duration histogram
    this.createHistogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    });
    
    // HTTP response size histogram
    this.createHistogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });
    
    logger.info('HTTP metrics registered');
  }
  
  // Create a new counter
  public createCounter(options: client.CounterConfiguration<string>): client.Counter<string> {
    const name = this.getMetricName(options.name);
    
    if (this.metrics.counters.has(name)) {
      return this.metrics.counters.get(name)!;
    }
    
    const counter = new client.Counter({
      ...options,
      name,
      registers: [this.registry]
    });
    
    this.metrics.counters.set(name, counter);
    logger.debug(`Counter created: ${name}`);
    
    return counter;
  }
  
  // Create a new gauge
  public createGauge(options: client.GaugeConfiguration<string>): client.Gauge<string> {
    const name = this.getMetricName(options.name);
    
    if (this.metrics.gauges.has(name)) {
      return this.metrics.gauges.get(name)!;
    }
    
    const gauge = new client.Gauge({
      ...options,
      name,
      registers: [this.registry]
    });
    
    this.metrics.gauges.set(name, gauge);
    logger.debug(`Gauge created: ${name}`);
    
    return gauge;
  }
  
  // Create a new histogram
  public createHistogram(options: client.HistogramConfiguration<string>): client.Histogram<string> {
    const name = this.getMetricName(options.name);
    
    if (this.metrics.histograms.has(name)) {
      return this.metrics.histograms.get(name)!;
    }
    
    const histogram = new client.Histogram({
      ...options,
      name,
      registers: [this.registry]
    });
    
    this.metrics.histograms.set(name, histogram);
    logger.debug(`Histogram created: ${name}`);
    
    return histogram;
  }
  
  // Create a new summary
  public createSummary(options: client.SummaryConfiguration<string>): client.Summary<string> {
    const name = this.getMetricName(options.name);
    
    if (this.metrics.summaries.has(name)) {
      return this.metrics.summaries.get(name)!;
    }
    
    const summary = new client.Summary({
      ...options,
      name,
      registers: [this.registry]
    });
    
    this.metrics.summaries.set(name, summary);
    logger.debug(`Summary created: ${name}`);
    
    return summary;
  }
  
  // Get a counter by name
  public getCounter(name: string): client.Counter<string> | undefined {
    return this.metrics.counters.get(this.getMetricName(name));
  }
  
  // Get a gauge by name
  public getGauge(name: string): client.Gauge<string> | undefined {
    return this.metrics.gauges.get(this.getMetricName(name));
  }
  
  // Get a histogram by name
  public getHistogram(name: string): client.Histogram<string> | undefined {
    return this.metrics.histograms.get(this.getMetricName(name));
  }
  
  // Get a summary by name
  public getSummary(name: string): client.Summary<string> | undefined {
    return this.metrics.summaries.get(this.getMetricName(name));
  }
  
  // Increment a counter
  public incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const counter = this.getCounter(name);
    
    if (counter) {
      if (labels) {
        counter.inc(labels, value);
      } else {
        counter.inc(value);
      }
    } else {
      logger.warn(`Counter not found: ${name}`);
    }
  }
  
  // Set a gauge value
  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.getGauge(name);
    
    if (gauge) {
      if (labels) {
        gauge.set(labels, value);
      } else {
        gauge.set(value);
      }
    } else {
      logger.warn(`Gauge not found: ${name}`);
    }
  }
  
  // Observe a histogram value
  public observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.getHistogram(name);
    
    if (histogram) {
      if (labels) {
        histogram.observe(labels, value);
      } else {
        histogram.observe(value);
      }
    } else {
      logger.warn(`Histogram not found: ${name}`);
    }
  }
  
  // Observe a summary value
  public observeSummary(name: string, value: number, labels?: Record<string, string>): void {
    const summary = this.getSummary(name);
    
    if (summary) {
      if (labels) {
        summary.observe(labels, value);
      } else {
        summary.observe(value);
      }
    } else {
      logger.warn(`Summary not found: ${name}`);
    }
  }
  
  // Get metric name with prefix
  private getMetricName(name: string): string {
    return this.options.prefix ? `${this.options.prefix}${name}` : name;
  }
  
  // Get metrics in Prometheus format
  public getMetrics(): string {
    return this.registry.metrics();
  }
  
  // Express middleware for collecting HTTP metrics
  public httpMetricsMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = Date.now();
      const requestSize = parseInt(req.headers['content-length'] || '0', 10);
      
      // Record request size
      this.observeHistogram('http_request_size_bytes', requestSize, {
        method: req.method,
        route: this.getRoutePattern(req),
      });
      
      // Track response size and duration
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const responseTime = (Date.now() - startTime) / 1000; // Convert to seconds
        const responseSize = parseInt(res.getHeader('content-length') as string || '0', 10);
        const statusCode = res.statusCode.toString();
        const labels = {
          method: req.method,
          route: this.getRoutePattern(req),
          status: statusCode
        };
        
        // Increment request counter
        this.incrementCounter('http_requests_total', labels);
        
        // Record response time
        this.observeHistogram('http_request_duration_seconds', responseTime, labels);
        
        // Record response size
        this.observeHistogram('http_response_size_bytes', responseSize, labels);
        
        return originalEnd.apply(res, args);
      }.bind(this);
      
      next();
    };
  }
  
  // Express metrics endpoint middleware
  public metricsEndpoint() {
    return (_req: Request, res: Response) => {
      res.set('Content-Type', this.registry.contentType);
      res.end(this.getMetrics());
    };
  }
  
  // Get route pattern from request
  private getRoutePattern(req: Request): string {
    // For Express routes
    if (req.route && req.route.path) {
      const baseRoute = req.baseUrl || '';
      return `${baseRoute}${req.route.path}`;
    }
    
    // For parameterized routes, try to use the matched route pattern
    if (req.path && req.params && Object.keys(req.params).length > 0) {
      let route = req.path;
      
      // Replace parameters with their placeholder names
      for (const [paramName, paramValue] of Object.entries(req.params)) {
        route = route.replace(paramValue as string, `:${paramName}`);
      }
      
      return route;
    }
    
    // Fallback to the request path
    return req.path || req.url || 'unknown';
  }
  
  // Clear all metrics
  public clearMetrics(): void {
    this.registry.clear();
    
    this.metrics.counters.clear();
    this.metrics.gauges.clear();
    this.metrics.histograms.clear();
    this.metrics.summaries.clear();
    
    // Re-register default metrics
    if (this.options.collectDefaultMetrics) {
      client.collectDefaultMetrics({
        register: this.registry,
        prefix: this.options.prefix,
        interval: this.options.defaultMetricsInterval
      });
    }
    
    // Re-register HTTP metrics
    this.registerHttpMetrics();
    
    logger.info('Metrics cleared and re-initialized');
  }
  
  // Reset a specific counter
  public resetCounter(name: string): void {
    const counter = this.getCounter(name);
    
    if (counter) {
      counter.reset();
      logger.debug(`Counter reset: ${name}`);
    } else {
      logger.warn(`Counter not found: ${name}`);
    }
  }
  
  // Reset a specific gauge
  public resetGauge(name: string): void {
    const gauge = this.getGauge(name);
    
    if (gauge) {
      gauge.reset();
      logger.debug(`Gauge reset: ${name}`);
    } else {
      logger.warn(`Gauge not found: ${name}`);
    }
  }
}

// Create a singleton metrics manager
let defaultMetricsManager: MetricsManager | null = null;

// Get or create the default metrics manager
export function getMetricsManager(options?: Partial<MetricsOptions>): MetricsManager {
  if (!defaultMetricsManager) {
    const defaultOptions: MetricsOptions = {
      appName: process.env.APP_NAME || 'secondbrain',
      environment: process.env.NODE_ENV || 'development',
      prefix: process.env.METRICS_PREFIX || 'app_',
      collectDefaultMetrics: true,
      ...options
    };
    
    defaultMetricsManager = new MetricsManager(defaultOptions);
  }
  
  return defaultMetricsManager;
}