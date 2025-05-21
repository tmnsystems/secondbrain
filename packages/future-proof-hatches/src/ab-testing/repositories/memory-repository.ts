import { 
  ExperimentRepository, 
  Experiment, 
  ExperimentStatus, 
  Variant,
  MetricEventData,
  UserAssignment
} from '../types';

/**
 * An in-memory implementation of the ExperimentRepository
 */
export class InMemoryExperimentRepository implements ExperimentRepository {
  private experiments: Map<string, Experiment>;
  private metricEvents: Map<string, MetricEventData[]>;
  private userAssignments: Map<string, UserAssignment[]>;

  constructor() {
    this.experiments = new Map<string, Experiment>();
    this.metricEvents = new Map<string, MetricEventData[]>();
    this.userAssignments = new Map<string, UserAssignment[]>();
  }

  async createExperiment(experiment: Experiment): Promise<Experiment> {
    this.experiments.set(experiment.id, {...experiment});
    return experiment;
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    return this.experiments.get(id) || null;
  }

  async updateExperiment(experiment: Experiment): Promise<Experiment> {
    this.experiments.set(experiment.id, {...experiment});
    return experiment;
  }

  async deleteExperiment(id: string): Promise<boolean> {
    return this.experiments.delete(id);
  }

  async listExperiments(filter?: { status?: ExperimentStatus }): Promise<Experiment[]> {
    const experiments = Array.from(this.experiments.values());
    
    if (filter?.status) {
      return experiments.filter(exp => exp.status === filter.status);
    }
    
    return experiments;
  }

  async recordMetricEvent(event: MetricEventData): Promise<void> {
    if (!this.metricEvents.has(event.metricId)) {
      this.metricEvents.set(event.metricId, []);
    }
    this.metricEvents.get(event.metricId)!.push({...event});
  }

  async getMetricEvents(metricId: string): Promise<MetricEventData[]> {
    return this.metricEvents.get(metricId) || [];
  }

  async getMetricEventsForUser(metricId: string, userId: string): Promise<MetricEventData[]> {
    const events = this.metricEvents.get(metricId) || [];
    return events.filter(event => event.userId === userId);
  }

  async recordUserAssignment(assignment: UserAssignment): Promise<void> {
    if (!this.userAssignments.has(assignment.experimentId)) {
      this.userAssignments.set(assignment.experimentId, []);
    }
    
    // Remove any existing assignment for this user in this experiment
    const assignments = this.userAssignments.get(assignment.experimentId)!;
    const index = assignments.findIndex(a => a.userId === assignment.userId);
    if (index !== -1) {
      assignments.splice(index, 1);
    }
    
    assignments.push({...assignment});
  }

  async getUserAssignment(experimentId: string, userId: string): Promise<UserAssignment | null> {
    const assignments = this.userAssignments.get(experimentId) || [];
    return assignments.find(a => a.userId === userId) || null;
  }

  async getUserAssignments(userId: string): Promise<UserAssignment[]> {
    const assignments: UserAssignment[] = [];
    
    for (const experimentAssignments of this.userAssignments.values()) {
      const userAssignments = experimentAssignments.filter(a => a.userId === userId);
      assignments.push(...userAssignments);
    }
    
    return assignments;
  }

  async getExperimentAssignments(experimentId: string): Promise<UserAssignment[]> {
    return this.userAssignments.get(experimentId) || [];
  }

  async getVariantAssignments(experimentId: string, variantId: string): Promise<UserAssignment[]> {
    const assignments = this.userAssignments.get(experimentId) || [];
    return assignments.filter(a => a.variantId === variantId);
  }
}