/**
 * Implementation of a deployment stage in a timeline
 */

import { v4 as uuidv4 } from 'uuid';
import {
  StageInterface,
  TimelineItemStatus,
  TimelineItemPriority,
  Dependency,
  Task,
  Resource,
  Metric
} from './types';

/**
 * Represents a deployment stage in a timeline
 */
export class Stage implements StageInterface {
  id: string;
  name: string;
  description?: string;
  status: TimelineItemStatus;
  priority?: TimelineItemPriority;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  owner?: string;
  dependencies?: Dependency[];
  metadata?: Record<string, any>;
  tasks: Task[];
  resources: Resource[];
  metrics: Metric[];
  featureFlags?: Record<string, boolean | string>;
  abTests?: string[];

  /**
   * Creates a new Stage
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    priority = TimelineItemPriority.MEDIUM,
    plannedStartDate,
    plannedEndDate,
    owner,
    metadata = {}
  }: {
    id?: string;
    name: string;
    description?: string;
    priority?: TimelineItemPriority;
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    owner?: string;
    metadata?: Record<string, any>;
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.status = TimelineItemStatus.PENDING;
    this.priority = priority;
    this.plannedStartDate = plannedStartDate;
    this.plannedEndDate = plannedEndDate;
    this.owner = owner;
    this.metadata = metadata;
    this.tasks = [];
    this.resources = [];
    this.metrics = [];
    this.dependencies = [];
    this.featureFlags = {};
    this.abTests = [];
  }

  /**
   * Start the stage
   */
  start(actualDate: Date = new Date()): Stage {
    if (this.status === TimelineItemStatus.PENDING || 
        this.status === TimelineItemStatus.WAITING || 
        this.status === TimelineItemStatus.PAUSED) {
      this.status = TimelineItemStatus.IN_PROGRESS;
      this.actualStartDate = actualDate;
    }
    return this;
  }

  /**
   * Complete the stage
   */
  complete(actualDate: Date = new Date()): Stage {
    if (this.status === TimelineItemStatus.IN_PROGRESS) {
      // Check if all tasks are completed
      const allTasksCompleted = this.tasks.every(task => task.completed);
      
      if (!allTasksCompleted) {
        throw new Error(`Cannot complete stage ${this.name} - not all tasks are completed`);
      }

      this.status = TimelineItemStatus.COMPLETED;
      this.actualEndDate = actualDate;
    }
    return this;
  }

  /**
   * Fail the stage
   */
  fail(reason?: string): Stage {
    if (this.status === TimelineItemStatus.IN_PROGRESS) {
      this.status = TimelineItemStatus.FAILED;
      
      if (reason) {
        this.metadata = {
          ...this.metadata,
          failureReason: reason
        };
      }
    }
    return this;
  }

  /**
   * Pause the stage
   */
  pause(reason?: string): Stage {
    if (this.status === TimelineItemStatus.IN_PROGRESS) {
      this.status = TimelineItemStatus.PAUSED;
      
      if (reason) {
        this.metadata = {
          ...this.metadata,
          pauseReason: reason
        };
      }
    }
    return this;
  }

  /**
   * Resume the stage from a paused state
   */
  resume(): Stage {
    if (this.status === TimelineItemStatus.PAUSED) {
      this.status = TimelineItemStatus.IN_PROGRESS;
    }
    return this;
  }

  /**
   * Delay the stage to a new planned date
   */
  delay(newPlannedEndDate: Date, reason?: string): Stage {
    this.status = TimelineItemStatus.DELAYED;
    this.plannedEndDate = newPlannedEndDate;
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        delayReason: reason
      };
    }
    
    return this;
  }

  /**
   * Cancel the stage
   */
  cancel(reason?: string): Stage {
    this.status = TimelineItemStatus.CANCELLED;
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        cancellationReason: reason
      };
    }
    
    return this;
  }

  /**
   * Add a task to this stage
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
    
    this.tasks.push(task);
    return task;
  }

  /**
   * Remove a task from this stage
   */
  removeTask(taskId: string): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    return this.tasks.length < initialLength;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, actualHours?: number): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (!task) {
      return false;
    }
    
    task.completed = true;
    
    if (actualHours !== undefined) {
      task.actualHours = actualHours;
    }
    
    return true;
  }

  /**
   * Add a resource allocation to this stage
   */
  addResource(
    name: string,
    role: string,
    allocationPercentage: number
  ): Resource {
    if (allocationPercentage < 0 || allocationPercentage > 100) {
      throw new Error('Allocation percentage must be between 0 and 100');
    }
    
    const resource: Resource = {
      id: uuidv4(),
      name,
      role,
      allocationPercentage
    };
    
    this.resources.push(resource);
    return resource;
  }

  /**
   * Remove a resource from this stage
   */
  removeResource(resourceId: string): boolean {
    const initialLength = this.resources.length;
    this.resources = this.resources.filter(resource => resource.id !== resourceId);
    return this.resources.length < initialLength;
  }

  /**
   * Add a metric to track for this stage
   */
  addMetric(
    name: string,
    description?: string,
    target?: number,
    unit?: string
  ): Metric {
    const metric: Metric = {
      id: uuidv4(),
      name,
      description,
      target,
      unit
    };
    
    this.metrics.push(metric);
    return metric;
  }

  /**
   * Update a metric's value
   */
  updateMetric(id: string, value: number): boolean {
    const metric = this.metrics.find(metric => metric.id === id);
    if (!metric) {
      return false;
    }
    
    metric.value = value;
    return true;
  }

  /**
   * Get task completion percentage
   */
  getTaskCompletionPercentage(): number {
    if (this.tasks.length === 0) {
      return 0;
    }
    
    const completedTasks = this.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / this.tasks.length) * 100);
  }

  /**
   * Add a feature flag configuration for this stage
   */
  addFeatureFlag(flagName: string, value: boolean | string): Stage {
    if (!this.featureFlags) {
      this.featureFlags = {};
    }
    
    this.featureFlags[flagName] = value;
    return this;
  }

  /**
   * Remove a feature flag configuration
   */
  removeFeatureFlag(flagName: string): boolean {
    if (!this.featureFlags || !(flagName in this.featureFlags)) {
      return false;
    }
    
    delete this.featureFlags[flagName];
    return true;
  }

  /**
   * Add an A/B test for this stage
   */
  addABTest(testId: string): Stage {
    if (!this.abTests) {
      this.abTests = [];
    }
    
    if (!this.abTests.includes(testId)) {
      this.abTests.push(testId);
    }
    
    return this;
  }

  /**
   * Remove an A/B test
   */
  removeABTest(testId: string): boolean {
    if (!this.abTests || !this.abTests.includes(testId)) {
      return false;
    }
    
    this.abTests = this.abTests.filter(id => id !== testId);
    return true;
  }

  /**
   * Check if all tasks are completed
   */
  areAllTasksCompleted(): boolean {
    if (this.tasks.length === 0) {
      return true;
    }
    
    return this.tasks.every(task => task.completed);
  }

  /**
   * Create a Stage from a JSON object
   */
  static fromJSON(json: any): Stage {
    const stage = new Stage({
      id: json.id,
      name: json.name,
      description: json.description,
      priority: json.priority,
      plannedStartDate: json.plannedStartDate ? new Date(json.plannedStartDate) : undefined,
      plannedEndDate: json.plannedEndDate ? new Date(json.plannedEndDate) : undefined,
      owner: json.owner,
      metadata: json.metadata
    });

    stage.status = json.status;
    stage.actualStartDate = json.actualStartDate ? new Date(json.actualStartDate) : undefined;
    stage.actualEndDate = json.actualEndDate ? new Date(json.actualEndDate) : undefined;
    stage.dependencies = json.dependencies || [];
    stage.tasks = json.tasks || [];
    stage.resources = json.resources || [];
    stage.metrics = json.metrics || [];
    stage.featureFlags = json.featureFlags || {};
    stage.abTests = json.abTests || [];

    return stage;
  }
}