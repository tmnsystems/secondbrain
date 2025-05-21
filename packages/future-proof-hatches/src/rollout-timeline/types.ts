/**
 * Roll-out Timeline Types
 * @module rollout-timeline/types
 * @description Type definitions for the Roll-out Timeline system
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
 * Priority level for stages and milestones
 */
export enum PriorityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Type of dependency between stages
 */
export enum DependencyType {
  /** Stage must be completed before dependent stage can start */
  COMPLETION = 'completion',
  /** Stage must be started before dependent stage can start */
  START = 'start',
  /** Stages can run in parallel but dependent stage cannot complete before this one */
  PARALLEL = 'parallel',
  /** Optional dependency that is preferred but not required */
  OPTIONAL = 'optional'
}

/**
 * Type of timeline item
 */
export enum TimelineItemType {
  STAGE = 'stage',
  MILESTONE = 'milestone'
}

/**
 * Base interface for timeline items (both stages and milestones)
 */
export interface TimelineItem {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description?: string;
  /** Current status */
  status: TimelineItemStatus;
  /** Priority level */
  priority: PriorityLevel;
  /** Type of item */
  type: TimelineItemType;
  /** Planned start date */
  plannedStart: Date;
  /** Planned end date */
  plannedEnd?: Date;
  /** Actual start date (when it was started) */
  actualStart?: Date;
  /** Actual end date (when it was completed) */
  actualEnd?: Date;
  /** Owner or responsible person/team */
  owner?: string;
  /** Additional metadata as key-value pairs */
  metadata?: Record<string, any>;
  /** Dependencies that must be satisfied before this item can start or complete */
  dependencies?: Dependency[];
  /** List of attached notifications for this item */
  notifications?: NotificationConfig[];
}

/**
 * Represents a dependency between timeline items
 */
export interface Dependency {
  /** ID of the timeline item this depends on */
  dependsOn: string;
  /** Type of dependency */
  type: DependencyType;
  /** Whether this dependency has been satisfied */
  satisfied: boolean;
  /** Optional condition that must be met */
  condition?: string;
  /** Delay in milliseconds after dependency is met before this can proceed */
  delay?: number;
}

/**
 * Notification configuration for timeline events
 */
export interface NotificationConfig {
  /** Unique identifier */
  id: string;
  /** Event that triggers this notification */
  event: TimelineEvent;
  /** Channels to send notification to */
  channels: NotificationChannel[];
  /** Optional message template */
  messageTemplate?: string;
  /** Whether notification has been sent */
  sent: boolean;
  /** Timestamp when notification was sent */
  sentAt?: Date;
  /** Optional additional data for the notification */
  data?: Record<string, any>;
}

/**
 * Events that can trigger notifications
 */
export enum TimelineEvent {
  STAGE_STARTED = 'stage_started',
  STAGE_COMPLETED = 'stage_completed',
  STAGE_FAILED = 'stage_failed',
  STAGE_DELAYED = 'stage_delayed',
  MILESTONE_REACHED = 'milestone_reached',
  MILESTONE_MISSED = 'milestone_missed',
  DEPENDENCY_SATISFIED = 'dependency_satisfied',
  DEPENDENCY_FAILED = 'dependency_failed',
  TIMELINE_STARTED = 'timeline_started',
  TIMELINE_COMPLETED = 'timeline_completed',
  TIMELINE_FAILED = 'timeline_failed',
  CUSTOM = 'custom'
}

/**
 * Available notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  CONSOLE = 'console',
  CUSTOM = 'custom'
}

/**
 * Interface for a deployment stage
 * Extends TimelineItem with stage-specific properties
 */
export interface Stage extends TimelineItem {
  /** Type is always STAGE */
  type: TimelineItemType.STAGE;
  /** Sub-stages if this is a composite stage */
  subStages?: Stage[];
  /** Progress percentage (0-100) */
  progress: number;
  /** Associated feature flags that should be enabled/disabled during this stage */
  featureFlags?: FeatureFlagConfig[];
  /** Rollback procedure if stage fails */
  rollbackProcedure?: string;
  /** Resources required for this stage */
  resources?: Resource[];
  /** Tasks that need to be completed as part of this stage */
  tasks?: Task[];
  /** Metrics to track during this stage */
  metrics?: MetricConfig[];
}

/**
 * Configuration for a feature flag during a deployment stage
 */
export interface FeatureFlagConfig {
  /** Name of the feature flag */
  name: string;
  /** Whether flag should be enabled */
  enabled: boolean;
  /** Percentage of users who should see the feature (for gradual rollouts) */
  percentage?: number;
  /** Target user segments */
  segments?: string[];
}

/**
 * Resource required for a stage
 */
export interface Resource {
  /** Name of the resource */
  name: string;
  /** Type of resource */
  type: string;
  /** Whether resource is available */
  available: boolean;
  /** Quantity needed */
  quantity?: number;
}

/**
 * Task within a stage
 */
export interface Task {
  /** Unique identifier */
  id: string;
  /** Description of the task */
  description: string;
  /** Whether task is completed */
  completed: boolean;
  /** Person assigned to the task */
  assignee?: string;
  /** Estimated time to complete (in hours) */
  estimatedHours?: number;
}

/**
 * Configuration for a metric to track during a stage
 */
export interface MetricConfig {
  /** Name of the metric */
  name: string;
  /** Description of what this metric tracks */
  description?: string;
  /** Query or method to calculate the metric */
  query: string;
  /** Threshold for alerts */
  threshold?: number;
  /** Whether metric is currently within threshold */
  withinThreshold?: boolean;
  /** Current value */
  currentValue?: number;
}

/**
 * Interface for a milestone
 * Extends TimelineItem with milestone-specific properties
 */
export interface Milestone extends TimelineItem {
  /** Type is always MILESTONE */
  type: TimelineItemType.MILESTONE;
  /** Whether milestone is a critical checkpoint */
  critical: boolean;
  /** Deliverables associated with this milestone */
  deliverables?: string[];
}

/**
 * Interface for a complete deployment timeline
 */
export interface Timeline {
  /** Unique identifier */
  id: string;
  /** Name of the timeline */
  name: string;
  /** Description of what this timeline represents */
  description?: string;
  /** Overall status of the timeline */
  status: TimelineItemStatus;
  /** Version or release this timeline is for */
  version: string;
  /** Date timeline was created */
  createdAt: Date;
  /** Date timeline was last updated */
  updatedAt: Date;
  /** User who created the timeline */
  createdBy?: string;
  /** Stages in this timeline */
  stages: Stage[];
  /** Milestones in this timeline */
  milestones: Milestone[];
  /** Global notifications that apply to the whole timeline */
  notifications?: NotificationConfig[];
  /** Metadata as key-value pairs */
  metadata?: Record<string, any>;
}

/**
 * Repository for storing and retrieving timeline data
 */
export interface TimelineRepository {
  /** Save a timeline */
  saveTimeline(timeline: Timeline): Promise<Timeline>;
  /** Get a timeline by ID */
  getTimeline(id: string): Promise<Timeline | null>;
  /** List all timelines */
  listTimelines(): Promise<Timeline[]>;
  /** Delete a timeline */
  deleteTimeline(id: string): Promise<boolean>;
  /** Update a timeline item (stage or milestone) */
  updateTimelineItem(timelineId: string, item: TimelineItem): Promise<TimelineItem>;
  /** Get a timeline item by ID */
  getTimelineItem(timelineId: string, itemId: string): Promise<TimelineItem | null>;
}

/**
 * Service for sending notifications
 */
export interface NotificationService {
  /** Send a notification */
  sendNotification(notification: NotificationConfig, timelineItem: TimelineItem, timeline: Timeline): Promise<boolean>;
  /** Register a custom notification channel */
  registerChannel(name: string, handler: NotificationHandler): void;
}

/** Type for a notification handler function */
export type NotificationHandler = (
  notification: NotificationConfig, 
  timelineItem: TimelineItem, 
  timeline: Timeline
) => Promise<boolean>;

/**
 * Progress tracking for a timeline or timeline item
 */
export interface ProgressTracker {
  /** Calculate the progress of a timeline */
  calculateTimelineProgress(timeline: Timeline): number;
  /** Calculate the progress of a stage */
  calculateStageProgress(stage: Stage): number;
  /** Track a milestone completion */
  trackMilestoneCompletion(milestone: Milestone): void;
  /** Track a stage progress update */
  trackStageProgress(stage: Stage, progress: number): void;
}

/**
 * Event emitted when a timeline or timeline item changes
 */
export interface TimelineChangeEvent {
  /** Type of event */
  type: TimelineEvent;
  /** Timeline the event relates to */
  timeline: Timeline;
  /** Timeline item the event relates to, if applicable */
  timelineItem?: TimelineItem;
  /** Previous state for tracking changes */
  previousState?: Partial<TimelineItem> | Partial<Timeline>;
  /** Timestamp when event occurred */
  timestamp: Date;
  /** Additional data related to the event */
  data?: Record<string, any>;
}

/**
 * Listener for timeline events
 */
export type TimelineEventListener = (event: TimelineChangeEvent) => void | Promise<void>;