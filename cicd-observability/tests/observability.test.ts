import { ObservabilityManager } from '../src/observability/observability';
import { Logger } from '../src/logging/logger';
import { MetricsService } from '../src/metrics/metrics';
import { TracingService } from '../src/tracing/tracer';

describe('ObservabilityManager', () => {
  let observabilityManager: ObservabilityManager;
  let logger: Logger;
  let metricsService: MetricsService;
  let tracingService: TracingService;

  beforeEach(() => {
    logger = new Logger({
      service: 'test-service',
      level: 'info',
      transports: ['console']
    });

    metricsService = new MetricsService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    });

    tracingService = new TracingService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      enabled: true,
      endpoint: 'http://localhost:4317'
    });

    observabilityManager = new ObservabilityManager({
      logger,
      metricsService,
      tracingService
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create an observability manager', () => {
    expect(observabilityManager).toBeDefined();
  });

  test('should get logger', () => {
    const loggerInstance = observabilityManager.getLogger();
    expect(loggerInstance).toBe(logger);
  });

  test('should get metrics service', () => {
    const metricsServiceInstance = observabilityManager.getMetricsService();
    expect(metricsServiceInstance).toBe(metricsService);
  });

  test('should get tracing service', () => {
    const tracingServiceInstance = observabilityManager.getTracingService();
    expect(tracingServiceInstance).toBe(tracingService);
  });

  test('should record business event', () => {
    // Mock logger info method
    const loggerInfoSpy = jest.spyOn(logger, 'info');
    
    // Record business event
    observabilityManager.recordBusinessEvent('test-event', {
      key: 'value',
      number: 123
    });
    
    // Check that logger info was called
    expect(loggerInfoSpy).toHaveBeenCalled();
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'Business event: test-event',
      expect.objectContaining({
        event: 'test-event',
        key: 'value',
        number: 123
      })
    );
  });

  test('should record error', () => {
    // Mock logger error method
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    
    // Create an error
    const error = new Error('Test error');
    
    // Record error
    observabilityManager.recordError(error, {
      context: {
        key: 'value'
      }
    });
    
    // Check that logger error was called
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error: Test error',
      expect.objectContaining({
        error,
        context: {
          key: 'value'
        }
      })
    );
  });

  test('should provide Express middleware', () => {
    // Create middleware
    const middleware = observabilityManager.expressMiddleware();
    expect(middleware).toBeDefined();
    
    // Mock Express request and response
    const req = {
      method: 'GET',
      path: '/test',
      headers: {}
    };
    
    const res = {
      statusCode: 200,
      getHeader: jest.fn(),
      setHeader: jest.fn(),
      once: (event: string, callback: () => void) => {
        if (event === 'finish') {
          callback();
        }
      }
    };
    
    const next = jest.fn();
    
    // Call middleware
    middleware(req as any, res as any, next);
    
    // Check that next was called
    expect(next).toHaveBeenCalled();
  });

  test('should create a child observability manager', () => {
    // Create child observability manager
    const childObservabilityManager = observabilityManager.child({
      component: 'child-component'
    });
    
    expect(childObservabilityManager).toBeDefined();
    
    // Get logger from child observability manager
    const childLogger = childObservabilityManager.getLogger();
    expect(childLogger).toBeDefined();
    expect(childLogger).not.toBe(logger);
  });
});