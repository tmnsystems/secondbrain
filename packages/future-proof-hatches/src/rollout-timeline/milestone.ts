/**
 * Milestone Class
 * @module rollout-timeline/milestone
 * @description Tracks important events in a deployment timeline
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Milestone as MilestoneInterface, 
  TimelineItemStatus, 
  TimelineItemType,
  PriorityLevel,
  Dependency,
  TimelineItem
} from './types';

/**
 * Represents a milestone in a deployment timeline
 */
export class Milestone implements MilestoneInterface {
  id: string;
  name: string;
  description?: string;
  status: TimelineItemStatus;
  priority: PriorityLevel;
  type: TimelineItemType.MILESTONE;
  plannedStart: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  owner?: string;
  metadata?: Record<string, any>;
  dependencies?: Dependency[];
  notifications?: any[];
  critical: boolean;
  deliverables?: string[];

  /**
   * Create a new milestone
   * @param name Milestone name
   * @param date Planned date for the milestone
   * @param options Additional options
   */
  constructor(
    name: string,
    date: Date,
    options: {
      id?: string;
      description?: string;
      priority?: PriorityLevel;
      owner?: string;
      critical?: boolean;
      deliverables?: string[];
      metadata?: Record<string, any>;
    } = {}
  ) {
    this.id = options.id || uuidv4();
    this.name = name;
    this.description = options.description;
    this.status = TimelineItemStatus.PENDING;
    this.priority = options.priority || PriorityLevel.MEDIUM;
    this.type = TimelineItemType.MILESTONE;
    this.plannedStart = date;
    this.plannedEnd = date; // For milestones, start and end are typically the same
    this.owner = options.owner;
    this.critical = options.critical || false;
    this.deliverables = options.deliverables || [];
    this.metadata = options.metadata || {};
  }

  /**
   * Reach/complete the milestone
   * @param actualDate Optional actual date of completion (defaults to now)
   * @returns This milestone instance
   */
  reach(actualDate: Date = new Date()): Milestone {
    if (this.status !== TimelineItemStatus.PENDING && 
        this.status !== TimelineItemStatus.IN_PROGRESS) {
      throw new Error(`Cannot reach milestone in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.COMPLETED;
    this.actualEnd = actualDate;
    
    // If no actual start date was set, use the same as the end date
    if (!this.actualStart) {
      this.actualStart = actualDate;
    }
    
    return this;
  }

  /**
   * Start progress towards the milestone
   * @param actualDate Optional actual start date (defaults to now)
   * @returns This milestone instance
   */
  start(actualDate: Date = new Date()): Milestone {
    if (this.status !== TimelineItemStatus.PENDING) {
      throw new Error(`Cannot start milestone in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.IN_PROGRESS;
    this.actualStart = actualDate;
    return this;
  }

  /**
   * Miss/fail the milestone
   * @param reason Optional reason for missing
   * @param actualDate Optional date when milestone was missed (defaults to now)
   * @returns This milestone instance
   */
  miss(reason?: string, actualDate: Date = new Date()): Milestone {
    if (this.status === TimelineItemStatus.COMPLETED || 
        this.status === TimelineItemStatus.CANCELLED) {
      throw new Error(`Cannot miss milestone in ${this.status} status`);
    }
    
    this.status = TimelineItemStatus.FAILED;
    this.actualEnd = actualDate;
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        missReason: reason
      };
    }
    
    return this;
  }

  /**
   * Cancel the milestone
   * @param reason Optional reason for cancellation
   * @returns This milestone instance
   */
  cancel(reason?: string): Milestone {
    if (this.status === TimelineItemStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed milestone');
    }
    
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
   * Delay the milestone
   * @param newDate New planned date for the milestone
   * @param reason Optional reason for delay
   * @returns This milestone instance
   */
  delay(newDate: Date, reason?: string): Milestone {
    if (this.status !== TimelineItemStatus.PENDING) {
      throw new Error(`Cannot delay milestone in ${this.status} status`);
    }
    
    if (newDate.getTime() <= this.plannedStart.getTime()) {
      throw new Error('New date must be after the current planned date');
    }
    
    this.status = TimelineItemStatus.DELAYED;
    const oldDate = this.plannedStart;
    this.plannedStart = newDate;
    this.plannedEnd = newDate;
    
    if (reason) {
      this.metadata = {
        ...this.metadata,
        delayReason: reason,
        originalPlannedDate: oldDate
      };
    }
    
    return this;
  }

  /**
   * Add a deliverable to this milestone
   * @param deliverable Deliverable description
   * @returns This milestone instance
   */
  addDeliverable(deliverable: string): Milestone {
    if (!this.deliverables) {
      this.deliverables = [];
    }
    
    this.deliverables.push(deliverable);
    return this;
  }

  /**
   * Check if the milestone is overdue
   * @returns Boolean indicating if the milestone is overdue
   */
  isOverdue(): boolean {
    const now = new Date();
    return this.status === TimelineItemStatus.PENDING && 
           this.plannedStart.getTime() < now.getTime();
  }

  /**
   * Calculate days until/since the milestone
   * @returns Positive number of days until the milestone, or negative number of days since
   */
  daysUntil(): number {
    const now = new Date();
    const timeDiff = this.plannedStart.getTime() - now.getTime();
    return Math.round(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if the milestone is ready to be reached
   * @param dependentItems Map of items this milestone might depend on
   * @returns Boolean indicating if milestone is ready to be reached
   */
  isReadyToReach(dependentItems: Map<string, TimelineItem>): boolean {
    // If already completed or cancelled, it's not ready to be reached
    if (this.status === TimelineItemStatus.COMPLETED || 
        this.status === TimelineItemStatus.CANCELLED) {
      return false;
    }
    
    // If no dependencies, it's ready
    if (!this.dependencies || this.dependencies.length === 0) {
      return true;
    }
    
    // Check all dependencies
    return this.dependencies.every(dependency => {
      const dependsOn = dependentItems.get(dependency.dependsOn);
      if (!dependsOn) return false;
      
      switch (dependency.type) {
        case 'completion':
          return dependsOn.status === TimelineItemStatus.COMPLETED;
        
        case 'start':
          return dependsOn.status === TimelineItemStatus.IN_PROGRESS || 
                 dependsOn.status === TimelineItemStatus.COMPLETED;
        
        case 'optional':
          // Optional dependencies don't block progress
          return true;
        
        default:
          return false;
      }
    });
  }

  /**
   * Create a Milestone instance from a plain object
   * @param data Plain object data
   * @returns A new Milestone instance
   */
  static fromObject(data: Record<string, any>): Milestone {
    const milestone = new Milestone(
      data.name,
      new Date(data.plannedStart),
      {
        id: data.id,
        description: data.description,
        priority: data.priority,
        owner: data.owner,
        critical: data.critical,
        deliverables: data.deliverables,
        metadata: data.metadata
      }
    );
    
    milestone.status = data.status;
    
    if (data.plannedEnd) {
      milestone.plannedEnd = new Date(data.plannedEnd);
    }
    
    if (data.actualStart) {
      milestone.actualStart = new Date(data.actualStart);
    }
    
    if (data.actualEnd) {
      milestone.actualEnd = new Date(data.actualEnd);
    }
    
    // Load dependencies
    if (Array.isArray(data.dependencies)) {
      milestone.dependencies = data.dependencies;
    }
    
    // Load notifications
    if (Array.isArray(data.notifications)) {
      milestone.notifications = data.notifications;
    }
    
    return milestone;
  }
}