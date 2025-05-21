/**
 * Implementation of a milestone in a deployment timeline
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MilestoneInterface,
  TimelineItemStatus,
  TimelineItemPriority,
  Dependency
} from './types';

/**
 * Represents a milestone in a deployment timeline
 */
export class Milestone implements MilestoneInterface {
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

  /**
   * Creates a new Milestone
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    priority = TimelineItemPriority.MEDIUM,
    plannedEndDate,
    owner,
    metadata = {}
  }: {
    id?: string;
    name: string;
    description?: string;
    priority?: TimelineItemPriority;
    plannedEndDate?: Date;
    owner?: string;
    metadata?: Record<string, any>;
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.status = TimelineItemStatus.PENDING;
    this.priority = priority;
    this.plannedEndDate = plannedEndDate;
    this.owner = owner;
    this.metadata = metadata;
    this.dependencies = [];
  }

  /**
   * Reach/complete the milestone
   */
  reach(actualDate: Date = new Date()): Milestone {
    this.status = TimelineItemStatus.COMPLETED;
    this.actualEndDate = actualDate;
    return this;
  }

  /**
   * Mark the milestone as missed
   */
  miss(reason?: string): Milestone {
    this.status = TimelineItemStatus.FAILED;
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        missReason: reason
      };
    }
    
    return this;
  }

  /**
   * Delay the milestone
   */
  delay(newPlannedDate: Date, reason?: string): Milestone {
    this.status = TimelineItemStatus.DELAYED;
    this.plannedEndDate = newPlannedDate;
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        delayReason: reason
      };
    }
    
    return this;
  }

  /**
   * Cancel the milestone
   */
  cancel(reason?: string): Milestone {
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
   * Check if this milestone has been reached by the given date
   */
  isReachedOnTime(date: Date = new Date()): boolean {
    if (this.status !== TimelineItemStatus.COMPLETED) {
      return false;
    }
    
    if (!this.plannedEndDate || !this.actualEndDate) {
      return false;
    }
    
    return this.actualEndDate <= this.plannedEndDate;
  }

  /**
   * Calculate how many days early/late the milestone was reached
   * Positive number means early, negative means late
   */
  getDaysEarlyOrLate(): number | null {
    if (this.status !== TimelineItemStatus.COMPLETED) {
      return null;
    }
    
    if (!this.plannedEndDate || !this.actualEndDate) {
      return null;
    }
    
    const plannedMs = this.plannedEndDate.getTime();
    const actualMs = this.actualEndDate.getTime();
    const diffMs = plannedMs - actualMs;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Add a dependency to this milestone
   */
  addDependency(
    dependsOnId: string, 
    type: string, 
    isBlocker: boolean = true
  ): Milestone {
    if (!this.dependencies) {
      this.dependencies = [];
    }
    
    this.dependencies.push({
      dependsOnId,
      type: type as any,
      isBlocker
    });
    
    return this;
  }

  /**
   * Remove a dependency from this milestone
   */
  removeDependency(dependsOnId: string): boolean {
    if (!this.dependencies) {
      return false;
    }
    
    const initialLength = this.dependencies.length;
    this.dependencies = this.dependencies.filter(dep => dep.dependsOnId !== dependsOnId);
    
    return this.dependencies.length < initialLength;
  }

  /**
   * Create a Milestone from a JSON object
   */
  static fromJSON(json: any): Milestone {
    const milestone = new Milestone({
      id: json.id,
      name: json.name,
      description: json.description,
      priority: json.priority,
      plannedEndDate: json.plannedEndDate ? new Date(json.plannedEndDate) : undefined,
      owner: json.owner,
      metadata: json.metadata
    });

    milestone.status = json.status;
    milestone.plannedStartDate = json.plannedStartDate ? new Date(json.plannedStartDate) : undefined;
    milestone.actualStartDate = json.actualStartDate ? new Date(json.actualStartDate) : undefined;
    milestone.actualEndDate = json.actualEndDate ? new Date(json.actualEndDate) : undefined;
    milestone.dependencies = json.dependencies || [];

    return milestone;
  }
}