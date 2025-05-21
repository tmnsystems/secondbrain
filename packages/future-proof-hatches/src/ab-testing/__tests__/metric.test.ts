import { MetricImpl } from '../metric';
import { MetricType } from '../types';

describe('Metric class', () => {
  test('should create a valid metric', () => {
    const metric = new MetricImpl(
      'Test Metric',
      'A test metric',
      MetricType.COUNTER,
      { isCumulative: true }
    );
    
    expect(metric.id).toBeDefined();
    expect(metric.name).toBe('Test Metric');
    expect(metric.description).toBe('A test metric');
    expect(metric.type).toBe(MetricType.COUNTER);
    expect(metric.isCumulative).toBe(true);
    expect(metric.isCounter).toBe(true);
  });
  
  test('should record metric events', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER);
    
    const event1 = metric.record('user1', 5, { source: 'test' });
    const event2 = metric.record('user1', 10);
    const event3 = metric.record('user2', 7);
    
    expect(event1.metricId).toBe(metric.id);
    expect(event1.userId).toBe('user1');
    expect(event1.value).toBe(5);
    expect(event1.context.source).toBe('test');
    
    expect(event2.userId).toBe('user1');
    expect(event2.value).toBe(10);
    
    expect(event3.userId).toBe('user2');
    expect(event3.value).toBe(7);
  });
  
  test('should get events for a user', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER);
    
    metric.record('user1', 5);
    metric.record('user1', 10);
    metric.record('user2', 7);
    
    const user1Events = metric.getEventsForUser('user1');
    const user2Events = metric.getEventsForUser('user2');
    const user3Events = metric.getEventsForUser('user3');
    
    expect(user1Events).toHaveLength(2);
    expect(user2Events).toHaveLength(1);
    expect(user3Events).toHaveLength(0);
    
    expect(user1Events[0].value).toBe(5);
    expect(user1Events[1].value).toBe(10);
    expect(user2Events[0].value).toBe(7);
  });
  
  test('should get all events', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER);
    
    metric.record('user1', 5);
    metric.record('user2', 7);
    metric.record('user3', 10);
    
    const allEvents = metric.getAllEvents();
    
    expect(allEvents).toHaveLength(3);
  });
  
  test('should calculate total for a user with non-cumulative metric', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER, { isCumulative: false });
    
    metric.record('user1', 5);
    metric.record('user1', 10);
    metric.record('user1', 7);
    
    const total = metric.getTotalForUser('user1');
    
    expect(total).toBe(22); // Sum of all values
  });
  
  test('should calculate total for a user with cumulative metric', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER, { isCumulative: true });
    
    metric.record('user1', 5);
    metric.record('user1', 10);
    metric.record('user1', 7);
    
    const total = metric.getTotalForUser('user1');
    
    expect(total).toBe(7); // Most recent value
  });
  
  test('should calculate average for a user', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER);
    
    metric.record('user1', 5);
    metric.record('user1', 10);
    metric.record('user1', 15);
    
    const average = metric.getAverageForUser('user1');
    
    expect(average).toBe(10); // (5 + 10 + 15) / 3
  });
  
  test('should return 0 for users with no events', () => {
    const metric = new MetricImpl('Test Metric', 'A test metric', MetricType.COUNTER);
    
    const total = metric.getTotalForUser('user1');
    const average = metric.getAverageForUser('user1');
    
    expect(total).toBe(0);
    expect(average).toBe(0);
  });
  
  test('should create counter metric', () => {
    const metric = MetricImpl.createCounter('Counter Metric', 'A counter metric');
    
    expect(metric.type).toBe(MetricType.COUNTER);
    expect(metric.isCounter).toBe(true);
    expect(metric.isCumulative).toBe(true);
  });
  
  test('should create gauge metric', () => {
    const metric = MetricImpl.createGauge('Gauge Metric', 'A gauge metric', 'units');
    
    expect(metric.type).toBe(MetricType.GAUGE);
    expect(metric.isCounter).toBe(false);
    expect(metric.isCumulative).toBe(false);
    expect(metric.unit).toBe('units');
  });
  
  test('should create timer metric', () => {
    const metric = MetricImpl.createTimer('Timer Metric', 'A timer metric');
    
    expect(metric.type).toBe(MetricType.TIMER);
    expect(metric.isCounter).toBe(false);
    expect(metric.isCumulative).toBe(false);
    expect(metric.unit).toBe('ms');
  });
  
  test('should create conversion metric', () => {
    const metric = MetricImpl.createConversion('Conversion Metric', 'A conversion metric');
    
    expect(metric.type).toBe(MetricType.CONVERSION);
    expect(metric.isCounter).toBe(true);
    expect(metric.isCumulative).toBe(false);
  });
  
  test('should create revenue metric', () => {
    const metric = MetricImpl.createRevenue('Revenue Metric', 'A revenue metric', 'EUR');
    
    expect(metric.type).toBe(MetricType.REVENUE);
    expect(metric.isCounter).toBe(false);
    expect(metric.isCumulative).toBe(true);
    expect(metric.unit).toBe('EUR');
  });
});