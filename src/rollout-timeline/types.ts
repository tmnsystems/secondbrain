/**
 * Types and interfaces for the Roll-out Timeline component
 */

/**
 * Status of a timeline stage or milestone
 */
export enum TimelineItemStatus {
  /** Not yet started */
  PENDING = 'pending',
  /** Currently in progress */
  IN_PROGRESS = 'in_progress',
  /** Completed successfully */
  COMPLETED = 'completed',
  /** Failed to complete */
  FAILED = 'failed',
  /** Waiting for a dependency or condition */
  WAITING = 'waiting',
  /** Delayed from original planned date */
  DELAYED = 'delayed',
  /** Paused manually */
  PAUSED = 'paused',
  /** Cancelled, will not be completed */
  CANCELLED = 'cancelled'
}

/**
 * Priority level for timeline items
 */
export enum TimelineItemPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Type of dependency between timeline items
 */
export enum DependencyType {
  /** Must be completed strictly before the dependent item */
  FINISH_TO_START = 'finish_to_start',
  /** Must start before the dependent item can start */
  START_TO_START = 'start_to_start',
  /** Must finish before the dependent item can finish */
  FINISH_TO_FINISH = 'finish_to_finish',
  /** Must start before the dependent item can finish */
  START_TO_FINISH = 'start_to_finish'
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  CONSOLE = 'console'
}

/**
 * Progress calculation strategy
 */
export enum ProgressStrategy {
  /** All items have equal weight */
  EQUAL_WEIGHT = 'equal_weight',
  /** Weight based on item priority */
  PRIORITY_BASED = 'priority_based',
  /** Weight based on estimated time/effort */
  TIME_BASED = 'time_based'
}

/**
 * Base interface for timeline items (stages and milestones)
 */
export interface TimelineItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Detailed description */
  description?: string;
  /** Current status */
  status: TimelineItemStatus;
  /** Priority level */
  priority?: TimelineItemPriority;
  /** Planned start date */
  plannedStartDate?: Date;
  /** Planned end date */
  plannedEndDate?: Date;
  /** Actual start date once started */
  actualStartDate?: Date;
  /** Actual end date once completed */
  actualEndDate?: Date;
  /** Person or team responsible */
  owner?: string;
  /** Dependencies on other timeline items */
  dependencies?: Dependency[];
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Dependency between timeline items
 */
export interface Dependency {
  /** ID of the item this depends on */
  dependsOnId: string;
  /** Type of dependency */
  type: DependencyType;
  /** Optional delay between dependent items (in milliseconds) */
  delay?: number;
  /** Whether this is a hard blocker or can be overridden */
  isBlocker: boolean;
}

/**
 * Task within a deployment stage
 */
export interface Task {
  id: string;
  description: string;
  completed: boolean;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
}

/**
 * Resource allocation for a stage
 */
export interface Resource {
  id: string;
  name: string;
  role: string;
  allocationPercentage: number;
}

/**
 * Performance metric for a stage
 */
export interface Metric {
  id: string;
  name: string;
  description?: string;
  value?: number;
  target?: number;
  unit?: string;
}

/**
 * Stage in a deployment timeline
 */
export interface StageInterface extends TimelineItem {
  /** Tasks to be completed in this stage */
  tasks: Task[];
  /** Resources allocated to this stage */
  resources: Resource[];
  /** Performance metrics for this stage */
  metrics: Metric[];
  /** Feature flags that should be updated during this stage */
  featureFlags?: Record<string, boolean | string>;
  /** A/B tests to be conducted during this stage */
  abTests?: string[];
  /** Start the stage */
  start(actualDate?: Date): StageInterface;
  /** Complete the stage */
  complete(actualDate?: Date): StageInterface;
  /** Add a task to this stage */
  addTask(description: string, options?: any): Task;
  /** Remove a task from this stage */
  removeTask(taskId: string): boolean;
  /** Complete a task */
  completeTask(taskId: string): boolean;
  /** Add a resource allocation */
  addResource(name: string, role: string, allocationPercentage: number): Resource;
  /** Add a metric to track */
  addMetric(name: string, description?: string, target?: number, unit?: string): Metric;
  /** Update a metric's value */
  updateMetric(id: string, value: number): boolean;
  /** Add feature flag configurations for this stage */
  addFeatureFlag(flagName: string, value: boolean | string): StageInterface;
  /** Add an A/B test for this stage */
  addABTest(testId: string): StageInterface;
}

/**
 * Milestone in a deployment timeline
 */
export interface MilestoneInterface extends TimelineItem {
  /** Reach/complete the milestone */
  reach(actualDate?: Date): MilestoneInterface;
  /** Mark the milestone as missed */
  miss(reason?: string): MilestoneInterface;
  /** Delay the milestone */
  delay(newPlannedDate: Date, reason?: string): MilestoneInterface;
}

/**
 * Complete deployment timeline
 */
export interface TimelineInterface {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Detailed description */
  description?: string;
  /** Current status */
  status: TimelineItemStatus;
  /** Version identifier */
  version: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Creator identifier */
  createdBy?: string;
  /** Stages in this timeline */
  stages: StageInterface[];
  /** Milestones in this timeline */
  milestones: MilestoneInterface[];
  /** Notification configurations */
  notifications?: any[];
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** Add a stage to the timeline */
  addStage(stage: StageInterface): TimelineInterface;
  /** Add a milestone to the timeline */
  addMilestone(milestone: MilestoneInterface): TimelineInterface;
  /** Get a timeline item by ID */
  getItemById(id: string): TimelineItem | null;
  /** Get active stages (in progress) */
  getActiveStages(): StageInterface[];
  /** Get pending stages (not started) */
  getPendingStages(): StageInterface[];
  /** Get completed stages */
  getCompletedStages(): StageInterface[];
  /** Get upcoming milestones */
  getUpcomingMilestones(): MilestoneInterface[];
  /** Check if a timeline item can start based on dependencies */
  canItemStart(id: string): boolean;
  /** Get all dependencies for a timeline item */
  getItemDependencies(id: string): (TimelineItem & { dependencyType: DependencyType })[];
  /** Get all items that depend on a given item */
  getItemDependents(id: string): (TimelineItem & { dependencyType: DependencyType })[];
  /** Calculate the current progress percentage of the timeline */
  calculateProgress(): number;
  /** Export the timeline to JSON */
  toJSON(): any;
  /** Subscribe to timeline events */
  on(event: string, callback: Function): void;
  /** Unsubscribe from timeline events */
  off(event: string, callback: Function): void;
}

/**
 * Repository for storing and retrieving timelines
 */
export interface TimelineRepository {
  /** Save a timeline */
  saveTimeline(timeline: TimelineInterface): Promise<void>;
  /** Get a timeline by ID */
  getTimeline(id: string): Promise<TimelineInterface | null>;
  /** List all timelines */
  listTimelines(): Promise<TimelineInterface[]>;
  /** Delete a timeline */
  deleteTimeline(id: string): Promise<void>;
}

/**
 * Timeline notification configuration
 */
export interface NotificationConfig {
  /** When to trigger the notification */
  trigger: 'stage_start' | 'stage_complete' | 'milestone_reached' | 'milestone_missed' | 'timeline_start' | 'timeline_complete' | 'dependency_ready' | 'custom';
  /** Channel to send the notification */
  channel: NotificationChannel;
  /** Template for notification message */
  template: string;
  /** Recipients */
  recipients?: string[];
  /** Condition to check before sending */
  condition?: (item: TimelineItem, timeline: TimelineInterface) => boolean;
  /** Custom configuration for different channels */
  channelConfig?: Record<string, any>;
}

/**
 * Notification service for sending timeline notifications
 */
export interface NotificationServiceInterface {
  /** Add a notification handler */
  addHandler(
    channel: NotificationChannel, 
    handler: (notification: NotificationConfig, item: TimelineItem, timeline: TimelineInterface) => Promise<boolean>
  ): void;
  
  /** Send a notification */
  sendNotification(
    notification: NotificationConfig, 
    timelineItem: TimelineItem, 
    timeline: TimelineInterface
  ): Promise<boolean>;
  
  /** Process template with variables */
  processTemplate(
    template: string, 
    timelineItem: TimelineItem, 
    timeline: TimelineInterface
  ): string;
}

/**
 * Progress calculation strategy interface
 */
export interface ProgressCalculationStrategy {
  /** Calculate progress for a timeline */
  calculateTimelineProgress(timeline: TimelineInterface): number;
  /** Calculate progress for a stage */
  calculateStageProgress(stage: StageInterface): number;
}

/**
 * Progress tracker for monitoring progress of timelines and stages
 */
export interface ProgressTrackerInterface {
  /** Set the progress calculation strategy */
  setStrategy(strategy: ProgressCalculationStrategy): void;
  /** Calculate the progress of a timeline */
  calculateTimelineProgress(timeline: TimelineInterface): number;
  /** Calculate the progress of a stage */
  calculateStageProgress(stage: StageInterface): number;
  /** Get the progress of a timeline with detailed breakdown */
  getDetailedProgress(timeline: TimelineInterface): {
    overall: number;
    stages: Record<string, number>;
    milestones: Record<string, boolean>;
  };
}