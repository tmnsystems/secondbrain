/**
 * Timeline Class
 * @module rollout-timeline/timeline
 * @description Manages deployment sequences with stages and milestones
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Timeline as TimelineInterface, 
  Stage, 
  Milestone, 
  TimelineItem, 
  TimelineItemStatus, 
  TimelineItemType,
  TimelineChangeEvent,
  TimelineEvent,
  TimelineEventListener,
  PriorityLevel,
  Dependency,
  DependencyType
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
  stages: Stage[];
  milestones: Milestone[];
  notifications?: any[];
  metadata?: Record<string, any>;
  
  private eventListeners: Map<TimelineEvent, TimelineEventListener[]> = new Map();

  /**
   * Create a new timeline
   * @param name The name of the timeline
   * @param version The version or release this timeline is for
   * @param options Additional options
   */
  constructor(
    name: string, 
    version: string, 
    options: {
      id?: string;
      description?: string;
      createdBy?: string;
      metadata?: Record<string, any>;
    } = {}
  ) {
    this.id = options.id || uuidv4();
    this.name = name;
    this.description = options.description;
    this.status = TimelineItemStatus.PENDING;
    this.version = version;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.createdBy = options.createdBy;
    this.stages = [];
    this.milestones = [];
    this.metadata = options.metadata || {};
  }

  /**
   * Add a stage to the timeline
   * @param stage The stage to add
   * @returns The added stage
   */
  addStage(stage: Omit<Stage, 'type' | 'id'> & { id?: string }): Stage {
    const newStage: Stage = {
      ...stage,
      id: stage.id || uuidv4(),
      type: TimelineItemType.STAGE,
      progress: stage.progress || 0
    };
    
    this.stages.push(newStage);
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'stage_added', 
      stage: newStage 
    });
    
    return newStage;
  }

  /**
   * Add a milestone to the timeline
   * @param milestone The milestone to add
   * @returns The added milestone
   */
  addMilestone(milestone: Omit<Milestone, 'type' | 'id'> & { id?: string }): Milestone {
    const newMilestone: Milestone = {
      ...milestone,
      id: milestone.id || uuidv4(),
      type: TimelineItemType.MILESTONE
    };
    
    this.milestones.push(newMilestone);
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'milestone_added', 
      milestone: newMilestone 
    });
    
    return newMilestone;
  }

  /**
   * Get all timeline items (stages and milestones) sorted by planned start date
   * @returns Array of timeline items
   */
  getAllItems(): TimelineItem[] {
    const allItems: TimelineItem[] = [
      ...this.stages,
      ...this.milestones
    ];
    
    return allItems.sort((a, b) => 
      a.plannedStart.getTime() - b.plannedStart.getTime()
    );
  }

  /**
   * Get a stage by ID
   * @param id Stage ID
   * @returns The stage or undefined if not found
   */
  getStage(id: string): Stage | undefined {
    return this.stages.find(stage => stage.id === id);
  }

  /**
   * Get a milestone by ID
   * @param id Milestone ID
   * @returns The milestone or undefined if not found
   */
  getMilestone(id: string): Milestone | undefined {
    return this.milestones.find(milestone => milestone.id === id);
  }

  /**
   * Get any timeline item (stage or milestone) by ID
   * @param id Item ID
   * @returns The timeline item or undefined if not found
   */
  getItem(id: string): TimelineItem | undefined {
    return this.getAllItems().find(item => item.id === id);
  }

  /**
   * Update a stage
   * @param id Stage ID
   * @param updates Updates to apply
   * @returns The updated stage
   */
  updateStage(id: string, updates: Partial<Omit<Stage, 'id' | 'type'>>): Stage | undefined {
    const stageIndex = this.stages.findIndex(stage => stage.id === id);
    if (stageIndex === -1) return undefined;
    
    const oldStage = { ...this.stages[stageIndex] };
    
    // Apply updates
    this.stages[stageIndex] = {
      ...this.stages[stageIndex],
      ...updates,
      type: TimelineItemType.STAGE // Ensure type doesn't change
    };
    
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'stage_updated', 
      stage: this.stages[stageIndex],
      previousState: oldStage
    });
    
    // Check if status changed
    this.handleStatusChange(oldStage, this.stages[stageIndex]);
    
    return this.stages[stageIndex];
  }

  /**
   * Update a milestone
   * @param id Milestone ID
   * @param updates Updates to apply
   * @returns The updated milestone
   */
  updateMilestone(id: string, updates: Partial<Omit<Milestone, 'id' | 'type'>>): Milestone | undefined {
    const milestoneIndex = this.milestones.findIndex(milestone => milestone.id === id);
    if (milestoneIndex === -1) return undefined;
    
    const oldMilestone = { ...this.milestones[milestoneIndex] };
    
    // Apply updates
    this.milestones[milestoneIndex] = {
      ...this.milestones[milestoneIndex],
      ...updates,
      type: TimelineItemType.MILESTONE // Ensure type doesn't change
    };
    
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'milestone_updated', 
      milestone: this.milestones[milestoneIndex],
      previousState: oldMilestone
    });
    
    // Check if status changed
    this.handleStatusChange(oldMilestone, this.milestones[milestoneIndex]);
    
    return this.milestones[milestoneIndex];
  }

  /**
   * Remove a stage by ID
   * @param id Stage ID
   * @returns Boolean indicating success
   */
  removeStage(id: string): boolean {
    const stageIndex = this.stages.findIndex(stage => stage.id === id);
    if (stageIndex === -1) return false;
    
    const removedStage = this.stages[stageIndex];
    this.stages.splice(stageIndex, 1);
    
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'stage_removed', 
      stage: removedStage 
    });
    
    return true;
  }

  /**
   * Remove a milestone by ID
   * @param id Milestone ID
   * @returns Boolean indicating success
   */
  removeMilestone(id: string): boolean {
    const milestoneIndex = this.milestones.findIndex(milestone => milestone.id === id);
    if (milestoneIndex === -1) return false;
    
    const removedMilestone = this.milestones[milestoneIndex];
    this.milestones.splice(milestoneIndex, 1);
    
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'milestone_removed', 
      milestone: removedMilestone 
    });
    
    return true;
  }

  /**
   * Start the timeline
   * @returns This timeline instance
   */
  start(): Timeline {
    if (this.status !== TimelineItemStatus.PENDING) {
      throw new Error(`Cannot start timeline in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.IN_PROGRESS;
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.TIMELINE_STARTED, {});
    
    return this;
  }

  /**
   * Complete the timeline
   * @returns This timeline instance
   */
  complete(): Timeline {
    if (this.status !== TimelineItemStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete timeline in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.COMPLETED;
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.TIMELINE_COMPLETED, {});
    
    return this;
  }

  /**
   * Mark the timeline as failed
   * @param reason Optional reason for failure
   * @returns This timeline instance
   */
  fail(reason?: string): Timeline {
    if (this.status === TimelineItemStatus.COMPLETED || 
        this.status === TimelineItemStatus.CANCELLED) {
      throw new Error(`Cannot fail timeline in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.FAILED;
    this.updatedAt = new Date();
    this.emitEvent(TimelineEvent.TIMELINE_FAILED, { reason });
    
    return this;
  }

  /**
   * Start a stage by ID
   * @param id Stage ID
   * @returns The updated stage or undefined if not found
   */
  startStage(id: string): Stage | undefined {
    const stage = this.getStage(id);
    if (!stage) return undefined;
    
    if (stage.status !== TimelineItemStatus.PENDING) {
      throw new Error(`Cannot start stage in ${stage.status} status`);
    }
    
    return this.updateStage(id, {
      status: TimelineItemStatus.IN_PROGRESS,
      actualStart: new Date()
    });
  }

  /**
   * Complete a stage by ID
   * @param id Stage ID
   * @returns The updated stage or undefined if not found
   */
  completeStage(id: string): Stage | undefined {
    const stage = this.getStage(id);
    if (!stage) return undefined;
    
    if (stage.status !== TimelineItemStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete stage in ${stage.status} status`);
    }
    
    return this.updateStage(id, {
      status: TimelineItemStatus.COMPLETED,
      actualEnd: new Date(),
      progress: 100
    });
  }

  /**
   * Mark a stage as failed
   * @param id Stage ID
   * @param reason Optional reason for failure
   * @returns The updated stage or undefined if not found
   */
  failStage(id: string, reason?: string): Stage | undefined {
    const stage = this.getStage(id);
    if (!stage) return undefined;
    
    if (stage.status === TimelineItemStatus.COMPLETED || 
        stage.status === TimelineItemStatus.CANCELLED) {
      throw new Error(`Cannot fail stage in ${stage.status} status`);
    }
    
    return this.updateStage(id, {
      status: TimelineItemStatus.FAILED,
      actualEnd: new Date(),
      metadata: { 
        ...stage.metadata,
        failureReason: reason 
      }
    });
  }

  /**
   * Reach a milestone
   * @param id Milestone ID
   * @returns The updated milestone or undefined if not found
   */
  reachMilestone(id: string): Milestone | undefined {
    const milestone = this.getMilestone(id);
    if (!milestone) return undefined;
    
    if (milestone.status !== TimelineItemStatus.PENDING && 
        milestone.status !== TimelineItemStatus.IN_PROGRESS) {
      throw new Error(`Cannot reach milestone in ${milestone.status} status`);
    }
    
    return this.updateMilestone(id, {
      status: TimelineItemStatus.COMPLETED,
      actualEnd: new Date()
    });
  }

  /**
   * Add a dependency between timeline items
   * @param dependentId ID of the dependent item
   * @param dependsOnId ID of the item being depended on
   * @param type Type of dependency
   * @param options Additional options
   * @returns Success boolean
   */
  addDependency(
    dependentId: string, 
    dependsOnId: string, 
    type: DependencyType = DependencyType.COMPLETION,
    options: {
      condition?: string;
      delay?: number;
    } = {}
  ): boolean {
    // Verify both items exist
    const dependentItem = this.getItem(dependentId);
    const dependsOnItem = this.getItem(dependsOnId);
    
    if (!dependentItem || !dependsOnItem) return false;
    
    // Create dependency object
    const dependency: Dependency = {
      dependsOn: dependsOnId,
      type,
      satisfied: false,
      condition: options.condition,
      delay: options.delay
    };
    
    // Add dependency to the dependent item
    if (!dependentItem.dependencies) {
      dependentItem.dependencies = [];
    }
    
    dependentItem.dependencies.push(dependency);
    this.updatedAt = new Date();
    
    this.emitEvent(TimelineEvent.CUSTOM, { 
      action: 'dependency_added',
      dependentItem,
      dependency
    });
    
    return true;
  }

  /**
   * Check if all dependencies for an item are satisfied
   * @param itemId ID of the item to check
   * @returns Boolean indicating if all dependencies are satisfied
   */
  areDependenciesSatisfied(itemId: string): boolean {
    const item = this.getItem(itemId);
    if (!item || !item.dependencies || item.dependencies.length === 0) return true;
    
    return item.dependencies.every(dependency => {
      const dependsOn = this.getItem(dependency.dependsOn);
      if (!dependsOn) return false;
      
      switch (dependency.type) {
        case DependencyType.COMPLETION:
          return dependsOn.status === TimelineItemStatus.COMPLETED;
        
        case DependencyType.START:
          return dependsOn.status === TimelineItemStatus.IN_PROGRESS || 
                 dependsOn.status === TimelineItemStatus.COMPLETED;
        
        case DependencyType.PARALLEL:
          // Can proceed in parallel, but dependsOn must at least be started
          return dependsOn.status === TimelineItemStatus.IN_PROGRESS || 
                 dependsOn.status === TimelineItemStatus.COMPLETED;
        
        case DependencyType.OPTIONAL:
          // Optional dependencies don't block progress
          return true;
        
        default:
          return false;
      }
    });
  }

  /**
   * Update progress for a stage
   * @param id Stage ID
   * @param progress Progress percentage (0-100)
   * @returns The updated stage or undefined if not found
   */
  updateStageProgress(id: string, progress: number): Stage | undefined {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    return this.updateStage(id, { progress });
  }

  /**
   * Get a list of items that can be started (all dependencies satisfied)
   * @returns Array of timeline items that can be started
   */
  getReadyToStartItems(): TimelineItem[] {
    return this.getAllItems().filter(item => 
      item.status === TimelineItemStatus.PENDING &&
      this.areDependenciesSatisfied(item.id)
    );
  }

  /**
   * Calculate the overall progress of the timeline
   * @returns Progress percentage (0-100)
   */
  calculateOverallProgress(): number {
    if (this.stages.length === 0) return 0;
    
    // Calculate weighted progress based on stage priority
    const weights = {
      [PriorityLevel.CRITICAL]: 4,
      [PriorityLevel.HIGH]: 3,
      [PriorityLevel.MEDIUM]: 2,
      [PriorityLevel.LOW]: 1
    };
    
    let totalWeight = 0;
    let weightedProgress = 0;
    
    for (const stage of this.stages) {
      const weight = weights[stage.priority];
      totalWeight += weight;
      
      // Calculate progress for the stage
      let stageProgress = stage.progress;
      if (stage.status === TimelineItemStatus.COMPLETED) {
        stageProgress = 100;
      } else if (stage.status === TimelineItemStatus.PENDING) {
        stageProgress = 0;
      }
      
      weightedProgress += stageProgress * weight;
    }
    
    return Math.round(weightedProgress / totalWeight);
  }

  /**
   * Subscribe to timeline events
   * @param event Event type to subscribe to
   * @param listener Listener function
   * @returns This timeline instance for chaining
   */
  on(event: TimelineEvent, listener: TimelineEventListener): Timeline {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)?.push(listener);
    return this;
  }

  /**
   * Unsubscribe from timeline events
   * @param event Event type to unsubscribe from
   * @param listener Listener function to remove
   * @returns This timeline instance for chaining
   */
  off(event: TimelineEvent, listener: TimelineEventListener): Timeline {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return this;
    
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    return this;
  }

  /**
   * Reset the timeline to initial state
   * @returns This timeline instance
   */
  reset(): Timeline {
    this.status = TimelineItemStatus.PENDING;
    this.updatedAt = new Date();
    
    // Reset all stages
    for (const stage of this.stages) {
      stage.status = TimelineItemStatus.PENDING;
      stage.actualStart = undefined;
      stage.actualEnd = undefined;
      stage.progress = 0;
    }
    
    // Reset all milestones
    for (const milestone of this.milestones) {
      milestone.status = TimelineItemStatus.PENDING;
      milestone.actualStart = undefined;
      milestone.actualEnd = undefined;
    }
    
    // Reset all dependencies
    for (const item of this.getAllItems()) {
      if (item.dependencies) {
        for (const dependency of item.dependencies) {
          dependency.satisfied = false;
        }
      }
    }
    
    this.emitEvent(TimelineEvent.CUSTOM, { action: 'timeline_reset' });
    return this;
  }

  /**
   * Export timeline data as JSON
   * @returns Timeline data as a plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      stages: this.stages,
      milestones: this.milestones,
      notifications: this.notifications,
      metadata: this.metadata,
      progress: this.calculateOverallProgress()
    };
  }

  /**
   * Create a Timeline instance from JSON data
   * @param data JSON data
   * @returns A new Timeline instance
   */
  static fromJSON(data: any): Timeline {
    const timeline = new Timeline(data.name, data.version, {
      id: data.id,
      description: data.description,
      createdBy: data.createdBy,
      metadata: data.metadata
    });
    
    timeline.status = data.status;
    timeline.createdAt = new Date(data.createdAt);
    timeline.updatedAt = new Date(data.updatedAt);
    
    // Add stages
    if (Array.isArray(data.stages)) {
      for (const stageData of data.stages) {
        const stage: Stage = {
          ...stageData,
          type: TimelineItemType.STAGE,
          plannedStart: new Date(stageData.plannedStart),
          plannedEnd: stageData.plannedEnd ? new Date(stageData.plannedEnd) : undefined,
          actualStart: stageData.actualStart ? new Date(stageData.actualStart) : undefined,
          actualEnd: stageData.actualEnd ? new Date(stageData.actualEnd) : undefined
        };
        
        timeline.stages.push(stage);
      }
    }
    
    // Add milestones
    if (Array.isArray(data.milestones)) {
      for (const milestoneData of data.milestones) {
        const milestone: Milestone = {
          ...milestoneData,
          type: TimelineItemType.MILESTONE,
          plannedStart: new Date(milestoneData.plannedStart),
          plannedEnd: milestoneData.plannedEnd ? new Date(milestoneData.plannedEnd) : undefined,
          actualStart: milestoneData.actualStart ? new Date(milestoneData.actualStart) : undefined,
          actualEnd: milestoneData.actualEnd ? new Date(milestoneData.actualEnd) : undefined
        };
        
        timeline.milestones.push(milestone);
      }
    }
    
    // Add notifications
    if (Array.isArray(data.notifications)) {
      timeline.notifications = data.notifications;
    }
    
    return timeline;
  }

  /**
   * Emit an event to all listeners
   * @param eventType Type of event
   * @param data Additional data for the event
   */
  private emitEvent(eventType: TimelineEvent, data: Record<string, any> = {}): void {
    const event: TimelineChangeEvent = {
      type: eventType,
      timeline: this,
      timestamp: new Date(),
      data
    };
    
    // Set timelineItem if this event relates to a specific item
    if (data.stage) {
      event.timelineItem = data.stage;
    } else if (data.milestone) {
      event.timelineItem = data.milestone;
    }
    
    // Set previousState if provided
    if (data.previousState) {
      event.previousState = data.previousState;
    }
    
    // Call all listeners for this event type
    const listeners = this.eventListeners.get(eventType) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in timeline event listener: ${error}`);
      }
    }
    
    // Also call listeners for the general 'all' event
    const allListeners = this.eventListeners.get(TimelineEvent.CUSTOM) || [];
    for (const listener of allListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in timeline event listener: ${error}`);
      }
    }
  }

  /**
   * Handle status changes and emit appropriate events
   * @param oldItem Previous state of the item
   * @param newItem Updated state of the item
   */
  private handleStatusChange(oldItem: TimelineItem, newItem: TimelineItem): void {
    if (oldItem.status === newItem.status) return;
    
    if (newItem.type === TimelineItemType.STAGE) {
      if (newItem.status === TimelineItemStatus.IN_PROGRESS && 
          oldItem.status !== TimelineItemStatus.IN_PROGRESS) {
        // Stage started
        this.emitEvent(TimelineEvent.STAGE_STARTED, { stage: newItem });
      } else if (newItem.status === TimelineItemStatus.COMPLETED && 
                 oldItem.status !== TimelineItemStatus.COMPLETED) {
        // Stage completed
        this.emitEvent(TimelineEvent.STAGE_COMPLETED, { stage: newItem });
      } else if (newItem.status === TimelineItemStatus.FAILED && 
                 oldItem.status !== TimelineItemStatus.FAILED) {
        // Stage failed
        this.emitEvent(TimelineEvent.STAGE_FAILED, { stage: newItem });
      } else if (newItem.status === TimelineItemStatus.DELAYED && 
                 oldItem.status !== TimelineItemStatus.DELAYED) {
        // Stage delayed
        this.emitEvent(TimelineEvent.STAGE_DELAYED, { stage: newItem });
      }
    } else if (newItem.type === TimelineItemType.MILESTONE) {
      if (newItem.status === TimelineItemStatus.COMPLETED && 
          oldItem.status !== TimelineItemStatus.COMPLETED) {
        // Milestone reached
        this.emitEvent(TimelineEvent.MILESTONE_REACHED, { milestone: newItem });
      } else if ((newItem.status === TimelineItemStatus.FAILED || 
                  newItem.status === TimelineItemStatus.CANCELLED) && 
                 oldItem.status !== TimelineItemStatus.FAILED && 
                 oldItem.status !== TimelineItemStatus.CANCELLED) {
        // Milestone missed
        this.emitEvent(TimelineEvent.MILESTONE_MISSED, { milestone: newItem });
      }
    }
    
    // Check dependencies that might be satisfied by this status change
    this.checkDependencyUpdates(newItem);
  }

  /**
   * Check and update dependencies that might be affected by a status change
   * @param item The item that changed status
   */
  private checkDependencyUpdates(item: TimelineItem): void {
    // Find all items that depend on this one
    for (const dependentItem of this.getAllItems()) {
      if (!dependentItem.dependencies) continue;
      
      for (const dependency of dependentItem.dependencies) {
        if (dependency.dependsOn === item.id && !dependency.satisfied) {
          let satisfied = false;
          
          switch (dependency.type) {
            case DependencyType.COMPLETION:
              satisfied = item.status === TimelineItemStatus.COMPLETED;
              break;
            
            case DependencyType.START:
              satisfied = item.status === TimelineItemStatus.IN_PROGRESS || 
                          item.status === TimelineItemStatus.COMPLETED;
              break;
            
            case DependencyType.PARALLEL:
              satisfied = item.status === TimelineItemStatus.IN_PROGRESS || 
                          item.status === TimelineItemStatus.COMPLETED;
              break;
            
            case DependencyType.OPTIONAL:
              // Optional dependencies are always considered satisfied
              satisfied = true;
              break;
          }
          
          if (satisfied) {
            dependency.satisfied = true;
            this.emitEvent(TimelineEvent.DEPENDENCY_SATISFIED, {
              dependency,
              dependentItem
            });
          } else if (item.status === TimelineItemStatus.FAILED || 
                     item.status === TimelineItemStatus.CANCELLED) {
            this.emitEvent(TimelineEvent.DEPENDENCY_FAILED, {
              dependency,
              dependentItem
            });
          }
        }
      }
    }
  }
}