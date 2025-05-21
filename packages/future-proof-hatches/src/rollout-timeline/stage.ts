/**
 * Stage Class
 * @module rollout-timeline/stage
 * @description Manages individual deployment stages within a timeline
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Stage as StageInterface, 
  TimelineItemStatus, 
  TimelineItemType,
  PriorityLevel,
  Task,
  FeatureFlagConfig,
  Resource,
  MetricConfig,
  Dependency
} from './types';

/**
 * Represents a deployment stage in a timeline
 */
export class Stage implements StageInterface {
  id: string;
  name: string;
  description?: string;
  status: TimelineItemStatus;
  priority: PriorityLevel;
  type: TimelineItemType.STAGE;
  plannedStart: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  owner?: string;
  metadata?: Record<string, any>;
  dependencies?: Dependency[];
  notifications?: any[];
  subStages?: Stage[];
  progress: number;
  featureFlags?: FeatureFlagConfig[];
  rollbackProcedure?: string;
  resources?: Resource[];
  tasks?: Task[];
  metrics?: MetricConfig[];

  /**
   * Create a new stage
   * @param name Stage name
   * @param plannedStart Planned start date
   * @param options Additional options
   */
  constructor(
    name: string,
    plannedStart: Date,
    options: {
      id?: string;
      description?: string;
      priority?: PriorityLevel;
      plannedEnd?: Date;
      owner?: string;
      metadata?: Record<string, any>;
      rollbackProcedure?: string;
    } = {}
  ) {
    this.id = options.id || uuidv4();
    this.name = name;
    this.description = options.description;
    this.status = TimelineItemStatus.PENDING;
    this.priority = options.priority || PriorityLevel.MEDIUM;
    this.type = TimelineItemType.STAGE;
    this.plannedStart = plannedStart;
    this.plannedEnd = options.plannedEnd;
    this.owner = options.owner;
    this.metadata = options.metadata || {};
    this.progress = 0;
    this.rollbackProcedure = options.rollbackProcedure;
    this.subStages = [];
    this.tasks = [];
    this.resources = [];
    this.featureFlags = [];
    this.metrics = [];
  }

  /**
   * Start the stage
   * @returns This stage instance
   */
  start(): Stage {
    if (this.status !== TimelineItemStatus.PENDING && 
        this.status !== TimelineItemStatus.PAUSED) {
      throw new Error(`Cannot start stage in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.IN_PROGRESS;
    this.actualStart = new Date();
    return this;
  }

  /**
   * Complete the stage
   * @returns This stage instance
   */
  complete(): Stage {
    if (this.status !== TimelineItemStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete stage in ${this.status} status`);
    }
    
    // Check if all tasks are completed
    const allTasksCompleted = !this.tasks || 
                              this.tasks.length === 0 ||
                              this.tasks.every(task => task.completed);
    
    if (!allTasksCompleted) {
      throw new Error('Cannot complete stage with unfinished tasks');
    }
    
    this.status = TimelineItemStatus.COMPLETED;
    this.actualEnd = new Date();
    this.progress = 100;
    return this;
  }

  /**
   * Add a sub-stage to this stage
   * @param subStage The sub-stage to add
   * @returns The added sub-stage
   */
  addSubStage(subStage: Stage): Stage {
    if (!this.subStages) {
      this.subStages = [];
    }
    
    this.subStages.push(subStage);
    return subStage;
  }

  /**
   * Add a task to this stage
   * @param description Task description
   * @param options Additional options
   * @returns The added task
   */
  addTask(
    description: string,
    options: {
      id?: string;
      completed?: boolean;
      assignee?: string;
      estimatedHours?: number;
    } = {}
  ): Task {
    const task: Task = {
      id: options.id || uuidv4(),
      description,
      completed: options.completed || false,
      assignee: options.assignee,
      estimatedHours: options.estimatedHours
    };
    
    if (!this.tasks) {
      this.tasks = [];
    }
    
    this.tasks.push(task);
    return task;
  }

  /**
   * Add a resource requirement to this stage
   * @param name Resource name
   * @param type Resource type
   * @param options Additional options
   * @returns The added resource
   */
  addResource(
    name: string,
    type: string,
    options: {
      available?: boolean;
      quantity?: number;
    } = {}
  ): Resource {
    const resource: Resource = {
      name,
      type,
      available: options.available !== undefined ? options.available : false,
      quantity: options.quantity
    };
    
    if (!this.resources) {
      this.resources = [];
    }
    
    this.resources.push(resource);
    return resource;
  }

  /**
   * Add a feature flag configuration to this stage
   * @param name Feature flag name
   * @param enabled Whether the flag should be enabled
   * @param options Additional options
   * @returns The added feature flag configuration
   */
  addFeatureFlag(
    name: string,
    enabled: boolean,
    options: {
      percentage?: number;
      segments?: string[];
    } = {}
  ): FeatureFlagConfig {
    const featureFlag: FeatureFlagConfig = {
      name,
      enabled,
      percentage: options.percentage,
      segments: options.segments
    };
    
    if (!this.featureFlags) {
      this.featureFlags = [];
    }
    
    this.featureFlags.push(featureFlag);
    return featureFlag;
  }

  /**
   * Add a metric to track during this stage
   * @param name Metric name
   * @param query Query to calculate the metric
   * @param options Additional options
   * @returns The added metric
   */
  addMetric(
    name: string,
    query: string,
    options: {
      description?: string;
      threshold?: number;
      currentValue?: number;
    } = {}
  ): MetricConfig {
    const metric: MetricConfig = {
      name,
      query,
      description: options.description,
      threshold: options.threshold,
      currentValue: options.currentValue,
      withinThreshold: options.threshold !== undefined && 
                       options.currentValue !== undefined ? 
                       options.currentValue <= options.threshold : 
                       undefined
    };
    
    if (!this.metrics) {
      this.metrics = [];
    }
    
    this.metrics.push(metric);
    return metric;
  }

  /**
   * Complete a task by ID
   * @param taskId Task ID
   * @returns Success boolean
   */
  completeTask(taskId: string): boolean {
    if (!this.tasks) return false;
    
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    task.completed = true;
    this.updateProgress();
    return true;
  }

  /**
   * Mark a resource as available
   * @param resourceName Resource name
   * @returns Success boolean
   */
  markResourceAvailable(resourceName: string): boolean {
    if (!this.resources) return false;
    
    const resource = this.resources.find(r => r.name === resourceName);
    if (!resource) return false;
    
    resource.available = true;
    return true;
  }

  /**
   * Update a metric value
   * @param metricName Metric name
   * @param value New value
   * @returns Success boolean
   */
  updateMetricValue(metricName: string, value: number): boolean {
    if (!this.metrics) return false;
    
    const metric = this.metrics.find(m => m.name === metricName);
    if (!metric) return false;
    
    metric.currentValue = value;
    
    if (metric.threshold !== undefined) {
      metric.withinThreshold = value <= metric.threshold;
    }
    
    return true;
  }

  /**
   * Update the progress of this stage
   * @param progressValue Optional explicit progress value (0-100)
   * @returns The updated progress value
   */
  updateProgress(progressValue?: number): number {
    if (progressValue !== undefined) {
      if (progressValue < 0 || progressValue > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      
      this.progress = progressValue;
      return this.progress;
    }
    
    // Calculate progress based on completed tasks
    if (this.tasks && this.tasks.length > 0) {
      const completedTasks = this.tasks.filter(task => task.completed).length;
      this.progress = Math.round((completedTasks / this.tasks.length) * 100);
    }
    
    // If there are sub-stages, include their progress as well
    if (this.subStages && this.subStages.length > 0) {
      const subStageProgress = this.subStages.reduce(
        (acc, stage) => acc + stage.progress, 
        0
      ) / this.subStages.length;
      
      // Weight tasks and sub-stages equally
      if (this.tasks && this.tasks.length > 0) {
        this.progress = Math.round((this.progress + subStageProgress) / 2);
      } else {
        this.progress = Math.round(subStageProgress);
      }
    }
    
    return this.progress;
  }

  /**
   * Pause the stage
   * @returns This stage instance
   */
  pause(): Stage {
    if (this.status !== TimelineItemStatus.IN_PROGRESS) {
      throw new Error(`Cannot pause stage in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.PAUSED;
    return this;
  }

  /**
   * Mark the stage as failed
   * @param reason Optional reason for failure
   * @returns This stage instance
   */
  fail(reason?: string): Stage {
    if (this.status === TimelineItemStatus.COMPLETED || 
        this.status === TimelineItemStatus.CANCELLED) {
      throw new Error(`Cannot fail stage in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.FAILED;
    this.actualEnd = new Date();
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        failureReason: reason
      };
    }
    
    return this;
  }

  /**
   * Cancel the stage
   * @param reason Optional reason for cancellation
   * @returns This stage instance
   */
  cancel(reason?: string): Stage {
    if (this.status === TimelineItemStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed stage');
    }
    
    this.status = TimelineItemStatus.CANCELLED;
    this.actualEnd = new Date();
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        cancellationReason: reason
      };
    }
    
    return this;
  }

  /**
   * Delay the stage
   * @param newPlannedStart New planned start date
   * @param reason Optional reason for delay
   * @returns This stage instance
   */
  delay(newPlannedStart: Date, reason?: string): Stage {
    if (this.status !== TimelineItemStatus.PENDING) {
      throw new Error(`Cannot delay stage in ${this.status} status`);
    }
    
    if (newPlannedStart.getTime() <= this.plannedStart.getTime()) {
      throw new Error('New planned start date must be after the current one');
    }
    
    this.status = TimelineItemStatus.DELAYED;
    const oldPlannedStart = this.plannedStart;
    this.plannedStart = newPlannedStart;
    
    // Adjust planned end if it exists
    if (this.plannedEnd) {
      const duration = this.plannedEnd.getTime() - oldPlannedStart.getTime();
      this.plannedEnd = new Date(newPlannedStart.getTime() + duration);
    }
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        delayReason: reason,
        originalPlannedStart: oldPlannedStart
      };
    }
    
    return this;
  }

  /**
   * Check if all resources are available
   * @returns Boolean indicating if all resources are available
   */
  areResourcesAvailable(): boolean {
    if (!this.resources || this.resources.length === 0) return true;
    
    return this.resources.every(resource => resource.available);
  }

  /**
   * Check if all metrics are within thresholds
   * @returns Boolean indicating if all metrics are within thresholds
   */
  areMetricsWithinThresholds(): boolean {
    if (!this.metrics || this.metrics.length === 0) return true;
    
    // Only check metrics that have both threshold and current value
    const metricsWithThresholds = this.metrics.filter(
      metric => metric.threshold !== undefined && metric.currentValue !== undefined
    );
    
    if (metricsWithThresholds.length === 0) return true;
    
    return metricsWithThresholds.every(metric => metric.withinThreshold);
  }

  /**
   * Check if the stage is ready to start
   * @param areDependenciesSatisfied Function to check if dependencies are satisfied
   * @returns Boolean indicating if the stage is ready to start
   */
  isReadyToStart(areDependenciesSatisfied: () => boolean): boolean {
    return this.status === TimelineItemStatus.PENDING &&
           this.areResourcesAvailable() &&
           areDependenciesSatisfied();
  }

  /**
   * Create a Stage instance from a plain object
   * @param data Plain object data
   * @returns A new Stage instance
   */
  static fromObject(data: Record<string, any>): Stage {
    const stage = new Stage(
      data.name,
      new Date(data.plannedStart),
      {
        id: data.id,
        description: data.description,
        priority: data.priority,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : undefined,
        owner: data.owner,
        metadata: data.metadata,
        rollbackProcedure: data.rollbackProcedure
      }
    );
    
    stage.status = data.status;
    stage.progress = data.progress || 0;
    
    if (data.actualStart) {
      stage.actualStart = new Date(data.actualStart);
    }
    
    if (data.actualEnd) {
      stage.actualEnd = new Date(data.actualEnd);
    }
    
    // Load dependencies
    if (Array.isArray(data.dependencies)) {
      stage.dependencies = data.dependencies;
    }
    
    // Load notifications
    if (Array.isArray(data.notifications)) {
      stage.notifications = data.notifications;
    }
    
    // Load tasks
    if (Array.isArray(data.tasks)) {
      stage.tasks = data.tasks;
    }
    
    // Load resources
    if (Array.isArray(data.resources)) {
      stage.resources = data.resources;
    }
    
    // Load metrics
    if (Array.isArray(data.metrics)) {
      stage.metrics = data.metrics;
    }
    
    // Load feature flags
    if (Array.isArray(data.featureFlags)) {
      stage.featureFlags = data.featureFlags;
    }
    
    // Recursively load sub-stages
    if (Array.isArray(data.subStages)) {
      stage.subStages = data.subStages.map(subStageData => 
        Stage.fromObject(subStageData)
      );
    }
    
    return stage;
  }
}