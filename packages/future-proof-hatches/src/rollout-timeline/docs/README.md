# Roll-out Timeline

The Roll-out Timeline module provides a comprehensive system for managing deployment sequences and timelines. It allows you to plan, track, and manage complex deployment processes with dependencies, notifications, and progress tracking.

## Features

- **Timeline Management**: Create and manage deployment timelines with stages and milestones
- **Dependency Management**: Define dependencies between stages and milestones
- **Progress Tracking**: Track progress of stages and estimate completion times
- **Notification System**: Send notifications for timeline events
- **Persistent Storage**: Store timeline data in memory or in JSON files
- **Critical Path Analysis**: Identify the critical path through a timeline
- **Risk Assessment**: Identify items that may be at risk of delays

## Installation

The Roll-out Timeline module is part of the Future-Proof Hatches package:

```bash
npm install @secondbrain/future-proof-hatches
```

## Basic Usage

```typescript
import {
  Timeline,
  Stage,
  Milestone,
  TimelineItemStatus,
  PriorityLevel,
  DependencyType
} from '@secondbrain/future-proof-hatches/rollout-timeline';

// Create a new timeline
const timeline = new Timeline(
  'Product Release v2.0',
  '2.0.0',
  {
    description: 'Timeline for the release of version 2.0 of our product',
    createdBy: 'Release Manager'
  }
);

// Add stages
const planningStage = timeline.addStage({
  name: 'Planning',
  description: 'Define scope, timeline, and resources',
  priority: PriorityLevel.HIGH,
  plannedStart: new Date('2025-06-01'),
  plannedEnd: new Date('2025-06-15'),
  owner: 'Project Manager'
});

const developmentStage = timeline.addStage({
  name: 'Development',
  description: 'Implement new features and improvements',
  priority: PriorityLevel.CRITICAL,
  plannedStart: new Date('2025-06-16'),
  plannedEnd: new Date('2025-07-31'),
  owner: 'Lead Developer'
});

// Add a milestone
const requirementsFinalized = timeline.addMilestone({
  name: 'Requirements Finalized',
  description: 'All requirements and specifications approved',
  priority: PriorityLevel.HIGH,
  critical: true,
  plannedStart: new Date('2025-06-15'),
  owner: 'Product Manager'
});

// Add a dependency
timeline.addDependency(
  developmentStage.id,
  planningStage.id,
  DependencyType.COMPLETION
);

// Start the timeline
timeline.start();

// Start and complete stages
timeline.startStage(planningStage.id);
timeline.completeStage(planningStage.id);

// Reach a milestone
timeline.reachMilestone(requirementsFinalized.id);

// Start the next stage
timeline.startStage(developmentStage.id);

// Update progress
timeline.updateStageProgress(developmentStage.id, 50);

// Calculate overall progress
const progress = timeline.calculateOverallProgress();
console.log(`Overall progress: ${progress}%`);
```

## Advanced Usage

See the [example implementation](../examples/product-release-timeline.ts) for a complete demonstration of the Roll-out Timeline module's features.

## Core Components

### Timeline

The central class for managing a deployment sequence. It contains stages, milestones, and manages dependencies between them.

```typescript
const timeline = new Timeline(
  'Product Release',
  '1.0.0',
  {
    description: 'Timeline for the product release',
    createdBy: 'Release Manager'
  }
);
```

### Stage

Represents a phase or stage in a deployment process. Stages can contain sub-stages, tasks, resources, feature flags, and metrics.

```typescript
const stage = new Stage(
  'Development',
  new Date('2025-06-01'),
  {
    description: 'Implement new features',
    priority: PriorityLevel.HIGH,
    plannedEnd: new Date('2025-06-30'),
    owner: 'Lead Developer'
  }
);
```

### Milestone

Represents a significant event or checkpoint in a timeline.

```typescript
const milestone = new Milestone(
  'Requirements Finalized',
  new Date('2025-05-31'),
  {
    description: 'All requirements approved',
    priority: PriorityLevel.HIGH,
    critical: true,
    owner: 'Product Manager'
  }
);
```

### DependencyResolver

Analyzes and resolves dependencies between timeline items. It can identify circular dependencies, calculate the critical path, and determine which items are ready to start.

```typescript
const resolver = new DependencyResolver(timeline);
const criticalPath = resolver.getCriticalPath();
const readyItems = resolver.getReadyToStartItems();
```

### NotificationService

Sends notifications for timeline events to various channels (email, Slack, webhooks, etc.).

```typescript
const notificationService = new NotificationService();
notificationService.registerChannel('email', async (notification, item, timeline) => {
  // Send email notification
  return true;
});
```

### ProgressTracker

Tracks and calculates progress for stages and timelines using different strategies (equal weight, priority-based, or time-based).

```typescript
const progressTracker = new ProgressTracker('priority');
const stageProgress = progressTracker.calculateStageProgress(stage);
const timelineProgress = progressTracker.calculateTimelineProgress(timeline);
```

### Repositories

Store timeline data in various formats:

- **InMemoryTimelineRepository**: Stores timeline data in memory (for testing and development)
- **JsonFileTimelineRepository**: Stores timeline data in JSON files (for persistence)

```typescript
const repository = new JsonFileTimelineRepository('/path/to/data');
await repository.saveTimeline(timeline);
const loadedTimeline = await repository.getTimeline(timeline.id);
```

## Integrations

The Roll-out Timeline module can be integrated with other components in the Future-Proof Hatches package:

- **Feature Flags**: Control feature flags during deployment stages
- **A/B Testing**: Set up A/B tests as part of deployment stages
- **API Gateway**: Track API changes in deployment timelines
- **AI Models**: Use AI models to predict deployment risks and estimate completion times

## API Reference

For complete API documentation, see the [API Reference](./API.md).