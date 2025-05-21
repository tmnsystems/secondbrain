/**
 * Core Timeline implementation for managing deployment sequences
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TimelineInterface,
  TimelineItem,
  TimelineItemStatus,
  StageInterface,
  MilestoneInterface,
  DependencyType,
  Dependency,
  NotificationConfig
} from './types';

/**
 * Core Timeline class that manages a deployment sequence
 */
export class Timeline implements TimelineInterface {
  id: string;
  name: string;
  description?: string;
  status: TimelineItemStatus;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  stages: StageInterface[];
  milestones: MilestoneInterface[];
  notifications?: NotificationConfig[];
  metadata?: Record<string, any>;
  private eventListeners: Record<string, Function[]> = {};

  /**
   * Creates a new Timeline
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    version = '1.0.0',
    createdBy,
    metadata = {}
  }: {
    id?: string;
    name: string;
    description?: string;
    version?: string;
    createdBy?: string;
    metadata?: Record<string, any>;
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.status = TimelineItemStatus.PENDING;
    this.version = version;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.createdBy = createdBy;
    this.stages = [];
    this.milestones = [];
    this.notifications = [];
    this.metadata = metadata;
  }

  /**
   * Add a stage to the timeline
   */
  addStage(stage: StageInterface): Timeline {
    this.stages.push(stage);
    this.updatedAt = new Date();
    this.emit('stage_added', { timeline: this, stage });
    return this;
  }

  /**
   * Add a milestone to the timeline
   */
  addMilestone(milestone: MilestoneInterface): Timeline {
    this.milestones.push(milestone);
    this.updatedAt = new Date();
    this.emit('milestone_added', { timeline: this, milestone });
    return this;
  }

  /**
   * Add a notification configuration to the timeline
   */
  addNotification(notification: NotificationConfig): Timeline {
    if (!this.notifications) {
      this.notifications = [];
    }
    this.notifications.push(notification);
    return this;
  }

  /**
   * Get a timeline item (stage or milestone) by ID
   */
  getItemById(id: string): TimelineItem | null {
    // Check stages first
    const stage = this.stages.find(s => s.id === id);
    if (stage) return stage;

    // Check milestones next
    const milestone = this.milestones.find(m => m.id === id);
    if (milestone) return milestone;

    return null;
  }

  /**
   * Get all stages that are currently active (in progress)
   */
  getActiveStages(): StageInterface[] {
    return this.stages.filter(stage => stage.status === TimelineItemStatus.IN_PROGRESS);
  }

  /**
   * Get all stages that are pending (not started)
   */
  getPendingStages(): StageInterface[] {
    return this.stages.filter(stage => stage.status === TimelineItemStatus.PENDING);
  }

  /**
   * Get all stages that are completed
   */
  getCompletedStages(): StageInterface[] {
    return this.stages.filter(stage => stage.status === TimelineItemStatus.COMPLETED);
  }

  /**
   * Get all upcoming milestones that haven't been reached yet
   */
  getUpcomingMilestones(): MilestoneInterface[] {
    return this.milestones.filter(
      milestone => milestone.status !== TimelineItemStatus.COMPLETED && 
                  milestone.status !== TimelineItemStatus.CANCELLED
    );
  }

  /**
   * Start the timeline
   */
  start(): Timeline {
    if (this.status === TimelineItemStatus.PENDING) {
      this.status = TimelineItemStatus.IN_PROGRESS;
      this.updatedAt = new Date();
      this.emit('timeline_started', { timeline: this });
    }
    return this;
  }

  /**
   * Complete the timeline
   */
  complete(): Timeline {
    if (this.status === TimelineItemStatus.IN_PROGRESS) {
      this.status = TimelineItemStatus.COMPLETED;
      this.updatedAt = new Date();
      this.emit('timeline_completed', { timeline: this });
    }
    return this;
  }

  /**
   * Check if a timeline item can start based on its dependencies
   */
  canItemStart(id: string): boolean {
    const item = this.getItemById(id);
    if (!item) return false;

    // If no dependencies, the item can start
    if (!item.dependencies || item.dependencies.length === 0) {
      return true;
    }

    // Check each dependency
    for (const dependency of item.dependencies) {
      const dependsOn = this.getItemById(dependency.dependsOnId);
      
      // If dependent item doesn't exist, log warning and continue
      if (!dependsOn) {
        console.warn(`Dependency ${dependency.dependsOnId} not found for item ${id}`);
        continue;
      }

      // Check based on dependency type
      switch (dependency.type) {
        case DependencyType.FINISH_TO_START:
          if (dependsOn.status !== TimelineItemStatus.COMPLETED) {
            return false;
          }
          break;
        
        case DependencyType.START_TO_START:
          if (dependsOn.status !== TimelineItemStatus.IN_PROGRESS && 
              dependsOn.status !== TimelineItemStatus.COMPLETED) {
            return false;
          }
          break;
        
        case DependencyType.FINISH_TO_FINISH:
          // This only matters when finishing, not when starting
          break;
        
        case DependencyType.START_TO_FINISH:
          // This only matters when finishing, not when starting
          break;
      }
    }

    return true;
  }

  /**
   * Get all dependencies for a timeline item
   */
  getItemDependencies(id: string): (TimelineItem & { dependencyType: DependencyType })[] {
    const item = this.getItemById(id);
    if (!item || !item.dependencies) {
      return [];
    }

    return item.dependencies.map(dep => {
      const dependsOn = this.getItemById(dep.dependsOnId);
      if (!dependsOn) {
        return null;
      }
      return { 
        ...dependsOn, 
        dependencyType: dep.type 
      };
    }).filter(Boolean) as (TimelineItem & { dependencyType: DependencyType })[];
  }

  /**
   * Get all items that depend on a given item
   */
  getItemDependents(id: string): (TimelineItem & { dependencyType: DependencyType })[] {
    const dependents: (TimelineItem & { dependencyType: DependencyType })[] = [];

    // Check all stages
    for (const stage of this.stages) {
      if (stage.dependencies) {
        for (const dep of stage.dependencies) {
          if (dep.dependsOnId === id) {
            dependents.push({ ...stage, dependencyType: dep.type });
          }
        }
      }
    }

    // Check all milestones
    for (const milestone of this.milestones) {
      if (milestone.dependencies) {
        for (const dep of milestone.dependencies) {
          if (dep.dependsOnId === id) {
            dependents.push({ ...milestone, dependencyType: dep.type });
          }
        }
      }
    }

    return dependents;
  }

  /**
   * Check if a stage can be completed based on its dependencies
   */
  canItemComplete(id: string): boolean {
    const item = this.getItemById(id);
    if (!item) return false;

    // Get items that this item depends on
    const dependencies = this.getItemDependencies(id);
    
    // Check for FINISH_TO_FINISH dependencies
    for (const dep of dependencies) {
      if (dep.dependencyType === DependencyType.FINISH_TO_FINISH && 
          dep.status !== TimelineItemStatus.COMPLETED) {
        return false;
      }
    }

    // Check for START_TO_FINISH dependencies
    for (const dep of dependencies) {
      if (dep.dependencyType === DependencyType.START_TO_FINISH && 
          dep.status !== TimelineItemStatus.IN_PROGRESS && 
          dep.status !== TimelineItemStatus.COMPLETED) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add a dependency between two timeline items
   */
  addDependency(
    itemId: string, 
    dependsOnId: string, 
    type: DependencyType = DependencyType.FINISH_TO_START, 
    isBlocker: boolean = true
  ): Timeline {
    const item = this.getItemById(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    const dependsOn = this.getItemById(dependsOnId);
    if (!dependsOn) {
      throw new Error(`Dependency item ${dependsOnId} not found`);
    }

    // Initialize dependencies array if it doesn't exist
    if (!item.dependencies) {
      item.dependencies = [];
    }

    // Add the dependency
    const dependency: Dependency = {
      dependsOnId,
      type,
      isBlocker
    };

    item.dependencies.push(dependency);
    this.updatedAt = new Date();
    this.emit('dependency_added', { 
      timeline: this, 
      itemId, 
      dependsOnId, 
      type, 
      isBlocker 
    });

    return this;
  }

  /**
   * Remove a dependency between two timeline items
   */
  removeDependency(itemId: string, dependsOnId: string): boolean {
    const item = this.getItemById(itemId);
    if (!item || !item.dependencies) {
      return false;
    }

    const initialLength = item.dependencies.length;
    item.dependencies = item.dependencies.filter(d => d.dependsOnId !== dependsOnId);
    
    const removed = item.dependencies.length < initialLength;
    if (removed) {
      this.updatedAt = new Date();
      this.emit('dependency_removed', { timeline: this, itemId, dependsOnId });
    }
    
    return removed;
  }

  /**
   * Calculate the overall progress percentage of the timeline
   * This is a simple implementation that can be overridden by a more 
   * sophisticated progress tracker
   */
  calculateProgress(): number {
    if (this.stages.length === 0) {
      return 0;
    }

    if (this.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }

    // Count completed stages
    const completedStages = this.getCompletedStages().length;
    const totalStages = this.stages.length;
    
    // Calculate percentage
    return Math.round((completedStages / totalStages) * 100);
  }

  /**
   * Subscribe to timeline events
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Unsubscribe from timeline events
   */
  off(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      return;
    }
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event
   */
  private emit(event: string, data: any): void {
    if (!this.eventListeners[event]) {
      return;
    }
    for (const callback of this.eventListeners[event]) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Convert the timeline to a JSON object
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      version: this.version,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      createdBy: this.createdBy,
      stages: this.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
        status: stage.status,
        priority: stage.priority,
        plannedStartDate: stage.plannedStartDate?.toISOString(),
        plannedEndDate: stage.plannedEndDate?.toISOString(),
        actualStartDate: stage.actualStartDate?.toISOString(),
        actualEndDate: stage.actualEndDate?.toISOString(),
        owner: stage.owner,
        dependencies: stage.dependencies,
        metadata: stage.metadata,
        tasks: stage.tasks,
        resources: stage.resources,
        metrics: stage.metrics,
        featureFlags: stage.featureFlags,
        abTests: stage.abTests
      })),
      milestones: this.milestones.map(milestone => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        status: milestone.status,
        priority: milestone.priority,
        plannedStartDate: milestone.plannedStartDate?.toISOString(),
        plannedEndDate: milestone.plannedEndDate?.toISOString(),
        actualStartDate: milestone.actualStartDate?.toISOString(),
        actualEndDate: milestone.actualEndDate?.toISOString(),
        owner: milestone.owner,
        dependencies: milestone.dependencies,
        metadata: milestone.metadata
      })),
      notifications: this.notifications,
      metadata: this.metadata
    };
  }

  /**
   * Create a Timeline from a JSON object
   */
  static fromJSON(json: any, stageFactory: any, milestoneFactory: any): Timeline {
    const timeline = new Timeline({
      id: json.id,
      name: json.name,
      description: json.description,
      version: json.version,
      createdBy: json.createdBy,
      metadata: json.metadata
    });

    timeline.status = json.status;
    timeline.createdAt = new Date(json.createdAt);
    timeline.updatedAt = new Date(json.updatedAt);
    timeline.notifications = json.notifications;

    // Reconstruct stages
    if (json.stages && Array.isArray(json.stages)) {
      for (const stageJson of json.stages) {
        const stage = stageFactory.fromJSON(stageJson);
        timeline.stages.push(stage);
      }
    }

    // Reconstruct milestones
    if (json.milestones && Array.isArray(json.milestones)) {
      for (const milestoneJson of json.milestones) {
        const milestone = milestoneFactory.fromJSON(milestoneJson);
        timeline.milestones.push(milestone);
      }
    }

    return timeline;
  }
}