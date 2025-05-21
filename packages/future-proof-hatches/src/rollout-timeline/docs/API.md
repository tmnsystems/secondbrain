# Roll-out Timeline API Reference

This document provides a comprehensive reference for the Roll-out Timeline API.

## Table of Contents

- [Enums](#enums)
- [Interfaces](#interfaces)
- [Classes](#classes)
  - [Timeline](#timeline)
  - [Stage](#stage)
  - [Milestone](#milestone)
  - [DependencyResolver](#dependencyresolver)
  - [NotificationService](#notificationservice)
  - [ProgressTracker](#progresstracker)
  - [Repositories](#repositories)

## Enums

### TimelineItemStatus

Status of a timeline stage or milestone.

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

### PriorityLevel

Priority level for stages and milestones.

```typescript
enum PriorityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}
```

### DependencyType

Type of dependency between stages.

```typescript
enum DependencyType {
  COMPLETION = 'completion',
  START = 'start',
  PARALLEL = 'parallel',
  OPTIONAL = 'optional'
}
```

### TimelineItemType

Type of timeline item.

```typescript
enum TimelineItemType {
  STAGE = 'stage',
  MILESTONE = 'milestone'
}
```

### TimelineEvent

Events that can trigger notifications.

```typescript
enum TimelineEvent {
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
```

### NotificationChannel

Available notification channels.

```typescript
enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  CONSOLE = 'console',
  CUSTOM = 'custom'
}
```

## Interfaces

### TimelineItem

Base interface for timeline items (both stages and milestones).

```typescript
interface TimelineItem {
  id: string;
  name: string;
  description?: string;
  status: TimelineItemStatus;
  priority: PriorityLevel;
  type: TimelineItemType;
  plannedStart: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  owner?: string;
  metadata?: Record<string, any>;
  dependencies?: Dependency[];
  notifications?: NotificationConfig[];
}
```

### Stage

Interface for a deployment stage.

```typescript
interface Stage extends TimelineItem {
  type: TimelineItemType.STAGE;
  subStages?: Stage[];
  progress: number;
  featureFlags?: FeatureFlagConfig[];
  rollbackProcedure?: string;
  resources?: Resource[];
  tasks?: Task[];
  metrics?: MetricConfig[];
}
```

### Milestone

Interface for a milestone.

```typescript
interface Milestone extends TimelineItem {
  type: TimelineItemType.MILESTONE;
  critical: boolean;
  deliverables?: string[];
}
```

### Dependency

Represents a dependency between timeline items.

```typescript
interface Dependency {
  dependsOn: string;
  type: DependencyType;
  satisfied: boolean;
  condition?: string;
  delay?: number;
}
```

### Task

Task within a stage.

```typescript
interface Task {
  id: string;
  description: string;
  completed: boolean;
  assignee?: string;
  estimatedHours?: number;
}
```

### Resource

Resource required for a stage.

```typescript
interface Resource {
  name: string;
  type: string;
  available: boolean;
  quantity?: number;
}
```

### MetricConfig

Configuration for a metric to track during a stage.

```typescript
interface MetricConfig {
  name: string;
  description?: string;
  query: string;
  threshold?: number;
  withinThreshold?: boolean;
  currentValue?: number;
}
```

### FeatureFlagConfig

Configuration for a feature flag during a deployment stage.

```typescript
interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  percentage?: number;
  segments?: string[];
}
```

### NotificationConfig

Notification configuration for timeline events.

```typescript
interface NotificationConfig {
  id: string;
  event: TimelineEvent;
  channels: NotificationChannel[];
  messageTemplate?: string;
  sent: boolean;
  sentAt?: Date;
  data?: Record<string, any>;
}
```

## Classes

### Timeline

Core Timeline class that manages a deployment sequence.

#### Constructor

```typescript
constructor(
  name: string, 
  version: string, 
  options: {
    id?: string;
    description?: string;
    createdBy?: string;
    metadata?: Record<string, any>;
  } = {}
)
```

#### Methods

```typescript
// Add a stage to the timeline
addStage(stage: Omit<Stage, 'type' | 'id'> & { id?: string }): Stage

// Add a milestone to the timeline
addMilestone(milestone: Omit<Milestone, 'type' | 'id'> & { id?: string }): Milestone

// Get all timeline items (stages and milestones) sorted by planned start date
getAllItems(): TimelineItem[]

// Get a stage by ID
getStage(id: string): Stage | undefined

// Get a milestone by ID
getMilestone(id: string): Milestone | undefined

// Get any timeline item (stage or milestone) by ID
getItem(id: string): TimelineItem | undefined

// Update a stage
updateStage(id: string, updates: Partial<Omit<Stage, 'id' | 'type'>>): Stage | undefined

// Update a milestone
updateMilestone(id: string, updates: Partial<Omit<Milestone, 'id' | 'type'>>): Milestone | undefined

// Remove a stage by ID
removeStage(id: string): boolean

// Remove a milestone by ID
removeMilestone(id: string): boolean

// Start the timeline
start(): Timeline

// Complete the timeline
complete(): Timeline

// Mark the timeline as failed
fail(reason?: string): Timeline

// Start a stage by ID
startStage(id: string): Stage | undefined

// Complete a stage by ID
completeStage(id: string): Stage | undefined

// Mark a stage as failed
failStage(id: string, reason?: string): Stage | undefined

// Reach a milestone
reachMilestone(id: string): Milestone | undefined

// Add a dependency between timeline items
addDependency(
  dependentId: string, 
  dependsOnId: string, 
  type: DependencyType = DependencyType.COMPLETION,
  options: {
    condition?: string;
    delay?: number;
  } = {}
): boolean

// Check if all dependencies for an item are satisfied
areDependenciesSatisfied(itemId: string): boolean

// Update progress for a stage
updateStageProgress(id: string, progress: number): Stage | undefined

// Get a list of items that can be started (all dependencies satisfied)
getReadyToStartItems(): TimelineItem[]

// Calculate the overall progress of the timeline
calculateOverallProgress(): number

// Subscribe to timeline events
on(event: TimelineEvent, listener: TimelineEventListener): Timeline

// Unsubscribe from timeline events
off(event: TimelineEvent, listener: TimelineEventListener): Timeline

// Reset the timeline to initial state
reset(): Timeline

// Export timeline data as JSON
toJSON(): Record<string, any>

// Create a Timeline instance from JSON data
static fromJSON(data: any): Timeline
```

### Stage

Represents a deployment stage in a timeline.

#### Constructor

```typescript
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
)
```

#### Methods

```typescript
// Start the stage
start(): Stage

// Complete the stage
complete(): Stage

// Add a sub-stage to this stage
addSubStage(subStage: Stage): Stage

// Add a task to this stage
addTask(
  description: string,
  options: {
    id?: string;
    completed?: boolean;
    assignee?: string;
    estimatedHours?: number;
  } = {}
): Task

// Add a resource requirement to this stage
addResource(
  name: string,
  type: string,
  options: {
    available?: boolean;
    quantity?: number;
  } = {}
): Resource

// Add a feature flag configuration to this stage
addFeatureFlag(
  name: string,
  enabled: boolean,
  options: {
    percentage?: number;
    segments?: string[];
  } = {}
): FeatureFlagConfig

// Add a metric to track during this stage
addMetric(
  name: string,
  query: string,
  options: {
    description?: string;
    threshold?: number;
    currentValue?: number;
  } = {}
): MetricConfig

// Complete a task by ID
completeTask(taskId: string): boolean

// Mark a resource as available
markResourceAvailable(resourceName: string): boolean

// Update a metric value
updateMetricValue(metricName: string, value: number): boolean

// Update the progress of this stage
updateProgress(progressValue?: number): number

// Pause the stage
pause(): Stage

// Mark the stage as failed
fail(reason?: string): Stage

// Cancel the stage
cancel(reason?: string): Stage

// Delay the stage
delay(newPlannedStart: Date, reason?: string): Stage

// Check if all resources are available
areResourcesAvailable(): boolean

// Check if all metrics are within thresholds
areMetricsWithinThresholds(): boolean

// Check if the stage is ready to start
isReadyToStart(areDependenciesSatisfied: () => boolean): boolean

// Create a Stage instance from a plain object
static fromObject(data: Record<string, any>): Stage
```

### Milestone

Represents a milestone in a deployment timeline.

#### Constructor

```typescript
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
)
```

#### Methods

```typescript
// Reach/complete the milestone
reach(actualDate: Date = new Date()): Milestone

// Start progress towards the milestone
start(actualDate: Date = new Date()): Milestone

// Miss/fail the milestone
miss(reason?: string, actualDate: Date = new Date()): Milestone

// Cancel the milestone
cancel(reason?: string): Milestone

// Delay the milestone
delay(newDate: Date, reason?: string): Milestone

// Add a deliverable to this milestone
addDeliverable(deliverable: string): Milestone

// Check if the milestone is overdue
isOverdue(): boolean

// Calculate days until/since the milestone
daysUntil(): number

// Check if the milestone is ready to be reached
isReadyToReach(dependentItems: Map<string, TimelineItem>): boolean

// Create a Milestone instance from a plain object
static fromObject(data: Record<string, any>): Milestone
```

### DependencyResolver

Validates and resolves dependencies between timeline items.

#### Constructor

```typescript
constructor(timeline: Timeline)
```

#### Methods

```typescript
// Check if all dependencies for an item are satisfied
areDependenciesSatisfied(itemId: string): boolean

// Check if a specific dependency is satisfied
isDependencySatisfied(dependency: Dependency, dependentItem: TimelineItem): boolean

// Get items that are blocked by a given item
getBlockedItems(itemId: string): TimelineItem[]

// Get items that a given item depends on
getDependsOnItems(itemId: string): TimelineItem[]

// Get items that are ready to start (all dependencies satisfied)
getReadyToStartItems(): TimelineItem[]

// Check for circular dependencies in the timeline
findCircularDependencies(): string[][]

// Check if a timeline item can be completed
canComplete(itemId: string): boolean

// Update dependency status when an item's status changes
updateDependencyStatus(itemId: string): Dependency[]

// Get the critical path through the timeline
getCriticalPath(): string[]

// Add a dependency between two items
addDependency(
  dependentId: string,
  dependsOnId: string,
  type: DependencyType = DependencyType.COMPLETION,
  options: {
    condition?: string;
    delay?: number;
  } = {}
): boolean

// Remove a dependency between two items
removeDependency(dependentId: string, dependsOnId: string): boolean

// Check if the timeline is acyclic (no circular dependencies)
isAcyclic(): boolean

// Rebuild the timeline with any dependency issues fixed
fixDependencyIssues(): Timeline
```

### NotificationService

Implementation of the notification service.

#### Constructor

```typescript
constructor(options: { templateEngine?: TemplateEngine } = {})
```

#### Methods

```typescript
// Send a notification
async sendNotification(
  notification: NotificationConfig, 
  timelineItem: TimelineItem, 
  timeline: Timeline
): Promise<boolean>

// Register a custom notification handler
registerChannel(name: string, handler: NotificationHandler): void

// Check if notifications for a timeline item are due
async processEvent(
  timelineItem: TimelineItem, 
  event: TimelineEvent, 
  timeline: Timeline
): Promise<NotificationConfig[]>
```

### ProgressTracker

Implementation of the progress tracker.

#### Constructor

```typescript
constructor(strategyType: 'equal' | 'priority' | 'time' = 'priority')
```

#### Methods

```typescript
// Set the progress calculation strategy
setStrategy(strategyType: 'equal' | 'priority' | 'time'): void

// Calculate the progress of a timeline
calculateTimelineProgress(timeline: Timeline): number

// Calculate the progress of a stage
calculateStageProgress(stage: Stage): number

// Track a milestone completion
trackMilestoneCompletion(milestone: Milestone): void

// Track a stage progress update
trackStageProgress(stage: Stage, progress: number): void

// Get a summary of timeline progress
getProgressSummary(timeline: Timeline): {
  overallProgress: number;
  stageProgress: { id: string; name: string; progress: number }[];
  completedMilestones: number;
  totalMilestones: number;
  estimatedCompletion: Date | null;
}

// Get critical items that may be at risk
getAtRiskItems(timeline: Timeline): TimelineItem[]

// Update progress for all items in a timeline
updateAllProgress(timeline: Timeline): Timeline
```

### Repositories

#### InMemoryTimelineRepository

Stores timeline data in memory.

```typescript
class InMemoryTimelineRepository implements TimelineRepository {
  // Save a timeline
  async saveTimeline(timeline: Timeline): Promise<Timeline>

  // Get a timeline by ID
  async getTimeline(id: string): Promise<Timeline | null>

  // List all timelines
  async listTimelines(): Promise<Timeline[]>

  // Delete a timeline
  async deleteTimeline(id: string): Promise<boolean>

  // Update a timeline item (stage or milestone)
  async updateTimelineItem(timelineId: string, item: TimelineItem): Promise<TimelineItem>

  // Get a timeline item by ID
  async getTimelineItem(timelineId: string, itemId: string): Promise<TimelineItem | null>
}
```

#### JsonFileTimelineRepository

Stores timeline data in JSON files.

```typescript
class JsonFileTimelineRepository implements TimelineRepository {
  // Constructor
  constructor(basePath: string)

  // Initialize the repository
  async initialize(): Promise<void>

  // Save a timeline
  async saveTimeline(timeline: Timeline): Promise<Timeline>

  // Get a timeline by ID
  async getTimeline(id: string): Promise<Timeline | null>

  // List all timelines
  async listTimelines(): Promise<Timeline[]>

  // Delete a timeline
  async deleteTimeline(id: string): Promise<boolean>

  // Update a timeline item (stage or milestone)
  async updateTimelineItem(timelineId: string, item: TimelineItem): Promise<TimelineItem>

  // Get a timeline item by ID
  async getTimelineItem(timelineId: string, itemId: string): Promise<TimelineItem | null>
}
```