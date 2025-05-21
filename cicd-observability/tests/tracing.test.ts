import { TracingService } from '../src/tracing/tracer';
import { context } from '@opentelemetry/api';

describe('TracingService', () => {
  let tracingService: TracingService;

  beforeEach(() => {
    tracingService = new TracingService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      enabled: true,
      endpoint: 'http://localhost:4317'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create a tracing service', () => {
    expect(tracingService).toBeDefined();
  });

  test('should get a tracer', () => {
    const tracer = tracingService.getTracer();
    expect(tracer).toBeDefined();
  });

  test('should create a span', () => {
    const tracer = tracingService.getTracer();
    const span = tracer.startSpan('test-span');
    
    expect(span).toBeDefined();
    
    // Add attributes to span
    span.setAttribute('key1', 'value1');
    span.setAttribute('key2', 123);
    
    // Add events to span
    span.addEvent('test-event', { key: 'value' });
    
    // End the span
    span.end();
  });

  test('should create a child span', () => {
    const tracer = tracingService.getTracer();
    
    const parentSpan = tracer.startSpan('parent-span');
    
    // Create context with parent span
    const ctx = context.active();
    
    const childSpan = tracer.startSpan('child-span', {}, ctx);
    
    expect(childSpan).toBeDefined();
    
    // End the spans
    childSpan.end();
    parentSpan.end();
  });

  test('should use span for a scoped operation', () => {
    const tracer = tracingService.getTracer();
    
    // Use withSpan to create a span for a scoped operation
    const result = tracer.startActiveSpan('scoped-span', async (span) => {
      // Do some work
      const result = 'test-result';
      
      // Add attributes to span
      span.setAttribute('result', result);
      
      // End the span
      span.end();
      
      return result;
    });
    
    expect(result).toBeDefined();
  });

  test('should provide Express middleware', () => {
    const middleware = tracingService.expressMiddleware();
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
});