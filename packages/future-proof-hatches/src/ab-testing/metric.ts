import { Metric, MetricType, MetricEventData } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Implementation of a metric for A/B testing experiments
 */
export class MetricImpl implements Metric {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  isCumulative: boolean;
  isCounter: boolean;
  unit?: string;
  private _events: Map<string, MetricEventData[]>;

  /**
   * Creates a new metric
   * 
   * @param name The name of the metric
   * @param description The description of the metric
   * @param type The type of metric
   * @param options Additional options for the metric
   */
  constructor(
    name: string,
    description: string,
    type: MetricType,
    options: {
      isCumulative?: boolean;
      isCounter?: boolean;
      id?: string;
      unit?: string;
    } = {}
  ) {
    this.id = options.id || uuidv4();
    this.name = name;
    this.description = description;
    this.type = type;
    this.isCumulative = options.isCumulative ?? false;
    this.isCounter = options.isCounter ?? type === MetricType.COUNTER;
    this.unit = options.unit;
    this._events = new Map<string, MetricEventData[]>();
  }

  /**
   * Records a value for this metric for a specific user
   * 
   * @param userId The ID of the user
   * @param value The value to record
   * @param context Additional context for the event
   * @returns The recorded event data
   */
  record(userId: string, value: number, context: Record<string, any> = {}): MetricEventData {
    const timestamp = new Date();
    const event: MetricEventData = {
      metricId: this.id,
      userId,
      value,
      timestamp,
      context,
    };

    if (!this._events.has(userId)) {
      this._events.set(userId, []);
    }
    this._events.get(userId)!.push(event);
    
    return event;
  }

  /**
   * Gets all recorded events for a specific user
   * 
   * @param userId The ID of the user
   * @returns All recorded events for the user
   */
  getEventsForUser(userId: string): MetricEventData[] {
    return this._events.get(userId) || [];
  }

  /**
   * Gets all recorded events for this metric
   * 
   * @returns All recorded events
   */
  getAllEvents(): MetricEventData[] {
    const allEvents: MetricEventData[] = [];
    for (const events of this._events.values()) {
      allEvents.push(...events);
    }
    return allEvents;
  }

  /**
   * Gets the total value for a specific user
   * 
   * @param userId The ID of the user
   * @returns The total value for the user
   */
  getTotalForUser(userId: string): number {
    const events = this.getEventsForUser(userId);
    if (events.length === 0) return 0;
    
    if (this.isCumulative) {
      // For cumulative metrics, return the latest value
      return events[events.length - 1].value;
    } else {
      // For non-cumulative metrics, sum all values
      return events.reduce((sum, event) => sum + event.value, 0);
    }
  }

  /**
   * Gets the average value for a specific user
   * 
   * @param userId The ID of the user
   * @returns The average value for the user
   */
  getAverageForUser(userId: string): number {
    const events = this.getEventsForUser(userId);
    if (events.length === 0) return 0;
    
    const total = events.reduce((sum, event) => sum + event.value, 0);
    return total / events.length;
  }

  /**
   * Creates a counter metric
   * 
   * @param name The name of the metric
   * @param description The description of the metric
   * @returns A new counter metric
   */
  static createCounter(name: string, description: string): MetricImpl {
    return new MetricImpl(name, description, MetricType.COUNTER, {
      isCounter: true,
      isCumulative: true
    });
  }

  /**
   * Creates a gauge metric
   * 
   * @param name The name of the metric
   * @param description The description of the metric
   * @param unit The unit of measurement
   * @returns A new gauge metric
   */
  static createGauge(name: string, description: string, unit?: string): MetricImpl {
    return new MetricImpl(name, description, MetricType.GAUGE, {
      isCounter: false,
      isCumulative: false,
      unit
    });
  }

  /**
   * Creates a timer metric
   * 
   * @param name The name of the metric
   * @param description The description of the metric
   * @returns A new timer metric
   */
  static createTimer(name: string, description: string): MetricImpl {
    return new MetricImpl(name, description, MetricType.TIMER, {
      isCounter: false,
      isCumulative: false,
      unit: 'ms'
    });
  }

  /**
   * Creates a conversion metric
   * 
   * @param name The name of the metric
   * @param description The description of the metric
   * @returns A new conversion metric
   */
  static createConversion(name: string, description: string): MetricImpl {
    return new MetricImpl(name, description, MetricType.CONVERSION, {
      isCounter: true,
      isCumulative: false
    });
  }

  /**
   * Creates a revenue metric
   * 
   * @param name The name of the metric
   * @param description The description of the metric
   * @param currencyUnit The currency unit
   * @returns A new revenue metric
   */
  static createRevenue(name: string, description: string, currencyUnit: string = 'USD'): MetricImpl {
    return new MetricImpl(name, description, MetricType.REVENUE, {
      isCounter: false,
      isCumulative: true,
      unit: currencyUnit
    });
  }
}