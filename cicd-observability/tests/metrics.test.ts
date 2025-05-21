import { MetricsService } from '../src/metrics/metrics';

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    });
  });

  test('should create a metrics service', () => {
    expect(metricsService).toBeDefined();
  });

  test('should create a counter', () => {
    const counter = metricsService.createCounter({
      name: 'test_counter',
      help: 'Test counter',
      labelNames: ['label1', 'label2']
    });

    expect(counter).toBeDefined();
  });

  test('should increment a counter', () => {
    const counter = metricsService.createCounter({
      name: 'test_counter',
      help: 'Test counter',
      labelNames: ['label1', 'label2']
    });

    counter.inc();
    counter.inc(2);
    counter.inc({ label1: 'value1', label2: 'value2' });
    counter.inc({ label1: 'value1', label2: 'value2' }, 2);

    // Get metrics and check counter values
    const metrics = metricsService.getMetrics();
    expect(metrics).toContain('test_counter');
  });

  test('should create a gauge', () => {
    const gauge = metricsService.createGauge({
      name: 'test_gauge',
      help: 'Test gauge',
      labelNames: ['label1', 'label2']
    });

    expect(gauge).toBeDefined();
  });

  test('should set a gauge value', () => {
    const gauge = metricsService.createGauge({
      name: 'test_gauge',
      help: 'Test gauge',
      labelNames: ['label1', 'label2']
    });

    gauge.set(10);
    gauge.set({ label1: 'value1', label2: 'value2' }, 20);

    // Get metrics and check gauge values
    const metrics = metricsService.getMetrics();
    expect(metrics).toContain('test_gauge');
  });

  test('should create a histogram', () => {
    const histogram = metricsService.createHistogram({
      name: 'test_histogram',
      help: 'Test histogram',
      labelNames: ['label1', 'label2'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    expect(histogram).toBeDefined();
  });

  test('should observe a histogram value', () => {
    const histogram = metricsService.createHistogram({
      name: 'test_histogram',
      help: 'Test histogram',
      labelNames: ['label1', 'label2'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    histogram.observe(0.5);
    histogram.observe({ label1: 'value1', label2: 'value2' }, 2);

    // Get metrics and check histogram values
    const metrics = metricsService.getMetrics();
    expect(metrics).toContain('test_histogram');
  });

  test('should create a summary', () => {
    const summary = metricsService.createSummary({
      name: 'test_summary',
      help: 'Test summary',
      labelNames: ['label1', 'label2'],
      percentiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999]
    });

    expect(summary).toBeDefined();
  });

  test('should observe a summary value', () => {
    const summary = metricsService.createSummary({
      name: 'test_summary',
      help: 'Test summary',
      labelNames: ['label1', 'label2'],
      percentiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999]
    });

    summary.observe(0.5);
    summary.observe({ label1: 'value1', label2: 'value2' }, 2);

    // Get metrics and check summary values
    const metrics = metricsService.getMetrics();
    expect(metrics).toContain('test_summary');
  });

  test('should track HTTP metrics', async () => {
    // Mock Express request and response
    const req = {
      method: 'GET',
      path: '/test',
      route: { path: '/test' },
      headers: {}
    };
    
    const res = {
      statusCode: 200,
      getHeaders: () => ({}),
      once: (event: string, callback: () => void) => {
        if (event === 'finish') {
          callback();
        }
      }
    };
    
    const next = jest.fn();

    // Use HTTP metrics middleware
    const middleware = metricsService.httpMetricsMiddleware();
    await middleware(req as any, res as any, next);

    // Check that next was called
    expect(next).toHaveBeenCalled();

    // Get metrics and check HTTP metrics
    const metrics = metricsService.getMetrics();
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_request_duration_seconds');
  });

  test('should provide metrics endpoint middleware', async () => {
    // Mock Express request and response
    const req = {};
    
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
    
    const next = jest.fn();

    // Use metrics endpoint middleware
    const middleware = metricsService.metricsMiddleware();
    await middleware(req as any, res as any, next);

    // Check that response was set correctly
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});