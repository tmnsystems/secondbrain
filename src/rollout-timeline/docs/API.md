# Roll-out Timeline API Reference

This document provides a comprehensive reference for the Roll-out Timeline API.

## Table of Contents

- [Enums](#enums)
- [Interfaces](#interfaces)
- [Classes](#classes)
  - [Timeline](#timeline-class)
  - [Stage](#stage-class)
  - [Milestone](#milestone-class)
  - [DependencyResolver](#dependencyresolver-class)
  - [NotificationService](#notificationservice-class)
  - [ProgressTracker](#progresstracker-class)
  - [InMemoryTimelineRepository](#inmemorytimelinerepository-class)
  - [JsonFileTimelineRepository](#jsonfiletimelinerepository-class)

## Enums

### TimelineItemStatus

```typescript
enum TimelineItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WAITING = 'waiting',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}
```

### TimelineItemPriority

```typescript
enum TimelineItemPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### DependencyType

```typescript
enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}
```

### NotificationChannel

```typescript
enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  CONSOLE = 'console'
}
```

### ProgressStrategy

```typescript
enum ProgressStrategy {
  EQUAL_WEIGHT = 'equal_weight',
  PRIORITY_BASED = 'priority_based',
  TIME_BASED = 'time_based'
}
```

## Interfaces

### TimelineItem

Base interface for timeline items (stages and milestones).

```typescript
interface TimelineItem {
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
}
```

### Dependency

Represents a dependency between timeline items.

```typescript
interface Dependency {
  dependsOnId: string;
  type: DependencyType;
  delay?: number;
  isBlocker: boolean;
}
```

### Task

Represents a task within a deployment stage.

```typescript
interface Task {
  id: string;
  description: string;
  completed: boolean;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
}
```

### Resource

Represents a resource allocation for a stage.

```typescript
interface Resource {
  id: string;
  name: string;
  role: string;
  allocationPercentage: number;
}
```

### Metric

Represents a performance metric for a stage.

```typescript
interface Metric {
  id: string;
  name: string;
  description?: string;
  value?: number;
  target?: number;
  unit?: string;
}
```

### StageInterface

Interface for a stage in a deployment timeline.

```typescript
interface StageInterface extends TimelineItem {
  tasks: Task[];
  resources: Resource[];
  metrics: Metric[];
  featureFlags?: Record<string, boolean | string>;
  abTests?: string[];
  
  start(actualDate?: Date): StageInterface;
  complete(actualDate?: Date): StageInterface;
  addTask(description: string, options?: any): Task;
  removeTask(taskId: string): boolean;
  completeTask(taskId: string): boolean;
  addResource(name: string, role: string, allocationPercentage: number): Resource;
  addMetric(name: string, description?: string, target?: number, unit?: string): Metric;
  updateMetric(id: string, value: number): boolean;
  addFeatureFlag(flagName: string, value: boolean | string): StageInterface;
  addABTest(testId: string): StageInterface;
}
```

### MilestoneInterface

Interface for a milestone in a deployment timeline.

```typescript
interface MilestoneInterface extends TimelineItem {
  reach(actualDate?: Date): MilestoneInterface;
  miss(reason?: string): MilestoneInterface;
  delay(newPlannedDate: Date, reason?: string): MilestoneInterface;
}
```

### TimelineInterface

Interface for a complete deployment timeline.

```typescript
interface TimelineInterface {
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
  notifications?: any[];
  metadata?: Record<string, any>;
  
  addStage(stage: StageInterface): TimelineInterface;
  addMilestone(milestone: MilestoneInterface): TimelineInterface;
  getItemById(id: string): TimelineItem | null;
  getActiveStages(): StageInterface[];
  getPendingStages(): StageInterface[];
  getCompletedStages(): StageInterface[];
  getUpcomingMilestones(): MilestoneInterface[];
  canItemStart(id: string): boolean;
  getItemDependencies(id: string): (TimelineItem & { dependencyType: DependencyType })[];
  getItemDependents(id: string): (TimelineItem & { dependencyType: DependencyType })[];
  calculateProgress(): number;
  toJSON(): any;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}
```

### TimelineRepository

Interface for storing and retrieving timelines.

```typescript
interface TimelineRepository {
  saveTimeline(timeline: TimelineInterface): Promise<void>;
  getTimeline(id: string): Promise<TimelineInterface | null>;
  listTimelines(): Promise<TimelineInterface[]>;
  deleteTimeline(id: string): Promise<void>;
}
```

### NotificationConfig

Configuration for timeline notifications.

```typescript
interface NotificationConfig {
  trigger: 'stage_start' | 'stage_complete' | 'milestone_reached' | 'milestone_missed' | 'timeline_start' | 'timeline_complete' | 'dependency_ready' | 'custom';
  channel: NotificationChannel;
  template: string;
  recipients?: string[];
  condition?: (item: TimelineItem, timeline: TimelineInterface) => boolean;
  channelConfig?: Record<string, any>;
}
```

### NotificationServiceInterface

Interface for the notification service.

```typescript
interface NotificationServiceInterface {
  addHandler(
    channel: NotificationChannel, 
    handler: (notification: NotificationConfig, item: TimelineItem, timeline: TimelineInterface) => Promise<boolean>
  ): void;
  
  sendNotification(
    notification: NotificationConfig, 
    timelineItem: TimelineItem, 
    timeline: TimelineInterface
  ): Promise<boolean>;
  
  processTemplate(
    template: string, 
    timelineItem: TimelineItem, 
    timeline: TimelineInterface
  ): string;
}
```

### ProgressCalculationStrategy

Interface for progress calculation strategies.

```typescript
interface ProgressCalculationStrategy {
  calculateTimelineProgress(timeline: TimelineInterface): number;
  calculateStageProgress(stage: StageInterface): number;
}
```

### ProgressTrackerInterface

Interface for progress tracking.

```typescript
interface ProgressTrackerInterface {
  setStrategy(strategy: ProgressCalculationStrategy): void;
  calculateTimelineProgress(timeline: TimelineInterface): number;
  calculateStageProgress(stage: StageInterface): number;
  getDetailedProgress(timeline: TimelineInterface): {
    overall: number;
    stages: Record<string, number>;
    milestones: Record<string, boolean>;
  };
}
```

## Classes

### Timeline Class

The core Timeline class that manages a deployment sequence.

#### Constructor

```typescript
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
})
```

#### Methods

##### addStage

Adds a stage to the timeline.

```typescript
addStage(stage: StageInterface): Timeline
```

##### addMilestone

Adds a milestone to the timeline.

```typescript
addMilestone(milestone: MilestoneInterface): Timeline
```

##### addNotification

Adds a notification configuration to the timeline.

```typescript
addNotification(notification: NotificationConfig): Timeline
```

##### getItemById

Gets a timeline item (stage or milestone) by ID.

```typescript
getItemById(id: string): TimelineItem | null
```

##### getActiveStages

Gets all stages that are currently active (in progress).

```typescript
getActiveStages(): StageInterface[]
```

##### getPendingStages

Gets all stages that are pending (not started).

```typescript
getPendingStages(): StageInterface[]
```

##### getCompletedStages

Gets all stages that are completed.

```typescript
getCompletedStages(): StageInterface[]
```

##### getUpcomingMilestones

Gets all upcoming milestones that haven't been reached yet.

```typescript
getUpcomingMilestones(): MilestoneInterface[]
```

##### start

Starts the timeline.

```typescript
start(): Timeline
```

##### complete

Completes the timeline.

```typescript
complete(): Timeline
```

##### canItemStart

Checks if a timeline item can start based on its dependencies.

```typescript
canItemStart(id: string): boolean
```

##### getItemDependencies

Gets all dependencies for a timeline item.

```typescript
getItemDependencies(id: string): (TimelineItem & { dependencyType: DependencyType })[]
```

##### getItemDependents

Gets all items that depend on a given item.

```typescript
getItemDependents(id: string): (TimelineItem & { dependencyType: DependencyType })[]
```

##### canItemComplete

Checks if a stage can be completed based on its dependencies.

```typescript
canItemComplete(id: string): boolean
```

##### addDependency

Adds a dependency between two timeline items.

```typescript
addDependency(
  itemId: string, 
  dependsOnId: string, 
  type: DependencyType = DependencyType.FINISH_TO_START, 
  isBlocker: boolean = true
): Timeline
```

##### removeDependency

Removes a dependency between two timeline items.

```typescript
removeDependency(itemId: string, dependsOnId: string): boolean
```

##### calculateProgress

Calculates the overall progress percentage of the timeline.

```typescript
calculateProgress(): number
```

##### on

Subscribes to timeline events.

```typescript
on(event: string, callback: Function): void
```

##### off

Unsubscribes from timeline events.

```typescript
off(event: string, callback: Function): void
```

##### toJSON

Converts the timeline to a JSON object.

```typescript
toJSON(): any
```

##### fromJSON (static)

Creates a Timeline from a JSON object.

```typescript
static fromJSON(json: any, stageFactory: any, milestoneFactory: any): Timeline
```

### Stage Class

Represents a deployment stage in a timeline.

#### Constructor

```typescript
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
})
```

#### Methods

##### start

Starts the stage.

```typescript
start(actualDate: Date = new Date()): Stage
```

##### complete

Completes the stage.

```typescript
complete(actualDate: Date = new Date()): Stage
```

##### fail

Fails the stage.

```typescript
fail(reason?: string): Stage
```

##### pause

Pauses the stage.

```typescript
pause(reason?: string): Stage
```

##### resume

Resumes the stage from a paused state.

```typescript
resume(): Stage
```

##### delay

Delays the stage to a new planned date.

```typescript
delay(newPlannedEndDate: Date, reason?: string): Stage
```

##### cancel

Cancels the stage.

```typescript
cancel(reason?: string): Stage
```

##### addTask

Adds a task to this stage.

```typescript
addTask(
  description: string,
  options: {
    id?: string;
    completed?: boolean;
    assignee?: string;
    estimatedHours?: number;
  } = {}
): Task
```

##### removeTask

Removes a task from this stage.

```typescript
removeTask(taskId: string): boolean
```

##### completeTask

Completes a task.

```typescript
completeTask(taskId: string, actualHours?: number): boolean
```

##### addResource

Adds a resource allocation to this stage.

```typescript
addResource(
  name: string,
  role: string,
  allocationPercentage: number
): Resource
```

##### removeResource

Removes a resource from this stage.

```typescript
removeResource(resourceId: string): boolean
```

##### addMetric

Adds a metric to track for this stage.

```typescript
addMetric(
  name: string,
  description?: string,
  target?: number,
  unit?: string
): Metric
```

##### updateMetric

Updates a metric's value.

```typescript
updateMetric(id: string, value: number): boolean
```

##### getTaskCompletionPercentage

Gets task completion percentage.

```typescript
getTaskCompletionPercentage(): number
```

##### addFeatureFlag

Adds a feature flag configuration for this stage.

```typescript
addFeatureFlag(flagName: string, value: boolean | string): Stage
```

##### removeFeatureFlag

Removes a feature flag configuration.

```typescript
removeFeatureFlag(flagName: string): boolean
```

##### addABTest

Adds an A/B test for this stage.

```typescript
addABTest(testId: string): Stage
```

##### removeABTest

Removes an A/B test.

```typescript
removeABTest(testId: string): boolean
```

##### areAllTasksCompleted

Checks if all tasks are completed.

```typescript
areAllTasksCompleted(): boolean
```

##### fromJSON (static)

Creates a Stage from a JSON object.

```typescript
static fromJSON(json: any): Stage
```

### Milestone Class

Represents a milestone in a deployment timeline.

#### Constructor

```typescript
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
})
```

#### Methods

##### reach

Reaches/completes the milestone.

```typescript
reach(actualDate: Date = new Date()): Milestone
```

##### miss

Marks the milestone as missed.

```typescript
miss(reason?: string): Milestone
```

##### delay

Delays the milestone.

```typescript
delay(newPlannedDate: Date, reason?: string): Milestone
```

##### cancel

Cancels the milestone.

```typescript
cancel(reason?: string): Milestone
```

##### isReachedOnTime

Checks if this milestone has been reached by the given date.

```typescript
isReachedOnTime(date: Date = new Date()): boolean
```

##### getDaysEarlyOrLate

Calculates how many days early/late the milestone was reached.

```typescript
getDaysEarlyOrLate(): number | null
```

##### addDependency

Adds a dependency to this milestone.

```typescript
addDependency(
  dependsOnId: string, 
  type: string, 
  isBlocker: boolean = true
): Milestone
```

##### removeDependency

Removes a dependency from this milestone.

```typescript
removeDependency(dependsOnId: string): boolean
```

##### fromJSON (static)

Creates a Milestone from a JSON object.

```typescript
static fromJSON(json: any): Milestone
```

### DependencyResolver Class

Validates and resolves dependencies between timeline items.

#### Constructor

```typescript
constructor(timeline: TimelineInterface)
```

#### Methods

##### findCircularDependencies

Checks for circular dependencies in the timeline.

```typescript
findCircularDependencies(): string[][]
```

##### validateDependencies

Checks if dependencies are valid.

```typescript
validateDependencies(): boolean
```

##### getCriticalPath

Gets the critical path through the timeline.

```typescript
getCriticalPath(): string[]
```

##### getItemsReadyToStart

Gets items that can start based on their dependencies.

```typescript
getItemsReadyToStart(): TimelineItem[]
```

##### getNextItems

Gets the next items that should be worked on based on priority and dependencies.

```typescript
getNextItems(limit: number = 5): TimelineItem[]
```

##### getItemsUnblockedBy

Checks if completing the given timeline item would unblock other items.

```typescript
getItemsUnblockedBy(id: string): TimelineItem[]
```

##### estimateCompletionDate

Calculates the estimated completion date for the timeline based on current progress and dependencies.

```typescript
estimateCompletionDate(): Date | null
```

### NotificationService Class

Implementation of the notification service.

#### Constructor

```typescript
constructor()
```

#### Methods

##### addHandler

Adds a notification handler for a specific channel.

```typescript
addHandler(
  channel: NotificationChannel, 
  handler: (notification: NotificationConfig, item: TimelineItem, timeline: TimelineInterface) => Promise<boolean>
): void
```

##### removeHandler

Removes a notification handler.

```typescript
removeHandler(channel: NotificationChannel, handler: Function): boolean
```

##### sendNotification

Sends a notification.

```typescript
async sendNotification(
  notification: NotificationConfig, 
  timelineItem: TimelineItem, 
  timeline: TimelineInterface
): Promise<boolean>
```

##### processTemplate

Processes a template string with variables.

```typescript
processTemplate(
  template: string, 
  timelineItem: TimelineItem, 
  timeline: TimelineInterface
): string
```

##### registerEmailHandler

Registers an email notification handler.

```typescript
registerEmailHandler(
  handler: (to: string[], subject: string, body: string, config: any) => Promise<boolean>
): void
```

##### registerSlackHandler

Registers a Slack notification handler.

```typescript
registerSlackHandler(
  handler: (channel: string, message: string, config: any) => Promise<boolean>
): void
```

##### registerWebhookHandler

Registers a webhook notification handler.

```typescript
registerWebhookHandler(
  handler: (url: string, payload: any) => Promise<boolean>
): void
```

##### registerSmsHandler

Registers a SMS notification handler.

```typescript
registerSmsHandler(
  handler: (to: string[], message: string, config: any) => Promise<boolean>
): void
```

### ProgressTracker Class

Implementation of the progress tracker.

#### Constructor

```typescript
constructor(strategy?: ProgressCalculationStrategy)
```

#### Methods

##### setStrategy

Sets the progress calculation strategy.

```typescript
setStrategy(strategy: ProgressCalculationStrategy): void
```

##### calculateTimelineProgress

Calculates the progress of a timeline.

```typescript
calculateTimelineProgress(timeline: TimelineInterface): number
```

##### calculateStageProgress

Calculates the progress of a stage.

```typescript
calculateStageProgress(stage: StageInterface): number
```

##### getDetailedProgress

Gets detailed progress information for a timeline.

```typescript
getDetailedProgress(timeline: TimelineInterface): {
  overall: number;
  stages: Record<string, number>;
  milestones: Record<string, boolean>;
}
```

##### withStrategy (static)

Creates a progress tracker with a specific strategy.

```typescript
static withStrategy(strategyType: ProgressStrategy): ProgressTracker
```

### EqualWeightStrategy Class

Strategy that weights all stages equally.

#### Methods

##### calculateTimelineProgress

Calculates progress for a timeline where all stages have equal weight.

```typescript
calculateTimelineProgress(timeline: TimelineInterface): number
```

##### calculateStageProgress

Calculates progress for a stage based on completed tasks.

```typescript
calculateStageProgress(stage: StageInterface): number
```

### PriorityBasedStrategy Class

Strategy that weights stages by priority.

#### Methods

##### calculateTimelineProgress

Calculates progress for a timeline based on priority-weighted stages.

```typescript
calculateTimelineProgress(timeline: TimelineInterface): number
```

##### calculateStageProgress

Calculates progress for a stage based on completed tasks.

```typescript
calculateStageProgress(stage: StageInterface): number
```

### TimeBasedStrategy Class

Strategy that weights stages by time/effort.

#### Methods

##### calculateTimelineProgress

Calculates progress for a timeline based on time-weighted stages.

```typescript
calculateTimelineProgress(timeline: TimelineInterface): number
```

##### calculateStageProgress

Calculates progress for a stage based on completed task hours.

```typescript
calculateStageProgress(stage: StageInterface): number
```

### InMemoryTimelineRepository Class

Stores timeline data in memory.

#### Constructor

```typescript
constructor()
```

#### Methods

##### saveTimeline

Saves a timeline to the repository.

```typescript
async saveTimeline(timeline: TimelineInterface): Promise<void>
```

##### getTimeline

Gets a timeline from the repository.

```typescript
async getTimeline(id: string): Promise<TimelineInterface | null>
```

##### listTimelines

Lists all timelines in the repository.

```typescript
async listTimelines(): Promise<TimelineInterface[]>
```

##### deleteTimeline

Deletes a timeline from the repository.

```typescript
async deleteTimeline(id: string): Promise<void>
```

##### searchTimelinesByName

Searches for timelines with a given name.

```typescript
async searchTimelinesByName(name: string): Promise<TimelineInterface[]>
```

##### searchTimelinesByStatus

Searches for timelines by status.

```typescript
async searchTimelinesByStatus(status: string): Promise<TimelineInterface[]>
```

##### searchTimelinesByMetadata

Searches for timelines by metadata.

```typescript
async searchTimelinesByMetadata(key: string, value: any): Promise<TimelineInterface[]>
```

##### clear

Clears all timelines from the repository.

```typescript
async clear(): Promise<void>
```

##### count

Gets the number of timelines in the repository.

```typescript
async count(): Promise<number>
```

### JsonFileTimelineRepository Class

Stores timeline data in JSON files.

#### Constructor

```typescript
constructor(directory: string)
```

#### Methods

##### initialize

Initializes the repository (creates directory if needed).

```typescript
async initialize(): Promise<void>
```

##### saveTimeline

Saves a timeline to a JSON file.

```typescript
async saveTimeline(timeline: TimelineInterface): Promise<void>
```

##### getTimeline

Gets a timeline from a JSON file.

```typescript
async getTimeline(id: string): Promise<TimelineInterface | null>
```

##### listTimelines

Lists all timelines in the repository.

```typescript
async listTimelines(): Promise<TimelineInterface[]>
```

##### deleteTimeline

Deletes a timeline from the repository.

```typescript
async deleteTimeline(id: string): Promise<void>
```

##### searchTimelinesByName

Searches for timelines by name.

```typescript
async searchTimelinesByName(name: string): Promise<TimelineInterface[]>
```

##### searchTimelinesByStatus

Searches for timelines by status.

```typescript
async searchTimelinesByStatus(status: string): Promise<TimelineInterface[]>
```

##### searchTimelinesByMetadata

Searches for timelines by metadata.

```typescript
async searchTimelinesByMetadata(key: string, value: any): Promise<TimelineInterface[]>
```