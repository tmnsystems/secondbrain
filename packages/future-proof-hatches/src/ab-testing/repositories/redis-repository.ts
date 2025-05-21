import { 
  ExperimentRepository, 
  Experiment, 
  ExperimentStatus, 
  Variant,
  MetricEventData,
  UserAssignment
} from '../types';
import Redis from 'ioredis';

/**
 * A Redis-based implementation of the ExperimentRepository
 */
export class RedisExperimentRepository implements ExperimentRepository {
  private client: Redis;
  private keyPrefix: string;

  /**
   * Creates a new RedisExperimentRepository
   * 
   * @param options Redis connection options
   * @param keyPrefix Prefix for Redis keys
   */
  constructor(options: Redis.RedisOptions, keyPrefix: string = 'abtest:') {
    this.client = new Redis(options);
    this.keyPrefix = keyPrefix;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }

  private experimentKey(id: string): string {
    return `${this.keyPrefix}experiment:${id}`;
  }

  private metricEventKey(metricId: string): string {
    return `${this.keyPrefix}metric:${metricId}`;
  }

  private userAssignmentKey(experimentId: string): string {
    return `${this.keyPrefix}assignment:${experimentId}`;
  }

  private experimentListKey(): string {
    return `${this.keyPrefix}experiments`;
  }

  private experimentStatusKey(status: ExperimentStatus): string {
    return `${this.keyPrefix}status:${status}`;
  }

  async createExperiment(experiment: Experiment): Promise<Experiment> {
    const key = this.experimentKey(experiment.id);
    const value = JSON.stringify(experiment);
    
    await this.client.set(key, value);
    await this.client.sadd(this.experimentListKey(), experiment.id);
    await this.client.sadd(this.experimentStatusKey(experiment.status), experiment.id);
    
    return experiment;
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    const key = this.experimentKey(id);
    const value = await this.client.get(key);
    
    if (!value) return null;
    
    return JSON.parse(value) as Experiment;
  }

  async updateExperiment(experiment: Experiment): Promise<Experiment> {
    const key = this.experimentKey(experiment.id);
    const oldExperiment = await this.getExperiment(experiment.id);
    
    if (oldExperiment && oldExperiment.status !== experiment.status) {
      // Remove from old status set and add to new status set
      await this.client.srem(this.experimentStatusKey(oldExperiment.status), experiment.id);
      await this.client.sadd(this.experimentStatusKey(experiment.status), experiment.id);
    }
    
    const value = JSON.stringify(experiment);
    await this.client.set(key, value);
    
    return experiment;
  }

  async deleteExperiment(id: string): Promise<boolean> {
    const experiment = await this.getExperiment(id);
    if (!experiment) return false;
    
    const key = this.experimentKey(id);
    await this.client.del(key);
    await this.client.srem(this.experimentListKey(), id);
    await this.client.srem(this.experimentStatusKey(experiment.status), id);
    
    // Clean up related data
    await this.client.del(this.userAssignmentKey(id));
    
    return true;
  }

  async listExperiments(filter?: { status?: ExperimentStatus }): Promise<Experiment[]> {
    let experimentIds: string[];
    
    if (filter?.status) {
      experimentIds = await this.client.smembers(this.experimentStatusKey(filter.status));
    } else {
      experimentIds = await this.client.smembers(this.experimentListKey());
    }
    
    const experiments: Experiment[] = [];
    
    for (const id of experimentIds) {
      const experiment = await this.getExperiment(id);
      if (experiment) experiments.push(experiment);
    }
    
    return experiments;
  }

  async recordMetricEvent(event: MetricEventData): Promise<void> {
    const key = this.metricEventKey(event.metricId);
    const value = JSON.stringify(event);
    
    await this.client.rpush(key, value);
    
    // Set expiration for events if needed
    // await this.client.expire(key, ttlInSeconds);
  }

  async getMetricEvents(metricId: string): Promise<MetricEventData[]> {
    const key = this.metricEventKey(metricId);
    const values = await this.client.lrange(key, 0, -1);
    
    return values.map(value => JSON.parse(value) as MetricEventData);
  }

  async getMetricEventsForUser(metricId: string, userId: string): Promise<MetricEventData[]> {
    const events = await this.getMetricEvents(metricId);
    return events.filter(event => event.userId === userId);
  }

  async recordUserAssignment(assignment: UserAssignment): Promise<void> {
    const key = this.userAssignmentKey(assignment.experimentId);
    const userKey = `${assignment.userId}`;
    const value = JSON.stringify(assignment);
    
    await this.client.hset(key, userKey, value);
  }

  async getUserAssignment(experimentId: string, userId: string): Promise<UserAssignment | null> {
    const key = this.userAssignmentKey(experimentId);
    const value = await this.client.hget(key, userId);
    
    if (!value) return null;
    
    return JSON.parse(value) as UserAssignment;
  }

  async getUserAssignments(userId: string): Promise<UserAssignment[]> {
    const experimentIds = await this.client.smembers(this.experimentListKey());
    const assignments: UserAssignment[] = [];
    
    for (const experimentId of experimentIds) {
      const assignment = await this.getUserAssignment(experimentId, userId);
      if (assignment) assignments.push(assignment);
    }
    
    return assignments;
  }

  async getExperimentAssignments(experimentId: string): Promise<UserAssignment[]> {
    const key = this.userAssignmentKey(experimentId);
    const values = await this.client.hvals(key);
    
    return values.map(value => JSON.parse(value) as UserAssignment);
  }

  async getVariantAssignments(experimentId: string, variantId: string): Promise<UserAssignment[]> {
    const assignments = await this.getExperimentAssignments(experimentId);
    return assignments.filter(a => a.variantId === variantId);
  }
}